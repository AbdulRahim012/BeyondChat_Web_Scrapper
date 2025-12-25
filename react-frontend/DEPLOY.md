# Deploy React Frontend to Vercel

## Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from react-frontend directory:**
   ```bash
   cd react-frontend
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - Project name: **article-frontend** (or your preferred name)
   - Directory: **./react-frontend** (or just **.** if already in the directory)
   - Override settings? **No**

5. **Set Environment Variables:**
   After deployment, go to Vercel dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `http://your-laravel-api-url/api`
     (e.g., `https://your-api.vercel.app/api` or your deployed Laravel API URL)

### Option 2: Deploy via GitHub

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `react-frontend`
   - Set **Build Command** to `npm run build`
   - Set **Output Directory** to `dist`
   - Add Environment Variable: `VITE_API_URL` = your Laravel API URL

3. **Deploy!**

## Environment Variables

Make sure to set these in Vercel dashboard:

- `VITE_API_URL` - Your Laravel API URL (e.g., `https://your-api.vercel.app/api` or `http://your-server:8000/api`)

## Build Settings

Vercel will automatically detect:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## Important Notes

1. **CORS:** Make sure your Laravel API allows requests from your Vercel domain
2. **API URL:** Update `VITE_API_URL` in Vercel environment variables
3. **HTTPS:** Vercel provides HTTPS automatically
4. **Custom Domain:** You can add a custom domain in Vercel settings

## Troubleshooting

- **Build fails:** Check that all dependencies are in `package.json`
- **API not working:** Verify `VITE_API_URL` is set correctly in Vercel
- **CORS errors:** Update Laravel `config/cors.php` to allow your Vercel domain

