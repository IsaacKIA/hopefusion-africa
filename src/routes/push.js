/**
 * HopeFusion Africa — Push Subscription REST Routes
 * Mounted at /api/v1/push
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { db } from '../config/db.js';
import { sendPush } from '../services/push.js';

const router = Router();

// All push routes require authentication
router.use(authenticate);

/* ================================================================
   POST /api/v1/push/subscribe
   Save a Web Push subscription or FCM token for this user.
   Body (Web Push):  { type: 'webpush', endpoint, p256dh, auth, deviceLabel? }
   Body (FCM):       { type: 'fcm', fcmToken, deviceLabel? }
   ================================================================ */
router.post('/subscribe', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, endpoint, p256dh, auth, fcmToken, fcm_token, deviceLabel } = req.body;
    const token = fcmToken || fcm_token;

    if (!type || !['webpush', 'fcm'].includes(type)) {
      return res.status(400).json({ error: 'type must be "webpush" or "fcm"' });
    }

    if (type === 'webpush') {
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: 'endpoint, p256dh, and auth required for webpush' });
      }

      // Upsert — update if endpoint already registered, insert otherwise
      await db.query(
        `INSERT INTO push_subscriptions (user_id, type, endpoint, p256dh, auth, device_label, updated_at)
         VALUES ($1, 'webpush', $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, endpoint)
         DO UPDATE SET p256dh=$3, auth=$4, device_label=$5, updated_at=NOW()`,
        [userId, endpoint, p256dh, auth, deviceLabel || 'Browser']
      );
    } else {
      // FCM
      if (!token) {
        return res.status(400).json({ error: 'fcmToken required for fcm type' });
      }

      await db.query(
        `INSERT INTO push_subscriptions (user_id, type, fcm_token, device_label, updated_at)
         VALUES ($1, 'fcm', $2, $3, NOW())
         ON CONFLICT (user_id, fcm_token)
         DO UPDATE SET device_label=$3, updated_at=NOW()`,
        [userId, token, deviceLabel || 'App']
      );
    }

    res.status(201).json({
      success: true,
      message: 'Push subscription saved',
      data: {
        type,
        endpoint,
        deviceLabel: deviceLabel || (type === 'webpush' ? 'Browser' : 'App')
      }
    });
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ================================================================
   DELETE /api/v1/push/unsubscribe
   Remove a push subscription on logout or permission revoke.
   Body: { endpoint? } or { fcmToken? } or { fcm_token? } — removes matching subscription.
   ================================================================ */
router.delete('/unsubscribe', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { endpoint, fcmToken, fcm_token } = req.body || {};
    const token = fcmToken || fcm_token;

    if (!endpoint && !token) {
      return res.status(400).json({ error: 'endpoint or fcmToken/fcm_token required' });
    }

    if (endpoint) {
      await db.query(
        'DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2',
        [userId, endpoint]
      );
    } else {
      await db.query(
        'DELETE FROM push_subscriptions WHERE user_id=$1 AND fcm_token=$2',
        [userId, token]
      );
    }

    res.json({ success: true, message: 'Push subscription removed' });
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ================================================================
   GET /api/v1/push/subscriptions
   List this user's active push subscriptions (for account settings UI).
   ================================================================ */
router.get('/subscriptions', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, device_label, created_at, updated_at,
              LEFT(endpoint, 40) AS endpoint_preview
       FROM push_subscriptions
       WHERE user_id=$1
       ORDER BY updated_at DESC`,
      [req.user.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================================================
   POST /api/v1/push/test
   Send a test push notification to the calling user (debug/dev).
   ================================================================ */
router.post('/test', async (req, res) => {
  try {
    await sendPush(req.user.userId, {
      title: '🔔 HopeFusion Push Test',
      body:  'Push notifications are working correctly!',
      url:   '/dashboard',
      data:  { type: 'test' },
    });
    res.json({ success: true, message: 'Test push notification sent' });
  } catch (err) {
    console.error('[Push] Test error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
