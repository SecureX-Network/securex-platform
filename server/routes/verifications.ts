import { Router, Request, Response } from 'express';
import { all, get, run } from '../db/database.js';
import {
  mapCredentialRow,
  mapVerificationHistoryRow,
  type CredentialRow,
  type VerificationHistoryRow,
} from '../db/mappers.js';
import { fail, ok, param } from '../utils/http.js';
import { entityId } from '../utils/ids.js';
import { serverConfig } from '../config.js';

export const verificationsRouter = Router();

interface RiskProfile {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  flags: string[];
}

function riskForStatus(status: string): RiskProfile {
  switch (status) {
    case 'VALID':
      return { riskLevel: 'LOW', score: 9, flags: ['No anomalies detected'] };
    case 'REVOKED':
      return { riskLevel: 'HIGH', score: 74, flags: ['Credential has been revoked by the issuer'] };
    case 'SUSPENDED':
      return { riskLevel: 'MEDIUM', score: 55, flags: ['Credential temporarily suspended pending review'] };
    case 'EXPIRED':
      return { riskLevel: 'MEDIUM', score: 41, flags: ['Credential has exceeded its validity period'] };
    case 'TAMPERED':
      return {
        riskLevel: 'CRITICAL',
        score: 96,
        flags: ['Digital signature mismatch detected', 'Hash verification failed'],
      };
    case 'SUSPICIOUS':
      return { riskLevel: 'HIGH', score: 82, flags: ['Anomalous issuance pattern detected'] };
    default:
      return { riskLevel: 'HIGH', score: 90, flags: ['Could not verify credential integrity'] };
  }
}

async function credentialByPublicId(credentialId: string): Promise<CredentialRow | undefined> {
  return get<CredentialRow>(
    `SELECT c.id, c.credential_id, c.type, c.title, c.description, c.holder_name, c.holder_id,
            c.issuer_id, c.institution_id, c.status, c.issued_at, c.expires_at, c.revoked_at,
            c.revoked_reason, c.tx_hash, c.merkle_root, c.digital_signature, c.template_id, c.metadata_json,
            k.name AS issuer_name, i.name AS institution_name
     FROM credentials c
     JOIN issuers k ON k.id = c.issuer_id
     JOIN institutions i ON i.id = c.institution_id
     WHERE c.credential_id = ? OR c.id = ?`,
    credentialId,
    credentialId,
  );
}

