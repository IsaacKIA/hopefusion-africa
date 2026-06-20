import request from 'supertest';
import { app, httpServer } from '../server.js';
import { mockDbReset, mockDbExpectQuery } from '../config/db.js';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('Impact & HopeScore Route Integration Tests', () => {
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

  describe('GET /api/v1/impact/hopescore/:startupId', () => {
    it('should successfully calculate HopeScore with fallback values', async () => {
      // Mock the SELECT query for startup and profiles by matching 'startup_profiles_v4'
      mockDbExpectQuery('startup_profiles_v4', [{
        startup_id: mockStartupId,
        name: 'Oasis Agri Tech',
        founder_id: mockUserId,
        sector: 'Agriculture',
        country: 'KE',
        stage: 'mvp',
        startup_node_id: 'node-1111',
        reputation_score: '0.002500',
        monthly_recurring_revenue: 5000.00,
        female_representation_percentage: 40.00,
        youth_representation_percentage: 60.00,
        sdg_alignment_targets: [2, 8],
        is_registered_incorporation: true,
        registry_number: 'RC-12345',
        incorporation_country: 'KE'
      }]);

      // Mock milestones query by matching 'escrow_milestones_v4'
      mockDbExpectQuery('escrow_milestones_v4', [{
        completed: 4,
        total: 5
      }]);

      // Mock PageRank average query by matching 'avg_rank'
      mockDbExpectQuery('avg_rank', [{
        avg_rank: 0.001000
      }]);

      const res = await request(app)
        .get(`/api/v1/impact/hopescore/${mockStartupId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hope_score).toBeDefined();
      expect(res.body.data.hope_score).toBeGreaterThanOrEqual(300);
      expect(res.body.data.hope_score).toBeLessThanOrEqual(850);
      expect(res.body.data.breakdown.identity_score).toBe(1.0); // True = 1.0
      expect(res.body.data.breakdown.execution_score).toBe(0.8); // 4 / 5 = 0.8
    });
  });

  describe('GET /api/v1/impact/passport/:startupId', () => {
    it('should successfully generate and stream PDF Impact Passport', async () => {
      mockDbExpectQuery('startup_profiles_v4', [{
        startup_id: mockStartupId,
        name: 'Oasis Agri Tech',
        founder_id: mockUserId,
        sector: 'Agriculture',
        country: 'KE',
        stage: 'mvp',
        startup_node_id: 'node-1111',
        reputation_score: '0.002500',
        monthly_recurring_revenue: 5000.00,
        female_representation_percentage: 40.00,
        youth_representation_percentage: 60.00,
        sdg_alignment_targets: [2, 8],
        is_registered_incorporation: true,
        registry_number: 'RC-12345',
        incorporation_country: 'KE'
      }]);

      mockDbExpectQuery('escrow_milestones_v4', [{
        completed: 4,
        total: 5
      }]);

      mockDbExpectQuery('avg_rank', [{
        avg_rank: 0.001000
      }]);

      // Additional query inside passport routing for name details
      mockDbExpectQuery('SELECT name, sector, country', [{
        name: 'Oasis Agri Tech',
        sector: 'Agriculture',
        country: 'KE'
      }]);

      const res = await request(app)
        .get(`/api/v1/impact/passport/${mockStartupId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body).toBeDefined();
    });
  });
});
