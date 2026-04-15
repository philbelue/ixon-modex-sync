import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS — allow GitHub Pages and anywhere else
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sync room ID — defaults to "modex2026" so the whole team lands on the same room.
  const room = (req.query.room || 'modex2026').toString().slice(0, 64);
  const key = `sync:${room}`;

  try {
    if (req.method === 'GET') {
      const data = (await kv.get(key)) || { status: 'empty', data: [] };
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const payload = {
        data: body.data || [],
        updatedAt: new Date().toISOString(),
        updatedBy: body.updatedBy || 'unknown'
      };
      await kv.set(key, payload);
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
