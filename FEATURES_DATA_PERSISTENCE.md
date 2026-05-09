# Quick Start: Data Persistence & Export Features

## 🎯 Overview

The NBH Data Explorer now supports three data storage options:

| Feature | Local Only | + Backend | Notes |
|---------|-----------|-----------|-------|
| Upload & Process Files | ✅ | ✅ | Works in browser immediately |
| Export Data as JSON | ✅ | ✅ | Backup locally anytime |
| Import Previous Data | ✅ | ✅ | Restore from JSON |
| Cloud Storage | ❌ | ✅ | Persist across devices |
| Year Summaries | ✅ | ✅ | Aggregate 30+ files |
| Multi-Device Sync | ❌ | ✅ | Access from anywhere |

---

## Part 1: GitHub Pages Only (No Backend)

### For GitHub Pages Users

Your data is stored locally in your browser using **IndexedDB**.

1. **Upload your monthly files** (6-7 files for 90 days)
   - Drag & drop or browse
   - Data is processed in your browser (100% private)

2. **Auto-saves to browser storage**
   - Automatically saved in IndexedDB
   - Returns immediately if you reload the page

3. **Export as JSON backup**
   - Click **"Export JSON"** button
   - Download appears in your Downloads folder
   - Keep as backup or share with team

4. **Import from backup**
   - Click **"Import JSON"** button
   - Select previously exported JSON file
   - Data loads instantly

5. **Yearly summary**
   - Upload all months for the year (12 files = 1 year)
   - Dashboard automatically shows combined analytics
   - Export as PDF when ready

### Example Workflow
```
Jan 2024 uploads → Data saved to IndexedDB
Feb 2024 uploads → Data saved to IndexedDB
...
Dec 2024 uploads → Data saved to IndexedDB
↓
Dashboard shows full year summary
↓
Click "Export JSON" → Backup downloaded
↓
Share backup file with team
↓
Team member clicks "Import JSON" → Sees same data
```

---

## Part 2: With Optional Node.js Backend

For cloud storage and team collaboration, deploy the backend server.

### Setup Backend (5 minutes on Railway)

1. **Go to**: https://railway.app/
2. **Connect your GitHub repo** → Auto-deploys
3. **Get your backend URL**: `https://your-railway-url.railway.app`

### Connect Frontend to Backend

In the browser console (F12), run:

```javascript
window.APIClient.setApiUrl('https://your-railway-url.railway.app/api');
window.APIClient.setBackendEnabled(true);
```

Or edit `js/app.js` to auto-connect:

```javascript
// After DOMContentLoaded function
const backendUrl = 'https://your-railway-url.railway.app/api';
window.APIClient.checkHealth().then(health => {
    if (health.status === 'ok') {
        window.APIClient.setApiUrl(backendUrl);
        window.APIClient.setBackendEnabled(true);
        console.log('✅ Backend connected');
    }
});
```

### Workflow With Backend

```
Upload 30 files (Jan-Dec 2024)
↓
Processed in browser
↓
Click "Save to Backend" (custom button you can add)
↓
Data stored in cloud (Railway)
↓
Team members access from any device
↓
GET /api/yearly-summary/2024 returns aggregated data
```

---

## API Usage Examples

### Get Yearly Summary (Backend Only)

```bash
curl https://your-backend/api/yearly-summary/2024
```

Response:
```json
{
  "year": "2024",
  "monthCount": 12,
  "totalTickets": 15890,
  "avgResolutionDays": 3.2,
  "statusBreakdown": {
    "OPEN": 234,
    "RESOLVED": 12000,
    "CLOSED": 3656
  },
  "zoneBreakdown": {
    "Zone-1": 3200,
    "Zone-2": 2100,
    "Zone-3": 1600,
    ...
  }
}
```

### Get Specific Month Report

```bash
curl https://your-backend/api/report/2024-12
```

### Upload Files

```bash
curl -X POST https://your-backend/api/upload \
  -F "files=@jan2024.xlsx" \
  -F "files=@feb2024.xlsx" \
  -F "files=@mar2024.xlsx"
```

---

## Data Storage Locations

### IndexedDB (Browser Local)
- Location: Browser cache
- Size: ~50MB per site
- Access: `window.loadDataFromIndexedDB()`
- Persists: ✅ Yes (until cache cleared)
- Backup: Export as JSON

### Backend (Cloud)
- Location: `server.js:data/` directory
- Size: Unlimited (depends on instance)
- Access: REST API endpoints
- Persists: ✅ Yes (until deleted)
- Backup: `data/report_*.json` files

---

## Key Functions Reference

### Frontend (IndexedDB)

```javascript
// Save data
await window.saveDataToIndexedDB(data, metadata);

// Load data
const saved = await window.loadDataFromIndexedDB();

// Export as JSON
await window.exportDataAsJSON('my-backup.json');

// Import from JSON
const data = await window.importDataFromJSON(file);

// Get yearly summary (all months loaded)
const summary = await window.getYearlySummary('2024');

// Clear storage
await window.clearIndexedDB();
```

### Backend (API Client)

```javascript
// Check if backend is available
const health = await window.APIClient.checkHealth();

// Save report to backend
await window.APIClient.saveReport(data, metadata);

// List all reports
const reports = await window.APIClient.getReports();

// Get yearly summary
const yearly = await window.APIClient.getYearlySummary('2024');

// Get specific month
const month = await window.APIClient.getReport('2024-12');

// Delete report
await window.APIClient.deleteReport('2024-12');
```

---

## Handling 30+ Files

### Best Practice for Large Batches

1. **Upload in groups**
   - Upload 5-6 files (one month) at a time
   - Wait for dashboard to render
   - Repeat for other months

2. **Export monthly backups**
   ```javascript
   // After each month upload
   await window.saveDataToIndexedDB(monthData, {monthKey: '2024-01'});
   await window.exportDataAsJSON('jan-2024.json');
   ```

3. **Aggregate in backend** (if using backend)
   ```bash
   # Backend auto-aggregates all months in yearly-summary endpoint
   curl /api/yearly-summary/2024
   ```

---

## Troubleshooting

### Data Not Saving?
```javascript
// Check IndexedDB
const saved = await window.loadDataFromIndexedDB();
console.log(saved); // Should show your data
```

### Can't Import JSON?
```javascript
// Verify file format
// Must be exported from Export JSON button
// Or manually formatted as:
{
  "exportedAt": "2024-01-15T10:00:00Z",
  "version": "1.0",
  "data": {
    "data": [...],
    "metadata": {...}
  }
}
```

### Backend Not Connecting?
```javascript
// Test backend health
const health = await window.APIClient.checkHealth();
// Should return: {status: "ok", uptime: 123.45, ...}
```

---

## Next Steps

1. **Deploy to GitHub Pages**: See [DEPLOYMENT.md](DEPLOYMENT.md)
2. **Add Backend (Optional)**: Railway free tier, takes 5 minutes
3. **Setup Team Access**: Use exported JSON for collaboration
4. **Automate Backups**: Export JSON weekly to Google Drive/S3

---

Still have questions? Check [DEPLOYMENT.md](DEPLOYMENT.md) for full setup guide.
