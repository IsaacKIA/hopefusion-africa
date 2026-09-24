/**
 * HopeFusion Africa — Test Suite Environment Setup
 * Sets up fallback variables for running tests on CI/CD (GitHub Actions)
 */

process.env.NODE_ENV = 'test';
process.env.NO_LISTEN = 'true';

// Fallback secrets to prevent module initialization crashes (e.g. passport-jwt)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtdevelopmentkeyforetestingruns';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.mock_test_key_for_testing';
