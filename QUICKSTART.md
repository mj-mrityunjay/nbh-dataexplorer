# Quick Start Guide

## 30-Second Setup

### Step 1: Generate the Report (First Time Only)
```bash
python generate_report.py
```
✓ Generates `report.html` in 5-10 seconds

### Step 2: View the Report
**Option A - Web Server (Recommended)**
```bash
python serve_report.py
```
Opens automatically in your browser at `http://localhost:8000/`

**Option B - Direct Browser**
Just double-click `report.html` to open in your default browser

---

## What You Get

### 📊 Interactive Dashboard
- **Key Metrics**: Total tickets, resolved/closed count, open tickets, average resolution time
- **10 Analytics Charts**: Status, priority, category, resolution time, timeline, escalation, response time, SLA compliance
- **1,282 Support Tickets**: Fully searchable, sortable table with filtering

### 🔍 Table Features
- **Search**: Type in the search box to filter all columns
- **Sort**: Click column headers to sort A-Z or 0-9
- **Paginate**: 25/50/100/250 rows per page
- **Export**: Download as CSV, Excel, PDF, or Print
- **Color Coding**: Red=HIGH priority/OPEN, Green=CLOSED, Blue=RESOLVED

### 📈 Key Metrics Displayed
- **Total Tickets**: 1,282
- **Resolved/Closed**: Count of completed tickets
- **Open Tickets**: Still pending
- **Avg Resolution Time**: Days to resolve
- **Status Distribution**: Pie chart breakdown
- **Priority Breakdown**: By HIGH/MEDIUM/LOW
- **Top Categories**: By volume
- **Resolution Timeline**: Trend over time

---

## Common Tasks

### Find All HIGH Priority Open Tickets
1. Search box: type "HIGH"
2. Click Status column header to show OPEN first
3. Or manually scan the red-highlighted rows

### Export Ticket Data
1. Click **📥 Export All Tables (CSV)** button at top
2. Or click **CSV** button in the DataTables menu
3. File downloads as `ticket_export_YYYY-MM-DD.csv`

### Analyze Resolution Times
1. Look at "Resolution Time Distribution" chart
2. See median, min, max in Analysis Summary section
3. Hover over chart bars for exact values

### Check SLA Compliance
1. Scroll to "First Response Time" and "SLA Compliance" charts
2. Green bar = good compliance, red bar = needs improvement
3. Look for target >95%

### Find Slowest Categories
1. Click "Resolution Rate" chart
2. Lower bars = categories taking longer
3. Check "Escalation Rate" chart for high escalations

---

## Data Structure

### Columns in Ticket Table
| Column | Type | Description |
|--------|------|-------------|
| Ticket ID | String | Unique identifier |
| Society | String | Building/community name |
| Category | String | Issue type (Electrical, Plumbing, etc.) |
| Priority | HIGH/MEDIUM/LOW | Urgency level |
| Status | OPEN/RESOLVED/CLOSED | Current state |
| Created | Date | When ticket was opened |
| Resolved | Date | When resolved |
| Closed | Date | When closed |
| Resolution Days | Number | Time to resolve |
| Created By | String | Who reported issue |
| Rating | 1-5 | User satisfaction |

### Status Meanings
- **OPEN**: Still being worked on
- **RESOLVED**: Issue fixed, waiting for confirmation
- **CLOSED**: Completed and confirmed
- **AUTO_CLOSE**: System auto-closed (no further action)
- **IN_PROGRESS**: Currently being handled

### Priority Meanings
- **HIGH**: Urgent, security/safety/utility issue
- **MEDIUM**: Important but not urgent
- **LOW**: Minor issues or informational

---

## Charts Explained

### 1. **Status Distribution (Pie Chart)**
Shows percentage of tickets in each status. 
Target: Minimize OPEN, maximize CLOSED/RESOLVED

### 2. **Priority Distribution (Bar Chart)**
Shows count of tickets by priority level.
Target: LOW majority, minimal HIGH

### 3. **Top Categories (Horizontal Bar)**
Top 15 issue types by volume.
Use to identify frequent issues

### 4. **Resolution Time (Histogram)**
Distribution of how long tickets take to resolve.
Shows median and outliers

