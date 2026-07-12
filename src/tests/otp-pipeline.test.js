import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery, redisMockStore } from '../config/db.js';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

// Helper to hash OTP matching backend
const hashOTP = (otp) => crypto.createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');

describe('OTP & Activation Pipeline Integration Tests', () => {
  beforeEach(() => {
    mockDbReset();
    jest.clearAllMocks();
  });

  afterAll((done) => {
    const io = app.get('io');
    if (io) io.close();
    if (httpServer.listening) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  describe('Idempotent Registration & Unverified Overwrite', () => {
    it('should allow overwriting an unverified account with new details', async () => {
      const existingUnverifiedUser = {
        id: '11111111-2222-3333-4444-555555555555',
        email: 'unverified@hopefusion.com',
        is_verified: false
      };

      // 1. Mock select duplicate -> returns unverified user
      mockDbExpectQuery('SELECT id, is_verified FROM users WHERE email', [existingUnverifiedUser]);

      // 2. Mock DELETE of associated profiles
      mockDbExpectQuery('DELETE FROM startups WHERE founder_id', []);
      mockDbExpectQuery('DELETE FROM investors WHERE user_id', []);
      mockDbExpectQuery('DELETE FROM mentors WHERE user_id', []);
      mockDbExpectQuery('DELETE FROM startup_passports WHERE user_id', []);

      // 3. Mock UPDATE of user core details
      mockDbExpectQuery('UPDATE users', [{
        id: existingUnverifiedUser.id,
        email: 'unverified@hopefusion.com',
        role: 'startup',
        first_name: 'NewName',
        last_name: 'NewLastName'
      }]);

      // 4. Mock INSERT into startups profile
      mockDbExpectQuery('INSERT INTO startups', [{ id: '99999999-9999-9999-9999-999999999999' }]);

      // 5. Mock INSERT/update into verification_codes table
      mockDbExpectQuery('INSERT INTO verification_codes', []);

      // 6. Mock Audit logging
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'unverified@hopefusion.com',
          password: 'NewPassword123',
          role: 'startup',
          first_name: 'NewName',
          last_name: 'NewLastName',
          phone: '+233501234567',
          country: 'Ghana'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.first_name).toBe('NewName');
      expect(res.body.user.id).toBe(existingUnverifiedUser.id);
    });

    it('should reject registration if email already registered and verified', async () => {
      const existingVerifiedUser = {
        id: '11111111-2222-3333-4444-555555555555',
        email: 'verified@hopefusion.com',
        is_verified: true
      };

      // Mock select duplicate -> returns verified user
      mockDbExpectQuery('SELECT id, is_verified FROM users WHERE email', [existingVerifiedUser]);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'verified@hopefusion.com',
          password: 'Password123',
          role: 'startup',
          first_name: 'Isaac',
          last_name: 'KIA'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/v1/auth/verify (Brute Force Protection & Verification)', () => {
    it('should verify successfully with a valid OTP code', async () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);
      
      const code = '123456';
      const codeHash = hashOTP(code);

      // Mock fetch verification code -> returns valid active code hash
      mockDbExpectQuery('SELECT code_hash, attempts', [{
        code_hash: codeHash,
        attempts: 0,
        max_attempts: 5,
        expires_at: new Date(Date.now() + 600000).toISOString()
      }]);

      // Mock updates and deletions
      mockDbExpectQuery('UPDATE users SET is_verified', []);
      mockDbExpectQuery('INSERT INTO startup_passports', []);
      mockDbExpectQuery('DELETE FROM verification_codes', []);

      const res = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Email verified successfully');
    });

    it('should increment attempt counter on wrong OTP and lock user after 5 attempts', async () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);
      
      const code = '123456';
      const codeHash = hashOTP(code);

      // Case 1: First wrong attempt
      mockDbExpectQuery('SELECT code_hash, attempts', [{
        code_hash: codeHash,
        attempts: 0,
        max_attempts: 5,
        expires_at: new Date(Date.now() + 600000).toISOString()
      }]);
      mockDbExpectQuery('UPDATE verification_codes SET attempts', []);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      let res = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'wrong1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('attempts remaining');

      // Case 2: 5th wrong attempt (attempts = 4, new attempt makes it 5)
      mockDbReset(); // Clear mock queries from Case 1
      mockDbExpectQuery('SELECT code_hash, attempts', [{
        code_hash: codeHash,
        attempts: 4,
        max_attempts: 5,
        expires_at: new Date(Date.now() + 600000).toISOString()
      }]);
      mockDbExpectQuery('DELETE FROM verification_codes', []);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      res = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'wrong2' });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Too many failed attempts');
      expect(redisMockStore[`verify:blocked:${userId}`]).toBe('1');
    });
  });

  describe('POST /api/v1/auth/resend (Rate Limiting)', () => {
    it('should enforce a 60-second cooldown rate limit between resends', async () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);

      // Mock user lookup
      mockDbExpectQuery('SELECT email, first_name', [{ email: 'test@hopefusion.com', first_name: 'Isaac' }]);

      // Mock verification_codes lookup showing a recent sent code (10 seconds ago)
      mockDbExpectQuery('SELECT last_sent_at', [{
        last_sent_at: new Date(Date.now() - 10000).toISOString(),
        resend_count: 1,
        resend_window_start: new Date(Date.now() - 10000).toISOString()
      }]);

      const res = await request(app)
        .post('/api/v1/auth/resend')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Please wait');
    });

    it('should enforce maximum 5 resends per hour', async () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);

      // Mock user lookup
      mockDbExpectQuery('SELECT email, first_name', [{ email: 'test@hopefusion.com', first_name: 'Isaac' }]);

      // Mock verification_codes lookup showing 5 resends within the current hour
      mockDbExpectQuery('SELECT last_sent_at', [{
        last_sent_at: new Date(Date.now() - 70000).toISOString(), // Cooldown passes (70s > 60s)
        resend_count: 5, // Maxed out resends
        resend_window_start: new Date(Date.now() - 600000).toISOString() // Sent 10 mins ago (inside the hour)
      }]);

      const res = await request(app)
        .post('/api/v1/auth/resend')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Maximum resend limit reached');
    });
  });
});
