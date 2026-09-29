/**
 * SecureX demo recorder — the scene list.
 *
 * The video has to explain itself without a narrator, so every scene carries
 * the three pieces of on-screen text it needs: the step number, the step
 * heading, and the one-line caption. The overlay module renders them; the spec
 * never hardcodes copy inline.
 */

export interface Scene {
  /** Two-digit scene id, used in logs and the failure report. */
  readonly id: string;
  /** Short name for logs. */
  readonly name: string;
  /** STEP nn shown bottom-left, or null for the opening/closing brand frames. */
  readonly step: string | null;
  /** Bold heading shown with the step. */
  readonly heading: string | null;
  /** Explanatory caption shown bottom-centre. */
  readonly caption: string | null;
}

export const SCENES = {
  landing: {
    id: '01',
    name: 'SecureX Landing',
    step: null,
    heading: 'SECUREX',
    caption: 'Digital Credential Trust Network',
  },
  landingTagline: {
    id: '01',
    name: 'SecureX Landing',
    step: null,
    heading: null,
    caption: 'Issue once. Verify everywhere. Trust instantly.',
  },
  holderLogin: {
    id: '02',
    name: 'Holder Login',
    step: 'STEP 01',
    heading: 'HOLDER',
    caption: 'Your credentials, verified and shareable.',
  },
  holderHome: {
    id: '03',
    name: 'Holder Home',
    step: 'STEP 02',
    heading: 'HOLDER HOME',
    caption: 'One place to manage your digital credentials.',
  },
  credential: {
    id: '04',
    name: 'Open Credential',
    step: 'STEP 03',
    heading: 'VERIFIED CREDENTIAL',
    caption: 'A digital credential ready to be verified.',
  },
  share: {
    id: '05',
    name: 'QR / Share',
    step: 'STEP 04',
    heading: 'SHARE',
    caption: 'Verify the credential using its SecureX QR.',
  },
  employerLogin: {
    id: '06',
    name: 'Employer Login',
    step: 'STEP 05',
    heading: 'EMPLOYER VERIFICATION',
    caption: 'Verify a credential before trusting it.',
  },
  employerVerify: {
    id: '07',
    name: 'Employer Verify',
    step: 'STEP 06',
    heading: 'VERIFIED',
    caption: 'The credential is valid.',
  },
  institutionLogin: {
    id: '08',
    name: 'Institution Login',
    step: 'STEP 07',
    heading: 'INSTITUTION',
    caption: 'Issue trusted credentials from the source.',
  },
  issue: {
    id: '09',
    name: 'Issue Credential',
    step: 'STEP 08',
    heading: 'CREDENTIAL ISSUED',
    caption: 'A new credential has been created.',
  },
  revoke: {
    id: '10',
    name: 'Revoke',
    step: 'STEP 09',
    heading: 'REVOCATION',
    caption: 'Credential status changes immediately.',
  },
  reverify: {
    id: '11',
    name: 'Employer Re-verification',
    step: 'STEP 10',
    heading: 'REVOKED',
    caption: 'A revoked credential is no longer valid.',
  },
  closing: {
    id: '12',
    name: 'Closing',
    step: null,
    heading: 'SECUREX',
    caption: 'Issue once. Verify everywhere. Trust instantly.',
  },
} as const satisfies Record<string, Scene>;

/** Closing frame footnote. Wording is deliberately limited to what DEMO does. */
export const CLOSING_FOOTNOTE =
  'Demo environment — no real blockchain anchoring or cryptographic signing.';
