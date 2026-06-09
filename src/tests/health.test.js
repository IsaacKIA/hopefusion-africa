import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery } from '../config/db.js';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

const SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';

const startupToken = jwt.sign(
  { userId: 'user-startup-01', role: 'startup' },
  SECRET, { expiresIn: '1h' }
);
const adminToken = jwt.sign(
  { userId: 'admin-uuid-01', role: 'admin' },
  SECRET, { expiresIn: '1h' }
);

describe('Health & Services Route Tests', () => {
  beforeEach(() => {
    mockDbReset();
    jest.setTimeout(15000);
  });

  afterAll((done) => {
    const io = app.get('io');
    if (io) io.close();
    if (httpServer.listening) httpServer.close(done);
    else done();
  });

  /* ── Health Check ──────────────────────────────────────── */
  describe('GET /api/v1/health', () => {
    it('should return status ok|degraded with service details', async () => {
      mockDbExpectQuery('SELECT 1', [{ '?column?': 1 }]);

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toMatch(/ok|degraded/);
      expect(res.body.services).toBeDefined();
      expect(res.body.services.database).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it('should include system info in response', async () => {
      mockDbExpectQuery('SELECT 1', [{ '?column?': 1 }]);

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.system).toBeDefined();
      expect(res.body.system.node_version).toMatch(/^v/);
      expect(typeof res.body.system.uptime_seconds).toBe('number');
      expect(typeof res.body.system.memory_mb).toBe('number');
    });

    it('should not require authentication', async () => {
      mockDbExpectQuery('SELECT 1', [{ '?column?': 1 }]);
      const res = await request(app).get('/api/v1/health');
      expect([200, 503]).toContain(res.status);
    });
  });

  /* ── Notifications ─────────────────────────────────────── */
  describe('GET /api/v1/notifications', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('should return user notifications with unread count', async () => {
      mockDbExpectQuery('SELECT * FROM notifications', [
        { id: 'n1', type: 'message', title: 'New message', is_read: false, created_at: new Date().toISOString() },
        { id: 'n2', type: 'match',   title: 'New match',   is_read: true,  created_at: new Date().toISOString() },
      ]);
      mockDbExpectQuery('SELECT COUNT(*)', [{ count: '1' }]);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.unread).toBe(1);
    });
  });

  /* ── Mentors List ──────────────────────────────────────── */
  describe('GET /api/v1/mentors', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/mentors');
      expect(res.status).toBe(401);
    });

    it('should return available mentors list', async () => {
      mockDbExpectQuery('SELECT m.*', [
        { id: 'm1', user_id: 'u1', first_name: 'Ada',  last_name: 'Lovelace', avg_rating: 4.9 },
        { id: 'm2', user_id: 'u2', first_name: 'Alan', last_name: 'Turing',   avg_rating: 4.7 },
      ]);

      const res = await request(app)
        .get('/api/v1/mentors')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ── Admin Activity Feed ───────────────────────────────── */
  describe('GET /api/v1/admin/activity', () => {
    it('should block non-admin users with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/activity')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(403);
    });

    it('should return activity feed for admin', async () => {
      mockDbExpectQuery('FROM audit_log', [
        { id: 'a1', action: 'login', entity: 'user', created_at: new Date().toISOString(), first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });
});
