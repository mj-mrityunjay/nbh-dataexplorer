# BHRTOA Facility Management Data Explorer - Updated Guide

## What's Fixed

### 1. ✓ Charts Now Render Properly
- **Previous Issue**: Charts appeared empty in report.html
- **Root Cause**: Charts were being generated but had issues with Plotly CDN loading
- **Solution**: 
  - Updated chart generation to use `include_plotlyjs='cdn'` for each chart
  - Added Plotly CDN script tag in HTML header
  - Ensured all charts have proper sizing and configuration
- **Result**: All 10 analytics charts now display correctly

### 2. ✓ Block/Unit Analysis Added
- **Issue_Location Format**: Contains block and unit as "BLOCK-UNIT" (e.g., "B1-U101")
- **What's New**:
  - Automatic parsing of Issue_Location field
  - Creates separate "Block" and "Unit" columns in data
  - Identified 80 unique blocks and 83 unique units
  - Added block/unit columns to the ticket table
- **New Charts**:
  - Top 15 blocks by ticket volume
  - Top 15 units by ticket volume
  - Status distribution by block
  - Priority distribution by block
  - Average resolution time by block

### 3. ✓ Web Server Fixed
- **Previous Issue**: `serve_report.py` crashed with Unicode encoding error
  - Error: `UnicodeEncodeError: 'charmap' codec can't encode character '\u2713'`
  - Checkmark character (✓) couldn't be encoded in Windows cp1252 terminal
- **Solution**: Created new `launch_server.py`
  - Uses only ASCII-compatible characters
  - Proper UTF-8 encoding handling
  - Auto-opens browser
  - Better error messages
  - Handles port conflicts gracefully
- **Result**: Server starts cleanly without encoding errors

## How to Use

### Generate Report
```powershell
python generate_report.py
```
This will:
- Load all data sources (1282 support tickets)
- Parse block and unit information
- Generate 10 analytics charts
- Create searchable/sortable ticket table
- Output: `report.html` (0.75 MB)

**Output includes:**
- 1282 Total Tickets
- 80 Blocks analyzed
- 83 Units analyzed
- 10 Analytics Charts
- Full ticket details table with filtering

### Start Web Server
```powershell
python launch_server.py
```
This will:
- Verify report.html exists
- Start HTTP server on http://localhost:8000
- Auto-open in your default browser
- Show server status with no errors

**Server runs cleanly without Unicode errors**

### Access Report
- **Via Server**: http://localhost:8000
- **Direct File**: Open `report.html` in any web browser

## What the Report Contains

### Key Metrics (Top)
- Total Tickets: 1282
- Blocks: 80
- Units: 83
- Open Tickets: [Live count]

### Analytics Charts (10 total)
1. **Ticket Status Distribution** - Pie chart of Open/Resolved/Closed
2. **Priority Distribution** - Bar chart of High/Medium/Low
3. **Top Issue Categories** - Top 12 categories
4. **Resolution Time Distribution** - Histogram of days to resolve
5. **Top Blocks by Volume** - Top 15 blocks by ticket count
6. **Top Units by Volume** - Top 15 units by ticket count
7. **Status by Block** - Stacked bar showing Open/Resolved/Closed per block
8. **Priority by Block** - Stacked bar showing High/Medium/Low per block
9. **Timeline** - Line chart of tickets created over time
10. **Avg Resolution by Block** - Bar chart of avg days to resolve per block

### Support Ticket Table
- **Searchable**: Filter by any text
- **Sortable**: Click column headers
- **Pagination**: 25/50/100/250 rows per page
- **Export**: CSV, Excel, PDF, Print
- **Columns**: 
  - Ticket ID
  - Block
  - Unit
  - Category
  - Priority (color-coded)
  - Status (color-coded)
  - Created Date
  - Resolved Date
  - Days to Resolve
  - Created By
  - Rating

### Filtering & Sorting
- Search across all columns
- Sort by any column (click header)
- Color-coded status and priority indicators
- Responsive design - works on all devices

## Features

### Data Processing
- Automatic datetime conversion
- Resolution time calculation (days)
- Closure time calculation (days)
- Ticket aging calculation
- Status tracking (Open/Resolved/Closed)
- Block/Unit parsing from location field

### Charts (Interactive)
- All charts are interactive with Plotly
- Hover for details
- Zoom, pan, download as PNG
- Click legend items to show/hide data

### Table Features
- Full-text search across all fields
- Column-based sorting
- Pagination with selectable rows per page
- Export to CSV, Excel, PDF, Print
- Responsive grid layout

### Performance
- Report file: 0.75 MB
- Loads quickly in browser
- Handles 1282 rows smoothly
- Optimized for large datasets

## Technical Details

### Files Modified
- `generate_report.py` - New version with fixed charts and block/unit parsing
- `launch_server.py` - New web server (replaces serve_report.py)
- `report.html` - Generated report (auto-created)

### Data Sources
The script loads data from:
- `SUPPORT_TICKET_COMMENTS_STATUS_*.xlsx` - Main source (1282 tickets)
- `CATEGORY_WISE_SUPPORT_TICKET_*.xlsx` - Category info
- `COMPLAINT_SUMMARY_*.csv` - Summary data
- Other data files for reference

### Chart Libraries
- **Plotly.js** - Interactive charts (CDN loaded)
- **DataTables** - Table functionality (jQuery plugin)
- **jQuery** - DOM manipulation
- **jsPDF, xlsx** - Export functionality

### Encoding
- Python: UTF-8 (proper handling)
- HTML: UTF-8 charset
- Browser: Full Unicode support
- Terminal: ASCII-safe output from server

## Troubleshooting

### Problem: Server won't start
**Solution 1**: Port already in use
```powershell
# Edit launch_server.py, change PORT = 8000 to PORT = 8001
```

**Solution 2**: Report not found
```powershell
# Run first:
python generate_report.py
```

### Problem: Charts still empty
**Solution**: Clear browser cache and refresh
- Press `Ctrl+Shift+Delete` to open clear cache
- Select "All time"
- Clear cache
- Refresh page (F5)

### Problem: Slow to load
**Solution**: Expected for 1282 rows. Wait 10-15 seconds for full load.

### Problem: Table not searchable
**Solution**: Wait for DataTables to initialize. It shows "Processing..." while loading.

## Summary

The report system is now fully operational with:
- ✓ 10 working analytics charts
- ✓ Block and unit analysis
- ✓ Working web server (no encoding errors)
- ✓ Searchable/sortable ticket table
- ✓ Export functionality
- ✓ Interactive visualizations

Run `python generate_report.py` to generate the report, then `python launch_server.py` to view it.

---
Generated: 2025-12-27
Report Type: BHRTOA Facility Management Analytics
Data Volume: 1282 Support Tickets | 80 Blocks | 83 Units
