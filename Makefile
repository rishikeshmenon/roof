SHELL := /bin/bash

.PHONY: dev up down logs fmt api-shell db-shell

dev:
	docker compose up --build

up:
	docker compose up -d

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=200

api-shell:
	docker compose exec api bash

db-shell:
	docker compose exec postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB}



