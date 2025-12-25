# Deploy React Frontend to Vercel

## Quick Deployment Steps

### Step 1: Push to GitHub (if not already done)
```bash
git push -u origin main
```

### Step 2: Deploy on Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import Project:**
   - Click "Add New Project" or "Import Project"
   - Select your repository: `AbdulRahim012/BeyondChat_Web_Scrapper`

3. **Configure Project Settings:**
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `react-frontend` ⚠️ **IMPORTANT!**
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)
   - **Install Command:** `npm install` (auto-filled)

4. **Environment Variables:**
   - Click "Environment Variables"
   - Add new variable:
     - **Name:** `VITE_API_URL`
     - **Value:** Your Laravel API URL
       - For local testing: `http://localhost:8000/api`
       - For production: Your deployed Laravel API URL (e.g., `https://your-api.vercel.app/api`)

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (usually 1-2 minutes)

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to react-frontend
cd react-frontend

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No
# - Project name: article-frontend
# - Directory: ./
# - Override settings? No

# Set environment variable
vercel env add VITE_API_URL
# Enter: http://localhost:8000/api (or your API URL)
# Select: Production, Preview, Development (all)
```

## Important Configuration

### Root Directory
⚠️ **CRITICAL:** Set Root Directory to `react-frontend` in Vercel project settings!

This tells Vercel to:
- Look for `package.json` in `react-frontend/`
- Run build commands from `react-frontend/`
- Output build to `react-frontend/dist/`

### Environment Variables

**Required:**
- `VITE_API_URL` - Your Laravel API endpoint

**Example values:**
- Development: `http://localhost:8000/api`
- Production: `https://your-laravel-api.vercel.app/api`

### Build Settings (Auto-detected by Vercel)

- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## Deployment Options

### Option A: Frontend Only (Limited Functionality)
⚠️ **Not Recommended for Production**

If you deploy only the frontend:
- The frontend will try to connect to `http://localhost:8000/api` (default)
- This **won't work** from Vercel because:
  - Browsers block requests to `localhost` from external domains
  - Your local backend won't be accessible to Vercel users
- **Result:** Frontend will load but show errors when fetching articles

### Option B: Frontend + Local Backend (Development Only)
✅ **Good for Local Testing**

1. Deploy frontend to Vercel
2. Keep backend running locally:
   ```bash
   cd laravel-backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```
3. Use a tunnel service (ngrok, Cloudflare Tunnel) to expose local backend:
   ```bash
   # Example with ngrok
   ngrok http 8000
   # Use the ngrok URL in VITE_API_URL
   ```
4. Set `VITE_API_URL` in Vercel to your tunnel URL

### Option C: Deploy Both (Recommended) ✅
✅ **Best for Production/Demo**

1. **Deploy Frontend to Vercel** (this guide)
2. **Deploy Backend to:**
   - **Vercel** (with serverless functions)
   - **Railway** (easy PHP hosting)
   - **Render** (free tier available)
   - **Heroku** (if you have account)
   - **DigitalOcean/AWS** (VPS)
3. Set `VITE_API_URL` in Vercel to your deployed backend URL

## After Deployment

1. **Get your Vercel URL:**
   - Your app will be live at: `https://your-project.vercel.app`

2. **Update CORS in Laravel:**
   - Edit `laravel-backend/config/cors.php`
   - Add your Vercel domain to allowed origins:
   ```php
   'allowed_origins' => [
       'https://your-project.vercel.app',
       'http://localhost:3000',
   ],
   ```

3. **Test the deployment:**
   - Visit your Vercel URL
   - Check browser console for any errors
   - Verify API calls are working

## Troubleshooting

### Build Fails
- Check that Root Directory is set to `react-frontend`
- Verify `package.json` exists in `react-frontend/`
- Check build logs in Vercel dashboard

### API Not Working
- Verify `VITE_API_URL` environment variable is set
- Check CORS settings in Laravel
- Verify Laravel API is accessible

### 404 Errors on Routes
- Vercel.json is configured to route all requests to `index.html`
- This should work automatically with the provided `vercel.json`

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

