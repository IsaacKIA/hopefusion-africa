/**
 * HopeFusion Africa — Consolidated Payments & Escrow Router
 * Mounts at /api/v1/payments
 */

import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { db, cacheGet, cacheSet } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  paystackInitializeSchema,
  momoCollectSchema,
  momoDisburseSchema,
  flutterwaveInitializeSchema,
  escrowCreateSchema,
  escrowReleaseSchema
} from '../schemas/payments.schema.js';

const paymentsRouter = express.Router();

const PAYSTACK_SECRET   = process.env.PAYSTACK_SECRET_KEY;
const FLUTTERWAVE_KEY   = process.env.FLUTTERWAVE_SECRET_KEY;
const MTN_SUBSCRIPTION  = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
const MTN_API_USER      = process.env.MTN_MOMO_API_USER;
const MTN_API_KEY       = process.env.MTN_MOMO_API_KEY;
const WEBHOOK_SECRET    = process.env.PAYSTACK_WEBHOOK_SECRET;
const FRONTEND_URL      = process.env.FRONTEND_URL || 'http://localhost:3001';
const MTN_ENV           = process.env.MTN_TARGET_ENV || 'sandbox';

/* ============================================================
   PAYSTACK INTEGRATION
   ============================================================ */

// Initialize a Paystack transaction
paymentsRouter.post('/paystack/initialize', authenticate, validate(paystackInitializeSchema), async (req, res) => {
  try {
    const { email, amount_usd, currency = 'GHS', plan, metadata = {}, callback_url, channels } = req.body;

    // Convert USD to minor subunit (pesewas/kobo)
    const amountInSubunit = Math.round(amount_usd * 100);

    const payload = {
      email,
      amount: amountInSubunit,
      currency,
      plan,
      callback_url: callback_url || `${FRONTEND_URL}/payment/verify`,
      metadata: {
        ...metadata,
        platform: 'HopeFusion Africa',
        user_id: req.user.userId,
        cancel_action: `${FRONTEND_URL}/payment/cancelled`,
      },
      channels: channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    };

    const { data } = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    });

    return res.json({
      success: true,
      data: {
        authorization_url: data.data.authorization_url,
        access_code:       data.data.access_code,
        reference:         data.data.reference,
      },
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({ error: msg });
  }
});

