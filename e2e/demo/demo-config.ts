/**
 * SecureX demo recorder — static configuration.
 *
 * Everything the recorder needs to be reproducible lives here: the DEMO
 * accounts, the credential the story is built around, the viewport, and the
 * pacing. No value in this file is a secret; the DEMO password is a published
 * fixture and is never rendered on screen.
 */

/** Where the orchestrator expects the final artifacts. */
export const ARTIFACT_DIR = 'artifacts/securex-demo';

export const VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Deterministic browser environment. The recording must look the same on every
 * machine, and must never inherit the developer's own Chrome profile, cookies,
 * extensions or locale.
 */
export const BROWSER_CONTEXT = {
  viewport: VIEWPORT,
  locale: 'en-US',
  timezoneId: 'UTC',
  colorScheme: 'dark' as const,
  deviceScaleFactor: 1,
  // No traces, no HAR, no downloads: the video is the only artifact.
  acceptDownloads: false,
  bypassCSP: false,
  reducedMotion: 'reduce' as const,
};

/** DEMO password. Published fixture; used to fill the form, never displayed. */
export const DEMO_PASSWORD = 'Password123!';

export interface DemoAccount {
  /** Label shown in the on-screen step overlay. */
  readonly role: string;
  readonly email: string;
  readonly name: string;
  /** Row index in the login page's "Use" list, 0-based, in DEMO_ACCOUNTS order. */
  readonly useButtonIndex: number;
}

export const ACCOUNTS = {
  holder: {
    role: 'HOLDER',
    email: 'emily.rodriguez@example.com',
    name: 'Emily Rodriguez',
    useButtonIndex: 1,
  },
  employer: {
    role: 'EMPLOYER',
    email: 'marcus.johnson@acme.com',
    name: 'Marcus Johnson',
    useButtonIndex: 2,
  },
  institution: {
    role: 'INSTITUTION',
    email: 's.chen@stanford.edu',
    name: 'Sarah Chen',
    useButtonIndex: 3,
  },
} as const satisfies Record<string, DemoAccount>;

/**
 * The credential the whole story hangs on.
 *
 * `cred-001` is the only credential that is simultaneously: held by the DEMO
 * holder, VALID, issued by the DEMO institution, and the first card in the
 * wallet — so no search is needed to reach it on camera. Only the PUBLIC
 * identifier is ever shown or typed; the internal `cred-00N` id never appears.
 */
export const FEATURED_CREDENTIAL = {
  title: 'Bachelor of Science in Computer Science',
  holderName: 'Emily Rodriguez',
  institutionName: 'Stanford University',
  publicId: 'SX-2F9C-A41B-8D7E',
  status: 'VALID',
} as const;

/** Values typed into the real issuance form. Fields map 1:1 to the form's own. */
export const ISSUED_CREDENTIAL = {
  type: 'Degree',
  title: 'Bachelor of Technology in Computer Science',
  description:
    'Awarded on the basis of a four-year undergraduate programme, including a capstone thesis and a supervised practical project.',
  holderName: 'Aarav Mehta',
  holderEmail: 'aarav.mehta@example.com',
} as const;

/**
 * Pacing, in milliseconds.
 *
 * Tuned so the finished recording lands in the 3-5 minute target: long enough
 * that a viewer can read each state, short enough that it is not a test log.
 */
export const TIMING = {
  /** Beat between two routine actions. */
  navigate: 900,
  /** Beat after a page-level transition. */
  transition: 1400,
  /** Beat on a meaningful result the viewer must read. */
  result: 2600,
  /** Beat held on the credential QR. */
  qr: 3000,
  /** Beat held on the VALID proof. */
  valid: 3000,
  /** Beat held on the REVOKED proof — the money shot. */
  revoked: 3600,
  /** Beat held on the closing brand frame. */
  closing: 5000,
  /** Beat before an irreversible action is committed. */
  beforeSubmit: 1500,
  /** Landing-page hero hold. */
  landing: 4000,
  /** Dashboard comprehension hold. */
  dashboard: 3000,
  /** How long a demo step caption stays up after its action. */
  stepCaption: 2200,
  /** Mouse travel speed: number of interpolated moves per interaction. */
  cursorSteps: 18,
  /** Pause between interpolated mouse moves. */
  cursorStepDelay: 12,
} as const;

/** localStorage key the app uses for DEMO credential overlay state. */
export const DEMO_OVERLAY_KEY = 'securex_demo_credential_overlay_v1';

/** localStorage keys the recorder clears to guarantee a clean first frame. */
export const DEMO_STORAGE_KEYS = [
  'securex_auth_user',
  'securex_auth_token',
  DEMO_OVERLAY_KEY,
] as const;
