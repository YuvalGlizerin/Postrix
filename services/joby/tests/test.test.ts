import supertest from 'supertest';
import whatsapp from 'whatsapp';

import joby from '../src/index.js';

// Since myFunction is an Express app, we can use it directly with supertest
const request = supertest(joby);

jest.mock('whatsapp', () => ({
  verifyToken: jest.fn()
}));

// Test the / endpoint
describe('GET /', () => {
  it('Responds with "Full CI/CD running on"', async () => {
    const response = await request.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Full CI/CD running on');
  });
});

describe('GET /webhook', () => {
  it('Responds with success status', async () => {
    // Mock the verifyToken implementation to resolve immediately
    (whatsapp.verifyToken as jest.Mock).mockImplementation((req, res) => {
      res.sendStatus(200);
    });

    const response = await request.get('/webhook');

    expect(response.status).toBe(200);
    expect(whatsapp.verifyToken).toHaveBeenCalledWith(
      expect.any(Object), // request object
      expect.any(Object), // response object
      'VERIFY_TOKEN'
    );
  });
});

// Close the server after all tests
afterAll(done => {
  joby.close();
  done();
});