// Verify a Paystack transaction status
paymentsRouter.get('/paystack/verify/:reference', authenticate, async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const txn = data.data;
    if (txn.status !== 'success') {
      return res.status(402).json({ error: 'Payment not successful', status: txn.status });
    }

    // Trigger Audit Log
    await db.query(
      'INSERT INTO audit_log (user_id, action, entity, ip_address, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, 'PAYMENT_VERIFIED', 'paystack', req.ip, JSON.stringify({ reference: txn.reference, amount: txn.amount / 100 })]
    );

    return res.json({
      success: true,
      data: {
        reference:    txn.reference,
        amount:       txn.amount / 100,
        currency:     txn.currency,
        channel:      txn.channel,
        paid_at:      txn.paid_at,
        customer:     txn.customer,
        metadata:     txn.metadata,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Create subscription plan on Paystack
paymentsRouter.post('/paystack/plans', authenticate, async (req, res) => {
  try {
    const { name, interval, amount_usd, currency = 'GHS', description } = req.body;
    const { data } = await axios.post('https://api.paystack.co/plan', {
      name,
      interval,
      amount: Math.round(parseFloat(amount_usd) * 100),
      currency,
      description,
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });

    return res.json({ success: true, data: data.data });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// List Paystack plans
paymentsRouter.get('/paystack/plans', authenticate, async (req, res) => {
  try {
    const cacheKey = 'payments:paystack_plans';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const { data } = await axios.get('https://api.paystack.co/plan', {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    
    await cacheSet(cacheKey, data.data, 300);
    return res.json({ success: true, data: data.data });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Request Paystack refund
paymentsRouter.post('/paystack/refund', authenticate, async (req, res) => {
  try {
    const { reference, amount } = req.body;
    const { data } = await axios.post('https://api.paystack.co/refund', {
      transaction: reference,
      amount: amount ? Math.round(amount * 100) : undefined,
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });

    return res.json({ success: true, data: data.data });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Paystack Webhook Handler
paymentsRouter.post('/paystack/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body      = req.body;
    const hash      = crypto.createHmac('sha512', WEBHOOK_SECRET || '').update(body).digest('hex');

    if (hash !== signature) return res.status(401).send('Invalid signature');

    const event = JSON.parse(body.toString());
    console.log('[Paystack Webhook] Event received:', event.event);

    // Business Logic updates (Audit logging, plan activations, etc.)
    await db.query(
      'INSERT INTO audit_log (action, entity, metadata) VALUES ($1, $2, $3)',
      ['WEBHOOK_RECEIVED', 'paystack', JSON.stringify({ event: event.event, reference: event.data?.reference })]
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error('[Paystack Webhook] Processing failed:', err.message);
    return res.status(500).send('Webhook Processing Error');
  }
});

/* ============================================================
   MTN MOBILE MONEY (MoMo API)
   ============================================================ */

async function getMTNToken(productType = 'collection') {
  const base64 = Buffer.from(`${MTN_API_USER}:${MTN_API_KEY}`).toString('base64');
  const { data } = await axios.post(
    `https://proxy.momoapi.mtn.com/${productType}/token/`,
    null,
    {
      headers: {
        Authorization: `Basic ${base64}`,
        'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
      },
    }
  );
  return data.access_token;
}

// Request payment collection from MoMo customer
paymentsRouter.post('/momo/collect', authenticate, validate(momoCollectSchema), async (req, res) => {
  try {
    const { phone, amount, currency = 'GHS', reference, description, payer_name } = req.body;
    const token     = await getMTNToken('collection');
    const requestId = reference || crypto.randomUUID();

    await axios.post(
      'https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay',
      {
        amount: amount.toString(),
        currency,
        externalId: requestId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phone.replace(/^\+/, ''),
        },
        payerMessage: description || 'HopeFusion Africa payment',
        payeeNote:    `Payment from ${payer_name || phone}`,
      },
      {
        headers: {
          Authorization:               `Bearer ${token}`,
          'X-Reference-Id':            requestId,
          'X-Target-Environment':      MTN_ENV,
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
          'Content-Type':              'application/json',
        },
      }
    );

    return res.json({
      success: true,
      data: {
        reference_id: requestId,
        status: 'pending',
        message: 'Payment request sent. Customer will receive a USSD prompt on their phone.',
      },
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(500).json({ error: msg });
  }
});

// Check status of a request-to-pay
paymentsRouter.get('/momo/status/:referenceId', authenticate, async (req, res) => {
  try {
    const token = await getMTNToken('collection');
    const { data } = await axios.get(
      `https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/${req.params.referenceId}`,
      {
        headers: {
          Authorization:               `Bearer ${token}`,
          'X-Target-Environment':      MTN_ENV,
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
        },
      }
    );

    return res.json({
      success: true,
      data: {
        reference_id: req.params.referenceId,
        status:   data.status,
        amount:   data.amount,
        currency: data.currency,
        payer:    data.payer,
        reason:   data.reason,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// MoMo disburse (Grant payout)
paymentsRouter.post('/momo/disburse', authenticate, validate(momoDisburseSchema), async (req, res) => {
  try {
    const { phone, amount, currency = 'GHS', reference, note } = req.body;
    const token     = await getMTNToken('disbursement');
    const requestId = reference || crypto.randomUUID();

    await axios.post(
      'https://proxy.momoapi.mtn.com/disbursement/v1_0/transfer',
      {
        amount: amount.toString(),
        currency,
        externalId: requestId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: phone.replace(/^\+/, ''),
        },
        payerMessage: note || 'HopeFusion Africa grant disbursement',
        payeeNote:    'HopeFusion grant payment',
      },
      {
        headers: {
          Authorization:               `Bearer ${token}`,
          'X-Reference-Id':            requestId,
          'X-Target-Environment':      MTN_ENV,
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
          'Content-Type':              'application/json',
        },
      }
    );

    return res.json({ success: true, data: { reference_id: requestId, status: 'pending' } });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

/* ============================================================
   FLUTTERWAVE INTEGRATION
   ============================================================ */

// Initialize Flutterwave cross-border transaction
paymentsRouter.post('/flutterwave/initialize', authenticate, validate(flutterwaveInitializeSchema), async (req, res) => {
  try {
    const { amount, currency = 'NGN', email, phone, name, tx_ref, redirect_url, payment_options, meta } = req.body;
    const cleanRef = tx_ref || `HFA-${Date.now()}`;

    const { data } = await axios.post('https://api.flutterwave.com/v3/payments', {
      tx_ref:          cleanRef,
      amount,
      currency,
      redirect_url:    redirect_url || `${FRONTEND_URL}/payment/flw-verify`,
      payment_options: payment_options || 'card,mobilemoneyghana,mobilemoneyrwanda,mobilemoneyzambia,ussd',
      customer: { email, phone_number: phone, name },
      customizations: {
        title:       'HopeFusion Africa',
        description: 'Empowering African startups',
        logo:        'https://hopefusionafrica.com/logo.png',
      },
      meta,
    }, {
      headers: { Authorization: `Bearer ${FLUTTERWAVE_KEY}`, 'Content-Type': 'application/json' },
    });

    return res.json({ success: true, data: { payment_link: data.data.link, tx_ref: data.data.tx_ref ?? cleanRef } });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Verify Flutterwave transaction
paymentsRouter.get('/flutterwave/verify/:tx_ref', authenticate, async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.flutterwave.com/v3/transactions?tx_ref=${req.params.tx_ref}`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_KEY}` } }
    );

    const txn = data.data?.[0];
    if (!txn || txn.status !== 'successful') {
      return res.status(402).json({ error: 'Transaction not successful', status: txn?.status });
    }

    return res.json({
      success: true,
      data: {
        id:         txn.id,
        tx_ref:     txn.tx_ref,
        amount:     txn.amount,
        currency:   txn.currency,
        status:     txn.status,
        payment_type: txn.payment_type,
        customer:   txn.customer,
        created_at: txn.created_at,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// Flutterwave Webhook
paymentsRouter.post('/flutterwave/webhook', async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const signature  = req.headers['verif-hash'];
    if (signature !== secretHash) return res.status(401).send('Invalid signature');

    const event = JSON.parse(req.body.toString());
    console.log('[Flutterwave Webhook] Completed transaction:', event.data?.tx_ref);

    await db.query(
      'INSERT INTO audit_log (action, entity, metadata) VALUES ($1, $2, $3)',
      ['WEBHOOK_RECEIVED', 'flutterwave', JSON.stringify({ tx_ref: event.data?.tx_ref, status: event.data?.status })]
    );

    return res.sendStatus(200);
  } catch (err) {
    return res.status(500).send('Webhook Processing Error');
  }
});

/* ============================================================
   CORE SUBSCRIPTION PLANS
   ============================================================ */

paymentsRouter.get('/plans', authenticate, async (req, res) => {
  try {
    const cacheKey = 'payments:plans';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const plans = [
      {
        id:          'startup_free',
        name:        'Startup Free',
        price_usd:   0,
        interval:    null,
        features:    ['Profile listing','5 AI matches/month','3 grant applications','Community access'],
        limits:      { ai_matches: 5, grant_apps: 3, messages: 20 },
      },
      {
        id:          'startup_pro',
        name:        'Startup Pro',
        price_usd:   29,
        price_ghs:   290,
        price_ngn:   27000,
        interval:    'monthly',
        paystack_plan: process.env.PAYSTACK_STARTUP_PRO_PLAN,
        features:    ['Unlimited AI matches','Unlimited grant applications','Priority investor visibility',
                      'Pitch deck AI analysis','Financial model builder','Verified badge'],
        limits:      { ai_matches: -1, grant_apps: -1, messages: -1 },
      },
      {
        id:          'investor_pro',
        name:        'Investor Pro',
        price_usd:   99,
        price_ghs:   990,
        interval:    'monthly',
        paystack_plan: process.env.PAYSTACK_INVESTOR_PRO_PLAN,
        features:    ['Full startup database access','Advanced AI matching filters','Deal room access',
                      'Direct messaging','Analytics dashboard','Dedicated account manager'],
        limits:      { ai_matches: -1, messages: -1 },
      },
      {
        id:          'mentor_pro',
        name:        'Mentor Pro',
        price_usd:   49,
        price_ghs:   490,
        interval:    'monthly',
        features:    ['Unlimited mentee slots','Live session hosting','Session recording',
                      'Mentor analytics','Featured listing','Certificate issuance'],
      },
    ];

    await cacheSet(cacheKey, plans, 300);
    return res.json({ success: true, data: plans });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   PERSISTENT IMPACT ESCROW GATEWAY
   ============================================================ */

// Create Escrow and Milestone slots
paymentsRouter.post('/escrow/create', authenticate, validate(escrowCreateSchema), async (req, res) => {
  try {
    const { startup_id, investor_id, amount, currency = 'USD', milestones } = req.body;

    // Verify startup existence
    const startupCheck = await db.query('SELECT id FROM startups WHERE id = $1', [startup_id]);
    if (!startupCheck.rows.length) {
      return res.status(404).json({ error: 'Startup profile not found' });
    }

    // Verify investor existence
    const investorCheck = await db.query('SELECT id, first_name, last_name FROM users WHERE id = $1', [investor_id]);
    if (!investorCheck.rows.length) {
      return res.status(404).json({ error: 'Investor user not found' });
    }

    // Begin Transaction
    await db.query('BEGIN');

    // Create central Escrow Record
    const escrowRes = await db.query(
      `INSERT INTO escrows (startup_id, investor_id, amount, currency)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [startup_id, investor_id, Math.round(amount), currency]
    );
    const escrow = escrowRes.rows[0];

    // Create Milestones
    const milestoneRows = [];
    for (const m of milestones) {
      const mRes = await db.query(
        `INSERT INTO escrow_milestones (escrow_id, title, amount, evidence_required)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [escrow.id, m.title, Math.round(m.amount), m.evidence_required !== false]
      );
      milestoneRows.push(mRes.rows[0]);
    }

    await db.query('COMMIT');

    // Audit logs
    await db.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, 'ESCROW_CREATED', 'escrows', escrow.id, JSON.stringify({ amount, currency, milestonesCount: milestones.length })]
    );

    return res.status(201).json({
      success: true,
      data: {
        ...escrow,
        milestones: milestoneRows,
      },
    });
  } catch (err) {
    await db.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
});

// Release a milestone payout
paymentsRouter.post('/escrow/:escrowId/milestone/:milestoneId/release', authenticate, validate(escrowReleaseSchema), async (req, res) => {
  try {
    const { escrowId, milestoneId } = req.params;
    const { evidence_url, notes } = req.body;

    // Fetch Milestone details
    const mRes = await db.query(
      'SELECT * FROM escrow_milestones WHERE id = $1 AND escrow_id = $2',
      [milestoneId, escrowId]
    );
    if (!mRes.rows.length) {
      return res.status(404).json({ error: 'Milestone not found under this escrow ID' });
    }
    const milestone = mRes.rows[0];

    if (milestone.status === 'released') {
      return res.status(400).json({ error: 'Milestone funds have already been released' });
    }

    // Begin Transaction
    await db.query('BEGIN');

    // Update Milestone status
    const updatedMRes = await db.query(
      `UPDATE escrow_milestones
       SET status = 'released', evidence_url = $1, released_at = NOW()
       WHERE id = $2 RETURNING *`,
      [evidence_url || null, milestoneId]
    );
    const updatedMilestone = updatedMRes.rows[0];

    // Fetch Escrow & Founder
    const escrowRes = await db.query(
      `SELECT e.*, s.founder_id, s.name as startup_name
       FROM escrows e
       JOIN startups s ON s.id = e.startup_id
       WHERE e.id = $1`,
      [escrowId]
    );
    const escrow = escrowRes.rows[0];

    // Check if all milestones are released, to mark the entire Escrow completed
    const checkMilestones = await db.query(
      'SELECT COUNT(*) as locked_count FROM escrow_milestones WHERE escrow_id = $1 AND status != $2',
      [escrowId, 'released']
    );

    let updatedEscrowStatus = escrow.status;
    if (parseInt(checkMilestones.rows[0].locked_count) === 0) {
      const escrowUpdate = await db.query(
        "UPDATE escrows SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING status",
        [escrowId]
      );
      updatedEscrowStatus = escrowUpdate.rows[0].status;
    }

    await db.query('COMMIT');

    // Notify Startup Founder of payout release
    if (escrow) {
      const notifTitle = '💰 Escrow Milestone Released!';
      const notifBody = `Funds of ${updatedMilestone.amount} ${escrow.currency} for milestone "${updatedMilestone.title}" have been disbursed to your account.`;
      
      await db.query(
        'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
        [escrow.founder_id, 'escrow_release', notifTitle, notifBody]
      );

      // Emit Live Web Socket Notification
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${escrow.founder_id}`).emit('notification:new', {
          type: 'escrow_release',
          title: notifTitle,
          body: notifBody,
          created_at: new Date(),
        });
      }
    }

    // Audit logs
    await db.query(
      'INSERT INTO audit_log (user_id, action, entity, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.userId, 'ESCROW_MILESTONE_RELEASED', 'escrow_milestones', milestoneId, JSON.stringify({ escrowId, status: updatedEscrowStatus })]
    );

    return res.json({
      success: true,
      data: {
        escrow_id:    escrowId,
        milestone:    updatedMilestone,
        escrow_status: updatedEscrowStatus,
        message:      'Milestone verified. Funds released to startup.',
      },
    });
  } catch (err) {
    await db.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
});

export default paymentsRouter;
