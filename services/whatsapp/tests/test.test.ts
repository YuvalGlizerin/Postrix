import supertest from 'supertest';
import whatsapp from 'whatsapp-utils';

import whatsappService from '../src/index.js';

// Since myFunction is an Express app, we can use it directly with supertest
const request = supertest(whatsappService);

jest.mock('whatsapp', () => ({
  verifyToken: jest.fn()
}));

// Test the / endpoint
describe('GET /', () => {
  it('responds with HTML containing welcome message', async () => {
    const response = await request.get('/');
    expect(response.text).toContain('Capish');
    expect(response.text).toContain('הצטרפו לפלטפורמה המובילה בישראל להוספת כתוביות לסרטונים');
    expect(response.headers['content-type']).toContain('text/html');
  });
});

describe('GET /privacy-policy', () => {
  it('responds with privacy policy HTML', async () => {
    const response = await request.get('/privacy-policy');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Privacy Policy');
    expect(response.text).toContain('Last updated');
    expect(response.headers['content-type']).toContain('text/html');
  });
});

describe('GET /webhook', () => {
  it('responds with success status', async () => {
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
  whatsappService.close();
  done();
});
