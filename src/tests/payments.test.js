/**
 * HopeFusion Africa — Payments Integration Tests
 */

import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery, redisMockStore } from '../config/db.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

// We spy on and mock axios methods for offline-safety in ESM environment
describe('Payments & Escrow Integration Tests', () => {
  let token;
  const userId = '24cf7450-cb78-433b-a53c-4458f2be52f4';
  const startupId = 'd3b07384-d113-4956-a5cc-e89a537f3747';
  const investorId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

  beforeEach(() => {
    mockDbReset();
    token = jwt.sign({ userId, role: 'startup' }, process.env.JWT_SECRET);
    
    // Setup ESM spies
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: {} }));
    jest.spyOn(axios, 'get').mockImplementation(() => Promise.resolve({ data: {} }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  describe('GET /api/v1/payments/plans', () => {
    it('should successfully retrieve platform pricing plans and cache it in Redis', async () => {
      const res = await request(app)
        .get('/api/v1/payments/plans')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(redisMockStore['payments:plans']).toBeDefined();
    });
  });

  describe('POST /api/v1/payments/paystack/initialize', () => {
    it('should successfully initialize Paystack transaction with validated parameters', async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            authorization_url: 'https://checkout.paystack.com/auth-token',
            access_code: 'access-code-123',
            reference: 'reference-ref-123'
          }
        }
      });

      const res = await request(app)
        .post('/api/v1/payments/paystack/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'founder@greenharvest.com',
          amount_usd: 29.00,
          currency: 'GHS'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorization_url).toBe('https://checkout.paystack.com/auth-token');
      expect(res.body.data.reference).toBe('reference-ref-123');
    });

    it('should reject payment initialization when Zod payload validation fails', async () => {
      const res = await request(app)
        .post('/api/v1/payments/paystack/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'bad-email-format',
          amount_usd: -50.00 // negative amount
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/payments/escrow/create', () => {
    it('should successfully create escrow contracts and milestone rows', async () => {
      // Mock db checks
      mockDbExpectQuery('SELECT id FROM startups', [{ id: startupId }]);
      mockDbExpectQuery('SELECT id, first_name', [{ id: investorId, first_name: 'Rene', last_name: 'Moerman' }]);

      // Mock database transaction inserts
      mockDbExpectQuery('INSERT INTO escrows', [{
        id: 'escrow-uuid-123',
        startup_id: startupId,
        investor_id: investorId,
        amount: 100000,
        currency: 'USD',
        status: 'active'
      }]);

      mockDbExpectQuery('INSERT INTO escrow_milestones', [{
        id: 'milestone-uuid-1',
        escrow_id: 'escrow-uuid-123',
        title: 'Milestone 1',
        amount: 50000,
        status: 'locked'
      }]);

      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/payments/escrow/create')
        .set('Authorization', `Bearer ${token}`)
        .send({
          startup_id: startupId,
          investor_id: investorId,
          amount: 100000,
          currency: 'USD',
          milestones: [
            { title: 'Milestone 1', amount: 50000, evidence_required: true },
            { title: 'Milestone 2', amount: 50000, evidence_required: true }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('escrow-uuid-123');
      expect(res.body.data.milestones[0].title).toBe('Milestone 1');
    });
  });
});
