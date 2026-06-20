import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery, redisMockStore } from '../config/db.js';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('Workspace & Graph Integration Tests', () => {
  let token;
  const mockUserId = '11111111-2222-4333-8444-555555555555';
  const mockStartupId = '99999999-9999-4999-8999-999999999999';

  beforeAll(() => {
    token = jwt.sign({ userId: mockUserId, role: 'startup' }, process.env.JWT_SECRET);
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

  describe('GET /api/v1/workspace/financials/:startupId', () => {
    it('should successfully retrieve runway details', async () => {
      mockDbExpectQuery('SELECT * FROM founder_financial_ledgers', [{
        startup_id: mockStartupId,
        bank_balance: 50000.00,
        monthly_burn_rate: 5000.00,
        currency: 'USD',
        ledger_history: [],
        forecasted_runway_months: 10.0
      }]);

      const res = await request(app)
        .get(`/api/v1/workspace/financials/${mockStartupId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bank_balance).toBe(50000.00);
      expect(res.body.data.forecasted_runway_months).toBe(10.0);
    });
  });

  describe('POST /api/v1/workspace/financials', () => {
    it('should save ledger details and recalculate runway', async () => {
      mockDbExpectQuery('INSERT INTO founder_financial_ledgers', [{
        startup_id: mockStartupId,
        bank_balance: 100000.00,
        monthly_burn_rate: 10000.00,
        currency: 'USD',
        ledger_history: [],
        forecasted_runway_months: 10.0
      }]);

      const res = await request(app)
        .post('/api/v1/workspace/financials')
        .set('Authorization', `Bearer ${token}`)
        .send({
          startup_id: mockStartupId,
          bank_balance: 100000.00,
          monthly_burn_rate: 10000.00,
          currency: 'USD',
          ledger_history: []
        });

      if (res.status !== 200) {
        console.error('DEBUG TEST RES:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.forecasted_runway_months).toBe(10);
    });
  });

  describe('GET /api/v1/workspace/crm/:startupId', () => {
    it('should fetch investor relations list', async () => {
      mockDbExpectQuery('SELECT r.*, n.properties', [{
        id: '44444444-4444-4444-4444-444444444444',
        startup_id: mockStartupId,
        investor_node_id: '55555555-5555-5555-5555-555555555555',
        pipeline_stage: 'pitching',
        notes: 'Interested in fintech',
        equity_offered: 5.00
      }]);

      const res = await request(app)
        .get(`/api/v1/workspace/crm/${mockStartupId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].pipeline_stage).toBe('pitching');
    });
  });

  describe('POST /api/v1/graph/node', () => {
    it('should create graph node successfully', async () => {
      mockDbExpectQuery('INSERT INTO graph_nodes', [{
        id: 'node-id-1234',
        entity_type: 'startup',
        properties: { name: 'Fintech Hub' }
      }]);

      const res = await request(app)
        .post('/api/v1/graph/node')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entity_type: 'startup',
          properties: { name: 'Fintech Hub' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entity_type).toBe('startup');
    });
  });

  describe('GET /api/v1/graph/affinity', () => {
    it('should compute connection score between nodes', async () => {
      const srcNode = '11111111-1111-1111-1111-111111111111';
      const destNode = '22222222-2222-2222-2222-222222222222';

      mockDbExpectQuery('SELECT target_id FROM graph_edges WHERE source_id', [
        { target_id: 'common-node' }
      ]);
      mockDbExpectQuery('SELECT target_id FROM graph_edges WHERE source_id', [
        { target_id: 'common-node' }
      ]);
      mockDbExpectQuery('SELECT SUM(weight) as weight_sum FROM graph_edges', [
        { weight_sum: 5.0 }
      ]);

      const res = await request(app)
        .get(`/api/v1/graph/affinity?source=${srcNode}&target=${destNode}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.connection_score).toBeDefined();
      expect(res.body.data.overlap_neighbors).toBe(1);
    });
  });

  describe('POST /api/v1/graph/pagerank', () => {
    it('should iterate PageRank successfully', async () => {
      const nodeA = '11111111-1111-1111-1111-111111111111';
      const nodeB = '22222222-2222-2222-2222-222222222222';

      mockDbExpectQuery('SELECT id FROM graph_nodes', [
        { id: nodeA }, { id: nodeB }
      ]);
      mockDbExpectQuery('SELECT source_id, target_id, weight FROM graph_edges', [
        { source_id: nodeA, target_id: nodeB, weight: 2.0 }
      ]);
      mockDbExpectQuery('BEGIN', []);
      mockDbExpectQuery('UPDATE graph_nodes', []);
      mockDbExpectQuery('UPDATE graph_nodes', []);
      mockDbExpectQuery('COMMIT', []);

      const res = await request(app)
        .post('/api/v1/graph/pagerank')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.node_count).toBe(2);
    });
  });

  describe('GET /api/v1/workspace/escrows/:startupId', () => {
    it('should successfully retrieve active escrows and milestones for a startup', async () => {
      const mockStartupNodeId = '99999999-9999-4999-8999-999999999999';
      mockDbExpectQuery('SELECT id FROM graph_nodes', [
        { id: mockStartupNodeId }
      ]);
      mockDbExpectQuery('SELECT e.*', [
        {
          id: 'escrow-id-v4',
          deal_id: 'test-deal',
          investor_node_id: 'investor-id',
          startup_node_id: mockStartupNodeId,
          total_amount: 5000,
          currency: 'USD',
          status: 'active',
          milestones: [
            { id: 'milestone-id-1', title: 'Milestone 1', amount: 5000, status: 'pending' }
          ]
        }
      ]);

      const res = await request(app)
        .get(`/api/v1/workspace/escrows/${mockStartupId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].deal_id).toBe('test-deal');
      expect(res.body.data[0].milestones).toHaveLength(1);
    });
  });
});
