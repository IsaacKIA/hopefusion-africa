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

  // Auto-handle the is_verified middleware lookup: default to verified=true
  // so tests that don't explicitly mock this query are not blocked by the
  // email verification gate added to the authenticate() middleware.
  if (sql.includes('SELECT is_verified FROM users WHERE id')) {
    return { rows: [{ is_verified: true }] };
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
    connectionTimeoutMillis: 10000,
  });

  // Real Redis client (supports Upstash rediss:// TLS URLs)
  const redisUrl = process.env.REDIS_URL || '';
  const realRedis = createClient({
    url: redisUrl,
    socket: {
      ...(redisUrl.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : {}),
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries >= 3) {
          return new Error('Redis unavailable — running without cache');
        }
        return Math.min(retries * 1000, 3000);
      },
    },
  });

  const devMemoryStore = {};
  const devHashStore = {};

  const safeRedisProxy = {
    isOpen: false,
    _realClient: realRedis,
    get: async (key) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.get(key); } catch {}
      }
      return devMemoryStore[key] || null;
    },
    set: async (key, val, options) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.set(key, val, options); } catch {}
      }
      devMemoryStore[key] = val;
      return 'OK';
    },
    setEx: async (key, ttl, val) => {
      if (safeRedisProxy.isOpen) {
        try { await realRedis.setEx(key, ttl, val); return; } catch {}
      }
      devMemoryStore[key] = val;
    },
    del: async (key) => {
      if (safeRedisProxy.isOpen) {
        try { await realRedis.del(key); return; } catch {}
      }
      delete devMemoryStore[key];
    },
    incr: async (key) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.incr(key); } catch {}
      }
      const val = (parseInt(devMemoryStore[key]) || 0) + 1;
      devMemoryStore[key] = val.toString();
      return val;
    },
    expire: async (key, ttl) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.expire(key, ttl); } catch {}
      }
      return 1;
    },
    hSet: async (hash, field, val) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.hSet(hash, field, val); } catch {}
      }
      if (!devHashStore[hash]) devHashStore[hash] = {};
      devHashStore[hash][field] = val;
      return 1;
    },
    hGet: async (hash, field) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.hGet(hash, field); } catch {}
      }
      return devHashStore[hash]?.[field] || null;
    },
    hDel: async (hash, field) => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.hDel(hash, field); } catch {}
      }
      if (devHashStore[hash]) {
        delete devHashStore[hash][field];
      }
      return 1;
    },
    ping: async () => {
      if (safeRedisProxy.isOpen) {
        try { return await realRedis.ping(); } catch {}
      }
      return 'PONG';
    },
    quit: async () => {
      if (safeRedisProxy.isOpen) {
        try { await realRedis.quit(); return; } catch {}
      }
    },
    disconnect: async () => {
      if (safeRedisProxy.isOpen) {
        try { await realRedis.disconnect(); return; } catch {}
      }
    },
    connect: async () => {
      try {
        await realRedis.connect();
        safeRedisProxy.isOpen = true;
      } catch (err) {
        safeRedisProxy.isOpen = false;
      }
    }
  };

  realRedis.on('connect', () => {
    safeRedisProxy.isOpen = true;
    console.log('[Redis] Connected successfully');
  });
  realRedis.on('error', (err) => {
    safeRedisProxy.isOpen = false;
    if (!realRedis._errorLogged) {
      console.warn('[Redis] Not available — falling back to local memory store for cache/OTP.');
      realRedis._errorLogged = true;
    }
  });

  safeRedisProxy.connect().catch(() => {});
  
  redisInstance = safeRedisProxy;
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
