import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery, redisMockStore } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Setup basic environment variables for the test run
process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    mockDbReset();
    jest.setTimeout(30000); // Set 30s timeout for slow bcrypt hashing
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

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new startup user and create startup profile', async () => {
      // 1. Mock SELECT check for duplicate email -> empty (no conflicts)
      mockDbExpectQuery('SELECT id FROM users WHERE email', []);

      // 2. Mock INSERT into users
      mockDbExpectQuery('INSERT INTO users', [{
        id: '11111111-2222-3333-4444-555555555555',
        email: 'test@hopefusion.com',
        role: 'startup',
        first_name: 'Isaac',
        last_name: 'KIA'
      }]);

      // 3. Mock INSERT into startups profile
      mockDbExpectQuery('INSERT INTO startups', [{ id: '99999999-9999-9999-9999-999999999999' }]);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@hopefusion.com',
          password: 'Password123',
          role: 'startup',
          first_name: 'Isaac',
          last_name: 'KIA',
          phone: '+233501234567',
          country: 'Ghana'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@hopefusion.com');
      expect(res.body.user.first_name).toBe('Isaac');
    });

    it('should reject registration if role is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@hopefusion.com',
          password: 'Password123',
          role: 'hacker-role',
          first_name: 'Isaac',
          last_name: 'KIA'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'role')).toBe(true);
    });

    it('should reject registration if password lacks an uppercase letter, lowercase letter, or number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@hopefusion.com',
          password: 'weakpassword',
          role: 'startup',
          first_name: 'Isaac',
          last_name: 'KIA'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].field).toBe('password');
    });

    it('should reject registration if email is already registered', async () => {
      // Mock SELECT duplicate query returning existing row
      mockDbExpectQuery('SELECT id FROM users WHERE email', [{ id: '11111111-2222-3333-4444-555555555555' }]);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@hopefusion.com',
          password: 'Password123',
          role: 'startup',
          first_name: 'Isaac',
          last_name: 'KIA'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in and return tokens for active users', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 12);
      
      mockDbExpectQuery('SELECT id, email, password_hash', [{
        id: '11111111-2222-3333-4444-555555555555',
        email: 'test@hopefusion.com',
        password_hash: hashedPassword,
        role: 'startup',
        first_name: 'Isaac',
        last_name: 'KIA',
        is_verified: true,
        is_active: true
      }]);
      mockDbExpectQuery('UPDATE users SET last_login', []);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@hopefusion.com',
          password: 'Password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.first_name).toBe('Isaac');
    }, 30000);

    it('should reject login for suspended/inactive users', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 12);
      
      mockDbExpectQuery('SELECT id, email, password_hash', [{
        id: '11111111-2222-3333-4444-555555555555',
        email: 'test@hopefusion.com',
        password_hash: hashedPassword,
        role: 'startup',
        first_name: 'Isaac',
        last_name: 'KIA',
        is_verified: true,
        is_active: false // suspended
      }]);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@hopefusion.com',
          password: 'Password123'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account suspended. Contact support.');
    }, 30000);

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 12);
      
      mockDbExpectQuery('SELECT id, email, password_hash', [{
        id: '11111111-2222-3333-4444-555555555555',
        email: 'test@hopefusion.com',
        password_hash: hashedPassword,
        role: 'startup',
        first_name: 'Isaac',
        last_name: 'KIA',
        is_verified: true,
        is_active: true
      }]);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@hopefusion.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    }, 30000);
  });

  describe('POST /api/v1/auth/forgot-password & /reset-password', () => {
    it('should send reset code for a valid email', async () => {
      mockDbExpectQuery('SELECT id, first_name, email FROM users WHERE email', [{
        id: '11111111-2222-3333-4444-555555555555',
        first_name: 'Isaac',
        email: 'test@hopefusion.com'
      }]);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@hopefusion.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset code was sent');
    });

    it('should send reset code for a valid phone number', async () => {
      mockDbExpectQuery('SELECT id, first_name, email FROM users WHERE email', [{
        id: '11111111-2222-3333-4444-555555555555',
        first_name: 'Isaac',
        email: 'test@hopefusion.com'
      }]);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: '0501234567' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset code was sent');
    });

    it('should reset password and revoke old tokens', async () => {
      mockDbExpectQuery('SELECT id FROM users WHERE email', [{
        id: '11111111-2222-3333-4444-555555555555'
      }]);
      mockDbExpectQuery('UPDATE users SET password_hash', []);

      redisMockStore['reset:11111111-2222-3333-4444-555555555555'] = '"123456"';

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'test@hopefusion.com',
          code: '123456',
          newPassword: 'NewPassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successfully');

      const revokedBefore = redisMockStore['revoked_before:11111111-2222-3333-4444-555555555555'];
      expect(revokedBefore).toBeDefined();

      const revokedTime = parseInt(revokedBefore);
      const payload = { userId: '11111111-2222-3333-4444-555555555555', role: 'startup', iat: revokedTime - 10 };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      const authRes = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '123456' });

      expect(authRes.status).toBe(401);
      expect(authRes.body.error).toBe('Token revoked');
    });
  });

  describe('Onboarding & Status & Passports V2', () => {
    it('should block unverified user from accessing protected users/me', async () => {
      const payload = { userId: '11111111-2222-3333-4444-555555555555', role: 'startup' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      mockDbExpectQuery('SELECT is_verified FROM users WHERE id', [{ is_verified: false }]);

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('verification required');
    });

    it('should create startup passport during verify', async () => {
      const payload = { userId: '11111111-2222-3333-4444-555555555555', role: 'startup' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      redisMockStore['verify:11111111-2222-3333-4444-555555555555'] = '"123456"';
      
      mockDbExpectQuery('UPDATE users SET is_verified', []);
      mockDbExpectQuery('INSERT INTO startup_passports', [{ id: '88888888-8888-8888-8888-888888888888' }]);

      const res = await request(app)
        .post('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow progressive onboarding with goals, roles, and profiles update', async () => {
      const payload = { userId: '11111111-2222-3333-4444-555555555555', role: 'startup' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      mockDbExpectQuery('UPDATE users SET goals', []);
      mockDbExpectQuery('SELECT id FROM startups WHERE founder_id', [{ id: '99999999-9999-9999-9999-999999999999' }]);
      mockDbExpectQuery('UPDATE startups', []);
      mockDbExpectQuery('UPDATE startup_passports', []);

      const res = await request(app)
        .post('/api/v1/auth/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goals: ['Raise Funding', 'Find Mentors'],
          country: 'Ghana',
          roles: ['startup'],
          startup_name: 'Super Startup Ltd',
          sector: 'fintech',
          stage: 'seed'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('completed successfully');
    });
  });
});
