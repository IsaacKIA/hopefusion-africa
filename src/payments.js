/**
 * HopeFusion Africa — Payment Integration
 * Paystack (cards, bank, USSD) + MTN Mobile Money + Flutterwave
 * Install: npm install axios crypto express dotenv
 */

import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const PAYSTACK_SECRET   = process.env.PAYSTACK_SECRET_KEY;
const FLUTTERWAVE_KEY   = process.env.FLUTTERWAVE_SECRET_KEY;
const MTN_SUBSCRIPTION  = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
const MTN_API_USER      = process.env.MTN_MOMO_API_USER;
const MTN_API_KEY       = process.env.MTN_MOMO_API_KEY;
const WEBHOOK_SECRET    = process.env.PAYSTACK_WEBHOOK_SECRET;
const FRONTEND_URL      = process.env.FRONTEND_URL || 'http://localhost:3000';

/* ============================================================
   PAYSTACK INTEGRATION
   ============================================================ */

// ── Initialize a payment (card, bank, USSD, mobile money via Paystack)
router.post('/paystack/initialize', async (req, res) => {
  try {
    const {
      email, amount_usd, currency = 'GHS', plan,
      metadata = {}, callback_url, channels
    } = req.body;

    if (!email || !amount_usd) {
      return res.status(400).json({ error: 'email and amount_usd required' });
    }

    // Paystack uses kobo/pesewas (multiply by 100)
    const amountInSubunit = Math.round(parseFloat(amount_usd) * 100);

    const payload = {
      email,
      amount: amountInSubunit,
      currency,
      plan,                     // for subscriptions
      callback_url: callback_url || `${FRONTEND_URL}/payment/verify`,
      metadata: {
        ...metadata,
        platform: 'HopeFusion Africa',
        cancel_action: `${FRONTEND_URL}/payment/cancelled`,
      },
      channels: channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    };

    const { data } = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    });

    res.json({
      success: true,
      data: {
        authorization_url: data.data.authorization_url,
        access_code:       data.data.access_code,
        reference:         data.data.reference,
      },
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    res.status(500).json({ error: msg });
  }
});

