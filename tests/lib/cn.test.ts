import { describe, expect, it } from 'vitest';
import { cn } from '../../src/lib/cn';

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toContain('foo');
    expect(result).not.toContain('bar');
    expect(result).toContain('baz');
  });

  it('handles arrays', () => {
    const result = cn(['foo', 'bar']);
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles objects', () => {
    const result = cn({ foo: true, bar: false });
    expect(result).toContain('foo');
    expect(result).not.toContain('bar');
  });

  it('merges tailwind classes correctly', () => {
    // twMerge should handle conflicting tailwind classes
    const result = cn('px-2 px-4');
    // The last class should win
    expect(result).toMatch(/px-4/);
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles undefined and null', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });
});
