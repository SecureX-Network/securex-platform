import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MerkleProofViewer } from '../components/MerkleProofViewer';
import { buildAttackEvidence } from '../data/evidence';
import type { MerkleProof } from '../types';

describe('MerkleProofViewer', () => {
  it('renders a valid proof path with leaf, siblings and root', () => {
    const evidence = buildAttackEvidence('sim-view-1', 'INVALID_MERKLE_PROOF', 21, 'tx-aaa');
    render(<MerkleProofViewer proof={evidence.merkleProof} />);

    expect(screen.getByText('Merkle proof path')).toBeInTheDocument();
    expect(screen.getByText('Leaf')).toBeInTheDocument();
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getAllByText(/Invalid/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Proof does not combine to the recorded Merkle root/)).toBeInTheDocument();
  });

  it('renders VALID verification status for a conforming proof', () => {
    const evidence = buildAttackEvidence('sim-view-2', 'FORGED_SIGNATURE', 18, 'tx-bbb');
    render(<MerkleProofViewer proof={evidence.merkleProof} />);
    expect(screen.getAllByText('Valid').length).toBeGreaterThan(0);
  });

  it('shows the demo leaf hash on the leaf node', () => {
    const proof: MerkleProof = {
      leafHash: '0xabc123',
      rootHash: '0xdef456',
      path: [
        { hash: '0xabc123', position: 'leaf' },
        { hash: '0xfab111', position: 'intermediate', direction: 'right' },
        { hash: '0xdef456', position: 'root' },
      ],
      verificationStatus: 'VALID',
      detail: 'Proof combines to the recorded root.',
    };
    render(<MerkleProofViewer proof={proof} />);
    expect(screen.getByText('0xabc123')).toBeInTheDocument();
    expect(screen.getByText('0xdef456')).toBeInTheDocument();
  });
});