// ---------------------------------------------------------------------------
// EXPLORER CHAIN CONNECTION STATE MACHINE
//
// A pure function, deliberately free of React and of the network, so the
// honesty rules can be stated once and tested exhaustively.
//
// THE RULE THAT MATTERS MOST: this never reports `operational` unless a real
// `/api/blockchain/health` request has actually succeeded. There is no path
// that infers health from a stale success, from a partially-loaded summary, or
// from anything other than a completed read. A visitor is never told the
// network is healthy when it was not asked, or when the last answer was a
// failure.
//
// WHY FOUR STATES AND NOT TWO
//
// A single "unavailable" boolean collapses two completely different situations
// that look identical in the raw data:
//
//   * the node is ASLEEP and being woken  -> retrying will very likely work in
//     seconds, and saying "unavailable" is both alarming and untrue;
//   * the request genuinely failed      -> retrying may be pointless.
//
// Reporting them the same way is why a free-tier node that is merely napping
// reads to a visitor as a broken network. So the machine separates them, and
// says which one is happening.
//
// `unavailable` is only reachable once the bounded retry budget is spent, or
// immediately for a failure that retrying cannot fix.
// ---------------------------------------------------------------------------

import type { Tone } from '../components/primitives';

export type ChainConnectionState =
  /** A real health request succeeded and the node reports itself healthy. */
  | 'operational'
  /** First ever attempt is in flight. Nothing known yet. */
  | 'connecting'
  /** The node is asleep / unreachable and we are actively waiting for it. */
  | 'waking'
  /** The bounded retry budget is spent, or the failure is not retryable. */
  | 'unavailable';

export interface ChainConnectionInput {
  /** Has a real request ever succeeded in this session? */
  everSucceeded: boolean;
  /** Is a request in flight right now? */
  inFlight: boolean;
  /** Message from the last failure, or null. */
  error: string | null;
  /**
   * Is the failure infrastructural (node asleep) rather than a real fault?
   * Supplied by the caller so this module never has to know about `ApiError`.
   */
  transient: boolean;
  /** Consecutive failed attempts so far in the current budget. */
  attemptsMade: number;
  /** Has the bounded retry budget been spent? */
  exhausted: boolean;
  /** The node's own reported status, e.g. 'UP' | 'RUNNING' | 'DEGRADED'. */
  nodeStatus: string | null;
  /**
   * How long the current attempt has been in flight, in ms. Null when nothing
   * is in flight.
   *
   * This exists because "Connecting" was doing too much work. A single request
   * has to outlast the API's own ~40s retry budget, so a visitor who loaded the
   * page against a sleeping node saw "Connecting" for well over two minutes —
   * technically honest (nothing is known, so nothing is claimed) but useless,
   * because it never once said the node was asleep.
   */
  inFlightMs?: number | null;
}

export interface ChainConnection {
  state: ChainConnectionState;
  tone: Tone;
  /** Short badge text. */
  label: string;
  /** Honest heading for the explanatory panel, or null when there is nothing to explain. */
  title: string | null;
  /** What a visitor should understand is happening. */
  detail: string | null;
  /** Is another attempt going to happen without the visitor asking? */
  willRetry: boolean;
}

const HEALTHY = new Set(['UP', 'RUNNING']);

/**
 * How long a health read may take before it is reasonable to suspect the node
 * is asleep.
 *
 * Measured against the same node: awake it answers `/health` in ~0.3s, and a
 * cold start takes ~22s. Ten seconds is therefore far outside the normal range
 * and far inside the worst case — comfortably between the two, so it fires only
 * when something is genuinely wrong with the upstream.
 *
 * It is a signal, not a fact, and the copy says so: the state reports that the
 * node is taking unusually long, not that it has been proven to be asleep.
 */
const WAKING_HINT_MS = 10_000;

/**
 * Derive the connection state.
 *
 * Ordering is deliberate and load-bearing. A previous success is trusted only
 * while nothing has since failed, because data already on screen genuinely came
 * from a real read — but the moment a read fails, that success stops being a
 * claim about the present and the state must reflect the failure.
 */
