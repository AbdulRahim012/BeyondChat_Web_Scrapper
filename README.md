# BeyondChats Article Scraping & Enhancement Project

A full-stack application that scrapes articles from BeyondChats blog, enhances them using Google search results and OpenAI, and displays them in a modern React frontend.

## 🌐 Live Demo

**Frontend Application:** [https://beyond-chat-web-scrapper-bagegv0nf.vercel.app](https://beyond-chat-web-scrapper-bagegv0nf.vercel.app?_vercel_share=u6QQGGQ9DRSak1tjAqAylxhmoAGQLyoL)

You can view both original and enhanced articles on the live site.

## 📋 Project Overview

This project consists of three main components:

1. **Laravel Backend** - Scrapes articles, stores them in database, provides CRUD APIs
2. **NodeJS Script** - Enhances articles using Google search and OpenAI
3. **React Frontend** - Displays articles in a responsive, professional UI

## 🏗️ Architecture

```
┌─────────────────┐
│  BeyondChats    │
│  Blog Website   │
└────────┬────────┘
         │
         │ Scrape
         ▼
┌─────────────────┐
│  Laravel API    │
│  - Scrape Cmd   │
│  - CRUD APIs    │
│  - MySQL DB     │
└────────┬────────┘
         │
         │ Fetch Latest
         ▼
┌─────────────────┐
│  NodeJS Script  │
│  - Google Search│
│  - Scrape URLs  │
│  - OpenAI API   │
└────────┬────────┘
         │
         │ Publish Enhanced
         ▼
┌─────────────────┐
│  Laravel API    │
│  (Store Updated)│
└────────┬────────┘
         │
         │ Fetch Articles
         ▼
┌─────────────────┐
│  React Frontend │
│  - Display UI   │
└─────────────────┘
```

### Data Flow

1. **Scraping Phase**: Laravel command scrapes 5 oldest articles from BeyondChats blog
2. **Storage**: Articles stored in MySQL database via Laravel migrations
3. **Enhancement Phase**: NodeJS script fetches latest article, searches Google, scrapes top 2 results
4. **LLM Processing**: OpenAI enhances article content based on reference articles
5. **Publishing**: Enhanced article published back to Laravel API with references
6. **Display**: React frontend fetches and displays all articles (original + updated)

## 🚀 Local Setup Instructions

### Prerequisites

- PHP 8.1+ with Composer
- Node.js 18+ and npm
- MySQL 5.7+ or MariaDB
- OpenAI API Key (free tier available)

### Phase 1: Laravel Backend Setup

1. **Navigate to Laravel directory:**
   ```bash
   cd laravel-backend
   ```

2. **Install dependencies:**
   ```bash
   composer install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Update `.env` file with your database credentials:**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=article_scraper
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

5. **Create database:**
   ```sql
   CREATE DATABASE article_scraper;
   ```

6. **Run migrations:**
   ```bash
   php artisan migrate
   ```

7. **Scrape articles from BeyondChats:**
   ```bash
   php artisan scrape:beyondchats --count=5
   ```

8. **Start Laravel server:**
   ```bash
   php artisan serve
   ```

   The API will be available at `http://localhost:8000/api`

### Phase 2: NodeJS Script Setup

1. **Navigate to NodeJS directory:**
   ```bash
   cd nodejs-script
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

4. **Update `.env` file:**
   ```env
   LARAVEL_API_URL=http://localhost:8000/api
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Run the enhancement script:**
   ```bash
   npm start
   ```

   This will:
   - Fetch the latest article from Laravel API
   - Search Google for the article title
   - Scrape content from top 2 blog results
   - Enhance article using OpenAI
   - Publish enhanced article back to Laravel API

### Phase 3: React Frontend Setup

1. **Navigate to React directory:**
   ```bash
   cd react-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   ```
   
   Update if your Laravel API is on a different URL:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## 📁 Project Structure

```
Web_Scraping_Assignment/
├── laravel-backend/
│   ├── app/
│   │   ├── Console/Commands/
│   │   │   └── ScrapeBeyondChatsArticles.php
│   │   ├── Http/Controllers/API/
│   │   │   └── ArticleController.php
│   │   └── Models/
│   │       └── Article.php
│   ├── database/migrations/
│   │   └── 2024_01_01_000001_create_articles_table.php
│   ├── routes/
│   │   └── api.php
│   └── composer.json
│
├── nodejs-script/
│   ├── index.js
│   ├── package.json
│   └── .env.example
│
├── react-frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🔌 API Endpoints

### Laravel API Base URL: `http://localhost:8000/api`

- `GET /articles` - Get all articles
- `GET /articles/latest` - Get latest article
- `GET /articles/{id}` - Get specific article
- `POST /articles` - Create new article
- `PUT /articles/{id}` - Update article
- `DELETE /articles/{id}` - Delete article

### Query Parameters

- `?is_updated=true` - Filter updated articles
- `?is_updated=false` - Filter original articles

## 🗄️ Database Schema

### Articles Table

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| title | string | Article title |
| content | text | Article content |
| author | string | Author name (nullable) |
| published_date | date | Publication date (nullable) |
| slug | string | URL-friendly slug (unique) |
| original_url | string | Original article URL |
| is_updated | boolean | Whether this is an updated version |
| updated_article_id | bigint | Reference to original article (nullable) |
| reference_urls | json | Array of reference URLs |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Update timestamp |

## 🛠️ Technologies Used

### Backend
- **Laravel 10** - PHP framework
- **Goutte** - Web scraping library
- **MySQL** - Database

### NodeJS Script
- **Puppeteer** - Headless browser for Google search
- **Cheerio** - HTML parsing and scraping
- **Axios** - HTTP client
- **OpenAI API** - LLM for article enhancement

### Frontend
- **React 18** - UI library
- **React Router** - Routing
- **Vite** - Build tool
- **Axios** - API client

## 📝 Usage Examples

### Scrape Articles
```bash
cd laravel-backend
php artisan scrape:beyondchats --count=5
```

### Enhance Latest Article
```bash
cd nodejs-script
npm start
```

### View Frontend
```bash
cd react-frontend
npm run dev
# Open http://localhost:3000
```

## ⚠️ Important Notes

1. **Google Search**: Uses Puppeteer which may be detected by Google. If blocked, consider adding delays or using alternative methods.

2. **OpenAI API**: Requires an API key. Free tier has rate limits. Monitor usage at https://platform.openai.com/usage

3. **CORS**: Laravel CORS is configured to allow requests from the React frontend. Adjust `config/cors.php` if needed.

4. **Rate Limiting**: Be respectful when scraping. The script includes delays to avoid overwhelming servers.

5. **Error Handling**: The scripts include basic error handling. Check console/logs for issues.

## 🐛 Troubleshooting

### Laravel Issues
- **Migration errors**: Ensure database exists and credentials are correct
- **Scraping fails**: Website structure may have changed. Check selectors in `ScrapeBeyondChatsArticles.php`

### NodeJS Issues
- **Puppeteer errors**: Install Chromium dependencies: `sudo apt-get install -y chromium-browser` (Linux)
- **OpenAI errors**: Verify API key is correct and has credits
- **Google blocking**: Add longer delays or use proxy/VPN

### React Issues
- **API connection errors**: Ensure Laravel server is running and CORS is configured
- **Build errors**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## 📄 License

MIT License - Feel free to use this project for learning purposes.

## 👤 Author

Created as part of BeyondChats Technical Product Manager assignment.

---

**Note**: This project uses only free resources. Google search is performed using Puppeteer (free), and OpenAI API requires an API key (free tier available).

