import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import supertest from 'supertest';

import cannon from '../src/index.ts';

// // Since myFunction is an Express app, we can use it directly with supertest
const request = supertest(cannon);

// Test the / endpoint
describe('GET /', () => {
  it('Cannon service running on"', async () => {
    const response = await request.get('/');
    assert.equal(response.status, 200);
    assert.match(response.text, /Cannon service running on/);
  });
});

// test('synchronous failing test', t => {
//   // This test fails because it throws an exception.
//   assert.strictEqual(1, 2);
// });

describe('GET /health', () => {
  it('responds with success status', async () => {
    const response = await request.get('/health');
    assert.equal(response.status, 200);
  });
});

// Make sure to add this at the end of your test file
test.after(async () => {
  // Close the server to prevent the process from hanging
  if (cannon && typeof cannon.close === 'function') {
    await new Promise<void>(resolve => {
      cannon.close(() => resolve());
    });
  }
});

// // Close the server after all tests
// afterAll(done => {
//   cannon.close();
//   done();
// });
