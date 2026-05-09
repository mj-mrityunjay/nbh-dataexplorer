// uploadManager.js - Manages multiple file uploads and data consolidation

window.UploadManager = {
    // Storage key for upload history
    STORAGE_KEY: 'nbh_upload_sessions',
    
    /**
     * Get all upload sessions
     */
    getAllSessions: async function() {
        try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            
            const result = await new Promise((resolve, reject) => {
                const request = store.get('uploadSessions');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            return result ? result.sessions || [] : [];
        } catch (err) {
            console.warn('Error getting upload sessions:', err);
            return [];
        }
    },

    /**
     * Create a new upload session after processing files
     */
    createSession: async function(data, fileNames, dateRange) {
        try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // Get existing sessions
            const sessionsRecord = await new Promise((resolve, reject) => {
                const request = store.get('uploadSessions');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            let sessions = sessionsRecord ? sessionsRecord.sessions || [] : [];
            
            const newSession = {
                id: `session_${Date.now()}`,
                uploadedAt: new Date().toISOString(),
                Files: fileNames,
                dateRange: dateRange,
                dataCount: data.length,
                data: data
            };
            
            // Check for overlapping date ranges
            const overlapping = sessions.filter(s => 
                this.dateRangesOverlap(s.dateRange, dateRange)
            );
            
            if (overlapping.length > 0) {
                newSession.warning = `Overlapping with ${overlapping.length} previous upload(s). Latest data will be used.`;
                newSession.overlappingWith = overlapping.map(s => s.id);
            }
            
            sessions.push(newSession);
            
            // Save updated sessions
            await new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'uploadSessions',
                    sessions: sessions
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log('Upload session created:', newSession.id);
            return newSession;
        } catch (err) {
            console.error('Error creating upload session:', err);
            throw err;
        }
    },

    /**
     * Check if two date ranges overlap
     */
    dateRangesOverlap: function(range1, range2) {
        if (!range1 || !range2) return false;
        const r1Start = new Date(range1.start);
        const r1End = new Date(range1.end);
        const r2Start = new Date(range2.start);
        const r2End = new Date(range2.end);
        
        return !(r1End < r2Start || r2End < r1Start);
    },

    /**
     * Consolidate all sessions into master dataset
     * Removes duplicates based on Ticket_ID, keeping latest
     */
    consolidateAllSessions: async function() {
        try {
            const sessions = await this.getAllSessions();
            
            if (!sessions || sessions.length === 0) {
                return [];
            }
            
            // Combine all data from all sessions
            const allData = [];
            const ticketMap = {}; // Track by Ticket_ID
            
            sessions.forEach(session => {
                if (session.data && Array.isArray(session.data)) {
                    session.data.forEach(ticket => {
                        const ticketId = ticket.Ticket_ID || ticket.ticket_id;
                        
                        if (!ticketMap[ticketId]) {
                            ticketMap[ticketId] = {
                                ticket: ticket,
                                sessionId: session.id,
                                uploadedAt: session.uploadedAt
                            };
                        } else {
                            // Keep latest
                            const existingTime = new Date(ticketMap[ticketId].uploadedAt);
                            const newTime = new Date(session.uploadedAt);
                            
                            if (newTime > existingTime) {
                                ticketMap[ticketId] = {
                                    ticket: ticket,
                                    sessionId: session.id,
                                    uploadedAt: session.uploadedAt
                                };
                            }
                        }
                    });
                }
            });
            
            // Extract unique tickets
            return Object.values(ticketMap).map(item => item.ticket);
        } catch (err) {
            console.error('Error consolidating sessions:', err);
            throw err;
        }
    },

    /**
     * Delete a specific upload session
     */
    deleteSession: async function(sessionId) {
        try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const sessionsRecord = await new Promise((resolve, reject) => {
                const request = store.get('uploadSessions');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            if (!sessionsRecord) return;
            
            const sessions = sessionsRecord.sessions.filter(s => s.id !== sessionId);
            
            await new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'uploadSessions',
                    sessions: sessions
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            console.log('Session deleted:', sessionId);
        } catch (err) {
            console.error('Error deleting session:', err);
            throw err;
        }
    },

    /**
     * Get summary of all uploaded date ranges
     */
    getUploadSummary: async function() {
        try {
            const sessions = await this.getAllSessions();
            
            return {
                totalSessions: sessions.length,
                dateRanges: sessions.map(s => ({
                    sessionId: s.id,
                    uploadedAt: s.uploadedAt,
                    dateRange: s.dateRange,
                    fileCount: s.Files ? s.Files.length : 0,
                    dataCount: s.dataCount,
                    warning: s.warning
                })),
                totalTickets: await this.consolidateAllSessions().then(d => d.length)
            };
        } catch (err) {
            console.error('Error getting upload summary:', err);
            throw err;
        }
    },

    /**
     * Extract date range from ticket data
     */
    extractDateRange: function(data) {
        if (!data || data.length === 0) {
            return { start: new Date(), end: new Date() };
        }
        
        let minDate = null;
        let maxDate = null;
        
        data.forEach(ticket => {
            const date = ticket.CreatedOnDate;
            if (date && date instanceof Date && !isNaN(date.getTime())) {
                if (!minDate || date < minDate) minDate = date;
                if (!maxDate || date > maxDate) maxDate = date;
            }
        });
        
        return {
            start: minDate ? minDate.toISOString().split('T')[0] : null,
            end: maxDate ? maxDate.toISOString().split('T')[0] : null,
            label: minDate && maxDate 
                ? `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
                : 'Unknown date range'
        };
    }
};

console.log('Upload Manager loaded');
