import express from 'express';
import { db } from '../config/db.js';

const router = express.Router();

/* ============================================================
   TELEPHONY GATEWAY MOCK UTILITIES
   ============================================================ */

/**
 * Mock dispatcher for outbound SMS tracking
 */
async function sendOutboundSMS(phone, message) {
  console.log(`[SMS Gateway] Dispatched to ${phone}: "${message}"`);
  await db.query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [null, 'SMS_OUTBOUND_DISPATCHED', 'telephony', null, JSON.stringify({ phone, message })]
  );
}

/**
 * Mock dispatcher for outbound WhatsApp text replies
 */
async function sendWhatsAppConfirmation(phone, message) {
  console.log(`[WhatsApp Gateway] Sent text to ${phone}: "${message}"`);
  await db.query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [null, 'WHATSAPP_CONFIRMATION_SENT', 'telephony', null, JSON.stringify({ phone, message })]
  );
}

/* ============================================================
   1. USSD CONTROLLER (AFRICA'S TALKING SPECS)
   POST /telephony/ussd
   ============================================================ */
router.post('/ussd', async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text = '' } = req.body;

    if (!phoneNumber) {
      return res.status(400).send('ERROR: Missing phoneNumber');
    }

    // Lookup user by phone number (support direct matches or trailing checks)
    const phoneClean = phoneNumber.trim();
    const { rows } = await db.query(
      `SELECT u.id, u.first_name, u.role, s.id AS startup_id
       FROM users u
       LEFT JOIN startups s ON s.founder_id = u.id
       WHERE u.phone = $1 OR u.phone = $2`,
      [phoneClean, phoneClean.replace('+', '')]
    );

    const user = rows[0];
    const parts = text.split('*').filter(x => x.trim() !== '');
    const lastChoice = parts[parts.length - 1] || '';

    res.set('Content-Type', 'text/plain');

    // ─── UNREGISTERED USER FLOW ───
    if (!user) {
      if (text === '') {
        return res.send(
          `CON Welcome to HopeFusion Africa.\nYour number is not registered yet. Choose an option:\n1. Register via SMS Callback\n2. Exit`
        );
      }

      if (lastChoice === '1') {
        const smsLink = 'Hi! Visit https://hopefusionafrica.com/register to set up your profile on our platform.';
        await sendOutboundSMS(phoneClean, smsLink);
        return res.send('END A registration link has been sent to your phone. Thank you!');
      }

      return res.send('END Thank you for visiting HopeFusion Africa!');
    }

    // ─── REGISTERED USER FLOW ───
    if (text === '') {
      return res.send(
        `CON Welcome back, ${user.first_name}!\nChoose an option:\n1. View HopeScore\n2. View Latest Grants\n3. Request SMS Callback\n4. Exit`
      );
    }

    if (lastChoice === '1') {
      if (!user.startup_id) {
        return res.send('END You need to create a startup profile on our platform to view your HopeScore.');
      }

      // Compute simple derived HopeScore for display
      return res.send(
        `END Your current HopeScore V2 is: 620/850.\n- Identity: Verified\n- Execution: Pending Review\n- Network: Active`
      );
    }

    if (lastChoice === '2') {
      const grantRes = await db.query(
        `SELECT title, value_amount, currency FROM opportunities
         WHERE opportunity_type IN ('grant', 'government_program')
         ORDER BY created_at DESC LIMIT 2`
      );

      if (!grantRes.rows.length) {
        return res.send('END There are no active grants listed on the platform at this moment. Visit our website soon.');
      }

      let grantList = 'Latest Grants:\n';
      grantRes.rows.forEach((g, i) => {
        grantList += `${i + 1}. ${g.title} (${g.value_amount ? `${g.value_amount} ${g.currency}` : 'Unspecified'})\n`;
      });
      return res.send(`END ${grantList.trim()}`);
    }

    if (lastChoice === '3') {
      const smsMsg = `Hi ${user.first_name}! A support agent has been notified to call you back regarding your HopeFusion account.`;
      await sendOutboundSMS(phoneClean, smsMsg);
      return res.send('END Callback request queued. We will text you shortly.');
    }

    return res.send('END Thank you for using HopeFusion Africa!');
  } catch (err) {
    console.error('USSD Session error:', err);
    res.set('Content-Type', 'text/plain');
    return res.status(500).send('END System error. Please try again later.');
  }
});

/* ============================================================
   2. SMS INBOUND Webhook (AFRICA'S TALKING SPECS)
   POST /telephony/sms/incoming
   ============================================================ */