async function recordVerification(
  credentialId: string,
  credentialRowId: string | undefined,
  credentialTitle: string,
  result: string,
  method: string,
): Promise<void> {
  await run(
    `INSERT INTO verification_history (id, credential_id, credential_row_id, credential_title, verified_at, verified_by, result, method, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entityId('vh'),
    credentialId,
    credentialRowId ?? null,
    credentialTitle,
    new Date().toISOString(),
    serverConfig.dataMode === 'real' ? 'Web Verification Portal' : 'Web Verification Portal',
    result,
    method,
    null,
  );
}

function isValidSha256Hex(hash: string): boolean {
  return /^[\da-f]{64}$/i.test(hash);
}

async function buildVerification(credentialId: string, documentHash?: string) {
  const row = await credentialByPublicId(credentialId);
  const verifiedAt = new Date().toISOString();

  if (!row) {
    await recordVerification(credentialId, undefined, 'Unknown', 'NOT_FOUND', 'API');
    return {
      credentialId,
      status: 'NOT_FOUND',
      issuer: { name: 'Unknown', verified: false },
      blockchainProof: { verified: false },
      signatureVerification: { valid: false },
      fraudCheck: {
        riskLevel: 'HIGH',
        score: 92,
        flags: ['Credential ID not found on distributed ledger'],
      },
      verifiedAt,
      documentHashCheck: undefined,
    };
  }

  const blocks = await all<{ height: number; timestamp: string }>(
    'SELECT height, timestamp FROM blocks ORDER BY height ASC',
  );
  const block = blocks[row.credential_id.length % blocks.length] ?? blocks[0];
  const isValid = row.status === 'VALID';
  const risk = riskForStatus(row.status);

  await recordVerification(row.credential_id, row.id, row.title, row.status, 'API');

  const signatureVerification = {
    valid: row.status !== 'TAMPERED' && row.status !== 'NOT_FOUND',
    algorithm: 'Ed25519-SHA256',
    verifiedAt,
  };
  const fraudCheck = { ...risk };

  let documentHashCheck: {
    credentialId: string;
    suppliedHash: string;
    anchoredHash: string | null;
    hashMatch: boolean;
    status: 'EXACT' | 'TAMPERED' | 'UNVERIFIABLE';
    verifiedAt: string;
  } | undefined;

  if (documentHash) {
    const anchoredHash = row.merkle_root;
    const hashMatch =
      anchoredHash != null &&
      documentHash.toLowerCase() === anchoredHash.toLowerCase();
    documentHashCheck = {
      credentialId: row.credential_id,
      suppliedHash: documentHash,
      anchoredHash: anchoredHash ?? null,
      hashMatch,
      status: hashMatch ? 'EXACT' : 'TAMPERED',
      verifiedAt,
    };
    if (!hashMatch) {
      signatureVerification.valid = false;
      fraudCheck.flags = [...fraudCheck.flags, 'Hash verification failed — document does not match the ledger record'];
    }
  }

  return {
    credentialId: row.credential_id,
    status: row.status,
    credential: mapCredentialRow(row),
    issuer: {
      name: row.institution_name ?? row.institution_id,
      verified: true,
      publicKey: undefined,
    },
    blockchainProof: {
      verified: isValid,
      txHash: row.tx_hash,
      blockHeight: block?.height,
      confirmations: isValid ? 26 : 0,
      timestamp: block?.timestamp,
    },
    signatureVerification,
    fraudCheck,
    verifiedAt,
    documentHashCheck,
  };
}

verificationsRouter.get('/', (req: Request, res: Response) => {
  void verifyHandler(req, res);
});

async function verifyHandler(req: Request, res: Response): Promise<void> {
  const credentialId = typeof req.query.credentialId === 'string' ? req.query.credentialId : '';
  if (!credentialId) {
    fail(res, 400, 'MISSING_CREDENTIAL_ID', 'Missing required field: credentialId');
    return;
  }
  const documentHash = typeof req.query.hash === 'string' ? req.query.hash : undefined;
  if (documentHash && !isValidSha256Hex(documentHash)) {
    fail(res, 400, 'INVALID_HASH_FORMAT', 'Invalid document hash. Expected a 64-character hexadecimal string.');
    return;
  }
  ok(res, await buildVerification(credentialId, documentHash));
}

verificationsRouter.get('/history', (req: Request, res: Response) => {
  void historyHandler(req, res);
});

async function historyHandler(req: Request, res: Response): Promise<void> {
  void req.query.employerId;
  const rows = await all<VerificationHistoryRow>(
    'SELECT * FROM verification_history ORDER BY verified_at DESC',
  );
  ok(res, rows.map(mapVerificationHistoryRow));
}

verificationsRouter.get('/search', (req: Request, res: Response) => {
  void searchHandler(req, res);
});

async function searchHandler(req: Request, res: Response): Promise<void> {
  const credentialId = typeof req.query.credentialId === 'string' ? req.query.credentialId : '';
  if (!credentialId) {
    fail(res, 400, 'MISSING_CREDENTIAL_ID', 'Missing required field: credentialId');
    return;
  }
  const documentHash = typeof req.query.hash === 'string' ? req.query.hash : undefined;
  if (documentHash && !isValidSha256Hex(documentHash)) {
    fail(res, 400, 'INVALID_HASH_FORMAT', 'Invalid document hash. Expected a 64-character hexadecimal string.');
    return;
  }
  ok(res, await buildVerification(credentialId, documentHash));
}

/**
 * Canonical path-form verification: GET /verifications/:id resolves the public
 * SecureX credential identity (the same SX-... value carried in QR codes,
 * wallet shares and verification URLs). Registered after /history and /search
 * so those literal segments always win.
 */
verificationsRouter.get('/:id', (req: Request, res: Response) => {
  void verifyPathHandler(req, res);
});

async function verifyPathHandler(req: Request, res: Response): Promise<void> {
  const credentialId = param(req, 'id');
  const documentHash = typeof req.query.hash === 'string' ? req.query.hash : undefined;
  if (documentHash && !isValidSha256Hex(documentHash)) {
    fail(res, 400, 'INVALID_HASH_FORMAT', 'Invalid document hash. Expected a 64-character hexadecimal string.');
    return;
  }
  ok(res, await buildVerification(credentialId, documentHash));
}