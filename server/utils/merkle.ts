/**
 * True when `value` is a hex Merkle root the SecureX chain can legitimately
 * produce.
 *
 * Roots are not uniformly 64 hex characters. `BlockValidator.computeMerkleRoot`
 * seeds the tree with `tx.id` for block version 1 and with `sha256(tx)` for
 * version 2 and later, and `MerkleTree.getRoot` returns the sole leaf unchanged
 * when the tree has only one. A version-1 block holding a single transaction
 * therefore roots to that transaction id: 32 hex characters. Any block with
 * more than one transaction, and any version-2+ block, goes through
 * `MerkleTree.combine` and is 64 hex. The empty-tree placeholder is 64 zeros.
 *
 * Rejecting the 32-character width treats a correctly committed anchor as
 * unconfirmed, so both widths have to be accepted. This check is a sanity test
 * on the shape of a chain response, not a security gate: `verified` already
 * means the chain recomputed the inclusion proof against this exact root.
 */
export function isMerkleRoot(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{32}$|^[0-9a-f]{64}$/.test(value);
}
