# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
School room scheduling application. Users (staff/teachers) can view room availability and book rooms. Supports mobile and desktop browsers. Only approved users can access the system.

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
  (auth)/                     # login, register, pending pages (no navbar)
  (app)/                      # protected pages (navbar layout)
    rooms/                    # room grid with filters + booking form
    bookings/                 # user's active bookings list
    admin/                    # admin-only: users, rooms, reasons
  api/                        # API routes
    bookings/
    switch-requests/
    booking-reasons/
    admin/users|rooms|reasons/
services/                     # Business logic — isolated from infrastructure
  rooms.service.ts            # Room CRUD, availability queries
  bookings.service.ts         # Create/cancel/switch bookings
  notifications.service.ts    # Email notifications via Resend
  auth.service.ts             # User approval, role checks
lib/
  supabase/
    client.ts                 # Browser Supabase client
    server.ts                 # Server-side Supabase client (typed) + service client (untyped/any)
types/
  supabase.ts                 # Auto-generated from DB schema — do not edit manually
  domain.ts                   # App domain types (Room, Booking, User, etc.)
components/
  layout/                     # Navbar (mobile hamburger menu)
  rooms/                      # RoomGrid, RoomCard, BookingForm, SwitchRequestModal
  bookings/                   # BookingList
  admin/                      # UserTable, RoomManager, ReasonManager
proxy.ts                      # Route protection (replaces middleware.ts in Next.js 16)
```

### Key Domain Concepts
- **Room**: Has floor, room number, capacity, and equipment tags (custom tags supported)
- **Booking**: Belongs to a user, has a reason (from a managed list), date/time range, status. Supports multi-day bookings.
- **Reason List**: Admin-managed list of booking reasons; users can propose new reasons inline when booking
- **Room Switch**: A request from User A to User B to swap their bookings; both must approve
- **Switch Request**: Has status (pending/approved/canceled); auto-canceled if requester books another room first

### Auth & Roles
- Users register but cannot access the system until an admin approves their account
- Roles: `user` (book/view), `admin` (full access — override any booking, manage rooms and reason list)
- Supabase RLS policies enforce roles at the database level — never rely on frontend-only checks
- Route protection is in `proxy.ts` (Next.js 16 renamed middleware → proxy)

### Email Notifications
| Event | Recipients |
|---|---|
| Booking confirmed | Booking owner |
| Admin cancels a booking | Booking owner |
| Switch request sent | Target user |
| Switch approved | Both users |
| Switch auto-canceled (requester booked another room) | Target user |

### Room Switch Flow
1. User A sees an occupied room and requests a switch
2. System creates a `switch_request` record (status: `pending`); User B receives email
3. If User B approves → bookings swap, both receive confirmation email
4. If User A books another room while a switch is pending → popup warns; on confirm, `switch_request` → `canceled`, User B is notified

### Rooms Page Filters
Client-side filtering on the rooms grid:
- **Date** — server-side fetch per date
- **Minimum capacity**
- **Availability** — all / free now / occupied now
- **Required equipment** — multi-select, derived from actual rooms

### Timezone
All date logic uses `Asia/Jerusalem`. Key places:
- `app/(app)/rooms/page.tsx` — today's date uses `toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })`
- `services/bookings.service.ts` — `getAllBookingsForDate` uses `+03:00` offset for day boundaries
- Bookings in the past are blocked at both UI and API level

## Database Schema
Core tables: `rooms`, `bookings`, `booking_reasons`, `switch_requests`, `profiles` (extends Supabase `auth.users`)

Migration file: `supabase/migrations/0001_initial_schema.sql`

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

## Deployment
- **Vercel** — auto-deploys on push to `main`. Framework: Next.js. Set all env vars in Vercel dashboard.
- **Supabase** — remote project. Run migration SQL via Supabase SQL Editor.
- After deploying, update Supabase Auth → URL Configuration → Site URL and Redirect URLs to the Vercel domain.

## Migration to AWS (when needed)
The `services/` layer is the only place that touches Supabase-specific APIs. To migrate:
1. Replace `lib/supabase/` with AWS SDK clients
2. Swap `services/auth.service.ts` with AWS Cognito
3. Swap `services/notifications.service.ts` with AWS SES
4. Migrate DB: `pg_dump` from Supabase → `pg_restore` to RDS
5. Deploy frontend to S3 + CloudFront or AWS Amplify
