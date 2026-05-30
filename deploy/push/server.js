'use strict';

// Minimal Web Push scheduler for the Fitness app rest timer.
// - Stores one push subscription per Supabase user (persisted to a JSON file).
// - Schedules a single one-shot push per user to fire when their rest timer ends.
//   (pg_cron only has minute granularity; rest timers need second precision, so we
//    keep an in-process setTimeout per user.)
// - Auth: the caller's Supabase access token is validated against the local
//   Supabase auth endpoint, which also yields the user id.

const http = require('http');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const PORT = Number(process.env.PORT || 8090);
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hector.alvarez@haddock.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUBS_FILE = process.env.SUBS_FILE || path.join(__dirname, 'subscriptions.json');
const MAX_SCHEDULE_MS = 30 * 60 * 1000; // never schedule further than 30 min out

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('Missing VAPID keys; refusing to start.');
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

/** @type {Record<string, any>} subscription keyed by userId */
let subs = {};
try {
  subs = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
} catch {
  subs = {};
}
const saveSubs = () => {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs));
  } catch (e) {
    console.error('saveSubs error', e);
  }
};

/** @type {Record<string, NodeJS.Timeout>} pending rest-end timer keyed by userId */
const timers = {};

const readBody = (req) =>
  new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => {
      b += c;
      if (b.length > 1e6) req.destroy();
    });
    req.on('end', () => resolve(b));
  });

const sendJson = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

async function userIdFromReq(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u.id : null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/^\/push/, '') || '/';

  if (route === '/health') return sendJson(res, 200, { ok: true });

  const userId = await userIdFromReq(req);
  if (!userId) return sendJson(res, 401, { error: 'unauthorized' });

  if (req.method === 'POST' && route === '/subscribe') {
    const body = JSON.parse((await readBody(req)) || '{}');
    if (!body.subscription || !body.subscription.endpoint) {
      return sendJson(res, 400, { error: 'invalid subscription' });
    }
    subs[userId] = body.subscription;
    saveSubs();
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && route === '/unsubscribe') {
    delete subs[userId];
    saveSubs();
    if (timers[userId]) {
      clearTimeout(timers[userId]);
      delete timers[userId];
    }
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && route === '/schedule') {
    const body = JSON.parse((await readBody(req)) || '{}');
    if (!subs[userId]) return sendJson(res, 400, { error: 'not subscribed' });
    const fireInMs = Math.max(0, (Number(body.fireAt) || 0) - Date.now());
    if (fireInMs > MAX_SCHEDULE_MS) return sendJson(res, 400, { error: 'fireAt too far' });

    if (timers[userId]) clearTimeout(timers[userId]);
    const payload = JSON.stringify({
      title: body.title || '⏱ Descanso terminado',
      body: body.body || 'Hora de la siguiente serie',
      tag: 'rest-timer',
    });
    timers[userId] = setTimeout(async () => {
      delete timers[userId];
      try {
        await webpush.sendNotification(subs[userId], payload);
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          delete subs[userId];
          saveSubs();
        }
        console.error('push send error', e && e.statusCode);
      }
    }, fireInMs);
    return sendJson(res, 200, { ok: true, fireInMs });
  }

  if (req.method === 'POST' && route === '/cancel') {
    if (timers[userId]) {
      clearTimeout(timers[userId]);
      delete timers[userId];
    }
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () =>
  console.log('fitness push service listening on 127.0.0.1:' + PORT)
);
