# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
School room scheduling application for בי"ס אדם. Staff/teachers view room availability and book rooms. Supports mobile and desktop. Only approved users can access. Admin users manage rooms, users, schedules, events, and backups.

## Tech Stack
- **Frontend + API**: Next.js 16 (App Router, TypeScript)
- **Database + Auth**: Supabase (PostgreSQL, Supabase Auth)
- **Styling**: Tailwind CSS
- **Email**: Resend
- **Hosting**: Vercel (frontend) + Supabase (remote project)

## Commands
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npx supabase gen types typescript --project-id <id> > types/supabase.ts  # Regenerate DB types from remote
```

> No local Docker/Supabase — the project connects directly to the remote Supabase project.

## Architecture

### Directory Structure
```
app/                          # Next.js App Router pages & API routes
  (auth)/                     # login, register, forgot/reset password, pending pages
  (app)/                      # protected pages (navbar layout)
    rooms/                    # room grid with filters + booking form
    bookings/                 # user's active bookings list
    settings/                 # user password change
    admin/                    # admin-only pages
      users/                  # approve/delete users
      rooms/                  # manage rooms (name, building, equipment)
      reasons/                # manage booking reasons
      schedules/              # class schedule templates + room assignment
      approvals/              # approve/reject recurring booking requests
      events/                 # school events calendar
      backups/                # backup & restore
      settings/               # school year dates
  api/                        # API routes
    bookings/
    switch-requests/
    booking-reasons/
    recurring-bookings/
    admin/users|rooms|reasons|settings|templates|schedules|approvals|events|backup/
services/                     # Business logic — isolated from infrastructure
  rooms.service.ts            # Room CRUD, availability queries (checks bookings + class schedules)
  bookings.service.ts         # Create/cancel/switch bookings
  schedules.service.ts        # Schedule templates CRUD, room-template assignment, cascade cancel
  recurring.service.ts        # Recurring booking requests, approval + booking generation
  events.service.ts           # School events CRUD, reminder emails
  backup.service.ts           # Full DB snapshot backup & restore
  settings.service.ts         # School year settings (start/end dates)
  notifications.service.ts    # All email notifications via Resend
  auth.service.ts             # User approval, role checks, delete user
lib/
  supabase/
    client.ts                 # Browser Supabase client
    server.ts                 # Server-side Supabase client (typed) + service client (any)
  school-periods.ts           # Period times for יסודי (6 periods) and תיכון (10 periods)
  school-events.ts            # SchoolEvent type + getEventStatus() — safe to import in client components
types/
  supabase.ts                 # Hand-written placeholder — regenerate from DB when needed
  domain.ts                   # App domain types
components/
  layout/                     # Navbar, InactivityTimeout (5-min auto-logout)
  rooms/                      # RoomGrid, RoomCard, BookingForm, SwitchRequestModal
  bookings/                   # BookingList
  admin/                      # UserTable, RoomManager, ReasonManager, SchedulesManager,
                              # ScheduleTemplateEditor, ApprovalsManager, EventsManager,
                              # BackupManager, SettingsManager
