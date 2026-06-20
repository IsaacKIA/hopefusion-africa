/**
 * HopeFusion Africa — Real-time Messaging + WebRTC Signalling
 * Unified Socket.io server — uses shared db/redis pools from config/db.js
 * No private pools — avoids Supabase connection exhaustion.
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// ✅ Use shared connection pools — no private pool instantiation
import { db, redis } from './config/db.js';
import { pushNewMessage, pushIncomingCall } from './services/push.js';

/* ================================================================
   ATTACH SOCKET.IO TO HTTP SERVER
   ================================================================ */
export function attachSocketIO(httpServer, corsOptions) {
  const io = new Server(httpServer, {
    cors:         corsOptions || { origin: process.env.FRONTEND_URL || '*', credentials: true },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  /* ── AUTH MIDDLEWARE ─────────────────────────────────────────── */
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token && socket.handshake.headers?.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie.split(';').map(c => c.trim().split('='))
        );
        token = cookies.hfa_token;
      }

      if (!token) return next(new Error('No token — authentication required'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const { rows } = await db.query(
        'SELECT id, first_name, last_name, role, avatar_url FROM users WHERE id=$1 AND is_active=TRUE',
        [payload.userId]
      );
      if (!rows.length) return next(new Error('User not found'));

      socket.user = rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  /* ── PRESENCE TRACKING ───────────────────────────────────────── */
  const activeSockets = new Map(); // userId -> Set<socketId>

  /* ── CONNECTION ──────────────────────────────────────────────── */
  io.on('connection', async (socket) => {
    const { id: userId, first_name, last_name, role } = socket.user;
    console.log(`[WS] Connected: ${first_name} ${last_name} (${role}) — socket ${socket.id}`);

    // Join personal room for DMs & notifications
    socket.join(`user:${userId}`);

    // Multi-device presence tracking
    if (!activeSockets.has(userId)) activeSockets.set(userId, new Set());
    activeSockets.get(userId).add(socket.id);

    // Track online presence in Redis
    await redis.hSet('online_users', String(userId), JSON.stringify({
      socket_id: socket.id,
      user_id:   userId,
      name:      `${first_name} ${last_name}`,
      role,
      online_at: new Date().toISOString(),
    }));

    // Broadcast presence to all connected clients
    socket.broadcast.emit('user:online', { user_id: userId, name: `${first_name} ${last_name}` });

    // Send unread notifications count on connect
    try {
      const { rows } = await db.query(
        'SELECT COUNT(*) AS unread FROM notifications WHERE user_id=$1 AND NOT is_read',
        [userId]
      );
      socket.emit('notifications:unread_count', { count: parseInt(rows[0].unread) });
    } catch { /* non-fatal */ }

    /* ── MESSAGING ──────────────────────────────────────────────── */

    // Send a message
    socket.on('message:send', async (data, callback) => {
      try {
        const { recipient_id, content, thread_id, attachments = [] } = data;
        if (!recipient_id || !content?.trim()) {
          return callback?.({ error: 'recipient_id and content required' });
        }

        const tId = thread_id || [userId, recipient_id].sort().join(':');

        const { rows } = await db.query(
          `INSERT INTO messages (sender_id, recipient_id, thread_id, content, attachments)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [userId, recipient_id, tId, content.trim(), JSON.stringify(attachments)]
        );
        const message = rows[0];

        const enriched = {
          ...message,
          sender: { id: userId, first_name, last_name, role, avatar_url: socket.user.avatar_url },
        };

        // Deliver to recipient if online
        io.to(`user:${recipient_id}`).emit('message:received', enriched);

        // Deliver to sender (other tabs/devices)
        socket.to(`user:${userId}`).emit('message:sent', enriched);

        // Push notification if recipient offline
        const recipientOnline = await redis.hGet('online_users', String(recipient_id));
        if (!recipientOnline) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, body, data)
             VALUES ($1,'message',$2,$3,$4)`,
            [
              recipient_id,
              `New message from ${first_name} ${last_name}`,
              content.slice(0, 80),
              JSON.stringify({ thread_id: tId, sender_id: userId }),
            ]
          );
          // 🔔 Push notification to device
          pushNewMessage(recipient_id, `${first_name} ${last_name}`, content.slice(0, 60)).catch(() => {});
        }

        callback?.({ success: true, data: enriched });
      } catch (err) {
        console.error('[WS] message:send error:', err);
        callback?.({ error: err.message });
      }
    });

    // Mark thread messages as read
    socket.on('message:read', async ({ thread_id }, callback) => {
      try {
        await db.query(
          'UPDATE messages SET is_read=TRUE WHERE thread_id=$1 AND recipient_id=$2 AND NOT is_read',
          [thread_id, userId]
        );
        const { rows } = await db.query(
          'SELECT DISTINCT sender_id FROM messages WHERE thread_id=$1 AND recipient_id=$2',
          [thread_id, userId]
        );
        rows.forEach(r => {
          io.to(`user:${r.sender_id}`).emit('message:read_receipt', { thread_id, reader_id: userId });
        });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // Typing indicators
    socket.on('message:typing', ({ thread_id, recipient_id }) => {
      io.to(`user:${recipient_id}`).emit('message:typing', {
        thread_id, user_id: userId, name: `${first_name} ${last_name}`,
      });
    });

    socket.on('message:typing_stop', ({ thread_id, recipient_id }) => {
      io.to(`user:${recipient_id}`).emit('message:typing_stop', { thread_id, user_id: userId });
    });

    // Load thread history (paginated)
    socket.on('messages:thread', async ({ thread_id, before, limit = 30 }, callback) => {
      try {
        const { rows } = await db.query(
          `SELECT m.*, u.first_name, u.last_name, u.avatar_url
           FROM messages m JOIN users u ON u.id=m.sender_id
           WHERE m.thread_id=$1 ${before ? 'AND m.created_at < $3' : ''}
           ORDER BY m.created_at DESC LIMIT $2`,
          before ? [thread_id, limit, before] : [thread_id, limit]
        );
        callback?.({ success: true, data: rows.reverse() });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    /* ── NOTIFICATIONS ──────────────────────────────────────────── */

    socket.on('notifications:mark_read', async ({ notification_id }, callback) => {
      try {
        if (notification_id) {
          await db.query(
            'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2',
            [notification_id, userId]
          );
        } else {
          await db.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [userId]);
        }
        const { rows } = await db.query(
          'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND NOT is_read',
          [userId]
        );
        socket.emit('notifications:unread_count', { count: parseInt(rows[0].count) });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    /* ── WEBRTC SIGNALLING ──────────────────────────────────────── */

    // Initiate a video/audio call
    socket.on('call:initiate', async ({ recipient_id, call_type, session_id }, callback) => {
      try {
        const call_id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const callData = {
          call_id,
          caller_id:     userId,
          caller_name:   `${first_name} ${last_name}`,
          caller_avatar: socket.user.avatar_url,
          call_type,       // 'video' | 'audio'
          session_id,      // optional — links to mentor session
          initiated_at:  new Date().toISOString(),
        };

        // Store call state in Redis (5 min TTL while ringing)
        await redis.setEx(
          `call:${call_id}`,
          300,
          JSON.stringify({ ...callData, recipient_id, status: 'ringing' })
        );

        // Persist call record to DB for audit trail
        try {
          await db.query(
            `INSERT INTO call_logs (call_id, caller_id, recipient_id, call_type, session_id, status, initiated_at)
             VALUES ($1,$2,$3,$4,$5,'ringing',$6)
             ON CONFLICT (call_id) DO NOTHING`,
            [call_id, userId, recipient_id, call_type, session_id || null, callData.initiated_at]
          );
        } catch { /* call_logs table may not exist yet — non-fatal */ }

        // Notify recipient via Socket.io
        io.to(`user:${recipient_id}`).emit('call:incoming', callData);

        // 🔔 Push notification if recipient offline
        const recipientOnline = await redis.hGet('online_users', String(recipient_id));
        if (!recipientOnline) {
          pushIncomingCall(recipient_id, `${first_name} ${last_name}`, call_type).catch(() => {});
        }

        callback?.({ success: true, call_id });
      } catch (err) {
        callback?.({ error: err.message });
      }
    });

    // Accept call
    socket.on('call:accept', async ({ call_id, caller_id }) => {
      const callRaw = await redis.get(`call:${call_id}`);
      if (!callRaw) return socket.emit('call:error', { message: 'Call expired or not found' });

      const call = JSON.parse(callRaw);
      call.status = 'connected';
      call.connected_at = new Date().toISOString();
      await redis.setEx(`call:${call_id}`, 3600, JSON.stringify(call));

      // Update DB log
      try {
        await db.query(
          `UPDATE call_logs SET status='connected', connected_at=NOW() WHERE call_id=$1`,
          [call_id]
        );
      } catch { /* non-fatal */ }

      io.to(`user:${caller_id}`).emit('call:accepted', { call_id, accepter_id: userId });
      socket.emit('call:accepted', { call_id });
    });

    // Decline call
    socket.on('call:decline', async ({ call_id, caller_id, reason = 'declined' }) => {
      await redis.del(`call:${call_id}`);
      try {
        await db.query(
          `UPDATE call_logs SET status=$1, ended_at=NOW() WHERE call_id=$2`,
          [reason, call_id]
        );
      } catch { /* non-fatal */ }
      io.to(`user:${caller_id}`).emit('call:declined', { call_id, reason });
    });

    // End call — logs duration, updates mentor session if linked
    socket.on('call:end', async ({ call_id, recipient_id, duration_seconds }) => {
      const callRaw = await redis.get(`call:${call_id}`);
      if (callRaw) {
        const call = JSON.parse(callRaw);
        await redis.del(`call:${call_id}`);

        // Update mentor session if this call was session-linked
        if (call.session_id) {
          try {
            await db.query(
              `UPDATE mentor_sessions SET status='completed', duration_min=$1 WHERE id=$2`,
              [Math.ceil((duration_seconds || 0) / 60), call.session_id]
            );
          } catch { /* non-fatal */ }
        }

        // Log final duration
        try {
          await db.query(
            `UPDATE call_logs SET status='ended', ended_at=NOW(), duration_seconds=$1 WHERE call_id=$2`,
            [duration_seconds || 0, call_id]
          );
        } catch { /* non-fatal */ }
      }
      io.to(`user:${recipient_id}`).emit('call:ended', { call_id, duration_seconds });
    });

    // WebRTC SDP offer → relay to recipient
    socket.on('webrtc:offer', ({ recipient_id, call_id, sdp }) => {
      io.to(`user:${recipient_id}`).emit('webrtc:offer', { caller_id: userId, call_id, sdp });
    });

    // WebRTC SDP answer → relay to caller
    socket.on('webrtc:answer', ({ caller_id, call_id, sdp }) => {
      io.to(`user:${caller_id}`).emit('webrtc:answer', { answerer_id: userId, call_id, sdp });
    });

    // ICE candidates → relay to peer
    socket.on('webrtc:ice_candidate', ({ recipient_id, call_id, candidate }) => {
      io.to(`user:${recipient_id}`).emit('webrtc:ice_candidate', { sender_id: userId, call_id, candidate });
    });

    // Screen share toggle
    socket.on('webrtc:screen_share', ({ recipient_id, call_id, sharing }) => {
      io.to(`user:${recipient_id}`).emit('webrtc:screen_share', { sender_id: userId, call_id, sharing });
    });

    // Media toggle (mute/unmute/camera on/off)
    socket.on('webrtc:media_toggle', ({ recipient_id, call_id, audio, video }) => {
      io.to(`user:${recipient_id}`).emit('webrtc:media_toggle', { sender_id: userId, call_id, audio, video });
    });

    /* ── LIVE SESSIONS ──────────────────────────────────────────── */

    socket.on('live:join', async ({ session_id }, callback) => {
      socket.join(`session:${session_id}`);
      const roomSize = io.sockets.adapter.rooms.get(`session:${session_id}`)?.size || 0;

      socket.to(`session:${session_id}`).emit('live:participant_joined', {
        user_id: userId,
        name:    `${first_name} ${last_name}`,
        role,
        avatar:  socket.user.avatar_url,
        count:   roomSize,
      });

      await redis.hSet(`session:${session_id}:participants`, String(userId), JSON.stringify({
        user_id: userId,
        name:    `${first_name} ${last_name}`,
        role,
        joined_at: new Date().toISOString(),
      }));

      callback?.({ success: true, participant_count: roomSize });
    });

    socket.on('live:leave', async ({ session_id }) => {
      socket.leave(`session:${session_id}`);
      await redis.hDel(`session:${session_id}:participants`, String(userId));
      const roomSize = io.sockets.adapter.rooms.get(`session:${session_id}`)?.size || 0;
      socket.to(`session:${session_id}`).emit('live:participant_left', {
        user_id: userId, name: `${first_name} ${last_name}`, count: roomSize,
      });
    });

    socket.on('live:question', ({ session_id, question }) => {
      io.to(`session:${session_id}`).emit('live:question', {
        user_id:  userId,
        name:     `${first_name} ${last_name}`,
        question,
        asked_at: new Date().toISOString(),
      });
    });

    socket.on('live:raise_hand', ({ session_id }) => {
      io.to(`session:${session_id}`).emit('live:hand_raised', {
        user_id: userId, name: `${first_name} ${last_name}`,
      });
    });

    socket.on('live:reaction', ({ session_id, emoji }) => {
      io.to(`session:${session_id}`).emit('live:reaction', {
        user_id: userId, name: `${first_name} ${last_name}`, emoji,
      });
    });

    /* ── MATCH SUBSCRIPTIONS ────────────────────────────────────── */

    socket.on('subscribe:matches', ({ startup_id }) => {
      socket.join(`matches:${startup_id}`);
    });

    /* ── DISCONNECT ─────────────────────────────────────────────── */
    socket.on('disconnect', async (reason) => {
      console.log(`[WS] Disconnected: ${first_name} ${last_name} — ${reason}`);

      const userSockets = activeSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeSockets.delete(userId);
          await redis.hDel('online_users', String(userId));
          socket.broadcast.emit('user:offline', { user_id: userId });
        }
      }
    });
  });

  /* ── EMIT HELPERS (call from backend routes / agent) ─────────── */
  io.emitNewMatch      = (startup_id, match)  => io.to(`matches:${startup_id}`).emit('match:new', match);
  io.emitNotification  = (user_id, notif)     => io.to(`user:${user_id}`).emit('notification:new', notif);
  io.emitGrantUpdate   = (user_id, update)    => io.to(`user:${user_id}`).emit('grant:status_update', update);
  io.broadcastPlatform = (event, data)        => io.emit(`platform:${event}`, data);

  return io;
}
