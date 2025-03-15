import supertest from 'supertest';

import joby from '../src/index.js';

// Since myFunction is an Express app, we can use it directly with supertest
const request = supertest(joby);

// Test the / endpoint
describe('GET /', () => {
  it('Cannon service running on"', async () => {
    const response = await request.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Cannon service running on');
  });
});

describe('GET /health', () => {
  it('responds with success status', async () => {
    const response = await request.get('/health');
    expect(response.status).toBe(200);
  });
});

// Close the server after all tests
afterAll(done => {
  joby.close();
  done();
});
