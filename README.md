# מערכת הזמנת חדרים — בית הספר

אפליקציית ווב להזמנת חדרים לצוות המורים. תומכת במובייל ודסקטופ.

## פיצ'רים

- **הזמנת חדר** — בחירת תאריך, שעת התחלה/סיום (כולל הזמנות מרובות ימים)
- **סינון חדרים** — לפי קיבולת, ציוד נדרש, זמינות
- **בקשת החלפה** — בקשה למשתמש אחר להחליף חדרים
- **אישור משתמשים** — רישום + אישור מנהל לפני גישה
- **ניהול אדמין** — ניהול חדרים, סיבות הזמנה, משתמשים
- **התראות אימייל** — אישור הזמנה, ביטול, בקשות החלפה

## טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| Database + Auth | Supabase (PostgreSQL) |
| Styling | Tailwind CSS |
| Email | Resend |
| Hosting | Vercel + Supabase |

## התקנה מקומית

### דרישות
- Node.js 20+
- חשבון Supabase (ללא Docker)

### הגדרה

1. **שכפל את הפרויקט**
   ```bash
   git clone https://github.com/YaronBasson/adamschoolroomsmanager.git
   cd adamschoolroomsmanager
   npm install
   ```

2. **הגדר משתני סביבה**
   ```bash
   cp .env.example .env.local
   ```
   מלא את הערכים מ-Supabase dashboard → Settings → API:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # Publishable key
   SUPABASE_SERVICE_ROLE_KEY=eyJ...            # Secret key
   RESEND_API_KEY=re_...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **הרץ את ה-migration בסופרבייס**
   Supabase dashboard → SQL Editor → הדבק את תוכן `supabase/migrations/0001_initial_schema.sql` → Run

4. **הפעל שרת פיתוח**
   ```bash
   npm run dev
   ```
   פתח את http://localhost:3000

### משתמש ראשון (אדמין)
1. הירשם דרך `/register`
2. ב-Supabase dashboard → Table Editor → `profiles` → עדכן את השורה שלך: `approved = true`, `role = admin`
3. התחבר מחדש

## פריסה ל-Vercel

1. דחף לגיטהאב
2. ייבא ב-Vercel → New Project
3. הגדר את משתני הסביבה ב-Vercel dashboard
4. עדכן ב-Supabase → Authentication → URL Configuration:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

## מבנה הפרויקט

```
app/
  (auth)/login|register|pending   # דפי אימות
  (app)/rooms|bookings|admin      # דפים מוגנים
  api/                            # API routes
services/                         # לוגיקה עסקית
lib/supabase/                     # Supabase clients
components/                       # React components
types/                            # TypeScript types
proxy.ts                          # הגנת ניתוב
supabase/migrations/              # SQL migrations
```
