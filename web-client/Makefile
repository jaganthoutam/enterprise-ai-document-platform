.PHONY: install start build test lint format clean docker-build docker-up docker-down

# Development
install:
	npm install

start:
	npm start

build:
	npm run build

test:
	npm test

lint:
	npm run lint

format:
	npm run format

clean:
	rm -rf node_modules
	rm -rf build
	rm -rf coverage
	rm -rf .env*

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# Combined commands
setup: install docker-build

dev: docker-up start

check: lint test

deploy: check build

# Help
help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make start        - Start development server"
	@echo "  make build        - Build for production"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linter"
	@echo "  make format       - Format code"
	@echo "  make clean        - Clean up build files"
	@echo "  make docker-build - Build Docker containers"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make setup        - Install deps and build Docker"
	@echo "  make dev          - Start development environment"
	@echo "  make check        - Run linter and tests"
	@echo "  make deploy       - Check and build for deployment" 