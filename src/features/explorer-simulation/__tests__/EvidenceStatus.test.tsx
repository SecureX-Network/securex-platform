import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvidenceStatus } from '../components/EvidenceStatus';

describe('EvidenceStatus', () => {
  it('renders a VALID status badge labelled "Valid"', () => {
    render(<EvidenceStatus status="VALID" />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('renders a REJECTED status badge labelled "Rejected"', () => {
    render(<EvidenceStatus status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders a DETECTED status badge labelled "Detected"', () => {
    render(<EvidenceStatus status="DETECTED" />);
    expect(screen.getByText('Detected')).toBeInTheDocument();
  });

  it('renders a BLOCKED status badge labelled "Blocked"', () => {
    render(<EvidenceStatus status="BLOCKED" />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('renders an INVALID status badge labelled "Invalid"', () => {
    render(<EvidenceStatus status="INVALID" />);
    expect(screen.getByText('Invalid')).toBeInTheDocument();
  });
});