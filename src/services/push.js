/**
 * HopeFusion Africa — Push Notification Service
 * Unified FCM (Firebase Cloud Messaging) + VAPID Web Push delivery.
 * Tries FCM first, falls back to Web Push for browsers without FCM.
 */

import { db } from '../config/db.js';
import webpush from 'web-push';

/* ── VAPID Web Push Configuration ────────────────────────────── */
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@hopefusion.africa',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/* ── Firebase Admin Lazy Initializer ─────────────────────────── */
let firebaseApp = null;

async function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    return null; // FCM not configured — skip silently
  }
  try {
    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      firebaseApp = admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      firebaseApp = admin.default.apps[0];
    }
    return admin.default;
  } catch (err) {
    console.error('[Push] Firebase admin init failed:', err.message);
    return null;
  }
}

/* ================================================================
   sendPush — Main public function
   payload: { title, body, icon?, url?, data? }
   ================================================================ */
export async function sendPush(userId, payload) {
  if (!userId || !payload?.title) return;

  // Fetch all subscriptions for this user
  let rows;
  try {
    ({ rows } = await db.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1',
      [userId]
    ));
  } catch (err) {
    console.error('[Push] DB lookup failed:', err.message);
    return;
  }

  if (!rows.length) return; // User has no push subscriptions

  const staleIds = [];

  for (const sub of rows) {
    try {
      if (sub.type === 'fcm' && sub.fcm_token) {
        await sendFCM(sub.fcm_token, payload);
      } else if (sub.type === 'webpush' && sub.endpoint) {
        await sendWebPush(sub, payload);
      }
    } catch (err) {
      const isStale =
        err.statusCode === 410 ||    // Gone — subscription expired
        err.statusCode === 404 ||    // Not found
        err.code === 'messaging/registration-token-not-registered';

      if (isStale) {
        staleIds.push(sub.id);
      } else {
        console.error(`[Push] Delivery failed for sub ${sub.id}:`, err.message);
      }
    }
  }

  // Clean up expired subscriptions
  if (staleIds.length) {
    await db.query(
      'DELETE FROM push_subscriptions WHERE id = ANY($1)',
      [staleIds]
    ).catch(() => {});
    console.log(`[Push] Cleaned ${staleIds.length} stale subscription(s) for user ${userId}`);
  }
}

/* ── FCM Delivery ─────────────────────────────────────────────── */
async function sendFCM(token, payload) {
  const admin = await getFirebaseAdmin();
  if (!admin) return; // FCM not configured

  const message = {
    token,
    notification: {
      title: payload.title,
      body:  payload.body || '',
    },
    webpush: {
      fcmOptions: { link: payload.url || '/' },
      notification: {
        icon:  payload.icon  || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data:  payload.data  || {},
      },
    },
    data: payload.data ? Object.fromEntries(
      Object.entries(payload.data).map(([k, v]) => [k, String(v)])
    ) : {},
  };

  await admin.messaging().send(message);
}

/* ── VAPID Web Push Delivery ──────────────────────────────────── */
async function sendWebPush(sub, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return; // VAPID not configured

  const pushPayload = JSON.stringify({
    title: payload.title,
    body:  payload.body  || '',
    icon:  payload.icon  || '/icons/icon-192x192.png',
    url:   payload.url   || '/',
    data:  payload.data  || {},
  });

  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth:   sub.auth,
      },
    },
    pushPayload,
    { TTL: 86400 } // 24-hour time-to-live
  );
}

/* ── Convenience Wrappers ─────────────────────────────────────── */

export const pushNewMessage = (userId, senderName, preview) =>
  sendPush(userId, {
    title: `💬 New message from ${senderName}`,
    body:  preview,
    url:   '/dashboard',
    data:  { type: 'message' },
  });

export const pushIncomingCall = (userId, callerName, callType) =>
  sendPush(userId, {
    title: `${callType === 'video' ? '📹' : '📞'} ${callerName} is calling you`,
    body:  `Incoming ${callType} call`,
    url:   '/dashboard',
    data:  { type: 'call' },
  });

export const pushNewMatch = (userId, matchInfo) =>
  sendPush(userId, {
    title: `🎯 New AI Match — Score ${matchInfo.score}%`,
    body:  matchInfo.description || 'A new high-quality match was found for you.',
    url:   '/matching',
    data:  { type: 'match', ...matchInfo },
  });

export const pushMilestoneReleased = (userId, amount, currency) =>
  sendPush(userId, {
    title: `💰 Escrow Milestone Released`,
    body:  `${currency} ${amount.toLocaleString()} has been unlocked for you.`,
    url:   '/dashboard',
    data:  { type: 'escrow' },
  });

export const pushGrantUpdate = (userId, grantName, status) =>
  sendPush(userId, {
    title: `📋 Grant Update: ${status}`,
    body:  `Your application for "${grantName}" has been updated.`,
    url:   '/grants',
    data:  { type: 'grant' },
  });
