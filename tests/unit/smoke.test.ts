import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('test pipeline is working', () => {
    expect(1 + 1).toBe(2);
  });

  it('environment provides crypto.randomUUID', () => {
    const id = crypto.randomUUID();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
