import request from 'supertest';
import app from '../server';

describe('Auth endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: '123456',
      });
      expect(res.status).toBe(400);
    });

    it('should return 401 for wrong credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing name', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@test.com',
        password: '123456',
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@test.com',
        password: '123',
      });
      expect(res.status).toBe(400);
    });
  });
});
