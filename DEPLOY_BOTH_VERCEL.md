# Deploy Both Frontend and Backend on Vercel

## Overview

This guide will help you deploy:
- **React Frontend** → Vercel (static site)
- **Laravel Backend** → Vercel (serverless PHP functions)

⚠️ **Note:** Laravel on Vercel has limitations. For production, consider Railway or Render for the backend.

## Prerequisites

1. GitHub repository pushed and ready
2. Vercel account (free tier works)
3. Both projects configured

## Step 1: Deploy Laravel Backend to Vercel

### 1.1 Create Backend Project on Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your repository: `AbdulRahim012/BeyondChat_Web_Scrapper`
4. Configure:
   - **Project Name:** `beyondchats-api` (or your choice)
   - **Root Directory:** `laravel-backend` ⚠️ **IMPORTANT!**
   - **Framework Preset:** Other (or leave blank)
   - **Build Command:** Leave empty (or `composer install --no-dev`)
   - **Output Directory:** `public`
   - **Install Command:** `composer install --no-dev --optimize-autoloader`

### 1.2 Environment Variables for Backend

Add these in Vercel Dashboard → Settings → Environment Variables:

```
APP_NAME=BeyondChats
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://your-backend.vercel.app

DB_CONNECTION=sqlite
DB_DATABASE=/tmp/database.sqlite

CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
```

**To get APP_KEY:**
```bash
cd laravel-backend
php artisan key:generate --show
# Copy the key and add to Vercel
```

### 1.3 Generate App Key

```bash
cd laravel-backend
php artisan key:generate
# Copy the key from .env to Vercel environment variables
```

### 1.4 Deploy Backend

- Click "Deploy"
- Wait for deployment
- Note the deployment URL (e.g., `https://beyondchats-api.vercel.app`)

### 1.5 Initialize Database (First Time)

After first deployment, you need to run migrations. You can:

**Option A: Use Vercel CLI**
```bash
cd laravel-backend
vercel env pull .env.local
vercel --prod
```

**Option B: Create a setup endpoint** (temporary)
Add a route to run migrations once:
```php
// routes/web.php (remove after setup!)
Route::get('/setup', function() {
    Artisan::call('migrate', ['--force' => true]);
    Artisan::call('scrape:beyondchats', ['--count' => 5]);
    return 'Database initialized!';
});
```

Then visit: `https://your-backend.vercel.app/setup` (delete this route after!)

## Step 2: Deploy React Frontend to Vercel

### 2.1 Create Frontend Project on Vercel

1. Go to https://vercel.com
2. Click "Add New Project" (new project, separate from backend)
3. Import the same repository: `AbdulRahim012/BeyondChat_Web_Scrapper`
4. Configure:
   - **Project Name:** `beyondchats-frontend` (or your choice)
   - **Root Directory:** `react-frontend` ⚠️ **IMPORTANT!**
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)
   - **Install Command:** `npm install` (auto-filled)

### 2.2 Environment Variables for Frontend

Add in Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://your-backend.vercel.app/api
```

Replace `your-backend.vercel.app` with your actual backend URL from Step 1.4

### 2.3 Deploy Frontend

- Click "Deploy"
- Wait for deployment
- Your frontend will be live!

## Step 3: Update CORS Settings

After both are deployed, update Laravel CORS:

1. In Vercel Dashboard → Backend Project → Settings → Environment Variables
2. Add/Update:
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

3. Update `laravel-backend/config/cors.php`:
   ```php
   'paths' => ['api/*', 'sanctum/csrf-cookie'],
   'allowed_methods' => ['*'],
   'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
   'allowed_origins_patterns' => [],
   'allowed_headers' => ['*'],
   'exposed_headers' => [],
   'max_age' => 0,
   'supports_credentials' => false,
   ```

## Step 4: Test Everything

1. Visit your frontend URL: `https://your-frontend.vercel.app`
2. Check browser console for errors
3. Verify articles are loading
4. Test article detail pages

## Important Notes

### Laravel Limitations on Vercel

⚠️ **Vercel's serverless environment has limitations:**

1. **No persistent storage** - SQLite database resets on each deployment
   - **Solution:** Use a cloud database (PlanetScale, Supabase, Railway DB)
   
2. **File storage** - `storage/` directory is read-only
   - **Solution:** Use cloud storage (S3, Cloudinary)

3. **Cold starts** - First request may be slow
   - **Solution:** Use Vercel Pro or keep functions warm

4. **Database migrations** - Need to run manually or via API endpoint

### Better Alternative: Use Railway/Render for Backend

For production, consider:
- **Railway** - Easy Laravel deployment, free tier
- **Render** - Free tier, good for Laravel
- **DigitalOcean App Platform** - Simple deployment

Then deploy only frontend on Vercel.

## Troubleshooting

### Backend Issues

**404 on API routes:**
- Check `vercel.json` routes configuration
- Verify Root Directory is `laravel-backend`

**Database errors:**
- SQLite needs write permissions (use `/tmp/` directory)
- Consider switching to cloud database

**CORS errors:**
- Update `CORS_ALLOWED_ORIGINS` environment variable
- Check `config/cors.php` settings

### Frontend Issues

**API not connecting:**
- Verify `VITE_API_URL` is set correctly
- Check backend URL is accessible
- Check browser console for CORS errors

**Build fails:**
- Check Root Directory is `react-frontend`
- Verify `package.json` exists
- Check build logs in Vercel

## Quick Commands Reference

```bash
# Generate Laravel app key
cd laravel-backend
php artisan key:generate

# Test backend locally
php artisan serve

# Test frontend locally
cd react-frontend
npm run dev

# Deploy backend with Vercel CLI
cd laravel-backend
vercel

# Deploy frontend with Vercel CLI
cd react-frontend
vercel
```

