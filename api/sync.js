import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS — wide open for trade show use
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const room = req.query.room || 'modex2026';
  const key = `sync:${room}`;

  try {
    if (req.method === 'GET') {
      const data = await kv.get(key);
      return res.status(200).json({ status: data ? 'ok' : 'empty', data: data || [] });
    }

    if (req.method === 'POST') {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'data must be an array' });
      }
      await kv.set(key, data, { ex: 60 * 60 * 24 * 7 }); // 7 day TTL
      return res.status(200).json({ status: 'saved', count: data.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('KV error:', err);
    return res.status(500).json({ error: 'Storage error', detail: err.message });
  }
}
