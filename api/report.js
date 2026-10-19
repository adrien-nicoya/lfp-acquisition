// GET /api/report : dépense et CPL Meta du challenge, en direct.
import challenge from '../lib/config.js';
import { getMeta } from '../lib/meta.js';

export const config = { maxDuration: 30 };

const parisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const today = parisToday();
  const until = challenge.endDate && challenge.endDate < today ? challenge.endDate : today;
  const base = { challenge, today, generatedAt: new Date().toISOString() };
  if (challenge.startDate > today) return res.status(200).json({ ...base, notStarted: true, meta: null, warnings: [], errors: [] });
  const warnings = [];
  try {
    const meta = await getMeta(challenge.startDate, until, warnings);
    res.status(200).json({ ...base, meta, warnings, errors: [] });
  } catch (e) {
    res.status(502).json({ ...base, meta: null, warnings, errors: [e.message] });
  }
}
