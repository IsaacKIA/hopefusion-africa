import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery } from '../config/db.js';
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';


// Sync helper (ESM workaround)
import jwt from 'jsonwebtoken';
const ADMIN_TOKEN = jwt.sign(
  { userId: 'admin-uuid-0001', role: 'admin', email: 'admin@hopefusion.com' },
  'supersecretjwtdevelopmentkeyforetestingruns',
  { expiresIn: '1h' }
);
const USER_TOKEN = jwt.sign(
  { userId: 'user-uuid-0001', role: 'startup', email: 'user@hopefusion.com' },
  'supersecretjwtdevelopmentkeyforetestingruns',
  { expiresIn: '1h' }
);

describe('Admin Routes Tests', () => {
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

  /* ── Analytics ─────────────────────────────────────────── */
  describe('GET /api/v1/admin/analytics', () => {
    it('should return analytics data for admin users', async () => {
      // Users KPI
      mockDbExpectQuery('SELECT COUNT(*) as total', [{
        total: '120', startups: '60', investors: '30',
        mentors: '20', suspended: '5', new_30d: '12',
      }]);
      // Startups KPI
      mockDbExpectQuery('SELECT COUNT(*) as total', [{
        total: '60', total_funding_sought: '5000000', total_funded: '1200000',
      }]);
      // Matches KPI
      mockDbExpectQuery('SELECT COUNT(*) as total', [{
        total: '200', avg_score: '78', converted: '15',
      }]);
      // Grants KPI
      mockDbExpectQuery('SELECT COUNT(*) as total', [{
        total: '40', total_awarded: '300000', awarded: '10',
      }]);
      // Sessions KPI
      mockDbExpectQuery('SELECT COUNT(*) as total', [{ total: '55' }]);
      // Growth chart
      mockDbExpectQuery("DATE_TRUNC('day'", [
        { date: '2024-05-01', count: '3' },
        { date: '2024-05-02', count: '5' },
      ]);
      // Role distribution
      mockDbExpectQuery('SELECT role, COUNT(*)', [
        { role: 'startup', count: '60' },
        { role: 'investor', count: '30' },
      ]);
      // Match statuses
      mockDbExpectQuery('SELECT status, COUNT(*)', [
        { status: 'pending', count: '100' },
        { status: 'invested', count: '15' },
      ]);
      // Recent activity
      mockDbExpectQuery('FROM audit_log', []);

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.total).toBe('120');
      expect(res.body.data.growth).toBeInstanceOf(Array);
      expect(res.body.data.role_distrib).toBeInstanceOf(Array);
    });

    it('should reject non-admin users with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${USER_TOKEN}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/admin/analytics');
      expect(res.status).toBe(401);
    });
  });

  /* ── User Management ───────────────────────────────────── */
  describe('GET /api/v1/admin/users', () => {
    it('should return paginated user list for admin', async () => {
      mockDbExpectQuery('SELECT u.id', [
        { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com', role: 'startup', is_active: true },
        { id: 'u2', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com', role: 'investor', is_active: true },
      ]);
      mockDbExpectQuery('SELECT COUNT(*)', [{ count: '2' }]);

      const res = await request(app)
        .get('/api/v1/admin/users?page=1&limit=25')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should filter users by role', async () => {
      mockDbExpectQuery('SELECT u.id', [
        { id: 'u1', role: 'startup', is_active: true },
      ]);
      mockDbExpectQuery('SELECT COUNT(*)', [{ count: '1' }]);

      const res = await request(app)
        .get('/api/v1/admin/users?role=startup')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].role).toBe('startup');
    });
  });

  describe('PATCH /api/v1/admin/users/:id/status', () => {
    it('should suspend an active user', async () => {
      mockDbExpectQuery('UPDATE users SET is_active', [{
        id: 'u1', email: 'user@test.com', is_active: false,
      }]);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .patch('/api/v1/admin/users/u1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(false);
    });

    it('should return 400 if is_active is not a boolean', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/users/u1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ is_active: 'yes' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockDbExpectQuery('UPDATE users SET is_active', []);

      const res = await request(app)
        .patch('/api/v1/admin/users/nonexistent/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ is_active: false });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should delete a user successfully', async () => {
      mockDbExpectQuery('DELETE FROM users', []);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .delete('/api/v1/admin/users/other-user-uuid')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should prevent admin from deleting their own account', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/users/admin-uuid-0001')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot delete/i);
    });
  });
});
