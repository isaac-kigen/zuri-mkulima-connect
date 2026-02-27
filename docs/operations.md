# Operations, Reliability, and Security

## Environments

- `development`: local iteration.
- `testing`: CI verification and smoke tests.
- `staging`: pre-production validation with production-like config.
- `production`: live environment.

## Monitoring and Logging

- Health endpoint: `GET /api/health`.
- Application errors are emitted through API error handling.
- Track these metrics in hosting dashboards:
- API latency (`p50`, `p95`, `p99`)
- Error rate (`4xx`, `5xx`)
- Payment success/failure ratio
- Auth failure and rate-limit events

## Backup and Recovery

- Database backups:
- Incremental: daily
- Full: weekly
- Archive snapshot: monthly
- Recovery objectives:
- RTO: less than 1 hour
- RPO: less than 24 hours
- Recovery workflow:
- Restore latest stable snapshot
- Re-apply schema migrations
- Run post-restore smoke tests

## Deployment Workflow

1. Run `npm run test`.
2. Deploy to `staging`.
3. Execute smoke checks: auth, listings, orders, payment callback.
4. Promote to `production`.
5. Verify `/api/health` and key business paths.

## Security Operations

- Rotate `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_CALLBACK_TOKEN`, and Daraja credentials on schedule.
- Apply dependency updates regularly and run full test/build before release.
- Investigate suspicious auth/payment patterns from logs and rate-limit events.
