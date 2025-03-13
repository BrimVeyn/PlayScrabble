dev:
	docker compose -f docker-compose.yml -f docker-compose-dev.yml up --build
dev-daemon:
	docker compose -f docker-compose.yml -f docker-compose-dev.yml up --build -d
restart-dev:
	docker compose down && make dev-daemon
dev-no-cache:
	docker compose -f docker-compose.yml -f docker-compose-dev.yml up --build --no-cache
prod:
	docker compose -f docker-compose.yml up --build
down:
	docker compose down
