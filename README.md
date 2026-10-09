# Workshop Registration Service

Staff tool for a community training centre: schedule workshops, register and cancel attendees, and never overbook a workshop, even when several people register for the last seat at the same moment.

- **Backend:** NestJS + TypeORM + PostgreSQL, in [`back-end/`](back-end)
- **Frontend:** React + Vite + Mantine + TanStack Query, in [`front-end/`](front-end)
- Design notes, trade-offs and what was skipped: [DESIGN.md](DESIGN.md)

## Requirements

- Node.js **22+** and npm
- PostgreSQL **13+**, either installed locally or run in Docker (see below)

## Run it locally

### 1. Start PostgreSQL

If you don't have Postgres running already:

```bash
docker run -d --name kenora-pg -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kenora postgres:16
```

If you use an existing server instead, create an empty database for the app (e.g. `CREATE DATABASE kenora;`).

### 2. Backend (http://localhost:3000)

```bash
cd back-end
cp .env.example .env      # adjust DB_* if your Postgres differs; set JWT_SECRET
npm install
npm run seed              # creates the tables, test accounts and sample workshops; safe to re-run
npm run start:dev
```

> Tables are created automatically by TypeORM `synchronize` (on seed and on server start); there are no migrations to run.

### 3. Frontend (http://localhost:5173)

```bash
cd front-end
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

Open http://localhost:5173 and sign in with one of the accounts below.

## Test accounts (dev only)

Created by `npm run seed` in `back-end/`. Safe to re-run; existing accounts are skipped.

| Name | Email | Password | Role | Notes |
|---|---|---|---|---|
| Admin | admin@kenora.dev | Admin@123 | admin | Manages user accounts |
| Maya Manager | manager@kenora.dev | Manager@123 | manager | Schedules workshops |
| Omar Programme | omar.manager@kenora.dev | Manager@123 | manager | Second manager |
| Sam Staff | staff@kenora.dev | Staff@123 | staff | Front desk |
| Priya Front Desk | priya.staff@kenora.dev | Staff@123 | staff | Front desk |
| Leo Front Desk | leo.staff@kenora.dev | Staff@123 | staff | Front desk |
| Nina Front Desk | nina.staff@kenora.dev | Staff@123 | staff | Front desk |
| Former Staff | former.staff@kenora.dev | Staff@123 | staff | **Inactive**: sign-in is refused |

The admin login can be changed with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `back-end/.env`.

### Sample workshops

The seed also creates 8 workshops across three locations (Main Hall, Riverside Centre, Hillside Studio), dated relative to the day you run it:

- several this week and next
- **FIT-205** with only 2 seats, to try the "last seat" race
- one completed workshop and one cancelled workshop

## What each role can do

Enforced by the API. The UI hides what a role can't use, but the backend refuses it regardless.

| | Admin | Manager | Staff |
|---|---|---|---|
| Create user accounts & set roles | ✅ | — | — |
| Add & edit workshops | — | ✅ | — |
| Register & cancel attendees | — | ✅ | ✅ |
| View workshops, registrations & history | — | ✅ | ✅ |
| Activity (audit log) | account changes | workshop & registration changes | — |

## Try the capacity rule

1. Sign in as two different staff accounts in two browser windows (e.g. a normal and a private window).
2. Open **FIT-205** (2 seats) in both, and fill the last seat from both windows at the same time.
3. One succeeds; the other sees *"Sorry, this workshop is full. The last seat was just taken."* and the seat counter updates.

## API overview

| Method | Path | Roles |
|---|---|---|
| POST | `/auth/login` | public |
| GET | `/auth/me` | any signed-in user |
| GET, POST | `/users` · PATCH, DELETE (deactivate) `/users/:id` | admin |
| GET | `/workshops?search&status&from&to&hasSeats&page&pageSize` | manager, staff |
| GET | `/workshops/:id` | manager, staff |
| POST | `/workshops` · PATCH `/workshops/:id` · POST `/workshops/:id/cancel` | manager |
| GET, POST | `/workshops/:id/registrations` | manager, staff |
| POST | `/registrations/:id/cancel` | manager, staff |
| GET | `/audit?entityType&page&pageSize` | admin, manager |
