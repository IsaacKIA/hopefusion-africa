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

describe('Ghana KYB Registrar Integration Tests', () => {
  let token;
  const mockUserId = '11111111-2222-4333-8444-555555555555';
  const mockStartupId = '99999999-9999-4999-8999-999999999999';
  const mockGraphNodeId = '77777777-7777-4777-8777-777777777777';

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

  describe('POST /api/v1/startups/verify-kyb', () => {
    it('should successfully verify a valid Ghana ORC registration number', async () => {
      // 1. Startup lookup query
      mockDbExpectQuery('SELECT id FROM startups WHERE founder_id = $1', [
        { id: mockStartupId }
      ]);
      // 2. Graph node lookup query
      mockDbExpectQuery('SELECT id FROM graph_nodes WHERE entity_type', [
        { id: mockGraphNodeId }
      ]);
      // 3. Profile existence check query
      mockDbExpectQuery('SELECT id FROM startup_profiles_v4 WHERE startup_node_id = $1', [
        { id: 'profile-v4-id' }
      ]);
      // 4. Update query in startup_profiles_v4
      mockDbExpectQuery('UPDATE startup_profiles_v4', []);

      const res = await request(app)
        .post('/api/v1/startups/verify-kyb')
        .set('Authorization', `Bearer ${token}`)
        .send({
          registry_number: 'CS123452026',
          incorporation_country: 'GH'
        });

      if (res.status !== 200) {
        console.error('DEBUG VERIFY ERROR:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.company_name).toBe('GHANA INNOVATION HUB 12345 LTD');
      expect(res.body.data.registrar).toContain('Ghana');
    });

    it('should reject non-Ghana country codes at this stage', async () => {
      const res = await request(app)
        .post('/api/v1/startups/verify-kyb')
        .set('Authorization', `Bearer ${token}`)
        .send({
          registry_number: 'RC123456',
          incorporation_country: 'NG'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Only Ghana registry verification is supported');
    });

    it('should reject invalid Ghana registry format', async () => {
      const res = await request(app)
        .post('/api/v1/startups/verify-kyb')
        .set('Authorization', `Bearer ${token}`)
        .send({
          registry_number: '123456ABC',
          incorporation_country: 'GH'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid Ghana registry number format');
    });
  });
});
