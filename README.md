# workshop-registration-kenora

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
