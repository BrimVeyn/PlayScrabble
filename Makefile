dev:
	sudo docker compose -f docker-compose.yml -f docker-compose-dev.yml up --build
dev-daemon:
	sudo docker compose -f docker-compose.yml -f docker-compose-dev.yml up --build -d
dev-no-cache:
	docker-compose -f docker-compose.yml -f docker-compose-dev.yml up --build --no-cache
prod:
	docker-compose -f docker-compose.yml up --build
down:
	docker-compose down