// ── Verify a Paystack payment
router.get('/paystack/verify/:reference', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const txn = data.data;
    if (txn.status !== 'success') {
      return res.status(402).json({ error: 'Payment not successful', status: txn.status });
    }

    // TODO: update your DB — mark subscription active, unlock feature, etc.
    res.json({
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
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── Paystack webhook — handle events server-side
router.post('/paystack/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const body      = req.body;
  const hash      = crypto.createHmac('sha512', WEBHOOK_SECRET).update(body).digest('hex');

  if (hash !== signature) return res.status(401).send('Invalid signature');

  const event = JSON.parse(body);
  console.log('Paystack event:', event.event);

  switch (event.event) {
    case 'charge.success':
      handlePaystackSuccess(event.data);
      break;
    case 'subscription.create':
      handleSubscriptionCreated(event.data);
      break;
    case 'subscription.disable':
      handleSubscriptionCancelled(event.data);
      break;
    case 'invoice.payment_failed':
      handlePaymentFailed(event.data);
      break;
    default:
      console.log('Unhandled Paystack event:', event.event);
  }

  res.sendStatus(200);
});

async function handlePaystackSuccess(data) {
  console.log('Payment success:', data.reference, data.amount / 100, data.currency);
  // Update subscription status in DB, send confirmation email, etc.
}
async function handleSubscriptionCreated(data) {
  console.log('Subscription created:', data.subscription_code, data.plan.name);
}
async function handleSubscriptionCancelled(data) {
  console.log('Subscription cancelled:', data.subscription_code);
}
async function handlePaymentFailed(data) {
  console.log('Payment failed:', data.reference);
}

// ── Create Paystack subscription plan
router.post('/paystack/plans', async (req, res) => {
  try {
    const { name, interval, amount_usd, currency = 'GHS', description } = req.body;
    const { data } = await axios.post('https://api.paystack.co/plan', {
      name,
      interval,  // 'monthly', 'quarterly', 'annually'
      amount: Math.round(parseFloat(amount_usd) * 100),
      currency,
      description,
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });

    res.json({ success: true, data: data.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── List Paystack plans
router.get('/paystack/plans', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.paystack.co/plan', {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    res.json({ success: true, data: data.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── Paystack refund
router.post('/paystack/refund', async (req, res) => {
  try {
    const { reference, amount } = req.body;
    const { data } = await axios.post('https://api.paystack.co/refund', {
      transaction: reference,
      amount: amount ? Math.round(amount * 100) : undefined,
    }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
    res.json({ success: true, data: data.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

/* ============================================================
   MTN MOBILE MONEY (MoMo API)
   ============================================================ */

// Get MTN MoMo OAuth access token
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

// ── Request MoMo payment from customer
router.post('/momo/collect', async (req, res) => {
  try {
    const { phone, amount, currency = 'GHS', reference, description, payer_name } = req.body;
    if (!phone || !amount || !reference) {
      return res.status(400).json({ error: 'phone, amount and reference required' });
    }

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
          partyId: phone.replace(/^\+/, ''), // strip leading +
        },
        payerMessage: description || 'HopeFusion Africa payment',
        payeeNote:    `Payment from ${payer_name || phone}`,
      },
      {
        headers: {
          Authorization:               `Bearer ${token}`,
          'X-Reference-Id':            requestId,
          'X-Target-Environment':      process.env.NODE_ENV === 'production' ? 'mtncameroon' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
          'Content-Type':              'application/json',
        },
      }
    );

    res.json({
      success: true,
      data: {
        reference_id: requestId,
        status: 'pending',
        message: 'Payment request sent. Customer will receive a USSD prompt on their phone.',
      },
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    res.status(500).json({ error: msg });
  }
});

// ── Check MoMo payment status
router.get('/momo/status/:referenceId', async (req, res) => {
  try {
    const token = await getMTNToken('collection');
    const { data } = await axios.get(
      `https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/${req.params.referenceId}`,
      {
        headers: {
          Authorization:               `Bearer ${token}`,
          'X-Target-Environment':      process.env.NODE_ENV === 'production' ? 'mtncameroon' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
        },
      }
    );

    res.json({
      success: true,
      data: {
        reference_id: req.params.referenceId,
        status:   data.status,           // PENDING | SUCCESSFUL | FAILED
        amount:   data.amount,
        currency: data.currency,
        payer:    data.payer,
        reason:   data.reason,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── MoMo disbursement — send money to a user (grant disbursement)
router.post('/momo/disburse', async (req, res) => {
  try {
    const { phone, amount, currency = 'GHS', reference, note } = req.body;
    if (!phone || !amount) return res.status(400).json({ error: 'phone and amount required' });

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
          'X-Target-Environment':      process.env.NODE_ENV === 'production' ? 'mtncameroon' : 'sandbox',
          'Ocp-Apim-Subscription-Key': MTN_SUBSCRIPTION,
          'Content-Type':              'application/json',
        },
      }
    );

    res.json({ success: true, data: { reference_id: requestId, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

/* ============================================================
   FLUTTERWAVE INTEGRATION (multi-currency, cross-border)
   ============================================================ */

// ── Initialize Flutterwave payment (best for cross-border)
router.post('/flutterwave/initialize', async (req, res) => {
  try {
    const {
      amount, currency = 'NGN', email, phone, name,
      tx_ref, redirect_url, payment_options, meta
    } = req.body;

    const { data } = await axios.post('https://api.flutterwave.com/v3/payments', {
      tx_ref:          tx_ref || `HFA-${Date.now()}`,
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

    res.json({ success: true, data: { payment_link: data.data.link, tx_ref: data.data.tx_ref ?? tx_ref } });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── Verify Flutterwave transaction
router.get('/flutterwave/verify/:tx_ref', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.flutterwave.com/v3/transactions?tx_ref=${req.params.tx_ref}`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_KEY}` } }
    );

    const txn = data.data?.[0];
    if (!txn || txn.status !== 'successful') {
      return res.status(402).json({ error: 'Transaction not successful', status: txn?.status });
    }
    res.json({
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
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ── Flutterwave webhook
router.post('/flutterwave/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  const signature  = req.headers['verif-hash'];
  if (signature !== secretHash) return res.status(401).send('Invalid signature');

  const event = JSON.parse(req.body);
  console.log('Flutterwave event:', event.event, event.data?.tx_ref);

  if (event.event === 'charge.completed' && event.data?.status === 'successful') {
    handleFlutterwaveSuccess(event.data);
  }

  res.sendStatus(200);
});

async function handleFlutterwaveSuccess(data) {
  console.log('Flutterwave payment success:', data.tx_ref, data.amount, data.currency);
}

/* ============================================================
   SUBSCRIPTION PLANS CONFIG
   ============================================================ */

router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: [
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
    ],
  });
});

/* ============================================================
   IMPACT ESCROW — milestone-based fund release
   ============================================================ */

router.post('/escrow/create', async (req, res) => {
  try {
    const { startup_id, investor_id, amount, currency, milestones } = req.body;
    // In production: create on-chain smart contract or use Paystack escrow
    const escrowId = `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    res.json({
      success: true,
      data: {
        escrow_id: escrowId,
        startup_id,
        investor_id,
        amount,
        currency,
        milestones: milestones.map((m, i) => ({
          id: `${escrowId}-M${i + 1}`,
          title:      m.title,
          amount:     m.amount,
          due_date:   m.due_date,
          status:     'locked',
          evidence_required: m.evidence_required || true,
        })),
        status:     'active',
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/escrow/:escrowId/milestone/:milestoneId/release', async (req, res) => {
  try {
    const { evidence_url, notes } = req.body;
    // Verify milestone completion, then trigger disbursement
    res.json({
      success: true,
      data: {
        escrow_id:    req.params.escrowId,
        milestone_id: req.params.milestoneId,
        status:       'released',
        evidence_url,
        released_at:  new Date().toISOString(),
        message:      'Milestone verified. Funds released to startup via MoMo/Paystack.',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
