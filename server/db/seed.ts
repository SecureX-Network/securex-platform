import bcrypt from 'bcryptjs';
import { all, get, run, transaction } from './database.js';
import { makeHex } from '../utils/ids.js';
import { logger } from '../services/logger.js';

/**
 * Deterministic seed of the canonical SecureX demo domain data.
 *
 * Every value mirrors src/services/mock/data.ts (the DEMO-mode source of
 * truth) so that DEMO and REAL modes render the same dataset. Relative dates
 * are computed from boot time exactly like the mock layer does, and the demo
 * password hash is computed once and shared (identical plaintext).
 *
 * Seeding runs only on a fresh database (no schema_meta.seeded row), so it
 * never overwrites existing rows on re-deploys.
 */

const DAY = 86_400_000;

function iso(daysAgo: number, hoursAgo = 0): string {
  return new Date(Date.now() - daysAgo * DAY - hoursAgo * 3_600_000).toISOString();
}

function futureIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * DAY).toISOString();
}

export async function seedIfEmpty(): Promise<void> {
  const existing = await get<{ n: number }>('SELECT COUNT(*) AS n FROM users');
  if (existing && existing.n > 0) {
    return;
  }

  const demoPasswordHash = bcrypt.hashSync('Password123!', 10);

  let seededUserCount = 0;
  let seededCredentialCount = 0;

  await transaction(async () => {
    // ── Users (incl. hashed demo password) ────────────────────────────
    const users: Array<[string, string, string, string, string | null, string, string]> = [
      ['usr-admin-001', 'admin@securex.io', 'Alex Morgan', 'ADMIN', null, iso(540), iso(0, 2)],
      ['usr-security-001', 'security@securex.io', 'Jamie Rivers', 'SECURITY_ADMIN', null, iso(520), iso(0, 5)],
      ['usr-network-001', 'network@securex.io', 'Taylor Brooks', 'NETWORK_ADMIN', null, iso(500), iso(1)],
      ['usr-auditor-001', 'auditor@securex.io', 'Casey Lin', 'AUDITOR', null, iso(480), iso(2, 3)],
      ['usr-inst-001', 's.chen@stanford.edu', 'Sarah Chen', 'INSTITUTION', 'inst-stanford', iso(460), iso(0, 1)],
      ['usr-employer-001', 'marcus.johnson@acme.com', 'Marcus Johnson', 'EMPLOYER', null, iso(420), iso(0, 6)],
      ['usr-holder-001', 'emily.rodriguez@example.com', 'Emily Rodriguez', 'HOLDER', null, iso(450), iso(0, 4)],
      ['usr-holder-002', 'daniel.kim@example.com', 'Daniel Kim', 'HOLDER', null, iso(430), iso(1, 2)],
      ['usr-holder-003', 'priya.sharma@example.com', 'Priya Sharma', 'HOLDER', null, iso(410), iso(2, 1)],
      ['usr-holder-004', 'sophia.martinez@example.com', 'Sophia Martinez', 'HOLDER', null, iso(390), iso(3, 5)],
      ['usr-holder-005', 'robert.nakamura@example.com', 'Robert Nakamura', 'HOLDER', null, iso(370), iso(4)],
      ['usr-holder-006', 'james.obrien@example.com', 'James O\u2019Brien', 'HOLDER', null, iso(350), iso(5, 2)],
      ['usr-holder-007', 'sarah.kim@example.com', 'Sarah Kim', 'HOLDER', null, iso(330), iso(6)],
      ['usr-holder-008', 'anna.kowalski@example.com', 'Anna Kowalski', 'HOLDER', null, iso(310), iso(7, 4)],
      ['usr-holder-009', 'monica.patel@example.com', 'Monica Patel', 'HOLDER', null, iso(290), iso(8, 6)],
    ];
    let i = 0;
    for (const u of users) {
      i += 1;
      await run(
        `INSERT INTO users (id, email, name, role, institution_id, password_hash, status, mfa_enabled, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        u[0], u[1], u[2], u[3], u[4], demoPasswordHash, i <= 4 ? 1 : 0, u[5], u[6],
      );
      seededUserCount = i;
    }

    // ── Institutions ───────────────────────────────────────────────────
    const institutions: Array<[string, string, string, string, number, string, string]> = [
      ['inst-stanford', 'Stanford University', 'University', 'https://www.stanford.edu', 1, 'ACTIVE', iso(620)],
      ['inst-mit', 'Massachusetts Institute of Technology', 'University', 'https://www.mit.edu', 1, 'ACTIVE', iso(615)],
      ['inst-berkeley', 'University of California, Berkeley', 'University', 'https://berkeley.edu', 1, 'ACTIVE', iso(605)],
      ['inst-gatech', 'Georgia Institute of Technology', 'University', 'https://www.gatech.edu', 1, 'ACTIVE', iso(590)],
      ['inst-jhu', 'Johns Hopkins University', 'University', 'https://www.jhu.edu', 1, 'ACTIVE', iso(575)],
      ['inst-ancc', 'American Nurses Credentialing Center', 'Certification Body', 'https://www.nursingworld.org/ancc/', 1, 'ACTIVE', iso(560)],
      ['inst-ieee', 'IEEE Computer Society', 'Professional Association', 'https://www.computer.org', 1, 'ACTIVE', iso(545)],
      ['inst-aws', 'AWS Training and Certification', 'Corporate Training Provider', 'https://aws.amazon.com/training/', 1, 'ACTIVE', iso(520)],
      ['inst-city', 'City University of Technology', 'University', 'https://www.citytech.edu', 0, 'PENDING', iso(12)],
      ['inst-gca', 'Global Certification Alliance', 'Certification Body', 'https://www.gcacert.org', 0, 'SUSPENDED', iso(200)],
    ];
    for (const inst of institutions) {
      await run(
        `INSERT INTO institutions (id, name, type, website, verified, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        inst[0], inst[1], inst[2], inst[3], inst[4], inst[5], inst[6],
      );
    }

    // ── Issuers ────────────────────────────────────────────────────────
    const issuers: Array<[string, string, string, string, number, string, number, string]> = [
      ['iss-stanford-registrar', 'Stanford Office of the Registrar', 'inst-stanford', 'registrar@stanford.edu', 101, 'ACTIVE', 842, iso(600)],
      ['iss-stanford-cs', 'Stanford Department of Computer Science', 'inst-stanford', 'cs-graduation@stanford.edu', 102, 'ACTIVE', 276, iso(560)],
      ['iss-stanford-online', 'Stanford Online Learning', 'inst-stanford', 'online-credentials@stanford.edu', 103, 'ACTIVE', 403, iso(530)],
      ['iss-mit-registrar', 'MIT Registrar Services', 'inst-mit', 'registrar@mit.edu', 104, 'ACTIVE', 712, iso(585)],
      ['iss-mit-profed', 'MIT Professional Education', 'inst-mit', 'professional@mit.edu', 105, 'ACTIVE', 165, iso(510)],
      ['iss-berkeley-registrar', 'UC Berkeley Office of the Registrar', 'inst-berkeley', 'registrar@berkeley.edu', 106, 'ACTIVE', 890, iso(598)],
      ['iss-gatech-registrar', 'Georgia Tech Registrar', 'inst-gatech', 'registrar@gatech.edu', 107, 'ACTIVE', 512, iso(570)],
      ['iss-jhu-nursing', 'Johns Hopkins School of Nursing', 'inst-jhu', 'nursing-credentials@jhu.edu', 108, 'ACTIVE', 342, iso(555)],
      ['iss-jhu-mph', 'Johns Hopkins Bloomberg School of Public Health', 'inst-jhu', 'mph-records@jhu.edu', 109, 'ACTIVE', 288, iso(540)],
      ['iss-ancc', 'ANCC Certification Services', 'inst-ancc', 'certification@ancc.org', 110, 'ACTIVE', 481, iso(550)],
      ['iss-ieee-portfolio', 'IEEE Portfolio Certification Office', 'inst-ieee', 'certification@computer.org', 111, 'ACTIVE', 372, iso(535)],
      ['iss-aws-cert', 'AWS Certification Compliance Team', 'inst-aws', 'certification@amazon.com', 112, 'ACTIVE', 1290, iso(515)],
      ['iss-gca', 'GCA Verification Office', 'inst-gca', 'verify@gcacert.org', 113, 'SUSPENDED', 214, iso(195)],
    ];
    for (const iss of issuers) {
      await run(
        `INSERT INTO issuers (id, name, institution_id, email, public_key, status, credentials_issued, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        iss[0], iss[1], iss[2], iss[3], makeHex(iss[4] as number), iss[5], iss[6], iss[7],
      );
    }

    // ── Credentials ────────────────────────────────────────────────────
    //
    // The first eight public credential IDs (cred-001 .. cred-008) are aligned
    // 1:1 with the SecureX blockchain demo credential set (REAL_DEMO_PUBLIC_CREDENTIAL_IDS):
    // the public ID is the shared identifier between the platform and the chain,
    // so wallet-shared QR references and the public verification portal resolve
    // the same credential on both systems. Internal record IDs (cred-*) are
    // platform-local.
    const credentials: Array<Array<string | number | null | undefined>> = [
      ['cred-001', 'SX-2F9C-A41B-8D7E', 'Degree', 'Bachelor of Science in Computer Science', 'Undergraduate degree in Computer Science with a concentration in artificial intelligence and human-computer interaction.', 'Emily Rodriguez', 'usr-holder-001', 'iss-stanford-cs', 'inst-stanford', 'VALID', '2024-05-18T14:30:00.000Z', null, 20001, 40001, 60001, 'tpl-bachelors', undefined],
      ['cred-002', 'SX-7A31-C0E4-19F6', 'Degree', 'Master of Science in Data Science', 'Graduate program covering statistical modeling, machine learning, and large-scale data infrastructure.', 'Daniel Kim', 'usr-holder-002', 'iss-berkeley-registrar', 'inst-berkeley', 'VALID', '2023-12-10T17:00:00.000Z', null, 20002, 40002, 60002, 'tpl-masters', undefined],
      ['cred-003', 'SX-4B8D-6A2F-C701', 'Certificate', 'Professional Certificate in Machine Learning', 'Certificate of completion for the online Machine Learning Specialization series evaluated via proctored assessments.', 'Sophia Martinez', 'usr-holder-004', 'iss-stanford-online', 'inst-stanford', 'VALID', '2024-08-22T09:15:00.000Z', futureIso(730), 20003, 40003, 60003, 'tpl-certificate', undefined],
      ['cred-004', 'SX-9C4E-2D80-5A31', 'Degree', 'Bachelor of Science in Nursing', 'Four-year baccalaureate nursing degree including clinical rotations across acute, community, and psychiatric care.', 'Priya Sharma', 'usr-holder-003', 'iss-jhu-nursing', 'inst-jhu', 'VALID', '2022-05-15T16:00:00.000Z', null, 20004, 40004, 60004, 'tpl-bachelors', undefined],
      ['cred-005', 'SX-3A17-B9F2-6D48', 'Certificate', 'Certified Nurse Educator (CNE)', 'Professional certification validating expertise in nursing education, curriculum design, and learner assessment.', 'Priya Sharma', 'usr-holder-003', 'iss-ancc', 'inst-ancc', 'VALID', '2023-06-01T12:00:00.000Z', futureIso(650), 20005, 40005, 60005, 'tpl-certificate', undefined],
      ['cred-006', 'SX-8E50-1C73-A9B4', 'Degree', 'PhD in Electrical Engineering', 'Doctoral degree with dissertation on energy-efficient edge computing architectures for decentralized networks.', 'Robert Nakamura', 'usr-holder-005', 'iss-mit-registrar', 'inst-mit', 'VALID', '2019-06-05T15:30:00.000Z', null, 20006, 40006, 60006, 'tpl-doctoral', undefined],
      ['cred-007', 'SX-6D29-B8E5-0F4C', 'Degree', 'Master of Business Administration', 'MBA with concentrations in strategic management and organizational leadership, completed with honors.', 'Emily Rodriguez', 'usr-holder-001', 'iss-stanford-registrar', 'inst-stanford', 'VALID', '2021-06-12T18:00:00.000Z', null, 20007, 40007, 60007, 'tpl-masters', undefined],
      ['cred-008', 'SX-5A40-9F61-D2B7', 'Certificate', 'AWS Certified Solutions Architect \u2013 Associate', 'Associate-level certification demonstrating skill in designing distributed systems on the AWS platform.', 'Daniel Kim', 'usr-holder-002', 'iss-aws-cert', 'inst-aws', 'REVOKED', '2022-09-30T10:00:00.000Z', null, 20008, 40008, 60008, 'tpl-certificate', 'REVOKED'],
      ['cred-009', 'SX-4B8F-C1D6-29A3', 'Certificate', 'IEEE Certified Software Development Professional (CSDP)', 'Professional certification for senior software engineers covering software architecture, process, and quality.', 'Monica Patel', 'usr-holder-009', 'iss-ieee-portfolio', 'inst-ieee', 'EXPIRED', '2021-11-20T14:00:00.000Z', '2024-11-20T23:59:59.000Z', 20009, 40009, 60009, 'tpl-certificate', 'EXPIRED'],
      ['cred-010', 'SX-F7C3-58E0-1D9A', 'Certificate', 'Professional Certificate in Project Management', 'Certificate covering PMI-aligned project management practices, earned through an online executive program.', 'James O\u2019Brien', 'usr-holder-006', 'iss-gatech-registrar', 'inst-gatech', 'SUSPENDED', '2023-03-15T11:00:00.000Z', null, 20010, 40010, 60010, 'tpl-certificate', 'SUSPENDED'],
      ['cred-011', 'SX-2A64-9B7E-50CD', 'Degree', 'Bachelor of Arts in Economics', 'Undergraduate degree in economics with a minor in data analytics and quantitative policy analysis.', 'Sarah Kim', 'usr-holder-007', 'iss-berkeley-registrar', 'inst-berkeley', 'VALID', '2020-05-20T16:30:00.000Z', null, 20011, 40011, 60011, 'tpl-bachelors', undefined],
      ['cred-012', 'SX-83E1-0FA6-4B92', 'Certificate', 'AWS Certified Developer \u2013 Associate', 'Associate-level certification validating proficiency in developing and maintaining AWS-based applications.', 'Anna Kowalski', 'usr-holder-008', 'iss-aws-cert', 'inst-aws', 'SUSPICIOUS', '2024-01-18T09:00:00.000Z', null, 20012, 40012, 60012, 'tpl-certificate', 'SUSPICIOUS'],
      ['cred-013', 'SX-5C97-D3B8-6E01', 'Degree', 'Master of Public Health', 'Graduate degree in public health with a focus on epidemiology and global health systems.', 'Priya Sharma', 'usr-holder-003', 'iss-jhu-mph', 'inst-jhu', 'VALID', '2021-05-28T13:45:00.000Z', null, 20013, 40013, 60013, 'tpl-masters', undefined],
      ['cred-014', 'SX-D0A2-71EC-9B45', 'Degree', 'Bachelor of Science in Industrial Engineering', 'Undergraduate degree in industrial and systems engineering emphasizing optimization and process design.', 'Marcus Johnson', 'usr-employer-001', 'iss-gatech-registrar', 'inst-gatech', 'VALID', '2015-05-08T15:00:00.000Z', null, 20014, 40014, 60014, 'tpl-bachelors', undefined],
      ['cred-015', 'SX-EF4B-390A-7C58', 'Certificate', 'Professional Certificate in Data Analytics', 'Certificate covering data wrangling, visualization, and statistical inference for business analytics.', 'Daniel Kim', 'usr-holder-002', 'iss-mit-profed', 'inst-mit', 'TAMPERED', '2024-10-05T08:30:00.000Z', null, 20015, 40015, 60015, 'tpl-certificate', 'TAMPERED'],
    ];
    const metadataByCred: Record<string, string> = {
      'cred-001': JSON.stringify({ major: 'Computer Science', gpa: '3.82', honors: 'Cum Laude' }),
      'cred-002': JSON.stringify({ concentration: 'Machine Learning', gpa: '3.91' }),
      'cred-003': JSON.stringify({ program: 'Machine Learning Specialization', hours: '180 CEUs' }),
      'cred-004': JSON.stringify({ specialization: 'Registered Nursing', cumulativeGpa: '3.74' }),
      'cred-005': JSON.stringify({ credentialCode: 'CNE-88213', renewalCycle: '5 years' }),
      'cred-006': JSON.stringify({ dissertationTitle: 'Energy-Efficient Edge Computing Architectures' }),
      'cred-007': JSON.stringify({ concentration: 'Strategic Management', gpa: '3.78' }),
      'cred-008': JSON.stringify({ credentialCode: 'AWS-SAA-45012', assessmentId: 'ASM-77812' }),
      'cred-009': JSON.stringify({ credentialCode: 'CSDP-221780', renewalCycle: '3 years' }),
      'cred-010': JSON.stringify({ credentialCode: 'GT-PMP-8834' }),
      'cred-011': JSON.stringify({ major: 'Economics', minor: 'Data Analytics', gpa: '3.65' }),
      'cred-012': JSON.stringify({ credentialCode: 'AWS-DVA-90331' }),
      'cred-013': JSON.stringify({ concentration: 'Epidemiology', gpa: '3.81' }),
      'cred-014': JSON.stringify({ major: 'Industrial Engineering', gpa: '3.55' }),
      'cred-015': JSON.stringify({ program: 'Data Analytics MicroMasters', hours: '120 CEUs' }),
    };
    for (const c of credentials) {
      seededCredentialCount += 1;
      const [id, credentialId, type, title, description, holderName, holderId, issuerId, institutionId, status, issuedAt, expiresAt] = c;
      const txHash = `0x${makeHex((c[12] as number) ?? 0)}`;
      const merkle = makeHex((c[13] as number) ?? 0);
      const signature = makeHex((c[14] as number) ?? 0);
      const templateId = c[15] as string | null | undefined;
      const revokedFor = c[16];
      const revokedAt = revokedFor === 'REVOKED' ? iso(200) : null;
      const revokedReason = revokedFor === 'REVOKED' ? 'Assessment results invalidated following a compliance audit.' : null;
      await run(
        `INSERT INTO credentials (id, credential_id, type, title, description, holder_name, holder_id, issuer_id, institution_id,
           status, issued_at, expires_at, revoked_at, revoked_reason, tx_hash, merkle_root, digital_signature, template_id, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, credentialId, type, title, description, holderName, holderId, issuerId, institutionId,
        status, issuedAt, expiresAt ?? null, revokedAt, revokedReason, txHash, merkle, signature, templateId ?? null,
        metadataByCred[id as string] ?? null,
      );
    }

    // ── Blocks (mirrors the mock generator, 22 blocks) ─────────────────
    const validators = ['SecureX Validator 01', 'SecureX Validator 02', 'SecureX Validator 03', 'SecureX Validator 04'];
    let previousHash = '0'.repeat(64);
    const genesisTime = Date.now() - 132 * 60_000;
    for (let height = 1; height <= 22; height++) {
      const hash = makeHex(7000 + height * 13);
      await run(
        `INSERT INTO blocks (height, hash, previous_hash, merkle_root, timestamp, validator, transaction_count, size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        height, hash, previousHash, makeHex(8000 + height * 17),
        new Date(genesisTime + height * 6 * 60_000).toISOString(),
        validators[(height - 1) % 4] as string,
        6 + (height % 8),
        48_000 + ((height * 7919) % 32_000),
      );
      previousHash = hash;
    }

    // ── Transactions (mirrors the mock generator, 34 txs) ──────────────
    const creds = await all<{ id: string; credential_id: string }>('SELECT id, credential_id FROM credentials');
    const txTypes = ['CREDENTIAL_ISSUED', 'CREDENTIAL_VERIFIED', 'CREDENTIAL_REVOKED', 'CREDENTIAL_SUSPENDED', 'INSTITUTION_REGISTERED', 'ISSUER_ADDED', 'BLOCK_CREATED'];
    const froms = Array.from({ length: 6 }, (_, i) => `0x${makeHex(9101 + i, 40)}`);
    const start = Date.now() - 34 * 5.4 * 60_000;
    for (let ti = 0; ti < 34; ti++) {
      const type = txTypes[ti % 7] as string;
      const cred = creds[ti % creds.length];
      await run(
        `INSERT INTO transactions (id, block_height, type, timestamp, from_address, to_address, credential_id, status, gas_used, confirmations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `0x${makeHex(50_000 + ti * 31)}`,
        (ti % 22) + 1,
        type,
        new Date(start + ti * 5.4 * 60_000).toISOString(),
        froms[ti % 6],
        `0x${makeHex(60_000 + ti * 37, 40)}`,
        cred?.credential_id ?? null,
        ti % 17 === 0 ? 'PENDING' : ti % 29 === 0 ? 'FAILED' : 'CONFIRMED',
        21_000 + ((ti * 173) % 90_000),
        ti % 17 === 0 ? 0 : 12 + (ti % 40),
      );
    }

    // ── Risk assessments ───────────────────────────────────────────────
    const riskAssessments: Array<[string, string, string, number, string[], string, string]> = [
      ['risk-001', 'SX-83E1-0FA6-4B92', 'HIGH', 82, ['Anomalous issuance pattern detected', 'Issuer signing key flagged for rotation'], 'ML_ENSEMBLE', iso(0, 2)],
      ['risk-002', 'SX-EF4B-390A-7C58', 'CRITICAL', 95, ['Digital signature mismatch', 'Merkle proof verification failed'], 'SIGNATURE_LOCALITY', iso(0, 3)],
      ['risk-003', 'SX-5A40-9F61-D2B7', 'MEDIUM', 45, ['Credential revoked by issuer'], 'LEDGER_STATE', iso(1, 6)],
      ['risk-004', 'SX-4B8F-C1D6-29A3', 'MEDIUM', 38, ['Credential has exceeded validity period'], 'VALIDITY_SCAN', iso(2, 1)],
    ];
    for (const r of riskAssessments) {
      await run(
        `INSERT INTO risk_assessments (id, credential_id, risk_level, score, flags_json, method, assessed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        r[0], r[1], r[2], r[3], JSON.stringify(r[4]), r[5], r[6],
      );
    }

    // ── Verification history ───────────────────────────────────────────
    const history: Array<Array<string | number | null>> = [
      ['vh-001', 'SX-2F9C-A41B-8D7E', 'Bachelor of Science in Computer Science', iso(0, 3), 'Marcus Johnson', 'VALID', 'QR_CODE', '192.168.40.12'],
      ['vh-002', 'SX-6D29-B8E5-0F4C', 'Master of Business Administration', iso(0, 11), 'Northwind Bank HR', 'VALID', 'MANUAL', '10.2.14.88'],
      ['vh-003', 'SX-F7C3-58E0-1D9A', 'Professional Certificate in Project Management', iso(1, 5), 'Accenture Talent Team', 'SUSPENDED', 'API', null],
      ['vh-004', 'SX-5A40-9F61-D2B7', 'AWS Certified Solutions Architect \u2013 Associate', iso(2, 2), 'Marcus Johnson', 'REVOKED', 'API', '192.168.40.12'],
      ['vh-005', 'SX-83E1-0FA6-4B92', 'AWS Certified Developer \u2013 Associate', iso(3), 'Riverbend Health HR', 'SUSPICIOUS', 'LINK', null],
      ['vh-006', 'SX-9C4E-2D80-5A31', 'Bachelor of Science in Nursing', iso(4, 6), 'Riverbend Health HR', 'VALID', 'QR_CODE', '10.5.70.3'],
    ];
    for (const h of history) {
      await run(
        `INSERT INTO verification_history (id, credential_id, credential_title, verified_at, verified_by, result, method, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7],
      );
    }

    // ── Security alerts ────────────────────────────────────────────────
    const alerts: Array<Array<string | null>> = [
      ['alrt-001', 'CREDENTIAL_TAMPERING', 'CRITICAL', 'Tamper attempt detected on credential', 'A hash mismatch was detected during verification of SX-EF4B-390A-7C58. The digital signature no longer matches the ledger record.', 'SX-EF4B-390A-7C58', 'INVESTIGATING', iso(0, 2), null],
      ['alrt-002', 'FRAUD_ATTEMPT', 'HIGH', 'Suspected synthetic credential submission', 'A credential presented for verification referenced an institution pattern consistent with prior fraud campaigns.', 'verification-engine', 'NEW', iso(0, 5), null],
      ['alrt-003', 'BRUTE_FORCE', 'HIGH', 'Brute force login attempt blocked', 'Twenty-two failed authentication attempts were recorded from a single source IP within ten minutes.', '10.0.4.77', 'ACKNOWLEDGED', iso(1, 3), null],
      ['alrt-004', 'SUSPICIOUS_VERIFICATION', 'MEDIUM', 'Repeated verification attempts flagged', 'The same credential ID was verified eight times from geographically distant locations in under an hour.', 'analytics-service', 'INVESTIGATING', iso(1, 8), null],
      ['alrt-005', 'UNAUTHORIZED_ACCESS', 'CRITICAL', 'Privileged endpoint access without MFA', 'A request reached the admin audit API without a completed multi-factor authentication challenge.', 'edge-gateway-02', 'NEW', iso(0, 9), null],
      ['alrt-006', 'SYSTEM_ANOMALY', 'LOW', 'Validator heartbeat latency spike', 'Validator node 04 reported an above-threshold block propagation latency. Auto-rebalancing engaged.', 'validator-04', 'RESOLVED', iso(2, 4), iso(1, 6)],
    ];
    for (const a of alerts) {
      await run(
        `INSERT INTO security_alerts (id, type, severity, title, description, source, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8],
      );
    }

    // ── Audit events ───────────────────────────────────────────────────
    const auditEvents: Array<Array<string | null>> = [
      ['aud-001', 'CREDENTIAL_ISSUED', 'Sarah Chen', 'INSTITUTION', 'cred-015', 'credential', 'institution=inst-stanford; credential=SX-EF4B-390A-7C58; via web securex issue flow', '10.0.1.24', iso(7, 2)],
      ['aud-002', 'CREDENTIAL_REVOKED', 'Sarah Chen', 'INSTITUTION', 'cred-008', 'credential', 'institution=inst-aws; credential=SX-5A40-9F61-D2B7; reason=compliance audit', '10.0.1.24', iso(200, 4)],
      ['aud-003', 'USER_LOGIN', 'Marcus Johnson', 'EMPLOYER', 'usr-employer-001', 'user', 'device=macOS Chrome; region=us-west', '192.168.40.12', iso(0, 6)],
      ['aud-004', 'INSTITUTION_REGISTERED', 'Alex Morgan', 'ADMIN', 'inst-city', 'institution', 'institution=inst-city; verification documents submitted for review', '10.0.8.10', iso(12, 1)],
      ['aud-005', 'SECURITY_ALERT_ACKNOWLEDGED', 'Jamie Rivers', 'SECURITY_ADMIN', 'alrt-003', 'alert', 'source=10.0.4.77; rate limiting applied', '10.0.8.22', iso(1, 2)],
      ['aud-006', 'SYSTEM_CONFIG_CHANGE', 'Taylor Brooks', 'NETWORK_ADMIN', 'validator-04', 'node', 'block propagation timeout updated to 4.2s', '10.0.8.33', iso(1, 9)],
      ['aud-007', 'CREDENTIAL_VERIFIED', 'Verification Engine', 'EMPLOYER', 'cred-001', 'credential', 'institution=inst-stanford; credential=SX-2F9C-A41B-8D7E; method=QR_CODE', '192.168.40.12', iso(0, 3)],
      ['aud-008', 'ISSUER_STATUS_CHANGED', 'Alex Morgan', 'ADMIN', 'iss-gca', 'issuer', 'institution=inst-gca; status transitioned ACTIVE\u2192SUSPENDED after fraud review', '10.0.8.10', iso(30, 5)],
      ['aud-009', 'CREDENTIAL_ISSUED', 'Certification Office', 'INSTITUTION', 'cred-005', 'credential', 'institution=inst-ancc; credential=SX-3A17-B9F2-6D48; renewal issuance', '10.0.1.90', iso(650, 2)],
    ];
    for (const e of auditEvents) {
      await run(
        `INSERT INTO audit_events (id, action, actor, actor_role, target, target_type, details, ip_address, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8],
      );
    }

    // ── Demo sessions (render the Security Center active-sessions card) ─
    const demoSessionData: Array<Array<string | number>> = [
      ['sess-001', 'usr-admin-001', iso(0, 2), '10.0.8.10', 'macOS Chrome 128', 'San Francisco, CA'],
      ['sess-002', 'usr-security-001', iso(0, 5), '10.0.8.22', 'Windows Edge 128', 'New York, NY'],
      ['sess-003', 'usr-network-001', iso(1), '10.0.8.33', 'Linux Firefox 130', 'Austin, TX'],
    ];
    for (const s of demoSessionData) {
      await run(
        `INSERT INTO sessions (jti, user_id, issued_at, expires_at, revoked, ip_address, device, location) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
        s[0], s[1], s[2], futureIso(1), s[3], s[4], s[5],
      );
    }

    await run("INSERT INTO schema_meta (key, value) VALUES ('seeded', ?)", new Date().toISOString());
  });

  logger.info('db.seeded', { users: seededUserCount, credentials: seededCredentialCount });
}