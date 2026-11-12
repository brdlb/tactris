import { secondsToDhms } from './timeUtils';
import { describe, expect, it } from 'vitest';

describe('secondsToDhms', () => {
  it.each([
    [0, '00:00:00:00'],
    [1, '00:00:00:01'],
    [60, '00:00:01:00'],
    [3600, '00:01:00:00'],
    [86400, '01:00:00:00'],
    [90061, '01:01:01:01'],
    [123456, '01:10:17:36'],
    [null, '00:00:00:00'],
    [undefined, '00:00:00:00'],
  ])('formats %s as %s', (input, expected) => {
    expect(secondsToDhms(input)).toBe(expected);
  });
});
