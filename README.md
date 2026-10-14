# ParkPulse

ParkPulse is a mobile-first installable workplace parking PWA for **5 car spaces and 10 bike spaces**.

## Employee flow

- Create an account with name, mobile number and password.
- Sign in with mobile number and password.
- Tap an available car or bike space to park.
- Occupancy updates for other signed-in users through Supabase Realtime.
- Tap **Check out** when leaving.
- Active parking is automatically cleared at 6:00 PM IST.
- Completed parking history older than 30 days is cleaned up automatically.
- Password recovery uses a one-time recovery code shown when the account is created and rotated after a successful recovery.

## Architecture

- Static frontend / PWA hosted on GitHub Pages.
- Supabase Auth and Edge Function for phone-number-style password authentication without SMS.
- PostgreSQL + RLS for profiles and parking data.
- Atomic database RPCs prevent two people taking the same space and prevent one user holding two active spaces.
- `parking_presence` exposes occupancy only; other employees' user/session IDs are not exposed to the client.

## Validation

Every push to `main` runs `.github/workflows/validate.yml`, which checks JavaScript syntax, service-worker syntax, required DOM elements, Home-page landing behavior, privacy-safe occupancy access, release/cache versions, and removal of obsolete OTP/invite-code UI.

The GitHub Pages deployment workflow publishes the current `main` branch after changes are committed.
