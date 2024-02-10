// test/helloWorld.test.ts
import { sum } from '../src';

describe('GET /helloWorld', () => {
  it('responds with "Hello, World 1722"', async () => {
    expect(sum(1, 2)).toBe(3);
  });
});
