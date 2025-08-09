## Roof: Rental Listings Aggregator

Monorepo for a production-oriented platform that aggregates rental listings into a single, fast, filter-rich dashboard.

### Stack
- Web: Next.js (React, Tailwind)
- API: FastAPI (Python)
- Worker: Celery (Python) with Redis broker
- DB: Postgres (PostGIS)
- Search: OpenSearch (+ Dashboards)
- Cache/Queue: Redis

### Quickstart (Dev)
1) Copy env template and adjust if needed:
```
cp env.example .env
```
2) Start the full stack:
```
docker compose up --build
```
3) Services
- Web: http://localhost:3000
- API: http://localhost:8000/docs
- OpenSearch: http://localhost:9200
- OpenSearch Dashboards: http://localhost:5601
- Postgres: localhost:5432 (db: `roof`)
- Redis: localhost:6379

### Development
- Web live reload via Docker volume mounts
- API live reload via `uvicorn --reload`
- Worker auto-reloads when files change in `worker/app`

### Scripts
Use the `Makefile` for common tasks:
```
make dev        # docker compose up --build
make up         # docker compose up
make down       # docker compose down -v
make logs       # tail all service logs
```

### Notes
- Initial API exposes `/health` and stubs. DB tables auto-create on first run for local dev. Migrations (Alembic) can be added later.
- OpenSearch security is disabled for local development only.



