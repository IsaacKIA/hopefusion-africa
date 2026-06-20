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

process.env.NO_LISTEN = 'true';

describe('V4 Telephony Integration Tests', () => {
  const mockUnregisteredPhone = '+233240000000';
  const mockRegisteredPhone = '+233241332246';
  const mockUserId = '11111111-2222-4333-8444-555555555555';
  const mockStartupId = '99999999-9999-4999-8999-999999999999';
  const mockMilestoneId = '33333333-3333-4333-8333-333333333333';

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

  describe('POST /api/v1/telephony/ussd', () => {
    it('should prompt unregistered users to register', async () => {
      // Mock db lookup for unregistered number
      mockDbExpectQuery('FROM users u', []);

      const res = await request(app)
        .post('/api/v1/telephony/ussd')
        .send({
          sessionId: 'session-1',
          serviceCode: '*384*#',
          phoneNumber: mockUnregisteredPhone,
          text: ''
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('CON Welcome to HopeFusion Africa.');
      expect(res.text).toContain('Choose an option:');
    });

    it('should queue SMS callback for unregistered user choosing option 1', async () => {
      mockDbExpectQuery('FROM users u', []);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/telephony/ussd')
        .send({
          sessionId: 'session-1',
          serviceCode: '*384*#',
          phoneNumber: mockUnregisteredPhone,
          text: '1'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('END A registration link has been sent');
    });

    it('should show registered users menu', async () => {
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, first_name: 'Ay', role: 'startup', startup_id: mockStartupId }
      ]);

      const res = await request(app)
        .post('/api/v1/telephony/ussd')
        .send({
          sessionId: 'session-2',
          serviceCode: '*384*#',
          phoneNumber: mockRegisteredPhone,
          text: ''
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('CON Welcome back, Ay!');
      expect(res.text).toContain('View HopeScore');
    });

    it('should display HopeScore standing for registered users (option 1)', async () => {
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, first_name: 'Ay', role: 'startup', startup_id: mockStartupId }
      ]);

      const res = await request(app)
        .post('/api/v1/telephony/ussd')
        .send({
          sessionId: 'session-2',
          serviceCode: '*384*#',
          phoneNumber: mockRegisteredPhone,
          text: '1'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('END Your current HopeScore V2 is: 620/850.');
    });

    it('should show latest grants for registered users (option 2)', async () => {
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, first_name: 'Ay', role: 'startup', startup_id: mockStartupId }
      ]);
      mockDbExpectQuery('FROM opportunities', [
        { title: 'Dakar Agritech Grant', value_amount: 25000, currency: 'USD' },
        { title: 'Kigali Innovation Fund', value_amount: 50000, currency: 'USD' }
      ]);

      const res = await request(app)
        .post('/api/v1/telephony/ussd')
        .send({
          sessionId: 'session-2',
          serviceCode: '*384*#',
          phoneNumber: mockRegisteredPhone,
          text: '2'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('END Latest Grants:');
      expect(res.text).toContain('Dakar Agritech Grant');
    });

    it('should request SMS callback for registered users (option 3)', async () => {
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, first_name: 'Ay', role: 'startup', startup_id: mockStartupId }
      ]);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/telephony/ussd')
        .send({
          sessionId: 'session-2',
          serviceCode: '*384*#',
          phoneNumber: mockRegisteredPhone,
          text: '3'
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('END Callback request queued');
    });
  });

  describe('POST /api/v1/telephony/sms/incoming', () => {
    it('should respond to incoming GRANTS SMS query', async () => {
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, first_name: 'Ay', startup_id: mockStartupId }
      ]);
      mockDbExpectQuery('FROM opportunities', [
        { title: 'Lagos Impact Grant', value_amount: 15000 }
      ]);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/telephony/sms/incoming')
        .send({
          from: mockRegisteredPhone,
          to: '384',
          text: 'GRANTS'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should respond to incoming SCORE SMS query', async () => {
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, first_name: 'Ay', startup_id: mockStartupId }
      ]);
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/telephony/sms/incoming')
        .send({
          from: mockRegisteredPhone,
          to: '384',
          text: 'SCORE'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/telephony/whatsapp/webhook', () => {
    it('should verify token handshake successfully', async () => {
      const res = await request(app)
        .get('/api/v1/telephony/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'hopefusion_verify_token_123',
          'hub.challenge': 'my-meta-challenge-123'
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('my-meta-challenge-123');
    });

    it('should reject invalid verify token with 403', async () => {
      const res = await request(app)
        .get('/api/v1/telephony/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'chall'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/telephony/whatsapp/webhook', () => {
    it('should parse WhatsApp milestone upload and update database V4 tables', async () => {
      // 1. Fetch user by WhatsApp sender
      mockDbExpectQuery('FROM users u', [
        { id: mockUserId, startup_id: mockStartupId }
      ]);

      // 2. Update milestone status
      mockDbExpectQuery('UPDATE escrow_milestones_v4 m', [
        { title: 'Alpha product delivery' }
      ]);

      // 3. Log confirmation message
      mockDbExpectQuery('INSERT INTO audit_log', []);

      const res = await request(app)
        .post('/api/v1/telephony/whatsapp/webhook')
        .send({
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        from: mockRegisteredPhone,
                        type: 'document',
                        document: {
                          id: 'doc-media-123',
                          caption: `Milestone Upload ${mockMilestoneId}`
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        });

      if (res.status !== 200) {
        console.error("DEBUG WHATSAPP WEBHOOK ERROR:", res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
