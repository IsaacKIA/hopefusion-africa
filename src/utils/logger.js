import { db } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  info: (event, metadata = {}, correlationId = null) => {
    log('INFO', event, metadata, correlationId);
  },
  warn: (event, metadata = {}, correlationId = null) => {
    log('WARN', event, metadata, correlationId);
  },
  error: (event, metadata = {}, correlationId = null) => {
    log('ERROR', event, metadata, correlationId);
  }
};

function log(level, event, metadata, correlationId) {
  const timestamp = new Date().toISOString();
  
  // Clean up metadata
  const cleanMetadata = { ...metadata };
  if (cleanMetadata.password) delete cleanMetadata.password;
  if (cleanMetadata.password_hash) delete cleanMetadata.password_hash;
  if (cleanMetadata.code) cleanMetadata.code = '[REDACTED]';
  if (cleanMetadata.code_hash) cleanMetadata.code_hash = '[REDACTED]';

  if (isProduction) {
    console.log(JSON.stringify({
      timestamp,
      level,
      correlationId,
      event,
      ...cleanMetadata
    }));
  } else {
    const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    const cidStr = correlationId ? ` [CID: ${correlationId}]` : '';
    console.log(`[${timestamp}] ${color}${level}${reset}:${cidStr} ${event}`, Object.keys(cleanMetadata).length ? JSON.stringify(cleanMetadata) : '');
  }
}

export async function writeAuditLog(userId, action, metadata = {}, ipAddress = null) {
  try {
    // Clean metadata of sensitive fields before inserting to DB
    const cleanMetadata = { ...metadata };
    if (cleanMetadata.password) delete cleanMetadata.password;
    if (cleanMetadata.password_hash) delete cleanMetadata.password_hash;
    if (cleanMetadata.code) cleanMetadata.code = '[REDACTED]';
    if (cleanMetadata.code_hash) cleanMetadata.code_hash = '[REDACTED]';

    await db.query(
      `INSERT INTO audit_log (user_id, action, metadata, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [userId, action, JSON.stringify(cleanMetadata), ipAddress]
    );
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log to database:', err.message);
  }
}
