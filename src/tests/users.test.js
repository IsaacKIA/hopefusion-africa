import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery, redisMockStore } from '../config/db.js';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('Users Integration Tests', () => {
  let token;
  const userId = '11111111-2222-3333-4444-555555555555';

  beforeEach(() => {
    mockDbReset();
    token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);
  });

  afterAll((done) => {
    const io = app.get('io');
    if (io) {
      io.close();
    }
    if (httpServer.listening) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  describe('GET /api/v1/users/me', () => {
    it('should successfully retrieve current logged in user and cache the result', async () => {
      // 1. Mock DB query retrieving user profile with startup conditional joins
      mockDbExpectQuery('SELECT u.*', [{
        id: userId,
        email: 'test@hopefusion.com',
        role: 'startup',
        first_name: 'Isaac',
        last_name: 'KIA',
        password_hash: 'secret-hash-that-should-be-deleted',
        startup_profile: { id: 'startup-id-123', name: 'My Startup' },
        investor_profile: null,
        mentor_profile: null
      }]);

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.password_hash).toBeUndefined(); // Security verify: strips sensitive fields
      expect(res.body.data.startup_profile.name).toBe('My Startup');

      // Verify that profile is cached in Redis
      const cached = redisMockStore[`user:${userId}`];
      expect(cached).toBeDefined();
      expect(JSON.parse(cached).email).toBe('test@hopefusion.com');
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should return 401 on invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should successfully update user profile and invalidate cache', async () => {
      mockDbExpectQuery('UPDATE users SET', []);

      // Pre-populate cache to test invalidation
      redisMockStore[`user:${userId}`] = JSON.stringify({ email: 'test@hopefusion.com' });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Isaac New',
          last_name: 'KIA New',
          linkedin_url: 'https://linkedin.com/in/isaackia'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Profile updated');

      // Verify cache invalidation
      expect(redisMockStore[`user:${userId}`]).toBeUndefined();
    });

    it('should reject updates with extra/unallowed properties due to strict validation', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Isaac',
          role: 'admin' // Hacker attempt: should be rejected by strict schema validation
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });
});
