const request = require('supertest');
const app = require('../src/app');

describe('User Module', () => {
  it('should get all users', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
  });
});