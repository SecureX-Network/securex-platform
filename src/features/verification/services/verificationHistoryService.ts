import { IS_MOCK } from '@/constants';
import { MOCK_CREDENTIALS } from '@/services/mock';
import { getCredentials } from '@/services/api/credentialService';
import type { Credential, VerificationHistory } from '@/types';

// ---------------------------------------------------------------------------
// VERIFICATION HISTORY — role scoped
//
// One page serves three very different questions:
//
//   HOLDER       "who has verified my credentials?"
//   EMPLOYER     "what have I verified?"
//   INSTITUTION  "what have verifiers seen for the credentials I issued?"
//
// The platform records a verification against a CREDENTIAL, not against a
// person, so a holder's or institution's history is the set of verifications
// whose credential belongs to them. That is how the row is scoped here.
//
// HONESTY: the verification record does not carry the holder's name, and the
// public verification DTO deliberately never discloses holder identity. In
// DEMO we can enrich a row from the local credential dataset. Against the live
// API the holder name is simply not available, so it is reported as
// `holderName: null` and the UI shows "Not disclosed" rather than inventing
// one. Enrichment is presentation-only; it never changes a status or a result.
// ---------------------------------------------------------------------------

export interface VerificationHistoryRow extends VerificationHistory {
  /** Resolved credential title when the platform could resolve it. */
  credentialTitle: string;
  /** Holder name when resolvable; null when the platform does not disclose it. */
  holderName: string | null;
  institutionName: string | null;
}

export type HistoryScope = 'performer' | 'holder' | 'issuer';

async function loadCredentialIndex(): Promise<Map<string, Credential>> {
  const index = new Map<string, Credential>();
  if (IS_MOCK) {
    for (const c of MOCK_CREDENTIALS) {
      index.set(c.credentialId, c);
      index.set(c.id, c);
    }
    return index;
  }
  try {
    const credentials = await getCredentials();
    for (const c of credentials) {
      index.set(c.credentialId, c);
      index.set(c.id, c);
    }
  } catch {
    // A credential lookup failure must not fail the history page; the rows
    // simply stay unresolved and the UI reports the fields as unavailable.
  }
  return index;
}

function toRow(entry: VerificationHistory, index: Map<string, Credential>): VerificationHistoryRow {
  const credential = index.get(entry.credentialId);
  return {
    ...entry,
    credentialTitle: credential?.title ?? entry.credentialTitle,
    holderName: credential?.holderName ?? null,
    institutionName: credential?.institutionName ?? null,
  };
}

/**
 * @param scope    whose perspective the history is presented from
 * @param userId   the acting user's id (performer id, or the owner whose
 *                 credentials are being matched)
 */
export async function getScopedVerificationHistory(
  scope: HistoryScope,
  userId: string,
): Promise<VerificationHistoryRow[]> {
  const [{ getVerificationHistory }, index] = await Promise.all([
    import('@/services/api/verificationService'),
    loadCredentialIndex(),
  ]);

  const all = await getVerificationHistory(userId);
  const rows = all.map((entry) => toRow(entry, index));

  if (scope === 'performer') return rows;

  const ownedIds = new Set<string>();
  if (IS_MOCK) {
    for (const c of MOCK_CREDENTIALS) {
      if (scope === 'holder' ? c.holderId === userId : c.institutionId === userId) {
        ownedIds.add(c.credentialId);
        ownedIds.add(c.id);
      }
    }
  } else {
    try {
      const credentials = await getCredentials();
      for (const c of credentials) {
        if (scope === 'issuer' && c.institutionId === userId) {
          ownedIds.add(c.credentialId);
        }
      }
    } catch {
      /* resolved lazily above; nothing to narrow by */
    }
  }

  return rows.filter((row) => ownedIds.has(row.credentialId));
}
