import { Router, Request, Response } from 'express';
import { all, get } from '../db/database.js';
import { mapBlockRow, mapTransactionRow, type BlockRow, type TransactionRow } from '../db/mappers.js';
import { fail, ok, paginated, param } from '../utils/http.js';

export const explorersRouter = Router();

explorersRouter.get('/blocks', (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  const total = get<{ n: number }>('SELECT COUNT(*) AS n FROM blocks')?.n ?? 0;
  const rows = all<BlockRow>(
    'SELECT * FROM blocks ORDER BY height DESC LIMIT ? OFFSET ?',
    pageSize,
    offset,
  );
  return ok(res, paginated(rows.map(mapBlockRow), total, page, pageSize));
});

explorersRouter.get('/blocks/:height', (req: Request, res: Response) => {
  const height = Number(param(req, 'height'));
  if (!Number.isInteger(height) || height <= 0) {
    return fail(res, 400, 'INVALID_HEIGHT', 'Block height must be a positive integer.');
  }
  const row = get<BlockRow>('SELECT * FROM blocks WHERE height = ?', height);
  if (!row) {
    return fail(res, 404, 'BLOCK_NOT_FOUND', `Block at height ${height} not found.`);
  }
  return ok(res, mapBlockRow(row));
});

explorersRouter.get('/transactions', (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 12));
  const offset = (page - 1) * pageSize;
  const total = get<{ n: number }>('SELECT COUNT(*) AS n FROM transactions')?.n ?? 0;
  const rows = all<TransactionRow>(
    'SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ? OFFSET ?',
    pageSize,
    offset,
  );
  return ok(res, paginated(rows.map(mapTransactionRow), total, page, pageSize));
});

explorersRouter.get('/transactions/:id', (req: Request, res: Response) => {
  const row = get<TransactionRow>('SELECT * FROM transactions WHERE id = ?', param(req, 'id'));
  if (!row) {
    return fail(res, 404, 'TRANSACTION_NOT_FOUND', `Transaction ${param(req, 'id')} not found.`);
  }
  return ok(res, mapTransactionRow(row));
});

explorersRouter.get('/network/stats', (_req: Request, res: Response) => {
  const totalBlocks = get<{ n: number }>('SELECT COUNT(*) AS n FROM blocks')?.n ?? 0;
  const totalTransactions = get<{ n: number }>('SELECT COUNT(*) AS n FROM transactions')?.n ?? 0;
  const totalCredentials = get<{ n: number }>('SELECT COUNT(*) AS n FROM credentials')?.n ?? 0;
  const totalInstitutions = get<{ n: number }>('SELECT COUNT(*) AS n FROM institutions')?.n ?? 0;
  const last = get<BlockRow>('SELECT * FROM blocks ORDER BY height DESC LIMIT 1');
  return ok(res, {
    chainId: 'securex-mainnet-01',
    networkName: 'SecureX Trust Network',
    totalBlocks,
    totalTransactions,
    totalCredentials,
    totalInstitutions,
    nodesOnline: 42,
    totalNodes: 47,
    avgBlockTime: 4.2,
    tps: 128,
    networkStatus: 'HEALTHY',
    lastBlockHeight: last?.height ?? 0,
  });
});