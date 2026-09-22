import request from 'supertest';
import app from '../server';

/**
 * Authentication endpoints.
 *
 * Password login and self-registration were retired in favour of Clerk plus
 * the invite system. These tests previously asserted the old behaviour and had
 * been failing to run at all — the suite could not parse, so nobody saw it.
 * They now pin what the endpoints actually do, including that the retired ones
 * stay retired.
 */

describe('Auth endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('rejects a request with no fields', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });

    it('rejects a malformed email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: '123456',
      });
      expect(res.status).toBe(400);
    });

    it('answers 410 for a well-formed password login', async () => {
      // Gone, not unauthorised: the endpoint exists and is deliberately
      // retired, and 401 would suggest the credentials were merely wrong.
      const res = await request(app).post('/api/auth/login').send({
        email: 'alguem@exemplo.pt',
        password: 'umapasswordqualquer',
      });
      expect(res.status).toBe(410);
      expect(res.body.error).toMatch(/no longer supported/i);
    });
  });

  describe('retired endpoints', () => {
    it('no longer exposes self-registration', async () => {
      // Accounts arrive through an invite, so there is no route at all.
      const res = await request(app).post('/api/auth/register').send({
        name: 'Alguém',
        email: 'alguem@exemplo.pt',
        password: '123456',
      });
      expect(res.status).toBe(404);
    });

    it('answers 410 for the old Google endpoint', async () => {
      const res = await request(app).post('/api/auth/google').send({ token: 'x' });
      expect(res.status).toBe(410);
    });
  });

  describe('GET /api/auth/me', () => {
    it('refuses without a session', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('refuses a bogus token rather than accepting it', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer nao-e-um-token');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('does not reveal whether an address is registered', async () => {
      // Answering differently for a known and an unknown address turns the
      // endpoint into a way to enumerate accounts.
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ninguem-com-esta-conta@exemplo.pt' });
      expect([200, 202]).toContain(res.status);
    });
  });
});
