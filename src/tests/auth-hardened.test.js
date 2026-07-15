import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery, redisMockStore } from '../config/db.js';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

const hashOTP = (otp) => crypto.createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');

describe('Hardened Auth Pipeline & Security Verification', () => {
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

  describe('C-2: debug_otp guard with DISABLE_DEBUG_OTP', () => {
    it('should NOT return debug_otp when DISABLE_DEBUG_OTP is true, even in dev environment mock', async () => {
      const oldNodeEnv = process.env.NODE_ENV;
      const oldDisableOtp = process.env.DISABLE_DEBUG_OTP;
      process.env.NODE_ENV = 'development';
      process.env.DISABLE_DEBUG_OTP = 'true';

      // Mock duplicate check -> returns nothing
      mockDbExpectQuery('SELECT id, is_verified FROM users WHERE email', []);
      // Mock INSERT of user details
      mockDbExpectQuery('INSERT INTO users', [{
        id: '22222222-3333-4444-5555-666666666666',
        email: 'nodebug@hopefusion.com',
        role: 'startup',
        first_name: 'Test',
        last_name: 'User'
      }]);
      // Mock INSERT into startups profile
      mockDbExpectQuery('INSERT INTO startups', [{ id: '99999999-9999-9999-9999-999999999999' }]);
      // Mock INSERT into verification_codes
      mockDbExpectQuery('INSERT INTO verification_codes', []);
      // Mock Audit logging
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'nodebug@hopefusion.com',
          password: 'Password123',
          role: 'startup',
          first_name: 'Test',
          last_name: 'User',
          phone: '+233501112233',
          country: 'Ghana'
        });

      process.env.NODE_ENV = oldNodeEnv;
      process.env.DISABLE_DEBUG_OTP = oldDisableOtp;

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.debug_otp).toBeUndefined();
    });
  });

  describe('H-3: Hashed Reset Password OTP', () => {
    it('should successfully reset password when correct OTP is verified', async () => {
      const email = 'reset@hopefusion.com';
      const code = '654321';
      const codeHash = hashOTP(code);

      mockDbExpectQuery('SELECT id FROM users WHERE email', [{ id: 'user-reset-123' }]);
      redisMockStore['reset:user-reset-123'] = JSON.stringify(codeHash);
      mockDbExpectQuery('UPDATE users SET password_hash', []);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email,
          code,
          newPassword: 'BrandNewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');
    });

    it('should reject password reset when OTP is invalid', async () => {
      const email = 'reset@hopefusion.com';
      const wrongCode = '000000';
      const correctCode = '654321';
      const correctHash = hashOTP(correctCode);

      mockDbExpectQuery('SELECT id FROM users WHERE email', [{ id: 'user-reset-123' }]);
      redisMockStore['reset:user-reset-123'] = JSON.stringify(correctHash);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email,
          code: wrongCode,
          newPassword: 'BrandNewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired reset code');
    });
  });

  describe('H-2: Internal Database Error Leak Prevention', () => {
    it('should sanitize 500 responses and not leak raw database errors', async () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);

      mockDbExpectQuery('SELECT u.id, u.email', new Error('PLPGSQL internal compile error: column "nonexistent" does not exist in table users'));

      const res = await request(app)
        .get('/api/v1/auth/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.error).not.toContain('PLPGSQL');
      expect(res.body.error).not.toContain('nonexistent');
      expect(res.body.error).toBe('Service temporarily unavailable.');
    });
  });
});
