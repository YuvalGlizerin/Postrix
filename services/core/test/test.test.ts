// test/helloWorld.test.ts
import * as request from 'supertest';
import { app } from '../src/app'; // Adjust the import according to your project structure

describe('GET /helloWorld', () => {
  it('responds with "Hello, World 1722"', async () => {
    const response = await request(app).get('/helloWorld');
    expect(response.text).toEqual('Hello, World 1722');
    expect(response.statusCode).toBe(200);
  });
});
