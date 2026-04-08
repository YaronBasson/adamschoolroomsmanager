# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
School room scheduling application. Users (staff/teachers) can view room availability and book rooms. Supports mobile and desktop browsers. Only approved users can access the system.

## Tech Stack
- **Frontend + API**: Next.js 14 (App Router, TypeScript)
- **Database + Auth**: Supabase (PostgreSQL, Supabase Auth)
- **Styling**: Tailwind CSS
- **Email**: Resend
- **Hosting**: Vercel (frontend) + Supabase EU (Frankfurt)

## Commands
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npx supabase start   # Start local Supabase (Docker required)
npx supabase db push # Apply migrations to local DB
npx supabase gen types typescript --local > types/supabase.ts  # Regenerate DB types
```

## Architecture

### Directory Structure
```
app/                          # Next.js App Router pages & API routes
services/                     # Business logic — isolated from infrastructure
  rooms.service.ts            # Room CRUD, availability queries
  bookings.service.ts         # Create/cancel/switch bookings
  notifications.service.ts    # Email notifications (swap here for AWS SES migration)
  auth.service.ts             # User approval, role checks (swap here for Cognito migration)
lib/
  supabase/
    client.ts                 # Browser Supabase client
    server.ts                 # Server-side Supabase client
types/
  supabase.ts                 # Auto-generated from DB schema — do not edit manually
  domain.ts                   # App domain types (Room, Booking, User, etc.)
```

### Key Domain Concepts
- **Room**: Has floor, room number, capacity, and equipment tags (piano, projector, dance floor, etc.)
- **Booking**: Belongs to a user, has a reason (from a managed list), date/time range, and status
- **Reason List**: Admin-managed list of booking reasons; users can propose new reasons inline when booking
- **Room Switch**: A request from User A to User B to swap their bookings; both must approve
- **Switch Request**: Has status (pending/approved/canceled); auto-canceled if requester books another room first

### Auth & Roles
- Users register but cannot access the system until an admin approves their account
- Roles: `user` (book/view), `admin` (full access — override any booking, manage rooms and reason list)
- Supabase RLS policies enforce roles at the database level — never rely on frontend-only checks

### Email Notifications
| Event | Recipients |
|---|---|
| Booking confirmed | Booking owner |
| Admin cancels a booking | Booking owner |
| Switch request sent | Target user |
| Switch approved | Both users |
| Switch auto-canceled (requester booked another room) | Target user |

### Room Switch Flow
1. User A sees an occupied room that fits their need and requests a switch
2. System creates a `switch_request` record (status: `pending`); User B receives email
3. If User B approves → bookings swap, both receive confirmation email
4. If User A books another room while a switch is pending → popup warns that the pending switch will be canceled; on confirm, `switch_request` → `canceled` and User B is notified

## Database Schema
Core tables: `rooms`, `bookings`, `booking_reasons`, `switch_requests`, `profiles` (extends Supabase `auth.users`)

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Server-side only — never expose to client
RESEND_API_KEY=
```

## Migration to AWS (when needed)
The `services/` layer is the only place that touches Supabase-specific APIs. To migrate:
1. Replace `lib/supabase/` with AWS SDK clients
2. Swap `services/auth.service.ts` with an AWS Cognito implementation
3. Swap `services/notifications.service.ts` with AWS SES
4. Migrate DB: `pg_dump` from Supabase → `pg_restore` to RDS (both are standard PostgreSQL)
5. Deploy frontend to S3 + CloudFront or AWS Amplify instead of Vercel
