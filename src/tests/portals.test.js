import { jest } from '@jest/globals';

// ─── HOISTED ESM MODULE MOCKS ──────────────────────────────────
jest.unstable_mockModule('@xenova/transformers', () => ({
  pipeline: jest.fn(async () => {
    return jest.fn(async (text, options) => {
      return {
        data: new Float32Array(384).fill(0.05)
      };
    });
  })
}));

// Import dynamically so mocks are applied beforehand
const { app, httpServer } = await import('../server.js');
const { mockDbReset, mockDbExpectQuery } = await import('../config/db.js');
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('Government & Corporate Portals Route Integration Tests', () => {
  let startupToken;
  let adminToken;
  const mockUserId = '11111111-2222-4333-8444-555555555555';
  const mockAdminId = '88888888-8888-4888-8888-888888888888';
  const mockStartupNodeId = '99999999-9999-4999-8999-999999999999';
  const mockInvestorNodeId = '77777777-7777-4777-8777-777777777777';
  const mockArbitratorNodeId = '66666666-6666-4666-8666-666666666666';

  beforeAll(() => {
    startupToken = jwt.sign({ userId: mockUserId, role: 'startup' }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ userId: mockAdminId, role: 'admin' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    mockDbReset();
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

  describe('GET /api/v1/government/analytics', () => {
    it('should allow Gov/Admin to view SME dashboard aggregations', async () => {
      mockDbExpectQuery('COUNT(*) AS count FROM startups', [{ count: 12 }]);
      mockDbExpectQuery('COUNT(*) AS count FROM startup_profiles_v4', [{ count: 8 }]);
      mockDbExpectQuery('AVG(headcount)', [{ avg: 5.4 }]);
      mockDbExpectQuery('AVG(female_representation_percentage)', [{ avg: 45.2 }]);
      mockDbExpectQuery('AVG(youth_representation_percentage)', [{ avg: 72.1 }]);
      mockDbExpectQuery('GROUP BY sector', [
        { sector: 'Agriculture', count: 7 },
        { sector: 'Fintech', count: 5 }
      ]);

      const res = await request(app)
        .get('/api/v1/government/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_startups).toBe(12);
      expect(res.body.data.total_registered_corporations).toBe(8);
      expect(res.body.data.avg_female_representation).toBe('45.2');
    });

    it('should reject startup requests with 403', async () => {
      const res = await request(app)
        .get('/api/v1/government/analytics')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/government/grants', () => {
    it('should allow Gov to publish grant programs', async () => {
      mockDbExpectQuery('INSERT INTO opportunities', [{
        id: 'grant-opp-123',
        title: 'National Agritech Fund',
        opportunity_type: 'government_program'
      }]);

      const res = await request(app)
        .post('/api/v1/government/grants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'National Agritech Fund',
          description: 'Government matching fund',
          value_amount: 50000,
          currency: 'USD',
          eligible_countries: ['KE'],
          eligible_sectors: ['Agriculture'],
          eligible_stages: ['mvp'],
          deadline: '2026-12-31T23:59:59Z',
          metadata: { agency: 'Ministry of Ag' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.opportunity_type).toBe('government_program');
    });
  });

  describe('POST /api/v1/government/disburse', () => {
    it('should disburse funds through V4 escrow schemas', async () => {
      mockDbExpectQuery('BEGIN', []);
      mockDbExpectQuery('INSERT INTO platform_escrows_v4', [{
        id: 'escrow-v4-uuid',
        deal_id: 'govt-grant-deal-001',
        total_amount: 10000,
        status: 'active'
      }]);
      mockDbExpectQuery('INSERT INTO escrow_milestones_v4', [{
        id: 'milestone-v4-uuid',
        title: 'Hiring goals achieved',
        amount: 10000,
        status: 'pending'
      }]);
      mockDbExpectQuery('COMMIT', []);

      const res = await request(app)
        .post('/api/v1/government/disburse')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deal_id: 'govt-grant-deal-001',
          investor_node_id: mockInvestorNodeId,
          startup_node_id: mockStartupNodeId,
          total_amount: 10000,
          currency: 'USD',
          escrow_type: 'MOBILE_MONEY',
          arbitrator_node_id: mockArbitratorNodeId,
          milestones: [
            { title: 'Hiring goals achieved', amount: 10000 }
          ]
        });

      if (res.status !== 201) {
        console.log("DEBUG /government/disburse ERROR BODY:", JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deal_id).toBe('govt-grant-deal-001');
      expect(res.body.data.milestones[0].title).toBe('Hiring goals achieved');
    });
  });

  describe('POST /api/v1/corporate/challenges', () => {
    it('should allow Corporate to post enterprise challenges', async () => {
      mockDbExpectQuery('INSERT INTO opportunities', [{
        id: 'corp-opp-123',
        title: 'API Gateway Challenge',
        opportunity_type: 'corporate_challenge'
      }]);

      const res = await request(app)
        .post('/api/v1/corporate/challenges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'API Gateway Challenge',
          description: 'Looking for payment orchestrators',
          value_amount: 15000,
          currency: 'USD',
          eligible_countries: ['ALL'],
          eligible_sectors: ['Fintech'],
          eligible_stages: ['early_traction'],
          deadline: '2026-11-30T00:00:00Z',
          metadata: { host: 'Standard Bank' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.opportunity_type).toBe('corporate_challenge');
    });
  });

  describe('Corporate Escrow & Milestone Management', () => {
    const mockEscrowId = '22222222-2222-2222-2222-222222222222';
    const mockMilestoneId = '33333333-3333-3333-3333-333333333333';

    it('should allow Corporate to create procurement escrow', async () => {
      mockDbExpectQuery('BEGIN', []);
      mockDbExpectQuery('INSERT INTO platform_escrows_v4', [{
        id: mockEscrowId,
        deal_id: 'procure-deal-999',
        total_amount: 25000,
        status: 'active'
      }]);
      mockDbExpectQuery('INSERT INTO escrow_milestones_v4', [{
        id: mockMilestoneId,
        title: 'MVP delivered',
        amount: 25000,
        status: 'pending'
      }]);
      mockDbExpectQuery('COMMIT', []);

      const res = await request(app)
        .post('/api/v1/corporate/escrow/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deal_id: 'procure-deal-999',
          investor_node_id: mockInvestorNodeId,
          startup_node_id: mockStartupNodeId,
          total_amount: 25000,
          currency: 'USD',
          escrow_type: 'MATIC',
          arbitrator_node_id: mockArbitratorNodeId,
          milestones: [
            { title: 'MVP delivered', amount: 25000 }
          ]
        });

      if (res.status !== 201) {
        console.log("DEBUG /corporate/escrow/create ERROR BODY:", JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockEscrowId);
    });

    it('should allow Startup to submit evidence for validation', async () => {
      mockDbExpectQuery('UPDATE escrow_milestones_v4', [{
        id: mockMilestoneId,
        escrow_id: mockEscrowId,
        status: 'submitted',
        evidence_uri: 'https://github.com/evidence'
      }]);

      const res = await request(app)
        .post(`/api/v1/corporate/escrow/${mockEscrowId}/milestone/${mockMilestoneId}/submit`)
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          evidence_uri: 'https://github.com/evidence'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('submitted');
    });

    it('should allow Corporate to approve milestone evidence and release funds', async () => {
      mockDbExpectQuery('BEGIN', []);
      mockDbExpectQuery('UPDATE escrow_milestones_v4', [{
        id: mockMilestoneId,
        escrow_id: mockEscrowId,
        status: 'approved'
      }]);
      mockDbExpectQuery('SELECT COUNT(*)', [{ count: 0 }]); // All approved
      mockDbExpectQuery('UPDATE platform_escrows_v4', []);
      mockDbExpectQuery('COMMIT', []);

      const res = await request(app)
        .post(`/api/v1/corporate/escrow/${mockEscrowId}/milestone/${mockMilestoneId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.status !== 200) {
        console.log("DEBUG /corporate/escrow/approve ERROR BODY:", JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.milestone.status).toBe('approved');
      expect(res.body.data.escrow_status).toBe('completed');
    });

    it('should allow Corporate to reject milestone evidence', async () => {
      mockDbExpectQuery('UPDATE escrow_milestones_v4', [{
        id: mockMilestoneId,
        escrow_id: mockEscrowId,
        status: 'rejected'
      }]);

      const res = await request(app)
        .post(`/api/v1/corporate/escrow/${mockEscrowId}/milestone/${mockMilestoneId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.status !== 200) {
        console.log("DEBUG /corporate/escrow/reject ERROR BODY:", JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('rejected');
    });
  });
});
