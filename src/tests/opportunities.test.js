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

jest.unstable_mockModule('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        this.messages = {
          create: jest.fn(async () => {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    title: 'Mock Opportunity from Claude',
                    description: 'A parsed mock opportunity description',
                    opportunity_type: 'grant',
                    value_amount: 50000,
                    currency: 'USD',
                    eligible_countries: ['KE', 'UG'],
                    eligible_sectors: ['Agriculture'],
                    eligible_stages: ['mvp'],
                    deadline: '2026-12-31T00:00:00Z',
                    metadata: {
                      application_url: 'https://example.com/apply',
                      funder_name: 'Mock Funder',
                      requirements: ['Must be agtech']
                    }
                  })
                }
              ]
            };
          })
        };
      }
    }
  };
});

// Import dynamically so mocks are applied beforehand
const { app, httpServer } = await import('../server.js');
const { mockDbReset, mockDbExpectQuery } = await import('../config/db.js');
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('Opportunities Route Integration Tests', () => {
  let startupToken;
  let adminToken;
  const mockUserId = '11111111-2222-4333-8444-555555555555';
  const mockAdminId = '88888888-8888-4888-8888-888888888888';
  const mockStartupId = '99999999-9999-4999-8999-999999999999';

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

  describe('POST /api/v1/opportunities', () => {
    it('should allow Admin to create a new opportunity', async () => {
      mockDbExpectQuery('INSERT INTO opportunities', [{
        id: 'opp-1111',
        title: 'Tech Seed Fund',
        opportunity_type: 'investment',
        value_amount: 100000.00,
        currency: 'USD'
      }]);

      const res = await request(app)
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tech Seed Fund',
          description: 'Investment round for tech startups',
          opportunity_type: 'investment',
          value_amount: 100000.00,
          currency: 'USD',
          eligible_countries: ['NG', 'GH'],
          eligible_sectors: ['Fintech'],
          eligible_stages: ['mvp', 'early_traction'],
          deadline: '2026-10-31T23:59:59Z',
          metadata: { funder: 'Capital Partners' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Tech Seed Fund');
    });

    it('should reject non-admin requests with 403', async () => {
      const res = await request(app)
        .post('/api/v1/opportunities')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          title: 'Unauthorised Opp',
          opportunity_type: 'grant'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/opportunities', () => {
    it('should retrieve list of opportunities', async () => {
      mockDbExpectQuery('SELECT id, title', [
        { id: '1', title: 'Agri Grant' },
        { id: '2', title: 'Fintech Accelerator' }
      ]);

      const res = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/v1/opportunities/:id', () => {
    it('should retrieve a single opportunity by ID', async () => {
      const oppId = '55555555-5555-5555-5555-555555555555';
      mockDbExpectQuery('SELECT id, title', [{
        id: oppId,
        title: 'Single Grant'
      }]);

      const res = await request(app)
        .get(`/api/v1/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Single Grant');
    });

    it('should return 404 if opportunity not found', async () => {
      mockDbExpectQuery('SELECT id, title', []);

      const res = await request(app)
        .get('/api/v1/opportunities/notfound')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/opportunities/parse', () => {
    it('should parse unstructured text via Claude', async () => {
      const res = await request(app)
        .post('/api/v1/opportunities/parse')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          raw_text: 'Agri tech grant of 50k for farmers in East Africa.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Mock Opportunity from Claude');
    });
  });

  describe('GET /api/v1/opportunities/matches', () => {
    it('should return similarity matched opportunities for a startup', async () => {
      // 1. Mock startup profile retrieval
      mockDbExpectQuery('SELECT * FROM startups WHERE founder_id', [{
        id: mockStartupId,
        name: 'Farm Tech Ltd',
        country: 'KE',
        sector: 'Agriculture',
        stage: 'mvp',
        embedding: '[0.1,0.2]'
      }]);

      // 2. Mock match opportunities function results
      mockDbExpectQuery('match_opportunities', [{
        id: 'opp-matched-1111',
        title: 'East Africa Food Security Grant',
        raw_similarity: 0.82,
        adjusted_score: 0.97,
        description: 'Grant details'
      }]);

      const res = await request(app)
        .get('/api/v1/opportunities/matches')
        .set('Authorization', `Bearer ${startupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].adjusted_score).toBe(0.97);
    });
  });
});