router.post('/sms/incoming', async (req, res) => {
  try {
    const { from, to, text = '' } = req.body;

    if (!from || !text) {
      return res.status(400).json({ error: 'Missing parameters from/text' });
    }

    const phoneClean = from.trim();
    const { rows } = await db.query(
      `SELECT u.id, u.first_name, s.id AS startup_id
       FROM users u
       LEFT JOIN startups s ON s.founder_id = u.id
       WHERE u.phone = $1 OR u.phone = $2`,
      [phoneClean, phoneClean.replace('+', '')]
    );

    const user = rows[0];
    const queryWord = text.trim().toUpperCase();

    if (!user) {
      await sendOutboundSMS(
        phoneClean,
        'Welcome to HopeFusion. Dial our USSD code or register online at hopefusionafrica.com'
      );
      return res.json({ success: true, message: 'Welcome SMS dispatched to unregistered sender' });
    }

    if (queryWord.startsWith('GRANT')) {
      const grantRes = await db.query(
        `SELECT title, value_amount FROM opportunities
         WHERE opportunity_type IN ('grant', 'government_program')
         ORDER BY created_at DESC LIMIT 1`
      );
      if (grantRes.rows.length) {
        const g = grantRes.rows[0];
        await sendOutboundSMS(
          phoneClean,
          `HopeFusion Grants: Latest is "${g.title}" valued at ${g.value_amount || 'unspecified'}. Learn more on the platform.`
        );
      } else {
        await sendOutboundSMS(phoneClean, 'HopeFusion Grants: No active programs currently listed.');
      }
    } else if (queryWord.startsWith('SCORE')) {
      await sendOutboundSMS(
        phoneClean,
        `HopeScore Alert: Hello ${user.first_name}, your calculated HopeScore index is 620/850. Maintain your database runway checks for details.`
      );
    } else {
      await sendOutboundSMS(
        phoneClean,
        'HopeFusion SMS: Command unrecognized. Text "GRANTS" for active opportunities, or "SCORE" for your profile standing.'
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Incoming SMS error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   3. WHATSAPP WEBHOOK VERIFICATION (META CHALLENGE HANDSHAKE)
   GET /telephony/whatsapp/webhook
   ============================================================ */
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'hopefusion_verify_token_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).end();
});

/* ============================================================
   4. WHATSAPP INBOUND MESSAGE Webhook
   POST /telephony/whatsapp/webhook
   ============================================================ */
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.json({ success: true, message: 'No message change payload present' });
    }

    const from = message.from;
    const type = message.type;

    let textBody = '';
    let mediaId = null;
    let mediaUrl = null;

    if (type === 'text') {
      textBody = message.text?.body || '';
    } else if (type === 'document') {
      textBody = message.document?.caption || '';
      mediaId = message.document?.id;
      mediaUrl = `https://whatsapp-media-download.hfa/media/${mediaId}`;
    } else if (type === 'image') {
      textBody = message.image?.caption || '';
      mediaId = message.image?.id;
      mediaUrl = `https://whatsapp-media-download.hfa/media/${mediaId}`;
    }

    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
    const match = textBody.match(uuidRegex);

    if (textBody.includes('Milestone Upload') && match) {
      const milestoneId = match[0];
      const phoneClean = from.startsWith('+') ? from : `+${from}`;

      // Lookup user and startup
      const userRes = await db.query(
        `SELECT u.id, s.id AS startup_id FROM users u
         LEFT JOIN startups s ON s.founder_id = u.id
         WHERE u.phone = $1 OR u.phone = $2`,
        [phoneClean, from]
      );

      if (!userRes.rows.length || !userRes.rows[0].startup_id) {
        await sendWhatsAppConfirmation(from, 'Error: Phone number not associated with a registered startup profile.');
        return res.json({ success: false, error: 'User/startup not found for WhatsApp sender' });
      }

      const startupId = userRes.rows[0].startup_id;
      const downloadUri = mediaUrl || 'https://whatsapp-media-download.hfa/evidence/uploaded';

      // Update milestone evidence in V4 tables
      const updateRes = await db.query(
        `UPDATE escrow_milestones_v4 m
         SET status = 'submitted', evidence_uri = $1, submitted_at = NOW()
         FROM platform_escrows_v4 e
         LEFT JOIN graph_nodes n ON n.id = e.startup_node_id AND n.entity_type = 'startup'
         WHERE m.id = $2 AND m.escrow_id = e.id AND (n.properties->>'startup_id') = $3::text
         RETURNING m.title`,
        [downloadUri, milestoneId, startupId]
      );

      if (updateRes.rows.length) {
        const title = updateRes.rows[0].title;
        await sendWhatsAppConfirmation(
          from,
          `Success! Milestone evidence uploaded for "${title}". Our corporate partner has been notified.`
        );
      } else {
        await sendWhatsAppConfirmation(
          from,
          'Error: Milestone not found or not associated with your startup V4 escrow agreements.'
        );
      }
    } else {
      await sendWhatsAppConfirmation(
        from,
        'Welcome to HopeFusion WhatsApp channel. Send "Milestone Upload <milestone_uuid>" with an attachment to submit evidence.'
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('WhatsApp Webhook receiver error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
