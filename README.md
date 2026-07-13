# Kids' Activities

Every kid's season in one place — practices, games, and rehearsals with times
and locations, coach contacts, and the per-activity gear checklist.

- **Storage:** D1 (`activities`, `sessions`, `gear`)
- **Access:** all tables `adult_writable` — kids read their schedule, adults
  manage it. Complements the carpool app (which owns the rides).
- **AI:** read-only exports `activities`, `upcoming_sessions`.

## Develop

```bash
make install
make dev
make test
make build
```
