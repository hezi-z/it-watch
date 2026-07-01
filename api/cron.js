// api/cron.js
// מופעל אוטומטית ב-1 לכל חודש בשעה 06:00 UTC (לפי vercel.json)
// מחמם את הcache של /api/news לחודש הנוכחי

export default async function handler(req, res) {
  // Vercel Cron מוסיף header מיוחד לאימות
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  try {
    // קרא ל-news endpoint כדי לחמם את הcache
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/news?month=${month}&year=${year}`);
    const data = await response.json();

    return res.status(200).json({
      ok: true,
      month,
      year,
      itemsGenerated: data.items?.length ?? 0,
      at: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
