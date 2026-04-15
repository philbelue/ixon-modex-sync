// Raw HTTP calls to Upstash Redis REST API.
// Works with env vars from Vercel's Upstash marketplace integration.

const UPSTASH_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;

const UPSTASH_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashGet(key) {
  const r = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`Upstash GET ${r.status}`);
  const j = await r.json();
  // Upstash returns {result: "<stringified value>"} or {result: null}
  if (!j || j.result == null) return null;
  try {
    return JSON.parse(j.result);
  } catch {
    return j.result; // fall back to raw if it's not JSON
  }
}

async function upstashSet(key, value) {
  const body = JSON.stringify(value);
  const r = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body
  });
  if (!r.ok) throw new Error(`Upstash SET ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(500).json({
      error: 'Upstash env vars missing. Connect the KV database to this project.'
    });
  }

  const room = (req.query.room || 'modex2026').toString().slice(0, 64);
  const key = `sync:${room}`;

  try {
    if (req.method === 'GET') {
      const stored = await upstashGet(key);
      if (!stored) return res.status(200).json({ status: 'empty', data: [] });
      return res.status(200).json(stored);
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const payload = {
        data: body.data || [],
        updatedAt: new Date().toISOString(),
        updatedBy: body.updatedBy || 'unknown'
      };
      await upstashSet(key, payload);
      return res.status(200).json({
        status: 'ok',
        room,
        count: Array.isArray(payload.data) ? payload.data.length : 0,
        updatedAt: payload.updatedAt
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
