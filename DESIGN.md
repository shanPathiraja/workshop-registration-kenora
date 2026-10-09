# Design notes

## Stack and why

- **NestJS + TypeORM + PostgreSQL.** Nest's guards, decorators and validation pipes make access control and input checks declarative and hard to forget. Postgres gives real row locks and CHECK constraints, which the capacity rule depends on.
- **React + Vite + Mantine + TanStack Query.** Mantine provides accessible tables, forms, modals and date pickers out of the box, so a non-technical team gets a familiar UI without custom CSS work. TanStack Query handles caching, refetching and stale seat counts.
- **One repo** with `back-end/` and `front-end/`. They share a REST/JSON contract.

## How over-registration is prevented

Registering and cancelling both run in one database transaction:

1. **Lock the workshop row** (`SELECT … FOR UPDATE`). Two requests for the same workshop queue behind each other; other workshops are unaffected.
2. **Re-check inside the lock:** status is Scheduled, not started, `active_count < capacity`, and the email is not already registered.
3. Insert the registration and increment `active_count` (on cancel: mark the row cancelled and decrement).
4. **Database CHECK `active_count <= capacity`.** Even a buggy code path cannot commit an overbooking.

Editing a workshop takes the same lock, so lowering capacity can't race a registration, and capacity can never go below the seats already taken. A partial unique index on `(workshop_id, attendee_email) WHERE status = 'ACTIVE'` backs up the duplicate check.

**Verified:** 30 simultaneous registration requests from 5 different staff accounts against a 2-seat workshop gave exactly 2 × `201` and 28 × `409`, with `active_count = 2` in the database.

*Alternative considered:* a single conditional `UPDATE … SET active_count = active_count + 1 WHERE active_count < capacity`. It is equally safe, but the explicit lock also serialises the duplicate-email check and capacity edits, and gives clear error messages.

## Other design decisions

- **Access control is deny-by-default.** One global guard verifies the JWT and **re-reads the user on every request**, so deactivation or a role change takes effect immediately. Every route must declare `@Roles(...)` or it is refused. The permission matrix is followed exactly; for example, the Admin cannot view workshops.
- **Nothing is hard-deleted.** Cancelled registrations keep who registered them, who cancelled them, when and why. Users are deactivated, not deleted, so history keeps its references.
- **A denormalised `active_count`** on the workshop makes "has seats" filtering and the capacity check a single indexed comparison, instead of counting rows on every request.
- **Responses go through DTOs** (`UserResponseDto.fromEntity`, etc.), so fields like password hashes can never leak.
- **Audit trail (bonus).** Account changes, workshop edits and registrations are written to `audit_logs` in the *same transaction* as the change, with a field-level from → to diff (password values are never stored). Admins see account changes; managers see workshop and registration changes.
- **Frontend:** filters live in the URL (bookmarkable "this week with seats"), seat counts auto-refresh, and on a 409 the page refetches so staff see the real count immediately.

## Assumptions

- Attendees are just a name and an email typed by staff; one active registration per email per workshop.
- No registrations for cancelled, completed or already-started workshops.
- Any front-desk user (manager or staff) may cancel any registration; the centre shares one front desk.
- Admins can't change their own role or deactivate themselves, so the system can't be locked out.
- Times are stored in UTC and shown in the browser's local time.
- Extra workshop fields added: **location** (three sites), description, end time, created/updated by.

## Trade-offs

- **`synchronize: true` instead of migrations.** Fastest for a 3-hour build and a reviewer's first run. For production I would generate migrations and turn `synchronize` off.
- **Row lock per workshop** serialises registrations for the *same* workshop. That is the point, and at a 15-person centre the contention is negligible.
- **JWT with a 1-hour expiry, stored in localStorage**, and no refresh tokens. Simple; an httpOnly cookie plus refresh would be the next step.
- Pagination is basic (page / pageSize), with no cursoring.

## Skipped

- **Waitlist.** It would add a `WAITLISTED` status and promote the oldest waitlisted attendee inside the same locked cancel transaction.
- Searching one attendee's history across all workshops by email.
- A dedicated mobile layout for wide tables (they scroll sideways).
- Database migrations, rate limiting on login, and refresh tokens.
