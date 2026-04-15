// IXON MODEX Sync API
// Uses Upstash Redis REST API directly — works with either KV_ or UPSTASH_ env vars
// No SDK needed, pure fetch

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Support both Vercel KV env var names and Upstash direct env var names
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      error: 'Missing env vars',
      hint: 'Need KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_ equivalents). Connect Upstash KV in Vercel Storage tab.'
    });
  }

  const room = (req.query.room || 'modex2026').toString().slice(0, 64);
  const key = `sync:${room}`;

  async function redisGet(k) {
    const r = await fetch(`${redisUrl}/get/${encodeURIComponent(k)}`, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
    const json = await r.json();
    if (json.result === null || json.result === undefined) return null;
    try { return JSON.parse(json.result); } catch { return json.result; }
  }

  async function redisSet(k, value) {
    const r = await fetch(`${redisUrl}/set/${encodeURIComponent(k)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(value) })
    });
    return r.ok;
  }

  try {
    if (req.method === 'GET') {
      const data = await redisGet(key);
      return res.status(200).json(data || { status: 'empty', data: [] });
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const payload = {
        data: body.data || [],
        updatedAt: new Date().toISOString(),
        updatedBy: body.updatedBy || 'unknown'
      };
      await redisSet(key, payload);
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
