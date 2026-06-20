import { jest } from '@jest/globals';

// ─── HOISTED ESM MODULE MOCKS ──────────────────────────────────
jest.unstable_mockModule('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        this.messages = {
          create: jest.fn(async (options) => {
            let responseText = '{}';
            const userContent = options.messages[0].content;

            if (userContent.includes('Write a compelling grant proposal')) {
              responseText = JSON.stringify({
                draft: "This is a mock draft proposal answer for smallholder farmers.",
                word_count: 10,
                strengths_leveraged: ["Kenya location", "Agriculture sector"],
                suggested_edits: ["Add visual traction graph"]
              });
            } else if (userContent.includes('Draft a personalized investor outreach')) {
              responseText = JSON.stringify({
                subject: "Outreach: Agritech Scaling in Kenya",
                body: "Hello Standard Bank team, we saw your agritech thesis...",
                personalization_hooks: ["Agriculture focus", "Kenya expansion"],
                call_to_action: "Are you free for a call?"
              });
            } else if (userContent.includes('Assess whether this startup qualifies')) {
              responseText = JSON.stringify({
                eligible: true,
                eligibility_score: 85,
                verdict: "Highly eligible",
                criteria_check: [{ criterion: "Stage match", met: true, note: "MVP is eligible" }],
                strengths: ["Great team"],
                gaps: ["No legal registration yet"],
                application_tips: ["Prepare pitch deck"],
                success_probability: "High",
                recommended_actions: ["Apply now"],
                alternative_grants: []
              });
            } else if (userContent.includes('Find the best grant programmes')) {
              responseText = JSON.stringify({
                grants: [
                  {
                    name: "Mock Grant A",
                    organisation: "Mock Funder A",
                    amount: "$50,000",
                    deadline: "2026-12-31",
                    match_score: 95,
                    match_reason: "Matches agritech focus",
                    region: "East Africa",
                    type: "Non-dilutive",
                    url: "https://mock.com",
                    urgency: "Apply now"
                  }
                ],
                total_available: 50000,
                strategy: "Focus on East Africa grant application first."
              });
            }

            return {
              content: [
                {
                  type: "text",
                  text: responseText
                }
              ],
              usage: {
                input_tokens: 100,
                output_tokens: 150
              }
            };
          }),
          stream: jest.fn(async () => {
            const mockStream = {
              [Symbol.asyncIterator]: async function* () {
                yield {
                  type: 'content_block_delta',
                  delta: {
                    type: 'text_delta',
                    text: 'Mock chat reply stream'
                  }
                };
              },
              finalMessage: async () => ({
                usage: { input_tokens: 10, output_tokens: 20 }
              })
            };
            return mockStream;
          })
        };
      }
    }
  };
});

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
const { mockDbReset } = await import('../config/db.js');
const request = (await import('supertest')).default;
const jwt = (await import('jsonwebtoken')).default;

process.env.JWT_SECRET = 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.NO_LISTEN = 'true';

describe('V4 AI Workers & Assistant Integration Tests', () => {
  let startupToken;
  const mockUserId = '11111111-2222-4333-8444-555555555555';

  beforeAll(() => {
    startupToken = jwt.sign({ userId: mockUserId, role: 'startup' }, process.env.JWT_SECRET);
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

  describe('POST /api/v1/ai/grants/write', () => {
    it('should draft a grant application response', async () => {
      const res = await request(app)
        .post('/api/v1/ai/grants/write')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          startup: { name: 'FarmTech', sector: 'Agriculture', country: 'KE' },
          grant: { title: 'Agritech Fund', sponsor: 'Gov' },
          question: 'What is your impact strategy?',
          word_limit: 200
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.draft).toContain('smallholder farmers');
      expect(res.body.data.word_count).toBe(10);
    });

    it('should reject requests missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/v1/ai/grants/write')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          startup: { name: 'FarmTech' }
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/ai/fundraiser/draft', () => {
    it('should draft investor outreach messages', async () => {
      const res = await request(app)
        .post('/api/v1/ai/fundraiser/draft')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          startup: { name: 'FarmTech', stage: 'mvp', funding_goal: 50000 },
          investor: { firm_name: 'Standard Bank VC', thesis: 'Agritech scaling' },
          channel: 'email',
          tone: 'professional'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toBe('Outreach: Agritech Scaling in Kenya');
      expect(res.body.data.body).toContain('Standard Bank');
    });

    it('should reject invalid channel or tone with 400', async () => {
      const res = await request(app)
        .post('/api/v1/ai/fundraiser/draft')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          startup: { name: 'FarmTech' },
          investor: { firm_name: 'Standard Bank VC' },
          channel: 'smoke-signals',
          tone: 'silly'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/ai/grants/check & /grants/discover', () => {
    it('should successfully run eligibility checking', async () => {
      const res = await request(app)
        .post('/api/v1/ai/grants/check')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          startup: { name: 'FarmTech' },
          grant: { title: 'Agritech Fund' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eligible).toBe(true);
    });

    it('should successfully run grants discovery', async () => {
      const res = await request(app)
        .post('/api/v1/ai/grants/discover')
        .set('Authorization', `Bearer ${startupToken}`)
        .send({
          startup: { name: 'FarmTech' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grants[0].name).toBe('Mock Grant A');
    });
  });
});
