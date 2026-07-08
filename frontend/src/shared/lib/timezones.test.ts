import { describe, expect, it } from 'vitest';

import { formatTimezoneUtcOffset } from './timezones';

describe('formatTimezoneUtcOffset', () => {
  const winterDate = new Date('2026-01-15T12:00:00.000Z');

  it('formats positive and negative whole-hour offsets', () => {
    expect(formatTimezoneUtcOffset('Asia/Omsk', winterDate)).toBe('(+6)');
    expect(formatTimezoneUtcOffset('Atlantic/Cape_Verde', winterDate)).toBe('(-1)');
  });

  it('formats UTC without a negative zero', () => {
    expect(formatTimezoneUtcOffset('UTC', winterDate)).toBe('(+0)');
  });
});
