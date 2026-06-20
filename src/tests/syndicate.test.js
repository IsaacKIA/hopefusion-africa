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

describe('V4 Syndicate Integration Tests', () => {
  let adminToken;
  let corpInvestorToken;
  let individualInvestorToken;
  let startupToken;

  const mockAdminId = '88888888-8888-4888-8888-888888888888';
  const mockCorpInvestorId = '77777777-7777-4777-8777-777777777777';
  const mockIndivInvestorId = '55555555-5555-4555-8555-555555555555';
  const mockStartupFounderId = '11111111-2222-4333-8444-555555555555';

  const mockStartupNodeId = '99999999-9999-4999-8999-999999999999';
  const mockSPVNodeId = '44444444-4444-4444-8444-444444444444';
  const mockOpportunityId = '22222222-2222-4222-8222-222222222222';

  beforeAll(() => {
    adminToken = jwt.sign({ userId: mockAdminId, role: 'admin' }, process.env.JWT_SECRET);
    corpInvestorToken = jwt.sign({ userId: mockCorpInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    individualInvestorToken = jwt.sign({ userId: mockIndivInvestorId, role: 'investor' }, process.env.JWT_SECRET);
    startupToken = jwt.sign({ userId: mockStartupFounderId, role: 'startup' }, process.env.JWT_SECRET);
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

  describe('POST /api/v1/syndicate/spvs', () => {
    it('should allow Admin to create a syndicated SPV', async () => {
      mockDbExpectQuery('entity_type = \'startup\'', [
        { id: mockStartupNodeId, entity_type: 'startup' }
      ]);
      mockDbExpectQuery('INSERT INTO graph_nodes', [
        { id: mockSPVNodeId, entity_type: 'investor', properties: { is_spv: true, spv_name: 'Kenya Agri Syndicate' } }
      ]);
      mockDbExpectQuery('INSERT INTO graph_edges', [
        { id: 'edge-uuid-1' }
      ]);

      const res = await request(app)
        .post('/api/v1/syndicate/spvs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          opportunity_id: mockOpportunityId,
          target_amount: 100000,
          minimum_ticket: 5000,
          currency: 'USD',
          spv_name: 'Kenya Agri Syndicate',
          startup_node_id: mockStartupNodeId
        });

      if (res.status !== 201) {
        console.log("DEBUG CREATE SPV ADMIN ERROR:", JSON.stringify(res.body, null, 2));
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockSPVNodeId);
      expect(res.body.data.properties.spv_name).toBe('Kenya Agri Syndicate');
    });

    it('should allow Corporate Investor to create a syndicated SPV', async () => {
      mockDbExpectQuery('SELECT investor_type FROM investors', [
        { investor_type: 'corporate' }
      ]);
      mockDbExpectQuery('entity_type = \'startup\'', [
        { id: mockStartupNodeId, entity_type: 'startup' }
      ]);
      mockDbExpectQuery('INSERT INTO graph_nodes', [
        { id: mockSPVNodeId, entity_type: 'investor', properties: { is_spv: true } }
      ]);
      mockDbExpectQuery('INSERT INTO graph_edges', []);

      const res = await request(app)
        .post('/api/v1/syndicate/spvs')
        .set('Authorization', `Bearer ${corpInvestorToken}`)
        .send({
          opportunity_id: mockOpportunityId,
          target_amount: 100000,
          minimum_ticket: 5000,
          currency: 'USD',
          spv_name: 'Kenya Agri Syndicate',
          startup_node_id: mockStartupNodeId
        });

      if (res.status !== 201) {
        console.log("DEBUG CREATE SPV CORP ERROR:", JSON.stringify(res.body, null, 2));
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject non-corporate, non-government individual investors with 403', async () => {
      mockDbExpectQuery('SELECT investor_type FROM investors', [
        { investor_type: 'angel' }
      ]);

      const res = await request(app)
        .post('/api/v1/syndicate/spvs')
        .set('Authorization', `Bearer ${individualInvestorToken}`)
        .send({
          opportunity_id: mockOpportunityId,
          target_amount: 100000,
          minimum_ticket: 5000,
          currency: 'USD',
          spv_name: 'Kenya Agri Syndicate',
          startup_node_id: mockStartupNodeId
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('should reject startups with 403', async () => {
      const res = await request(app)
        .post('/api/v1/syndicate/spvs')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          opportunity_id: mockOpportunityId,
          target_amount: 100000,
          minimum_ticket: 5000,
          currency: 'USD',
          spv_name: 'Kenya Agri Syndicate',
          startup_node_id: mockStartupNodeId
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/syndicate/spvs/:spvId/invest', () => {
    const mockInvestorNodeId = '99999999-8888-4777-8666-555555555555';

    it('should allow investor to commit micro-investment capital to active SPV', async () => {
      mockDbExpectQuery('SELECT * FROM graph_nodes WHERE id = $1 FOR UPDATE', [
        {
          id: mockSPVNodeId,
          entity_type: 'investor',
          properties: {
            is_spv: true,
            spv_name: 'Kenya Agri Syndicate',
            status: 'active',
            minimum_ticket: 5000,
            pooled_amount: 0,
            target_amount: 100000,
            currency: 'USD'
          }
        }
      ]);

      mockDbExpectQuery("entity_type = 'investor'", [
        { id: mockInvestorNodeId }
      ]);

      mockDbExpectQuery('INSERT INTO graph_edges', [
        { id: 'edge-uuid-2' }
      ]);

      mockDbExpectQuery('UPDATE graph_nodes', []);

      const res = await request(app)
        .post(`/api/v1/syndicate/spvs/${mockSPVNodeId}/invest`)
        .set('Authorization', `Bearer ${individualInvestorToken}`)
        .send({
          amount: 10000,
          currency: 'USD'
        });

      if (res.status !== 200) {
        console.error("DEBUG TEST /invest error:", res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pooled_amount).toBe(10000);
      expect(res.body.data.status).toBe('active');
    });

    it('should self-heal/create investor node if missing on investment commit', async () => {
      mockDbExpectQuery('SELECT * FROM graph_nodes WHERE id = $1 FOR UPDATE', [
        {
          id: mockSPVNodeId,
          entity_type: 'investor',
          properties: {
            is_spv: true,
            spv_name: 'Kenya Agri Syndicate',
            status: 'active',
            minimum_ticket: 5000,
            pooled_amount: 0,
            target_amount: 100000,
            currency: 'USD'
          }
        }
      ]);

      // Return empty rows indicating investor graph node doesn't exist yet
      mockDbExpectQuery('SELECT * FROM graph_nodes WHERE entity_type', []);
      
      // Expect INSERT to self-heal/create the node
      mockDbExpectQuery('INSERT INTO graph_nodes', [
        { id: mockInvestorNodeId }
      ]);

      mockDbExpectQuery('INSERT INTO graph_edges', []);
      mockDbExpectQuery('UPDATE graph_nodes', []);

      const res = await request(app)
        .post(`/api/v1/syndicate/spvs/${mockSPVNodeId}/invest`)
        .set('Authorization', `Bearer ${individualInvestorToken}`)
        .send({
          amount: 10000,
          currency: 'USD'
        });

      if (res.status !== 200) {
        console.error("DEBUG TEST self-heal error:", res.body);
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.investment.investor_node_id).toBe(mockInvestorNodeId);
    });

    it('should reject investment if amount is below minimum ticket size', async () => {
      mockDbExpectQuery('SELECT * FROM graph_nodes WHERE id = $1 FOR UPDATE', [
        {
          id: mockSPVNodeId,
          entity_type: 'investor',
          properties: {
            is_spv: true,
            spv_name: 'Kenya Agri Syndicate',
            status: 'active',
            minimum_ticket: 5000,
            pooled_amount: 0,
            target_amount: 100000,
            currency: 'USD'
          }
        }
      ]);

      const res = await request(app)
        .post(`/api/v1/syndicate/spvs/${mockSPVNodeId}/invest`)
        .set('Authorization', `Bearer ${individualInvestorToken}`)
        .send({
          amount: 2500, // below 5000
          currency: 'USD'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('below minimum ticket size');
    });

    it('should set status to funded when pooled amount meets or exceeds target', async () => {
      mockDbExpectQuery('SELECT * FROM graph_nodes WHERE id = $1 FOR UPDATE', [
        {
          id: mockSPVNodeId,
          entity_type: 'investor',
          properties: {
            is_spv: true,
            spv_name: 'Kenya Agri Syndicate',
            status: 'active',
            minimum_ticket: 5000,
            pooled_amount: 95000,
            target_amount: 100000,
            currency: 'USD'
          }
        }
      ]);

      mockDbExpectQuery("entity_type = 'investor'", [
        { id: mockInvestorNodeId }
      ]);
      mockDbExpectQuery('INSERT INTO graph_edges', []);
      mockDbExpectQuery('UPDATE graph_nodes', []);

      const res = await request(app)
        .post(`/api/v1/syndicate/spvs/${mockSPVNodeId}/invest`)
        .set('Authorization', `Bearer ${individualInvestorToken}`)
        .send({
          amount: 10000, // brings total to 105000 >= 100000
          currency: 'USD'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('funded');
    });
  });
});
