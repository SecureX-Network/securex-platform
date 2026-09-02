import { describe, it, expect } from 'vitest';
import {
  classNames,
  formatDate,
  generateId,
  getStatusColor,
  getStatusLabel,
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

describe('getStatusColor', () => {
  it('returns valid tailwind classes for known statuses', () => {
    expect(getStatusColor('VALID')).toContain('bg-green-100');
    expect(getStatusColor('REVOKED')).toContain('bg-red-100');
    expect(getStatusColor('SUSPENDED')).toContain('bg-amber-100');
    expect(getStatusColor('EXPIRED')).toContain('bg-gray-100');
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
