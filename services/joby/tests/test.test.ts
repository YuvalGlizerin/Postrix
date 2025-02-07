import supertest from 'supertest';

import joby from '../src/index'; // Replace './index' with the actual path to your Cloud Function file

// Since myFunction is an Express app, we can use it directly with supertest
const request = supertest(joby);

// Test the / endpoint
describe('GET /', () => {
  it('responds with "Full CI/CD running on"', async () => {
    const response = await request.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Full CI/CD running on');
  });
});

// Close the server after all tests
afterAll(done => {
  joby.close();
  done();
});
