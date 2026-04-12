# Session Notes — בי"ס אדם Room Booking System

## Status: Active Development
Last updated: 2026-04-12

---

## Deployed Features

### Core Booking System
- Room grid with availability view (per date)
- Period-based booking form (יסודי: 6 periods, תיכון: 10 periods, or custom time)
- Multi-day bookings supported
- Room switch requests (user ↔ user swap with email notifications)
- Admin can cancel any booking
- Past bookings blocked at UI + API

### User Management
- Registration + admin approval flow
- Forgot/reset password flow
- Admin can delete users
- 5-minute inactivity auto-logout
- User settings page (password change)

### Room Management
- Rooms have: floor, number, name, building (יסודי/תיכון/אלוט), capacity, equipment tags
- 53 rooms seeded from school data
- Building filter on rooms page (יסודי / תיכון / אלו"ט / הכל)
- Filters panel open by default

### Class Schedule Templates (Module 2)
- Admin creates weekly occupancy templates (grid: periods × days, drag to toggle)
- 4 default templates seeded: יסודי סיום 13:00/14:00, תיכון סיום 14:45/15:30
- Rooms can be assigned a template → automatically blocked during class hours
- Changing a template auto-cancels affected bookings + notifies users

### School Year Settings (Module 4)
- Admin sets school year start + end dates (separate for יסודי / תיכון)
- Used to bound recurring booking generation

### Recurring Bookings (Module 3)
- User toggles "הזמנה חוזרת" in booking form → selects day of week
- Sends request to admin approval queue
- Admin approves → system generates all weekly bookings until school year end
- Conflicts skipped (not cancelled); count shown to admin
- Email on approve/reject

### School Events (Module 6)
- Monthly list view with month navigation
- Status colors: green (room booked), orange (≤7 days, no room), gray (future/undated)
- Create/edit events: title, date, school type, description, responsible user, classes
- Auto email reminder sent once when event is within 7 days and has no room booked

### Backup & Restore (Module 5)
- Create named snapshot of all DB tables (stored as JSONB in `backups` table in Supabase)
- Restore replaces all data (except auth.users/profiles) from snapshot
- Delete old backups

---

## Pending / Future Work
- Schedule/calendar view of rooms (week/month view — discussed, deferred)
- Regenerate `types/supabase.ts` from actual DB schema and remove `ignoreBuildErrors: true`
- Update Resend `FROM` address to verified domain

---

## Database Migrations Applied
| # | File | Status |
|---|------|--------|
| 0001 | initial_schema | ✅ applied |
| 0002 | seed_rooms | ✅ applied |
| 0003 | add_room_name | ✅ applied |
| 0004 | add_building_to_rooms | ✅ applied |
| 0005 | class_schedules | ✅ applied |
| 0006 | recurring_bookings | ⬜ run in Supabase SQL Editor |
| 0007 | school_settings | ⬜ run in Supabase SQL Editor |
| 0008 | backups | ⬜ run in Supabase SQL Editor |
| 0009 | school_events | ⬜ run in Supabase SQL Editor |

---

## Admin Nav Tabs
ניהול משתמשים · ניהול חדרים · ניהול סיבות הזמנה · מערכות שעות · אישורים · ארועים · גיבויים · הגדרות

---

## Key Technical Decisions
- **Pure logic in `lib/`**: Functions/types used in client components must live in `lib/` (not `services/`), because services import `lib/supabase/server` which is server-only (`next/headers`).
- **Schedule periods**: Stored as sparse JSONB array `[{day, period}]` — only occupied entries. Absence = free.
- **Backup storage**: Stored as JSONB rows in the `backups` DB table (no external storage needed).
- **Recurring approval**: Conflicts are skipped (not blocked) — admin sees skipped count.
- **Timezone**: All date logic uses `Asia/Jerusalem` (UTC+2/+3).
