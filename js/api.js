// api.js - Client-side API wrapper for backend communication
// Optional: Use this to connect to your Node.js backend server

const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api';
const USE_BACKEND = localStorage.getItem('useBackend') === 'true';

window.APIClient = {
    // Set the backend URL
    setApiUrl: (url) => {
        localStorage.setItem('apiBaseUrl', url);
        API_BASE_URL = url;
    },

    // Enable/disable backend usage
    setBackendEnabled: (enabled) => {
        localStorage.setItem('useBackend', enabled.toString());
        USE_BACKEND = enabled;
    },

    // Upload files to backend
    uploadFiles: async (files) => {
        if (!USE_BACKEND) {
            console.warn('Backend not enabled. Using local processing only.');
            return null;
        }

        try {
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Files uploaded to backend:', result);
            return result;
        } catch (err) {
            console.error('Upload error:', err);
            throw err;
        }
    },

    // Save processed report to backend
    saveReport: async (data, metadata = {}) => {
        if (!USE_BACKEND) {
            console.warn('Backend not enabled. Using local storage only.');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/save-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, metadata })
            });

            if (!response.ok) {
                throw new Error(`Save failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Report saved to backend:', result);
            return result;
        } catch (err) {
            console.error('Save error:', err);
            throw err;
        }
    },

    // Get list of all reports
    getReports: async () => {
        if (!USE_BACKEND) {
            console.warn('Backend not enabled.');
            return [];
        }

        try {
            const response = await fetch(`${API_BASE_URL}/reports`);
            if (!response.ok) throw new Error('Failed to fetch reports');
            const result = await response.json();
            return result.reports || [];
        } catch (err) {
            console.error('Get reports error:', err);
            throw err;
        }
    },

    // Get yearly summary
    getYearlySummary: async (year) => {
        if (!USE_BACKEND) {
            console.warn('Backend not enabled.');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/yearly-summary/${year}`);
            if (!response.ok) throw new Error('Failed to fetch yearly summary');
            const result = await response.json();
            return result;
        } catch (err) {
            console.error('Yearly summary error:', err);
            throw err;
        }
    },

    // Get specific report by month
    getReport: async (monthKey) => {
        if (!USE_BACKEND) {
            console.warn('Backend not enabled.');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/report/${monthKey}`);
            if (!response.ok) throw new Error('Report not found');
            const result = await response.json();
            return result.report;
        } catch (err) {
            console.error('Get report error:', err);
            throw err;
        }
    },

    // Delete report
    deleteReport: async (monthKey) => {
        if (!USE_BACKEND) {
            console.warn('Backend not enabled.');
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/delete-report/${monthKey}`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Delete failed');
            const result = await response.json();
            console.log('Report deleted:', result);
            return result;
        } catch (err) {
            console.error('Delete error:', err);
            throw err;
        }
    },

    // Health check
    checkHealth: async () => {
        if (!USE_BACKEND) return { status: 'disabled' };

        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            if (!response.ok) throw new Error('Server unreachable');
            return await response.json();
        } catch (err) {
            console.error('Health check failed:', err);
            return { status: 'unreachable', error: err.message };
        }
    }
};

console.log('API Client loaded. Backend:', USE_BACKEND ? `${API_BASE_URL}` : 'Disabled (local only)');
