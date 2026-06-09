import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery } from '../config/db.js';
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

import jwt from 'jsonwebtoken';
const TOKEN = jwt.sign(
  { userId: 'user-uuid-push-01', role: 'startup', email: 'push@hopefusion.com' },
  'supersecretjwtdevelopmentkeyforetestingruns',
  { expiresIn: '1h' }
);

describe('Push Notification Routes Tests', () => {
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

  /* ── Subscribe ─────────────────────────────────────────── */
  describe('POST /api/v1/push/subscribe', () => {
    it('should save a webpush subscription', async () => {
      mockDbExpectQuery('INSERT INTO push_subscriptions', [{
        id: 'sub-uuid-0001',
        user_id: 'user-uuid-push-01',
        type: 'webpush',
        endpoint: 'https://fcm.googleapis.com/push/abc123',
      }]);

      const res = await request(app)
        .post('/api/v1/push/subscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          type:        'webpush',
          endpoint:    'https://fcm.googleapis.com/push/abc123',
          p256dh:      'BNcRdreALRFXTkOOUHK',
          auth:        'tBHItJI5svbpez7KI4CCXg',
          deviceLabel: 'Chrome on Windows',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('webpush');
    });

    it('should save an FCM token subscription', async () => {
      mockDbExpectQuery('INSERT INTO push_subscriptions', [{
        id: 'sub-uuid-0002',
        user_id: 'user-uuid-push-01',
        type: 'fcm',
        fcm_token: 'fcm-token-abc',
      }]);

      const res = await request(app)
        .post('/api/v1/push/subscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          type:      'fcm',
          fcm_token: 'fcm-token-abc',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing type field', async () => {
      const res = await request(app)
        .post('/api/v1/push/subscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ endpoint: 'https://fcm.googleapis.com/push/abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/type/i);
    });

    it('should return 400 for invalid subscription type', async () => {
      const res = await request(app)
        .post('/api/v1/push/subscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ type: 'invalid-type' });

      expect(res.status).toBe(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/push/subscribe')
        .send({ type: 'webpush', endpoint: 'https://example.com' });

      expect(res.status).toBe(401);
    });
  });

  /* ── Unsubscribe ───────────────────────────────────────── */
  describe('DELETE /api/v1/push/unsubscribe', () => {
    it('should remove subscription by endpoint', async () => {
      mockDbExpectQuery('DELETE FROM push_subscriptions', [{ id: 'sub-uuid-0001' }]);

      const res = await request(app)
        .delete('/api/v1/push/unsubscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ endpoint: 'https://fcm.googleapis.com/push/abc123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should remove subscription by FCM token', async () => {
      mockDbExpectQuery('DELETE FROM push_subscriptions', [{ id: 'sub-uuid-0002' }]);

      const res = await request(app)
        .delete('/api/v1/push/unsubscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ fcm_token: 'fcm-token-abc' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if neither endpoint nor fcm_token provided', async () => {
      const res = await request(app)
        .delete('/api/v1/push/unsubscribe')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
