// indexeddb.js - IndexedDB operations for data persistence

const DB_NAME = 'NHDataExplorerDB';
const DB_VERSION = 1;
const STORE_NAME = 'reportData';

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Save processed data to IndexedDB
window.saveDataToIndexedDB = async function(data, metadata = {}) {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const record = {
            id: 'mainData',
            data: data,
            metadata: {
                savedAt: new Date().toISOString(),
                dataCount: data.length,
                ...metadata
            }
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log('Data saved to IndexedDB:', record.metadata);
        return true;
    } catch (err) {
        console.error('Error saving to IndexedDB:', err);
        throw err;
    }
};

// Load data from IndexedDB
window.loadDataFromIndexedDB = async function() {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const result = await new Promise((resolve, reject) => {
            const request = store.get('mainData');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (result) {
            console.log('Data loaded from IndexedDB:', result.metadata);
            return result;
        }
        return null;
    } catch (err) {
        console.error('Error loading from IndexedDB:', err);
        throw err;
    }
};

// Add monthly report to history
window.addMonthlyReport = async function(monthKey, data, metadata = {}) {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const record = {
            id: `month_${monthKey}`,
            data: data,
            metadata: {
                month: monthKey,
                savedAt: new Date().toISOString(),
                dataCount: data.length,
                ...metadata
            }
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`Monthly report saved for ${monthKey}`);
        return true;
    } catch (err) {
        console.error('Error saving monthly report:', err);
        throw err;
    }
};

// Get all monthly reports for yearly summary
window.getYearlySummary = async function(year) {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const allRecords = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        // Filter for months in the given year
        const yearlyData = allRecords.filter(record => {
            if (record.id.startsWith('month_')) {
                const monthKey = record.id.replace('month_', '');
                return monthKey.startsWith(year);
            }
            return false;
        });
        
        return yearlyData;
    } catch (err) {
        console.error('Error retrieving yearly summary:', err);
        throw err;
    }
};

// Export data as JSON
window.exportDataAsJSON = async function(filename = null) {
    try {
        const savedData = await window.loadDataFromIndexedDB();
        if (!savedData) {
            throw new Error('No data to export. Please upload files first.');
        }
        
        const exportObj = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            data: savedData
        };
        
        const dataStr = JSON.stringify(exportObj, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `NBH-Report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Data exported successfully');
        return true;
    } catch (err) {
        console.error('Error exporting data:', err);
        throw err;
    }
};

// Import data from JSON file
window.importDataFromJSON = async function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const importObj = JSON.parse(event.target.result);
                
                if (!importObj.data || !importObj.data.data) {
                    throw new Error('Invalid import file format');
                }
                
                // Save the imported data
                await window.saveDataToIndexedDB(importObj.data.data, {
                    importedAt: new Date().toISOString(),
                    originalExportTime: importObj.data.metadata.savedAt
                });
                
                console.log('Data imported successfully');
                resolve(importObj.data.data);
            } catch (err) {
                reject(err);
            }
        };
        
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};

// Clear all data from IndexedDB
window.clearIndexedDB = async function() {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log('IndexedDB cleared');
        return true;
    } catch (err) {
        console.error('Error clearing IndexedDB:', err);
        throw err;
    }
};
