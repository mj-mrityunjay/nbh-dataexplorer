// dataProcessor.js

let zoneConfig = null;

// Try fetching the zone config, fallback if running locally via file://
async function loadZoneConfig() {
    try {
        const response = await fetch('./zone_config.json');
        if (response.ok) {
            const data = await response.json();
            zoneConfig = data.zones;
            console.log("Loaded zone configuration remotely.");
        }
    } catch (e) {
        console.warn("Could not fetch zone_config.json (likely due to CORS if running locally). Using fallback.");
    }
    
    // Fallback zones identical to zone_config.json
    if (!zoneConfig) {
        zoneConfig = {
            "Zone-1": { blocks: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"], color: "#667eea" },
            "Zone-2": { blocks: ["9", "14", "15", "16", "17"], color: "#764ba2" },
            "Zone-3": { blocks: ["18", "19", "20", "21", "22", "23", "24"], color: "#f093fb" },
            "Zone-4": { blocks: ["27", "28", "29", "30", "31", "32"], color: "#4facfe" },
            "Zone-5": { blocks: ["46", "47", "48", "49"], color: "#43e97b" },
            "Zone-6": { blocks: ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64"], color: "#fa709a" },
            "Zone-7": { blocks: ["33", "34", "35", "36"], color: "#fee140" },
            "Zone-8": { blocks: ["37", "38", "39", "40", "41"], color: "#30b0fe" }
        };
    }
}

// Function to extract base block
function getBaseBlock(blockStr) {
    if (!blockStr || blockStr === 'N/A') return null;
    let str = String(blockStr).trim();
    const match = str.match(/^(\d+)/);
    return match ? match[1] : str;
}

// Map Block to Zone
function getZone(block) {
    if (!block || block === 'N/A') return 'Unassigned';
    const baseBlock = getBaseBlock(block);
    for (const [zoneName, zoneData] of Object.entries(zoneConfig)) {
        if (zoneData.blocks.includes(baseBlock)) {
            return zoneName;
        }
    }
    return 'Unassigned';
}

// Helper to convert excel serial date to JS Date
function excelDateToJSDate(serial) {
    if (!serial) return null;
    if (typeof serial === 'string') {
        const d = new Date(serial);
        // Sometimes dates are in "DD-MM-YYYY HH:mm" format depending on locale, parsing can be tricky
        // This relies on browser standard parser.
        return isNaN(d.getTime()) ? null : d;
    }
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60; total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

// Process the raw data from Worksheet
async function processSupportTickets(data) {
    await loadZoneConfig();
    
    let processedFiles = 0;
    
    // Process records
    const processedData = data.map(row => {
        // Find relevant raw fields
        const createdOnRaw = row['CreatedOn'] || row['Created On'];
        const resolvedTimeRaw = row['Resolved Time'] || row['Resolved On'];
        const closedTimeRaw = row['Closed Time'] || row['Closed On'];
        const locationStr = row['Issue_Location'] || row['Issue Location'] || row['Location'];
        
        // Parse dates
        const createdOn = excelDateToJSDate(createdOnRaw);
        const resolvedOn = excelDateToJSDate(resolvedTimeRaw);
        const closedOn = excelDateToJSDate(closedTimeRaw);
        
        // Parse Location -> Block / Unit
        let block = 'N/A';
        let unit = 'N/A';
        if (locationStr) {
            const parts = String(locationStr).split('-');
            if (parts.length >= 1) block = parts[0].trim();
            if (parts.length >= 2) unit = parts.slice(1).join('-').trim();
        }
        
        // Calculate Times
        let resolution_time_days = null;
        if (createdOn && resolvedOn) {
            const diffTime = Math.abs(resolvedOn - createdOn);
            resolution_time_days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        let is_resolved = !!resolvedOn;
        let is_closed = !!closedOn;
        
        // Find Zone
        const zone = getZone(block);
        
        return {
            Ticket_ID: row['Ticket_ID'] || row['Ticket ID'] || '-',
            Zone: zone,
            Block: block,
            Unit: unit,
            Category: row['Category'] || '-',
            Priority: row['Priority'] || '-',
            Status: row['Status'] || '-',
            CreatedOnStr: createdOn ? createdOn.toISOString().split('T')[0] : '-',
            CreatedOnDate: createdOn,
            ResolvedTimeStr: resolvedOn ? resolvedOn.toISOString().split('T')[0] : '-',
            ResolutionDays: resolution_time_days,
            CreatedBy: row['Created_By'] || row['Created By'] || '-',
            Rating: row['Rating'] || '-',
            Description: row['Description'] || '',
            Resolution: row['Resolution'] || '',
            Comments: row['Comments'] || ''
        };
    });
    
    return processedData;
}

// Read File Function
window.readExcelFiles = async function(files) {
    let allData = [];
    let foundSupportTickets = false;

    for (let file of files) {
        // Similar to Python logic, focus on files containing SUPPORT_TICKET
        // Or if it's just one file, we try to parse it anyway.
        if (file.name.includes('SUPPORT_TICKET') || files.length === 1) {
            foundSupportTickets = true;
            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                // Take first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // Convert to JSON
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                allData = allData.concat(json);
            } catch (e) {
                throw new Error(`Error reading file ${file.name}: ${e.message}`);
            }
        }
    }
    
    if (allData.length === 0) {
        throw new Error("No SUPPORT_TICKET files found and no data parsed. Please upload a valid NoBrokerHood Support Ticket export.");
    }
    
    return await processSupportTickets(allData);
}

// Expose zoneConfig for app.js styling
window.getZoneConfig = () => zoneConfig;
