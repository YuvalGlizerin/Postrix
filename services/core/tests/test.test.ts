import supertest from 'supertest';
import core from '../src/index'; // Replace './index' with the actual path to your Cloud Function file

// Since myFunction is an Express app, we can use it directly with supertest
const request = supertest(core);

describe('GET /', () => {
  it('responds with Hello World!', async () => {
    const response = await request.get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello World!');
  });
});

afterAll(done => {
  core.close();
  done();
});