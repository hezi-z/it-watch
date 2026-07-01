// api/news.js
// Vercel Serverless Function — קורא ל-Anthropic API ומחזיר ידיעות IT לחודש הנוכחי

const HEBREW_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
];

const CATEGORIES = [
  'Adobe Acrobat / Reader',
  'Microsoft 365 / Outlook',
  'Teams',
  'דפדפנים',
  'מערכות הפעלה ושרתים',
  'דרייברים',
  'שליטה מרחוק',
  'Zoom / סביבות עבודה'
];

function buildPrompt(month, year) {
  const monthHeb = HEBREW_MONTHS[month - 1];
  const cats = CATEGORIES.join(', ');

  return `אתה אנליסט IT ארגוני מנוסה. המשימה: צור 12 ידיעות IT עדכניות לחודש ${monthHeb} ${year} בעברית.

נושאים בלבד (לא אבטחת מידע!): עדכוני מוצרים, תקלות ידועות, שינויי גרסה, הוצאה משימוש, בעיות תפעוליות בצד לקוח.

קטגוריות: ${cats}

לכל פריט החזר אובייקט JSON עם השדות הבאים:
- category: אחת מהקטגוריות לעיל בדיוק
- title: כותרת קצרה (עד 10 מילים)
- description: משפט-שניים — מה קרה ולמה חשוב
- recommendation: משפט — מה לעשות בפועל
- severity: גבוהה / בינונית / נמוכה
- date: חודש ושנה (לדוגמה: יוני 2026)

חוקים:
1. היה ספציפי: ציין גרסאות, KB numbers, שמות תכונות אמיתיים
2. אל תמציא CVEs — אם מזכיר אבטחה זה רק בהקשר תפעולי (כמו Patch Tuesday)
3. תוכן ממוקד ב-${monthHeb} ${year} בלבד
4. החזר אך ורק JSON תקין — מערך אובייקטים, בלי markdown, בלי backticks, בלי טקסט נוסף`;
}

function safeParseArray(text) {
  const clean = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    const result = JSON.parse(clean);
    return Array.isArray(result) ? result : [];
  } catch {
    // try salvaging complete objects
    const lastBrace = clean.lastIndexOf('}');
    if (lastBrace === -1) return [];
    try {
      const salvaged = JSON.parse(clean.slice(0, lastBrace + 1) + ']');
      return Array.isArray(salvaged) ? salvaged : [];
    } catch {
      return [];
    }
  }
}

export default async function handler(req, res) {
  // allow CORS from same origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // support ?month=6&year=2026 override, fallback to current date
  const now = new Date();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const year  = parseInt(req.query.year)  || now.getFullYear();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY לא מוגדר ב-Vercel Environment Variables' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: buildPrompt(month, year) }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `Anthropic API error: ${response.status}`, detail: err });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) return res.status(502).json({ error: 'תשובה ריקה מ-Claude' });

    const items = safeParseArray(textBlock.text);
    if (!items.length) return res.status(502).json({ error: 'לא ניתן לפענח JSON מהתשובה', raw: textBlock.text.slice(0, 300) });

    return res.status(200).json({ month, year, generated: new Date().toISOString(), items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