proxy.ts                      # Route protection (replaces middleware.ts in Next.js 16)
```

### Key Domain Concepts
- **Room**: Has floor, room number, name, building (יסודי/תיכון/אלוט), capacity, equipment tags
- **Building**: יסודי = floors 1-4, תיכון = floors 5-7, אלוט = external building (floor 0)
- **Booking**: Belongs to a user, has a reason, date/time range, status. Supports multi-day bookings.
- **Recurring Booking**: User requests a weekly recurring slot → admin approves → system generates all individual bookings for the school year
- **Room Switch**: User A requests to swap bookings with User B; both must approve
- **Schedule Template**: Named weekly occupancy pattern (e.g. "יסודי סיום 14:00") — array of `{day, period}` entries (sparse: only occupied entries stored). Days 0=Sun … 5=Fri.
- **Room Schedule**: Each room can be assigned a template (or custom override). Rooms with schedules are excluded from availability during class hours.
- **School Event**: Event with optional date, school type, responsible teacher, linked room bookings. Status: green (rooms booked), orange (within 7 days, no rooms), gray (future/undated).
- **Backup**: Full JSONB snapshot of all tables stored in `backups` table. Restore truncates + re-inserts (excluding profiles/auth).
- **School Settings**: Key-value table for school year start/end dates per school type.

### Auth & Roles
- Users register but cannot access until an admin approves their account
- Roles: `user` (book/view), `admin` (full access)
- Supabase RLS policies enforce roles at DB level — never rely on frontend-only checks
- Route protection is in `proxy.ts` (Next.js 16 renamed middleware → proxy)
- 5-minute inactivity auto-logout via `InactivityTimeout` component in app layout

### School Periods
Defined in `lib/school-periods.ts`. Two school types:
- **יסודי**: 6 periods, 08:00–14:00
- **תיכון**: 10 periods, 08:00–17:15

BookingForm uses period selectors (not free time pickers). "שעה מותאמת" option reveals a time input fallback.

### Email Notifications
| Event | Recipients |
|---|---|
| Booking confirmed | Booking owner |
| Admin cancels booking | Booking owner |
| Schedule template change cancels booking | Booking owner |
| Switch request sent | Target user |
| Switch approved | Both users |
| Switch auto-canceled | Target user |
| Recurring request approved | Requester |
| Recurring request rejected | Requester |
| Event reminder (within 7 days, no room) | Responsible user + all admins |

### Room Availability Check
`getAvailableRooms(startTime, endTime)` in `rooms.service.ts`:
1. Excludes rooms with active bookings overlapping the slot
2. Also excludes rooms whose class schedule marks that period as occupied on that day
Period lookup uses `lib/school-periods.ts` based on room's building (יסודי/תיכון/אלוט → uses יסודי periods)

### Rooms Page Filters (client-side)
- **Building** — יסודי / תיכון / אלו"ט / הכל
- **Date** — server-side fetch per date
- **Minimum capacity**
- **Availability** — all / free / occupied
- **Required equipment** — multi-select
- Filters panel is open by default

### Timezone
All date logic uses `Asia/Jerusalem`. Key places:
- `app/(app)/rooms/page.tsx` — today's date via `toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })`
- `services/bookings.service.ts` — `getAllBookingsForDate` uses `+03:00` offset
- Bookings in the past are blocked at UI and API level

## Database Schema

### Migrations (run in order in Supabase SQL Editor)
| File | Description |
|------|-------------|
| `0001_initial_schema.sql` | rooms, bookings, booking_reasons, switch_requests, profiles |
| `0002_seed_rooms.sql` | 53 rooms with building + name |
| `0003_add_room_name.sql` | `name` column on rooms |
| `0004_add_building_to_rooms.sql` | `building` column on rooms |
| `0005_class_schedules.sql` | schedule_templates, room_schedules + 4 seeded templates |
| `0006_recurring_bookings.sql` | recurring_booking_requests |
| `0007_school_settings.sql` | school_settings key-value table |
| `0008_backups.sql` | backups table |
| `0009_school_events.sql` | school_events |

### All Tables
`rooms`, `bookings`, `booking_reasons`, `switch_requests`, `profiles`, `schedule_templates`, `room_schedules`, `recurring_booking_requests`, `school_settings`, `backups`, `school_events`

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Server-side only — never expose to client
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=           # e.g. https://your-app.vercel.app
```

## Known Issues / Notes
- `types/supabase.ts` is a hand-written placeholder. Regenerate from the real DB to fix TypeScript strictness. Until then, `createServiceClient()` returns `any` to avoid build errors.
- `typescript.ignoreBuildErrors: true` is set in `next.config.ts` — remove after regenerating proper types.
- Resend `FROM` address in `notifications.service.ts` must be updated to a verified domain.
- **Important**: Never import from `services/*.service.ts` inside `'use client'` components — services import `lib/supabase/server` which uses `next/headers` (server-only). Put shared pure logic in `lib/` files instead (e.g. `lib/school-events.ts`, `lib/school-periods.ts`).

## Deployment
- **Vercel** — auto-deploys on push to `main`. Framework: Next.js. Set all env vars in Vercel dashboard.
- **Supabase** — remote project. Run migration SQL files via Supabase SQL Editor (in order).
- After deploying, update Supabase Auth → URL Configuration → Site URL and Redirect URLs to the Vercel domain.

## Migration to AWS (when needed)
The `services/` layer is the only place that touches Supabase-specific APIs. To migrate:
1. Replace `lib/supabase/` with AWS SDK clients
2. Swap `services/auth.service.ts` with AWS Cognito
3. Swap `services/notifications.service.ts` with AWS SES
4. Migrate DB: `pg_dump` from Supabase → `pg_restore` to RDS
5. Deploy frontend to S3 + CloudFront or AWS Amplify