### 5. **Timeline (Line Chart)**
Tickets created over the 90-day period.
Shows volume trends

### 6. **Status by Date (Stacked Bar)**
How statuses changed over time.
Trend analysis

### 7-10. **Complaint Summary & Escalation**
Category-specific metrics
Resolution rates, escalation rates, response times

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search table | Type directly in search box |
| Sort column | Click column header |
| Copy row | Ctrl+C on selected row |
| Print report | Ctrl+P |
| Export CSV | Click 📥 button then CSV |
| Go to page | Type page number in pagination |

---

## Performance Tips

✓ **For Large Reports** (1000+ rows)
- Use pagination (set to 100 rows/page)
- Filter before exporting
- Use Chrome/Firefox (faster than Edge)

✓ **For Printing**
- Use PDF export instead of browser print
- Adjust page orientation to landscape for tables
- Test print preview first

✓ **For Mobile**
- Report is responsive - should work on phone
- Use landscape mode for table
- Export to CSV and view in mobile app if needed

---

## Files Overview

```
nbh-dataexplorer/
├── generate_report.py      # Main script to generate report.html
├── serve_report.py         # Local web server to view report
├── test_data_loading.py    # Debug script to check data sources
├── report.html             # The final interactive dashboard (0.79 MB)
├── DOCUMENTATION.md        # Full technical documentation
├── README.md              # Original readme
├── nbh-data/              # Source data files (CSV, XLSX)
│   └── 3-month-27Dec/
│       ├── SUPPORT_TICKET_COMMENTS_STATUS_...xlsx (1,282 rows)
│       ├── COMPLAINT_SUMMARY_WITH_PREVIOUS_TICKETS_...csv
│       ├── ESCALATION_MATRIX_...csv
│       └── ... (other data files)
└── backup_20251227_081454/  # Complete timestamped backup
    ├── (all .py files)
    ├── (all data files)
    └── (all generated reports)
```

---

## Regenerating the Report

If data changes and you need a fresh report:

```bash
# Remove old report (optional)
del report.html

# Generate new report with updated data
python generate_report.py

# Serve the new report
python serve_report.py
```

Report generation shows progress:
```
✓ Status distribution chart
✓ Priority distribution chart
  ✓ Added 250 rows to table...
  ✓ Added 500 rows to table...
  ✓ Added 750 rows to table...
  ✓ Added 1000 rows to table...
  ✓ Added 1250 rows to table...
Writing HTML file...

✓ Report generated successfully!
  File: report.html
  Size: 0.79 MB
  Rows: 1282 support tickets
```

---

## FAQ

### Q: Can I filter by date range?
A: Use the search box and type the date (e.g., "2025-12-01")
Future enhancement: Add date range picker UI

### Q: How often is the data updated?
A: Data is static from your nbh-data folder. To update:
1. Get latest data files
2. Copy to nbh-data/3-month-27Dec/
3. Run `python generate_report.py`

### Q: Can I add more columns?
A: Yes, edit generate_report.py:
- Line ~260: Change `display_cols` list
- Line ~30: Add new calculations

### Q: Is my data secure?
A: Yes! Report runs locally in your browser. No data is sent anywhere.

### Q: Can I share the report?
A: Yes! Email `report.html` to anyone. They can open it in any browser.

### Q: Can I use on mobile?
A: Yes! Report is responsive. Best on landscape mode.

---

## Support & Troubleshooting

**Report won't generate**
- Check Python is installed: `python --version`
- Check dependencies: `pip install pandas plotly openpyxl`
- Check data exists: `dir nbh-data\3-month-27Dec\`

**Server won't start**
- Check port 8000 is available: `netstat -ano | find "8000"`
- Try different port: Edit serve_report.py, change PORT = 8080

**Charts not showing**
- Wait 2-3 seconds for Plotly to load from CDN
- Check internet connection
- Try different browser

**Table is slow**
- Use pagination (25-50 rows per page)
- Filter before exporting
- Close other browser tabs

---

**Last Updated**: 2025-12-27  
**Report Generated**: 2025-12-27 08:14:33  
**Data Period**: Last 90 Days  
**Total Tickets**: 1,282
