import express from 'express';
import { db, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { mentorProfileSchema } from '../schemas/startup.schema.js';

const router = express.Router();

/* ============================================================
   MENTOR SESSION ROUTES
   ============================================================ */

// POST /sessions — book a session
router.post('/sessions', authenticate, async (req, res) => {
  try {
    const { mentor_id, title, agenda, session_type, format, scheduled_at, duration_min } = req.body;
    if (!mentor_id || !title || !scheduled_at) {
      return res.status(400).json({ error: 'mentor_id, title and scheduled_at required' });
    }

    // Automatically find startup_id if user has one
    const startup = await db.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
    const startupId = startup.rows.length ? startup.rows[0].id : null;

    const { rows } = await db.query(
      `INSERT INTO mentor_sessions (mentor_id, mentee_id, startup_id, title, agenda, session_type, format, scheduled_at, duration_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [mentor_id, req.user.userId, startupId, title, agenda, session_type || 'one_on_one', format || 'video', scheduled_at, duration_min || 60]
    );

    // Notify mentor
    const mentorUser = await db.query('SELECT user_id FROM mentors WHERE id = $1', [mentor_id]);
    if (mentorUser.rows.length) {
      const targetUserId = mentorUser.rows[0].user_id;
      const notifTitle = 'New session booked';
      const notifBody = `A session "${title}" has been scheduled.`;

      await db.query(
        'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
        [targetUserId, 'session_booked', notifTitle, notifBody]
      );

      // Emit active socket notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${targetUserId}`).emit('notification:new', {
          type: 'session_reminder',
          title: notifTitle,
          body: notifBody,
          created_at: new Date(),
        });
      }
    }

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /sessions — list sessions for current startup or mentor
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role === 'mentor') {
      const mentor = await db.query('SELECT id FROM mentors WHERE user_id = $1', [req.user.userId]);
      if (!mentor.rows.length) {
        return res.status(404).json({ error: 'Mentor profile not found' });
      }
      const mentorId = mentor.rows[0].id;
      
      const { rows } = await db.query(
        `SELECT s.*, 
                u.first_name as mentee_first_name, 
                u.last_name as mentee_last_name, 
                u.avatar_url as mentee_avatar_url,
                u.bio as mentee_bio,
                st.name as startup_name,
                st.tagline as startup_tagline
         FROM mentor_sessions s
         JOIN users u ON s.mentee_id = u.id
         LEFT JOIN startups st ON s.startup_id = st.id
         WHERE s.mentor_id = $1
         ORDER BY s.scheduled_at DESC`,
        [mentorId]
      );
      return res.json({ success: true, data: rows });
    } else {
      // Treat as startup/mentee role
      const { rows } = await db.query(
        `SELECT s.*, 
                u.first_name as mentor_first_name, 
                u.last_name as mentor_last_name, 
                u.avatar_url as mentor_avatar_url,
                u.bio as mentor_bio,
                m.expertise as mentor_expertise
         FROM mentor_sessions s
         JOIN mentors m ON s.mentor_id = m.id
         JOIN users u ON m.user_id = u.id
         WHERE s.mentee_id = $1
         ORDER BY s.scheduled_at DESC`,
        [req.user.userId]
      );
      return res.json({ success: true, data: rows });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /sessions/:id/status — update session status (live, completed, cancelled)
router.patch('/sessions/:id/status', authenticate, async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const sessionRes = await db.query(
      `SELECT s.*, m.user_id as mentor_user_id 
       FROM mentor_sessions s 
       JOIN mentors m ON s.mentor_id = m.id 
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!sessionRes.rows.length) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionRes.rows[0];
    if (session.mentee_id !== req.user.userId && session.mentor_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this session' });
    }

    const { rows } = await db.query(
      `UPDATE mentor_sessions 
       SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() 
       WHERE id = $3 RETURNING *`,
      [status, notes || null, req.params.id]
    );

    const targetUserId = session.mentee_id === req.user.userId ? session.mentor_user_id : session.mentee_id;
    const notifTitle = `Session status updated`;
    const notifBody = `Your session "${session.title}" status has been set to ${status}.`;

    await db.query(
      'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
      [targetUserId, 'session_status_update', notifTitle, notifBody]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('notification:new', {
        type: 'session_update',
        title: notifTitle,
        body: notifBody,
        created_at: new Date(),
      });
      io.to(`session:${req.params.id}`).emit('session:updated', rows[0]);
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// POST /mentors — create/update mentor profile
router.post('/mentors', authenticate, authorize('mentor'), validate(mentorProfileSchema), async (req, res) => {
  try {
    const updates = req.body;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE mentors SET ${sets}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
      [req.user.userId, ...Object.values(updates)]
    );

    await cacheDel(`user:${req.user.userId}`);

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /mentors — list mentors
router.get('/mentors', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const { rows } = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.avatar_url, u.bio
       FROM mentors m JOIN users u ON u.id = m.user_id
       WHERE m.is_available = TRUE AND u.is_active = TRUE
       ORDER BY m.avg_rating DESC NULLS LAST, m.total_sessions DESC LIMIT $1`,
      [parseInt(limit)]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   NOTIFICATION ROUTES
   ============================================================ */

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND NOT is_read',
      [req.user.userId]
    );
    return res.json({ success: true, data: rows, unread: parseInt(count) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.userId]);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   MESSAGING ROUTES
   ============================================================ */

router.post('/messages', authenticate, async (req, res) => {
  try {
    const { recipient_id, content, thread_id } = req.body;
    if (!recipient_id || !content) {
      return res.status(400).json({ error: 'recipient_id and content required' });
    }
    const tId = thread_id || [req.user.userId, recipient_id].sort().join(':');
    const { rows } = await db.query(
      'INSERT INTO messages (sender_id, recipient_id, thread_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, recipient_id, tId, content]
    );
    const msg = rows[0];

    // Emit real-time message via socket.io if users are connected
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipient_id}`).emit('message:received', msg);
      io.to(`user:${req.user.userId}`).emit('message:received', msg);
    }

    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/messages/threads', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (thread_id) m.*,
        u.first_name, u.last_name, u.avatar_url,
        COUNT(*) FILTER (WHERE NOT m.is_read AND m.recipient_id = $1) OVER (PARTITION BY m.thread_id) as unread
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
       WHERE m.sender_id = $1 OR m.recipient_id = $1
       ORDER BY m.thread_id, m.created_at DESC`,
      [req.user.userId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ANALYTICS ROUTES (admin only)
   ============================================================ */

router.get('/admin/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cached = await cacheGet('admin:analytics');
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const [users, startups, matches, grants, sessions, growth, roleDistrib, matchByStatus, recentActivity] = await Promise.all([
      // Core KPIs
      db.query(`SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE role='startup') as startups,
                COUNT(*) FILTER (WHERE role='investor') as investors,
                COUNT(*) FILTER (WHERE role='mentor') as mentors,
                COUNT(*) FILTER (WHERE is_active = FALSE) as suspended,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d
                FROM users`),
      db.query(`SELECT COUNT(*) as total,
                COALESCE(SUM(funding_goal),0) as total_funding_sought,
                COALESCE(SUM(funding_raised),0) as total_funded
                FROM startups WHERE status='active'`),
      db.query(`SELECT COUNT(*) as total,
                ROUND(AVG(ai_score)) as avg_score,
                COUNT(*) FILTER (WHERE status='invested') as converted
                FROM matches`),
      db.query(`SELECT COUNT(*) as total,
                COALESCE(SUM(awarded_amount),0) as total_awarded,
                COUNT(*) FILTER (WHERE status='awarded') as awarded
                FROM grant_applications`),
      db.query(`SELECT COUNT(*) as total FROM mentor_sessions WHERE status='completed'`),

      // 30-day daily signup growth
      db.query(`SELECT DATE_TRUNC('day', created_at)::DATE as date, COUNT(*) as count
                FROM users WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY 1 ORDER BY 1`),

      // Role distribution
      db.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),

      // Match status breakdown
      db.query(`SELECT status, COUNT(*) as count FROM matches GROUP BY status`),

      // Recent audit activity
      db.query(`SELECT a.*, u.first_name, u.last_name, u.email
                FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
                ORDER BY a.created_at DESC LIMIT 10`),
    ]);

    const analytics = {
      users:          users.rows[0],
      startups:       startups.rows[0],
      matches:        matches.rows[0],
      grants:         grants.rows[0],
      sessions:       sessions.rows[0],
      growth:         growth.rows,
      role_distrib:   roleDistrib.rows,
      match_statuses: matchByStatus.rows,
      recent_activity: recentActivity.rows,
      generated_at:   new Date().toISOString(),
    };
    await cacheSet('admin:analytics', analytics, 60);
    return res.json({ success: true, data: analytics });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ── Admin User Management ───────────────────────────────────── */

router.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search = '', role, status, page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['1=1'];
    const params     = [];
    let idx          = 1;

    if (search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (role)   { conditions.push(`u.role = $${idx}`);      params.push(role);   idx++; }
    if (status === 'active')    conditions.push('u.is_active = TRUE');
    if (status === 'suspended') conditions.push('u.is_active = FALSE');

    const where = conditions.join(' AND ');

    const [rows, countRow] = await Promise.all([
      db.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role,
                u.is_active, u.is_verified, u.country, u.created_at, u.last_login
         FROM users u WHERE ${where}
         ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params),
    ]);

    return res.json({
      success: true,
      data:    rows.rows,
      total:   parseInt(countRow.rows[0].count),
      page:    parseInt(page),
      limit:   parseInt(limit),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/admin/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active (boolean) required' });
    }
    const { rows } = await db.query(
      'UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING id,email,is_active',
      [is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    // Audit log
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, metadata)
       VALUES ($1, $2, 'user', $3, $4)`,
      [req.user.userId, is_active ? 'user_activated' : 'user_suspended', req.params.id,
       JSON.stringify({ by: req.user.userId })]
    ).catch(() => {});

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, metadata)
       VALUES ($1,'user_deleted','user',$2,$3)`,
      [req.user.userId, req.params.id, JSON.stringify({ by: req.user.userId })]
    ).catch(() => {});
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ── Activity Feed ───────────────────────────────────────────── */

router.get('/admin/activity', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { limit = 50, page = 1, action, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (action)  { conditions.push(`a.action = $${idx}`);  params.push(action);  idx++; }
    if (user_id) { conditions.push(`a.user_id = $${idx}`); params.push(user_id); idx++; }

    const { rows } = await db.query(
      `SELECT a.*, u.first_name, u.last_name, u.email, u.role
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, parseInt(limit), offset]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   HEALTH CHECK
   ============================================================ */

router.get('/health', async (req, res) => {
  try {
    const start  = Date.now();
    const dbOk   = await db.query('SELECT 1').then(() => true).catch(() => false);
    const dbMs   = Date.now() - start;

    // Try Redis via its own ping
    let redisOk = false;
    let redisMs = 0;
    try {
      const { redis } = await import('../config/db.js');
      const t0 = Date.now();
      await redis.ping();
      redisMs = Date.now() - t0;
      redisOk = true;
    } catch { redisOk = false; }

    const status = dbOk && redisOk ? 'ok' : dbOk ? 'degraded' : 'error';

    return res.json({
      status,
      services: {
        database: { status: dbOk  ? 'ok' : 'error', latency_ms: dbMs },
        cache:    { status: redisOk ? 'ok' : 'error', latency_ms: redisMs },
      },
      system: {
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        env: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