export function deriveConnection(input: ChainConnectionInput): ChainConnection {
  const { everSucceeded, inFlight, error, transient, attemptsMade, exhausted, nodeStatus, inFlightMs } = input;
  const nodeHealthy = nodeStatus !== null && HEALTHY.has(nodeStatus.toUpperCase());

  // The one sentence that explains every waking state. It is attached in both
  // waking branches, not just the in-flight one: the copy a visitor actually
  // spends the most time reading is the copy shown while the timer waits, so
  // that is where the explanation has to be.
  const WAKING_CONTEXT =
    'This node runs on a free hosting tier, so it sleeps when idle and takes a few seconds to come back.';

  // A success that has not been followed by a failure. Data on screen is real
  // and was read moments ago, so a background refresh must not make the page
  // flail. `nodeStatus` being absent (metrics are best-effort) still counts as
  // operational: the health read that gated this summary did succeed.
  if (everSucceeded && !error) {
    if (nodeStatus && !nodeHealthy) {
      return {
        state: 'operational',
        tone: 'warn',
        label: nodeStatus,
        title: null,
        detail: 'The blockchain node is reachable but reports a degraded state.',
        willRetry: false,
      };
    }
    return {
      state: 'operational',
      tone: 'ok',
      label: 'Operational',
      title: null,
      detail: null,
      willRetry: false,
    };
  }

  // Currently retrying after a failure. This is the state that was previously
  // missing: the node is asleep and we are waiting, which is neither healthy
  // nor broken.
  if (inFlight && (error !== null || attemptsMade > 0)) {
    return {
      state: 'waking',
      tone: 'warn',
      label: 'Waking',
      title: 'Blockchain node is waking up',
      detail: `SecureX is reconnecting to the blockchain node. ${WAKING_CONTEXT}`,
      willRetry: true,
    };
  }

  // Failed, but the budget still has room and the failure is the kind retrying
  // can fix. Say so plainly instead of declaring an outage.
  if (error !== null && transient && !exhausted) {
    return {
      state: 'waking',
      tone: 'warn',
      label: 'Waking',
      title: 'Blockchain node is waking up',
      detail:
        attemptsMade > 1
          ? `SecureX is reconnecting to the blockchain node (attempt ${attemptsMade + 1}). ${WAKING_CONTEXT}`
          : `SecureX is reconnecting to the blockchain node. ${WAKING_CONTEXT}`,
      willRetry: true,
    };
  }

  // A failure retrying cannot fix (a 401, a malformed response, a 404 on a
  // route that should exist). Report it immediately rather than pretending to
  // wait for something that will never arrive.
  if (error !== null && !transient) {
    return {
      state: 'unavailable',
      tone: 'bad',
      label: 'Unavailable',
      title: 'Blockchain service unavailable',
      detail: error,
      willRetry: false,
    };
  }

  // Budget spent on a transient failure. This is the only route to
  // `unavailable` for a sleeping node, and it is reached only after the bounded
  // attempts have genuinely all failed.
  if (error !== null && exhausted) {
    return {
      state: 'unavailable',
      tone: 'bad',
      label: 'Unavailable',
      title: 'Blockchain node did not respond',
      detail: `SecureX could not reach the blockchain node after ${attemptsMade} ${attemptsMade === 1 ? 'attempt' : 'attempts'}. This node sleeps when idle on a free hosting tier; it may need a moment, or a manual retry.`,
      willRetry: false,
    };
  }

  // First attempt, still nothing known and nothing failed. But if the read has
  // now been outstanding for far longer than a healthy node ever takes, "still
  // connecting" stops being the useful thing to say.
  if (
    inFlightMs != null &&
    inFlightMs >= WAKING_HINT_MS &&
    !everSucceeded &&
    error === null
  ) {
    return {
      state: 'waking',
      tone: 'warn',
      label: 'Waking',
      title: 'Waiting for the blockchain node',
      detail: `The node has not responded for ${Math.round(inFlightMs / 1000)}s. It is taking longer than usual to start — ${WAKING_CONTEXT}`,
      willRetry: true,
    };
  }

  // First attempt, nothing known, nothing failed.
  return {
    state: 'connecting',
    tone: 'neutral',
    label: 'Connecting',
    title: null,
    detail: null,
    willRetry: false,
  };
}

/**
 * Should the next attempt be a fast recovery retry rather than a normal poll?
 *
 * Only transient failures qualify. Retrying a genuine fault on a fast loop is
 * pure load with no possible benefit, and on a free-tier node load is the thing
 * most likely to keep it down.
 */
export function shouldRetrySoon(input: {
  error: string | null;
  transient: boolean;
  exhausted: boolean;
}): boolean {
  return input.error !== null && input.transient && !input.exhausted;
}