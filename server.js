// server.js - Express backend for NBH Data Explorer
// Deploy to Heroku, Railway, Vercel, or any Node.js hosting

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

// Storage for uploaded data (in production, use database like MongoDB)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DATA_DIR);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        cb(null, `${timestamp}_${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

/**
 * POST /api/upload
 * Upload Excel or CSV files
 */
app.post('/api/upload', upload.array('files', 30), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(f => ({
            filename: f.filename,
            originalName: f.originalname,
            size: f.size,
            path: f.path,
            uploadedAt: new Date().toISOString()
        }));

        console.log(`Files uploaded: ${uploadedFiles.length}`);
        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/save-report
 * Save processed report data as JSON
 */
app.post('/api/save-report', (req, res) => {
    try {
        const { data, metadata } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
        const filename = `report_${monthKey}.json`;
        const filepath = path.join(DATA_DIR, filename);

        const reportData = {
            savedAt: new Date().toISOString(),
            monthKey: monthKey,
            dataCount: data.length,
            metadata: metadata || {},
            data: data
        };

        fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
        console.log(`Report saved: ${filename}`);

        res.json({
            success: true,
            message: 'Report saved successfully',
            filename: filename,
            path: filepath
        });
    } catch (err) {
        console.error('Save report error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/reports
 * List all saved reports
 */
app.get('/api/reports', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR)
            .filter(f => f.startsWith('report_') && f.endsWith('.json'))
            .map(f => {
                const filepath = path.join(DATA_DIR, f);
                const stats = fs.statSync(filepath);
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                return {
                    filename: f,
                    monthKey: data.monthKey,
                    savedAt: data.savedAt,
                    dataCount: data.dataCount,
                    size: stats.size
                };
            })
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        res.json({
            success: true,
            reports: files,
            total: files.length
        });
    } catch (err) {
        console.error('List reports error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/yearly-summary/:year
 * Get aggregated data for a specific year
 */
app.get('/api/yearly-summary/:year', (req, res) => {
    try {
        const year = req.params.year;
        const files = fs.readdirSync(DATA_DIR)
            .filter(f => f.startsWith('report_') && f.startsWith(`report_${year}`))
            .map(f => {
                const filepath = path.join(DATA_DIR, f);
                return JSON.parse(fs.readFileSync(filepath, 'utf8'));
            });

        if (files.length === 0) {
            return res.json({
                success: true,
                year: year,
                message: 'No data found for this year',
                reports: [],
                totalTickets: 0
            });
        }

        // Aggregate data
        const allData = files.reduce((acc, report) => [...acc, ...report.data], []);
        const totalTickets = allData.length;

        // Calculate metrics
        const statusCounts = {};
        const zoneCounts = {};
        let totalResolutionDays = 0;
        let resolvedCount = 0;

        allData.forEach(ticket => {
            statusCounts[ticket.Status] = (statusCounts[ticket.Status] || 0) + 1;
            zoneCounts[ticket.Zone] = (zoneCounts[ticket.Zone] || 0) + 1;
            if (ticket.ResolutionDays !== null) {
                totalResolutionDays += ticket.ResolutionDays;
                resolvedCount++;
            }
        });

        const avgResolutionDays = resolvedCount > 0 
            ? (totalResolutionDays / resolvedCount).toFixed(2) 
            : 0;

        res.json({
            success: true,
            year: year,
            monthCount: files.length,
            totalTickets: totalTickets,
            avgResolutionDays: parseFloat(avgResolutionDays),
            statusBreakdown: statusCounts,
            zoneBreakdown: zoneCounts,
            reports: files.map(r => ({
                monthKey: r.monthKey,
                savedAt: r.savedAt,
                dataCount: r.dataCount
            }))
        });
    } catch (err) {
        console.error('Yearly summary error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/report/:monthKey
 * Get a specific report by month
 */
app.get('/api/report/:monthKey', (req, res) => {
    try {
        const monthKey = req.params.monthKey;
        const filename = `report_${monthKey}.json`;
        const filepath = path.join(DATA_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json({
            success: true,
            report: data
        });
    } catch (err) {
        console.error('Get report error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/delete-report/:monthKey
 * Delete a report
 */
app.post('/api/delete-report/:monthKey', (req, res) => {
    try {
        const monthKey = req.params.monthKey;
        const filename = `report_${monthKey}.json`;
        const filepath = path.join(DATA_DIR, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Report not found' });
        }

        fs.unlinkSync(filepath);
        console.log(`Report deleted: ${filename}`);

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (err) {
        console.error('Delete report error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 NBH Data Explorer Server running on http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  POST   /api/upload                - Upload Excel/CSV files`);
    console.log(`  POST   /api/save-report           - Save processed report`);
    console.log(`  GET    /api/reports               - List all reports`);
    console.log(`  GET    /api/report/:monthKey      - Get specific report`);
    console.log(`  GET    /api/yearly-summary/:year  - Get yearly aggregate`);
    console.log(`  POST   /api/delete-report/:month  - Delete a report`);
    console.log(`  GET    /api/health                - Health check\n`);
});

module.exports = app;
