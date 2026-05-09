# NBH Data Explorer - Deployment & Setup Guide

This guide covers deploying the NBH Data Explorer with full multi-year data persistence support.

## Architecture Overview

- **Frontend**: Static HTML/CSS/JS hosted on GitHub Pages
- **Backend (Optional)**: Node.js/Express server for cloud storage & persistent data
- **Local Storage**: IndexedDB for browser-based data persistence (works offline)

---

## Part 1: Frontend (GitHub Pages Hosting)

### Prerequisites
- GitHub account
- Git installed

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - NBH Data Explorer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/nbh-dataexplorer.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select "Deploy from a branch"
   - Choose "main" branch and "/" (root) folder
   - Save

3. **Your site will be live at**: `https://YOUR_USERNAME.github.io/nbh-dataexplorer/`

### Features Available on GitHub Pages Only
✅ Upload & process files locally  
✅ Generate PDF reports  
✅ Export data as JSON  
✅ Import previously exported JSON  
✅ Store data in browser (IndexedDB)  
✅ Yearly summaries from uploaded files  

---

## Part 2: Optional Backend Setup

For persistent cloud storage, multi-device sync, and advanced analytics, deploy the Node.js backend.

### Option A: Deploy on Railway (⭐ Recommended - Free)

1. **Sign up at**: https://railway.app/

2. **Connect your GitHub repository**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your nbh-dataexplorer repository
   - Authorize Railway to access your GitHub

3. **Configure environment**
   - Railway auto-detects Node.js project
   - No additional config needed
   - Railway generates a public URL

4. **Deploy**
   - Push code to GitHub
   - Railway auto-deploys on every push

5. **Test backend**
   ```bash
   curl https://your-railway-url.railway.app/api/health
   ```
   Should return: `{"status":"ok", ...}`

6. **Connect frontend to backend** (in your GitHub Pages site)
   - Open browser console on your site
   - Run:
   ```javascript
   window.APIClient.setApiUrl('https://your-railway-url.railway.app/api');
   window.APIClient.setBackendEnabled(true);
   ```
   - Or add this to HTML (in app.js after DOMContentLoaded):
   ```javascript
   // Auto-connect to backend if available
   const backendUrl = 'https://your-railway-url.railway.app/api';
   fetch(`${backendUrl}/health`).then(() => {
       window.APIClient.setApiUrl(backendUrl);
       window.APIClient.setBackendEnabled(true);
       console.log('✅ Backend connected');
   }).catch(() => {
       console.log('⚠️ Backend unavailable - using local mode');
   });
   ```

---

### Option B: Deploy on Heroku (Paid - $7/month)

1. **Sign up at**: https://www.heroku.com/

2. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli

3. **Create app**
   ```bash
   heroku login
   heroku create your-app-name
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **View logs**
   ```bash
   heroku logs --tail
   ```

6. **Get your backend URL**: `https://your-app-name.herokuapp.com/api`

---

### Option C: Deploy on Vercel (Free)

1. **Sign up at**: https://vercel.com/

2. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Follow prompts** and confirm deployment

---

### Option D: Local Docker Deployment

Run the server locally using Docker:

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Create .dockerignore**
   ```
   node_modules
   npm-debug.log
   .git
   .gitignore
   ```

3. **Build and run**
   ```bash
   docker build -t nbh-explorer .
   docker run -p 5000:5000 -v $(pwd)/data:/app/data nbh-explorer
   ```

4. **Access at**: http://localhost:5000

---

## Part 3: Local Development Setup

### Prerequisites
- Node.js 14+ and npm installed
- VS Code (recommended)

### Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   Backend will run on http://localhost:5000

3. **In another terminal, test the frontend**
   ```bash
   # Option 1: Use any HTTP server
   npx http-server
   # Frontend on: http://localhost:8080
   
   # Option 2: Use Python
   python -m http.server 8000
   # Frontend on: http://localhost:8000
   ```

4. **Enable backend in frontend**
   ```javascript
   window.APIClient.setApiUrl('http://localhost:5000/api');
   window.APIClient.setBackendEnabled(true);
   ```

---

## Usage: Backend API Endpoints

### 1. Upload Files
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "files=@ticket1.xlsx" \
  -F "files=@ticket2.xlsx"
