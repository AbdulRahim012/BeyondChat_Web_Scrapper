#!/bin/bash

# Complete Project Setup and Run Script
# Run with: bash setup-and-run.sh

set -e

echo "🚀 Setting up BeyondChats Article Scraper Project"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check SQLite extension
echo "Checking PHP SQLite extension..."
if php -m | grep -qi sqlite; then
    echo -e "${GREEN}✓ SQLite extension installed${NC}"
else
    echo -e "${YELLOW}⚠ SQLite extension not found${NC}"
    echo "Please run: sudo apt install -y php8.3-sqlite3"
    exit 1
fi

# Setup Laravel
echo ""
echo "📦 Setting up Laravel Backend..."
cd laravel-backend

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
APP_NAME=ArticleScraper
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
DB_DATABASE=/home/abdul/Web_Scraping_Assignment/laravel-backend/database/database.sqlite
EOF
    php artisan key:generate
fi

echo "Running migrations..."
php artisan migrate --force

echo -e "${GREEN}✓ Laravel backend ready${NC}"

# Setup NodeJS
echo ""
echo "📦 Setting up NodeJS Script..."
cd ../nodejs-script

if [ ! -d node_modules ]; then
    echo "Installing NodeJS dependencies..."
    npm install
fi

if [ ! -f .env ]; then
    echo "Creating .env file for NodeJS..."
    cat > .env << 'EOF'
LARAVEL_API_URL=http://localhost:8000/api
OPENAI_API_KEY=your_openai_api_key_here
EOF
    echo -e "${YELLOW}⚠ Please edit nodejs-script/.env and add your OpenAI API key${NC}"
fi

echo -e "${GREEN}✓ NodeJS script ready${NC}"

# Setup React
echo ""
echo "📦 Setting up React Frontend..."
cd ../react-frontend

if [ ! -d node_modules ]; then
    echo "Installing React dependencies..."
    npm install
fi

echo -e "${GREEN}✓ React frontend ready${NC}"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To run the project:"
echo ""
echo "1. Start Laravel (Terminal 1):"
echo "   cd ~/Web_Scraping_Assignment/laravel-backend"
echo "   php artisan serve"
echo ""
echo "2. Scrape articles (optional, Terminal 1):"
echo "   php artisan scrape:beyondchats --count=5"
echo ""
echo "3. Run NodeJS enhancement (Terminal 2):"
echo "   cd ~/Web_Scraping_Assignment/nodejs-script"
echo "   npm start"
echo ""
echo "4. Start React frontend (Terminal 3):"
echo "   cd ~/Web_Scraping_Assignment/react-frontend"
echo "   npm run dev"
echo ""

