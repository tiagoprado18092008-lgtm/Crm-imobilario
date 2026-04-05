import request from 'supertest';
import app from '../server';

describe('API protection', () => {
  it('GET /api/contacts should return 401 without token', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(401);
  });

  it('GET /api/opportunities should return 401 without token', async () => {
    const res = await request(app).get('/api/opportunities');
    expect(res.status).toBe(401);
  });

  it('GET /api/tasks should return 401 without token', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('GET /api/users should return 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('GET /api/conversations should return 401 without token', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  it('POST /api/contacts should return 401 without token', async () => {
    const res = await request(app).post('/api/contacts').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('GET /api/search should return 401 without token', async () => {
    const res = await request(app).get('/api/search?q=test');
    expect(res.status).toBe(401);
  });

  it('POST /api/invitations should return 401 without token', async () => {
    const res = await request(app).post('/api/invitations').send({ email: 'a@b.com' });
    expect(res.status).toBe(401);
  });
});

describe('Validation', () => {
  it('POST /api/auth/login with invalid data returns validation errors', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('details');
  });
});

describe('404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});

describe('Webhooks', () => {
  it('GET /webhook/whatsapp without valid token returns 403', async () => {
    const res = await request(app).get('/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test');
    expect(res.status).toBe(403);
  });
});
