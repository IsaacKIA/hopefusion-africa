import pg from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Mock testing stores & utilities
export const redisMockStore = {};
let mockQueries = [];

export const mockDbReset = () => {
  mockQueries = [];
  for (const key in redisMockStore) {
    delete redisMockStore[key];
  }
};

/**
 * Registers an expected query execution and the rows to return.
 * @param {string|RegExp|Function} matcher - String inclusion, RegExp, or checker function.
 * @param {Array} resultRows - The mock rows to return on match.
 */
export const mockDbExpectQuery = (matcher, resultRows) => {
  mockQueries.push({ matcher, resultRows });
};

const dbMockQueryHandler = async (sql, params) => {
  const match = mockQueries.find((q) => {
    if (typeof q.matcher === 'string') return sql.includes(q.matcher);
    if (q.matcher instanceof RegExp) return q.matcher.test(sql);
    if (typeof q.matcher === 'function') return q.matcher(sql, params);
    return false;
  });

  if (match) {
    return { rows: match.resultRows };
  }

  const upperSql = sql.trim().toUpperCase();
  if (upperSql === 'BEGIN' || upperSql === 'COMMIT' || upperSql === 'ROLLBACK') {
    return { rows: [] };
  }

  console.warn(`[DbMock] Unmatched query executed: ${sql} with params:`, params);
  return { rows: [] };
};

// Connections
let dbInstance;
let redisInstance;

if (process.env.NODE_ENV === 'test') {
  // DB Mock Client
  const mockClient = {
    query: async (sql, params) => dbMockQueryHandler(sql, params),
    release: () => {},
  };

  dbInstance = {
    query: async (sql, params) => dbMockQueryHandler(sql, params),
    connect: async () => mockClient,
  };

  redisInstance = {
    isOpen: true,
    get: async (key) => redisMockStore[key] || null,
    setEx: async (key, ttl, val) => { redisMockStore[key] = val; },
    del: async (key) => { delete redisMockStore[key]; },
    incr: async (key) => {
      const val = (parseInt(redisMockStore[key]) || 0) + 1;
      redisMockStore[key] = val.toString();
      return val;
    },
    expire: async () => 1,
    ping: async () => 'PONG',
    connect: async () => {},
  };
} else {
  const dbUrl = process.env.DATABASE_URL || '';
  dbInstance = new Pool({
    connectionString: dbUrl,
    ssl: (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Real Redis client (supports Upstash rediss:// TLS URLs)
  const redisUrl = process.env.REDIS_URL || '';
  redisInstance = createClient({
    url: redisUrl,
    socket: {
      ...(redisUrl.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : {}),
      connectTimeout: 10000,
      reconnectStrategy: (retries) => {
        if (retries >= 5) {
          console.error('[Redis] Max reconnect attempts reached. Giving up.');
          return new Error('Redis max retries exceeded');
        }
        return Math.min(retries * 500, 3000);
      },
    },
  });
  redisInstance.on('error', (err) => {
    console.error('[Redis] Client error:', err);
  });
  redisInstance.connect()
    .then(() => console.log('[Redis] Connected successfully'))
    .catch((err) => console.error('[Redis] Connection error:', err));
}

export const db = dbInstance;
export const redis = redisInstance;

// Cache helper functions
export const cacheGet = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key, val, ttlSeconds = 300) => {
  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(val));
  } catch {}
};

export const cacheDel = async (key) => {
  try {
    await redis.del(key);
  } catch {}
};
