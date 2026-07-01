# IT-Watch — לוח בקרת מוצרי IT

דשבורד שמתעדכן אוטומטית כל חודש ב-1 לחודש עם ידיעות IT עדכניות לצד לקוח.

## מבנה הפרויקט

```
itwatch/
├── api/
│   ├── news.js      ← Serverless function (שולח לClaude API)
│   └── cron.js      ← Cron job (ב-1 לכל חודש, 06:00 UTC)
├── public/
│   └── index.html   ← הדשבורד
├── vercel.json       ← הגדרות + לוח זמנים
└── package.json
```

## פריסה ב-Vercel — שלב אחר שלב

### 1. העלה ל-GitHub

```bash
git init
git add .
git commit -m "IT-Watch initial"
git remote add origin https://github.com/YOUR_USERNAME/it-watch.git
git push -u origin main
```

### 2. חבר ל-Vercel

- כנס ל-[vercel.com](https://vercel.com) → **New Project**
- בחר את ה-repo מ-GitHub
- לחץ **Deploy** (ללא הגדרות מיוחדות)

### 3. הגדר Environment Variables

ב-Vercel Dashboard → Settings → **Environment Variables**:

| שם משתנה | ערך | היכן |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview, Development |
| `CRON_SECRET` | מחרוזת אקראית (לדוגמה: `my-secret-123`) | Production |

> מקבלים API key ב: [console.anthropic.com](https://console.anthropic.com)

### 4. Re-deploy

לאחר הוספת משתנים, לחץ **Redeploy** בVercel Dashboard.

---

## איך זה עובד

```
ב-1 לכל חודש, 06:00 UTC
        ↓
  Vercel Cron מפעיל /api/cron
        ↓
  /api/cron קורא ל-/api/news
        ↓
  /api/news שולח בקשה ל-Claude API
  עם "תן ידיעות IT ל-[חודש] [שנה]"
        ↓
  Claude מחזיר JSON
        ↓
  Vercel מאחסן בcache (86400 שניות)
        ↓
  המשתמש פותח את הדשבורד — רואה תוכן טרי
```

## הערות

- **Cron Jobs** זמינים ב-Vercel **Hobby plan** (חינמי) — עד 2 cron jobs בחינם
- אם ה-Cron לא פעל, לחיצה על כפתור "⟳ רענן" בדשבורד מפעילה יצירה מחדש
- ה-localStorage שומר cache בדפדפן כך שאותו חודש לא נוצר פעמיים לאותו משתמש
- שינוי קטגוריות: ערוך את מערך `CATEGORIES` ב-`api/news.js`
