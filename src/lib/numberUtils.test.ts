import { describe, expect, it } from 'vitest';
import { parseLocaleDecimal } from './numberUtils';

describe('parseLocaleDecimal', () => {
  it('parses comma decimals', () => {
    expect(parseLocaleDecimal('12,5')).toBe(12.5);
  });

  it('parses dot decimals', () => {
    expect(parseLocaleDecimal('12.5')).toBe(12.5);
  });

  it('returns null for invalid values', () => {
    expect(parseLocaleDecimal('abc')).toBeNull();
    expect(parseLocaleDecimal('')).toBeNull();
  });
});

