#!/bin/bash
# ============================================================
# HopeFusion Africa — One-Command Production Deploy Script
# Usage: ./deploy.sh [--build] [--migrate]
# ============================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BUILD=false
MIGRATE=false

for arg in "$@"; do
  case $arg in
    --build)   BUILD=true ;;
    --migrate) MIGRATE=true ;;
  esac
done

echo -e "${BOLD}🌍 HopeFusion Africa — Production Deploy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env not found. Copy .env.example and fill in values.${NC}"
  exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker not installed.${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Environment file found"
echo -e "${GREEN}✓${NC} Docker available"

# Optional build
if [ "$BUILD" = true ]; then
  echo -e "\n${YELLOW}🐳 Building Docker images...${NC}"
  docker-compose build --no-cache
  echo -e "${GREEN}✓ Images built${NC}"
fi

# Start services
echo -e "\n${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d

# Wait for API health check
echo -e "\n${YELLOW}⏳ Waiting for API to be healthy...${NC}"
MAX=30
COUNT=0
until docker-compose exec -T api wget -qO- http://localhost:3000/api/v1/health > /dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX ]; then
    echo -e "${RED}❌ API health check timed out after ${MAX}s${NC}"
    docker-compose logs api --tail=20
    exit 1
  fi
  echo -n "."
  sleep 2
done
echo -e "\n${GREEN}✓ API is healthy${NC}"

# Optional migration
if [ "$MIGRATE" = true ]; then
  echo -e "\n${YELLOW}🔄 Running DB migration...${NC}"
  docker-compose exec -T api npm run db:migrate
  echo -e "${GREEN}✓ Migration complete${NC}"
fi

echo -e "\n${BOLD}${GREEN}🎉 Deployment complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  API:      https://api.hopefusionafrica.com"
echo -e "  Frontend: https://hopefusionafrica.com"
echo -e "  Admin:    https://hopefusionafrica.com/admin"
echo ""
echo -e "  Logs:     docker-compose logs -f"
echo -e "  Status:   docker-compose ps"
