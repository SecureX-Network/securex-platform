import { Router, Request, Response } from 'express';
import { all, get } from '../db/database.js';
import { mapBlockRow, mapTransactionRow, type BlockRow, type TransactionRow } from '../db/mappers.js';
import { fail, ok, paginated, param } from '../utils/http.js';

export const explorersRouter = Router();

explorersRouter.get('/blocks', (req: Request, res: Response) => {
  void blocksHandler(req, res);
});

async function blocksHandler(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  const total = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM blocks'))?.n ?? 0;
  const rows = await all<BlockRow>(
    'SELECT * FROM blocks ORDER BY height DESC LIMIT ? OFFSET ?',
    pageSize,
    offset,
  );
  ok(res, paginated(rows.map(mapBlockRow), total, page, pageSize));
}

explorersRouter.get('/blocks/:height', (req: Request, res: Response) => {
  void blockHandler(req, res);
});

async function blockHandler(req: Request, res: Response): Promise<void> {
  const height = Number(param(req, 'height'));
  if (!Number.isInteger(height) || height <= 0) {
    fail(res, 400, 'INVALID_HEIGHT', 'Block height must be a positive integer.');
    return;
  }
  const row = await get<BlockRow>('SELECT * FROM blocks WHERE height = ?', height);
  if (!row) {
    fail(res, 404, 'BLOCK_NOT_FOUND', `Block at height ${height} not found.`);
    return;
  }
  ok(res, mapBlockRow(row));
}

explorersRouter.get('/transactions', (req: Request, res: Response) => {
  void transactionsHandler(req, res);
});

async function transactionsHandler(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 12));
  const offset = (page - 1) * pageSize;
  const total = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))?.n ?? 0;
  const rows = await all<TransactionRow>(
    'SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ? OFFSET ?',
    pageSize,
    offset,
  );
  ok(res, paginated(rows.map(mapTransactionRow), total, page, pageSize));
}

explorersRouter.get('/transactions/:id', (req: Request, res: Response) => {
  void transactionHandler(req, res);
});

async function transactionHandler(req: Request, res: Response): Promise<void> {
  const row = await get<TransactionRow>('SELECT * FROM transactions WHERE id = ?', param(req, 'id'));
  if (!row) {
    fail(res, 404, 'TRANSACTION_NOT_FOUND', `Transaction ${param(req, 'id')} not found.`);
    return;
  }
  ok(res, mapTransactionRow(row));
}

explorersRouter.get('/network/stats', (_req: Request, res: Response) => {
  void networkStatsHandler(res);
});

async function networkStatsHandler(res: Response): Promise<void> {
  const totalBlocks = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM blocks'))?.n ?? 0;
  const totalTransactions = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))?.n ?? 0;
  const totalCredentials = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM credentials'))?.n ?? 0;
  const totalInstitutions = (await get<{ n: number }>('SELECT COUNT(*) AS n FROM institutions'))?.n ?? 0;
  const last = await get<BlockRow>('SELECT * FROM blocks ORDER BY height DESC LIMIT 1');
  ok(res, {
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
}