```

### 2. Save Report
```bash
curl -X POST http://localhost:5000/api/save-report \
  -H "Content-Type: application/json" \
  -d '{
    "data": [...],
    "metadata": {"source": "file_upload"}
  }'
```

### 3. List All Reports
```bash
curl http://localhost:5000/api/reports
```

### 4. Get Yearly Summary (2024 data)
```bash
curl http://localhost:5000/api/yearly-summary/2024
```

Response:
```json
{
  "success": true,
  "year": "2024",
  "monthCount": 12,
  "totalTickets": 5234,
  "avgResolutionDays": 2.5,
  "statusBreakdown": {
    "OPEN": 145,
    "RESOLVED": 3200,
    "CLOSED": 1800
  },
  "zoneBreakdown": {
    "Zone-1": 890,
    "Zone-2": 450,
    ...
  },
  "reports": [...]
}
```

### 5. Get Specific Report
```bash
curl http://localhost:5000/api/report/2024-01
```

### 6. Delete Report
```bash
curl -X POST http://localhost:5000/api/delete-report/2024-01
```

### 7. Health Check
```bash
curl http://localhost:5000/api/health
```

---

## Data Storage

### Local Storage (IndexedDB)
- ✅ Works offline
- ✅ ~50MB storage limit
- ✅ Data persists across browser sessions
- ❌ Single device only
- ❌ No backup if browser cache cleared

### Backend Storage
- ✅ Unlimited storage
- ✅ Multi-device access
- ✅ Cloud backup
- ✅ Multi-year aggregation
- ✅ Team collaboration
- ❌ Requires internet connection

### Recommended Workflow
1. **Upload & process** locally (Chrome, Edge, Safari)
2. **Export as JSON** for backup
3. **Optionally sync** to backend for cloud storage
4. **Generate** yearly summaries from backend

---

## Troubleshooting

### "Invalid time value" Error
- ✅ Already fixed! Uses `.getTime()` for proper date validation

### Backend Connection Issues
1. **Test backend health**
   ```javascript
   await window.APIClient.checkHealth();
   ```

2. **Check CORS**
   - Add to `server.js` if needed:
   ```javascript
   app.use(cors({
       origin: 'https://YOUR_GITHUB_PAGES_URL.github.io',
       credentials: true
   }));
   ```

3. **Check file uploads**
   - Max 100MB per file (configurable in server.js)
   - Ensure `data/` directory exists

### GitHub Pages Deployment Issues
- Pages settings → Source should be "Deploy from a branch"
- Wait 1-2 minutes for initial deploy
- Clear browser cache if old version showing

---

## Production Checklist

- [ ] Set backend URL in production frontend
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS for your GitHub Pages domain
- [ ] Set up database (MongoDB/PostgreSQL) instead of file storage
- [ ] Add authentication/API keys
- [ ] Set up backups (daily exports to S3/Google Drive)
- [ ] Monitor server logs and uptime
- [ ] Rate limit API endpoints
- [ ] Add data encryption for sensitive reports
- [ ] Document data retention policies

---

## Support Multi-Year Summary

### From Frontend (IndexedDB)
```javascript
// Get all monthly reports for a year
const yearlySummary = await window.getYearlySummary('2024');
console.log(yearlySummary); // Array of 12 monthly reports
```

### From Backend
```bash
curl http://your-backend/api/yearly-summary/2024
```

This automatically aggregates all monthly reports for the requested year.

---

## Environment Variables (Backend)

Create `.env` file:
```
PORT=5000
NODE_ENV=production
DATA_DIR=./data
MAX_FILE_SIZE=104857600  # 100MB
```

Load with `dotenv`:
```bash
npm install dotenv
```

Then in server.js:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 5000;
```

---

## Database Migration (Optional)

To upgrade from file storage to MongoDB:

1. **Install MongoDB**
   ```bash
   npm install mongodb
   ```

2. **Update server.js** to use MongoDB instead of fs

3. **Example**:
   ```javascript
   const { MongoClient } = require('mongodb');
   const client = new MongoClient(process.env.MONGODB_URI);
   const db = client.db('nbh-explorer');
   ```

For MongoDB free tier, use **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas

---

## Questions?

- GitHub Issues: Create issue in your repo
- Backend logs: `rails logs --tail` or `heroku logs --tail`
- Frontend console: F12 → Console tab for errors

Happy analyzing! 📊
