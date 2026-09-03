import { describe, it, expect } from 'vitest';
import {
  classNames,
  formatDate,
  generateId,
  getInstitutionStatusBadgeVariant,
  getIssuerStatusBadgeVariant,
  getStatusBadgeVariant,
  getStatusBgTextClass,
  getStatusLabel,
  getStatusTextClass,
  truncateHash,
} from '@/utils';

describe('formatDate', () => {
  it('returns correct format', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatDate(date);
    expect(result).toBe('Jan 15, 2024');
  });

  it('handles invalid input gracefully', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('truncateHash', () => {
  it('truncates long strings correctly', () => {
    const hash = '0x1234567890abcdef1234';
    expect(truncateHash(hash)).toBe('0x12345678…ef1234');
  });

  it('returns original when short enough', () => {
    expect(truncateHash('short')).toBe('short');
  });

  it('handles empty input', () => {
    expect(truncateHash(undefined)).toBe('—');
  });
});

describe('getStatusBadgeVariant', () => {
  it('returns the correct badge variant for known statuses', () => {
    expect(getStatusBadgeVariant('VALID')).toBe('success');
    expect(getStatusBadgeVariant('REVOKED')).toBe('danger');
    expect(getStatusBadgeVariant('SUSPENDED')).toBe('warning');
    expect(getStatusBadgeVariant('EXPIRED')).toBe('default');
    expect(getStatusBadgeVariant('NOT_FOUND')).toBe('default');
  });
});

describe('getStatusTextClass', () => {
  it('returns a color class for a known status', () => {
    expect(getStatusTextClass('VALID')).toContain('trust');
    expect(getStatusTextClass('REVOKED')).toContain('danger');
    expect(getStatusTextClass('SUSPENDED')).toContain('warning');
  });
});

describe('getStatusBgTextClass', () => {
  it('returns a bg + text class for a known status', () => {
    expect(getStatusBgTextClass('VALID')).toContain('trust');
    expect(getStatusBgTextClass('REVOKED')).toContain('danger');
    expect(getStatusBgTextClass('SUSPENDED')).toContain('warning');
  });
});

describe('getStatusLabel', () => {
  it('returns correct labels', () => {
    expect(getStatusLabel('VALID')).toBe('Valid');
    expect(getStatusLabel('REVOKED')).toBe('Revoked');
    expect(getStatusLabel('SUSPENDED')).toBe('Suspended');
    expect(getStatusLabel('EXPIRED')).toBe('Expired');
    expect(getStatusLabel('NOT_FOUND')).toBe('Not Found');
  });
});

describe('getIssuerStatusBadgeVariant', () => {
  it('returns the correct badge variant for issuer statuses', () => {
    expect(getIssuerStatusBadgeVariant('ACTIVE')).toBe('success');
    expect(getIssuerStatusBadgeVariant('REVOKED')).toBe('danger');
    expect(getIssuerStatusBadgeVariant('SUSPENDED')).toBe('warning');
  });
});

describe('getInstitutionStatusBadgeVariant', () => {
  it('returns the correct badge variant for institution statuses', () => {
    expect(getInstitutionStatusBadgeVariant('ACTIVE')).toBe('success');
    expect(getInstitutionStatusBadgeVariant('SUSPENDED')).toBe('danger');
    expect(getInstitutionStatusBadgeVariant('PENDING')).toBe('warning');
  });
});

describe('classNames', () => {
  it('joins classes correctly and filters falsy values', () => {
    expect(
      classNames('a', 'b', false, null, undefined, '', 'c'),
    ).toBe('a b c');
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('prepends the provided prefix', () => {
    expect(generateId('user')).toMatch(/^user-/);
  });

  it('generates unique ids', () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });
});
