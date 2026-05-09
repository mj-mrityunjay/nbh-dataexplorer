// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const dropZone = document.getElementById('upload-section');
    const fileInput = document.getElementById('file-input');
    const dashboard = document.getElementById('dashboard-section');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorBanner = document.getElementById('error-banner');
    const errorMsg = document.getElementById('error-message');
    const exportBtn = document.getElementById('export-pdf-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');
    const filterBanner = document.getElementById('active-filter-banner');
    const filterTypeVal = document.getElementById('filter-type-val');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const addMoreFilesBtn = document.getElementById('add-more-files-btn');
    const uploadHistory = document.getElementById('upload-history');
    const uploadHistoryContent = document.getElementById('upload-history-content');

    // State
    let dataTable = null;
    let masterData = [];
    let currentData = [];
    let currentFilter = { key: null, val: null };
    let currentSession = null;

    // --- Events ---
    
    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-active');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    // Add more files button
    addMoreFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    resetFilterBtn.addEventListener('click', () => {
        applyFilter(null, null);
    });

    exportBtn.addEventListener('click', () => {
        const element = document.getElementById('app-content');
        exportBtn.style.display = 'none';
        
        const opt = {
            margin:       10,
            filename:     'BHRTOA-Diagnostics.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a3', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            exportBtn.style.display = 'inline-flex';
        });
    });

    // Export JSON data
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');

    exportJsonBtn.addEventListener('click', async () => {
        try {
            setLoading(true);
            await window.exportDataAsJSON(`NBH-Report-${new Date().toISOString().split('T')[0]}.json`);
            showError(false);
        } catch (err) {
            console.error(err);
            showError(true, err.message || "Failed to export data.");
        } finally {
            setLoading(false);
        }
    });

    importJsonBtn.addEventListener('click', () => {
        importJsonInput.click();
    });

    importJsonInput.addEventListener('change', async (e) => {
        if (e.target.files.length) {
            try {
                setLoading(true);
                showError(false);
                const file = e.target.files[0];
                const importedData = await window.importDataFromJSON(file);
                
                if (importedData && importedData.length > 0) {
                    masterData = importedData;
                    currentData = [...masterData];
                    renderDashboard(currentData);
                    
                    dropZone.classList.add('hidden');
                    dashboard.classList.remove('hidden');
                    exportJsonBtn.style.display = 'inline-flex';
                    exportBtn.style.display = 'inline-flex';
                    importJsonBtn.style.display = 'inline-flex';
                    
                    showError(false);
                } else {
                    showError(true, "No valid data in the imported file.");
                }
            } catch (err) {
                console.error(err);
                showError(true, err.message || "Failed to import data.");
            } finally {
                setLoading(false);
                importJsonInput.value = '';
            }
        }
    });

    // --- Core Logic ---

    async function handleFiles(fileList) {
        showError(false);
        setLoading(true);
        
        try {
            const files = Array.from(fileList);
            const processedData = await window.readExcelFiles(files);
            
            if (processedData && processedData.length > 0) {
                // Create upload session
                const fileNames = files.map(f => f.name);
                const dateRange = window.UploadManager.extractDateRange(processedData);
                
                currentSession = await window.UploadManager.createSession(
                    processedData, 
                    fileNames, 
                    dateRange
                );
                
                // Show warning if overlapping
                if (currentSession.warning) {
                    showError(true, `⚠️ ${currentSession.warning}`);
                }
                
                // Consolidate all sessions into master data
                masterData = await window.UploadManager.consolidateAllSessions();
                currentData = [...masterData];
                
                // Update UI
                await updateUploadHistory();
                renderDashboard(currentData);
                
                dropZone.classList.add('hidden');
                dashboard.classList.remove('hidden');
                exportBtn.style.display = 'inline-flex';
                exportJsonBtn.style.display = 'inline-flex';
                importJsonBtn.style.display = 'inline-flex';
                addMoreFilesBtn.style.display = 'inline-flex';
                uploadHistory.classList.remove('hidden');
            } else {
                showError(true, "No valid data found in the provided files.");
            }
        } catch (err) {
            console.error(err);
            showError(true, err.message || "Failed to parse files.");
        } finally {
            setLoading(false);
            fileInput.value = '';
        }
    }

    async function updateUploadHistory() {
        try {
            const summary = await window.UploadManager.getUploadSummary();
            
            if (summary.totalSessions === 0) {
                uploadHistoryContent.innerHTML = '<p class="text-muted">No uploads yet</p>';
                return;
            }
            
            let html = `<div class="upload-sessions">
                <p class="text-muted">Total: ${summary.totalTickets} tickets from ${summary.totalSessions} upload(s)</p>`;
            
            summary.dateRanges.forEach((range, idx) => {
                const warningClass = range.warning ? 'warning' : '';
                const warningText = range.warning ? `<div class="warning-badge">${range.warning}</div>` : '';
                
                html += `
                    <div class="session-item ${warningClass}">
                        <div class="session-date">📅 ${range.dateRange?.label || 'Unknown dates'}</div>
                        <div class="session-meta">${range.fileCount} file(s) • ${range.dataCount} records</div>
                        <div class="session-time">${new Date(range.uploadedAt).toLocaleString()}</div>
                        ${warningText}
                    </div>
                `;
            });
            
            html += '</div>';
            uploadHistoryContent.innerHTML = html;
        } catch (err) {
            console.error('Error updating upload history:', err);
        }
    }

    function applyFilter(key, val) {
        currentFilter = { key, val };
        if (!key) {
            currentData = [...masterData];
            filterBanner.classList.add('hidden');
        } else if (key === 'BlockUnit') {
            currentData = masterData.filter(d => {
                let k = String((d.Block && d.Block !== 'N/A' ? d.Block + '-' : '') + (d.Unit || 'Unknown'));
                if (k.length > 20) k = k.substring(0, 20) + '...';
                return k === val;
            });
            filterTypeVal.textContent = `Unit: ${val}`;
            filterBanner.classList.remove('hidden');
        } else {
            currentData = masterData.filter(d => d[key] === val);
            filterTypeVal.textContent = `${key}: ${val}`;
            filterBanner.classList.remove('hidden');
        }
        renderDashboard(currentData);
    }

    function setLoading(isLoading) {
        if (isLoading) loadingOverlay.classList.remove('overlay-hidden');
        else loadingOverlay.classList.add('overlay-hidden');
    }

    function showError(show, msg = '') {
        if (show) {
            errorMsg.textContent = msg;
            errorBanner.classList.remove('hidden');
        } else {
            errorBanner.classList.add('hidden');
        }
    }

    // --- Rendering logic ---

    function renderDashboard(data) {
        renderMetrics(data);
        renderCharts(data);
        renderTable(data);
        renderZoneSummary(data);
    }

    function renderMetrics(data) {
        const container = document.getElementById('metrics-container');
        const openCount = data.filter(d => d.Status === 'OPEN').length;
        const resolvedCount = data.filter(d => d.Status === 'RESOLVED').length;
        const blocksCount = new Set(data.map(d => d.Block)).size;
        const unitsCount = new Set(data.map(d => d.Unit)).size;

        container.innerHTML = `
            <div class="metric-card">
                <div class="metric-title">Tickets Parsed</div>
                <div class="metric-value">${data.length}</div>
            </div>
            <div class="metric-card" style="border-left: 4px solid var(--error)">
                <div class="metric-title">Open Issues</div>
                <div class="metric-value">${openCount}</div>
            </div>
            <div class="metric-card" style="border-left: 4px solid var(--info)">
                <div class="metric-title">Resolved</div>
                <div class="metric-value">${resolvedCount}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Blocks Affected</div>
                <div class="metric-value">${blocksCount}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Distinct Units</div>
                <div class="metric-value">${unitsCount}</div>
            </div>
        `;
    }

    function renderZoneSummary(data) {
        const tbody = document.getElementById('zone-summary-body');
        const zonesConfig = window.getZoneConfig();
        const zones = Object.keys(zonesConfig).sort();
        
        let html = '';
        zones.forEach(zone => {
            const zData = data.filter(d => d.Zone === zone);
            const total = zData.length;
            if(total === 0) return; // Hide empty zones for cleaner view

            const open = zData.filter(d => d.Status === 'OPEN').length;
            const inProg = zData.filter(d => d.Status === 'IN_PROGRESS').length;
            const onHold = zData.filter(d => d.Status === 'ON_HOLD').length;
            const resolved = zData.filter(d => d.Status === 'RESOLVED').length;
            const closed = zData.filter(d => d.Status === 'CLOSED').length;
            const other = total - open - inProg - onHold - resolved - closed;
            const pct = data.length ? ((total / data.length) * 100).toFixed(1) : 0;
            const color = zonesConfig[zone].color || '#999';

            html += `
                <tr data-zone="${zone}">
                    <td><span class="zone-badge" style="background-color: ${color}">${zone}</span></td>
                    <td><span class="status-open" style="font-weight:bold">${open}</span></td>
                    <td style="color: var(--warning); font-weight:bold">${inProg}</td>
                    <td style="color: #60a5fa; font-weight:bold">${onHold}</td>
                    <td><span class="status-resolved" style="font-weight:bold">${resolved}</span></td>
                    <td><span class="status-closed" style="font-weight:bold">${closed}</span></td>
                    <td style="color: #c026d3; font-weight:bold">${other}</td>
                    <td><strong>${total}</strong></td>
                    <td>${pct}%</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Bind click events on rows
        document.querySelectorAll('#zone-summary-table tbody tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const z = tr.getAttribute('data-zone');
                if (z) applyFilter('Zone', z);
            });
        });
    }

    function getPlotlyLayout(title, customMargin = {}) {
        return {
            title: { text: title, font: { color: '#f8fafc', size: 16 } },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#cbd5e1', family: 'Inter' },
            height: 450,
            margin: Object.assign({ t: 50, l: 60, r: 20, b: 60 }, customMargin),
            xaxis: { automargin: false, tickfont: {size: 11}, gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.1)' },
            yaxis: { automargin: false, tickfont: {size: 11}, gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.1)' }
        };
    }

    function drawPlot(divId, dataArr, layout) {
        Plotly.react(divId, dataArr, layout, { responsive: true, displayModeBar: false });
    }

    // Colors mapping to ensure consistency
    const statusColors = {
        'OPEN': '#f87171', 'RESOLVED': '#38bdf8', 'CLOSED': '#34d399', 
        'IN_PROGRESS': '#fbbf24', 'ON_HOLD': '#60a5fa'
    };
    function getStatusColor(st) { return statusColors[st] || '#c026d3'; }

    function renderCharts(data) {
        if(data.length === 0) return;

        function getCounts(key, limit = null, maxLabelLength = 25) {
            const counts = {};
            data.forEach(d => {
                let k = String(d[key] || 'Unknown');
                // Truncate strings to prevent plotly from breaking layout
                if (k.length > maxLabelLength) k = k.substring(0, maxLabelLength) + '...';
                counts[k] = (counts[k] || 0) + 1;
            });
            let sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
            if (limit) sorted = sorted.slice(0, limit);
            return { x: sorted.map(i => i[0]), y: sorted.map(i => i[1]) };
        }

        const zCfg = window.getZoneConfig();

        // 1. Status Pie
        const statusC = getCounts('Status');
        drawPlot('chart-status', [{
            labels: statusC.x, values: statusC.y, type: 'pie', hole: 0.4,
            marker: { colors: statusC.x.map(getStatusColor) }
        }], getPlotlyLayout('Ticket Status (Click to Filter)'));

        // Bind interactive filter
        document.getElementById('chart-status').on('plotly_click', data => {
            applyFilter('Status', data.points[0].label);
        });

        // 2. Zone Distrib
        const zoneC = getCounts('Zone');
        const zCol = zoneC.x.map(z => zCfg[z] ? zCfg[z].color : '#94a3b8');
        drawPlot('chart-zone-dist', [{
            labels: zoneC.x, values: zoneC.y, type: 'pie', hole: 0.4,
            marker: { colors: zCol }
        }], getPlotlyLayout('Zone Distribution (Click to Filter)'));

        document.getElementById('chart-zone-dist').on('plotly_click', evt => {
            applyFilter('Zone', evt.points[0].label);
        });

        // 3. Priority
        const prioC = getCounts('Priority');
        drawPlot('chart-priority', [{
            x: prioC.x, y: prioC.y, type: 'bar', text: prioC.y.map(String), textposition: 'auto',
            marker: { color: prioC.x.map(p => p === 'HIGH' ? '#f87171' : p === 'MEDIUM' ? '#fbbf24' : '#34d399') }
        }], getPlotlyLayout('Tickets by Priority'));

        // 4. Timeline
        const dCounts = {};
        data.forEach(d => { if(d.CreatedOnStr!=='-') dCounts[d.CreatedOnStr] = (dCounts[d.CreatedOnStr] || 0) + 1; });
        const dates = Object.keys(dCounts).sort();
        drawPlot('chart-timeline', [{
            x: dates, y: dates.map(d=>dCounts[d]), type: 'scatter', mode: 'lines',
            line: { color: '#818cf8', width: 3 }, fill: 'tozeroy', fillcolor: 'rgba(129, 140, 248, 0.2)'
        }], getPlotlyLayout('Tickets Created Over Time'));

        // 5. Avg Res Trend
        const dailyRes = {};
        data.forEach(d => {
            if (d.CreatedOnStr!=='-' && d.ResolutionDays !== null) {
                if(!dailyRes[d.CreatedOnStr]) dailyRes[d.CreatedOnStr] = {s:0, c:0};
                dailyRes[d.CreatedOnStr].s += d.ResolutionDays;
                dailyRes[d.CreatedOnStr].c += 1;
            }
        });
        const rDates = Object.keys(dailyRes).sort();
        drawPlot('chart-resolution-trend', [{
            x: rDates, y: rDates.map(d => dailyRes[d].s / dailyRes[d].c),
            type: 'scatter', mode: 'lines+markers', line: { color: '#fbbf24', shape: 'spline', width: 3 }
        }], getPlotlyLayout('Daily Avg Resolution Time (Days)'));

        // 6. Resolution Histogram
        const resTimes = data.map(d => d.ResolutionDays).filter(d => d !== null);
        drawPlot('chart-resolution-time', [{
            x: resTimes, type: 'histogram', marker: { color: '#38bdf8' }, nbinsx: 30
        }], getPlotlyLayout('Resolution Speed Distribution'));

        // 7. Topology Top 10s (Horizontal Bar needs Left Margin)
        const cats = getCounts('Category', 10, 30);
        drawPlot('chart-categories', [{
            x: cats.y, y: cats.x, type: 'bar', orientation: 'h', text: cats.y.map(String), textposition: 'auto', marker: { color: '#a78bfa' }
        }], {...getPlotlyLayout('Top 10 Categories', { l: 200 }), yaxis:{autorange:'reversed'}});

        const blocks = getCounts('Block', 15, 20);
        drawPlot('chart-top-blocks', [{
            x: blocks.y, y: blocks.x, type: 'bar', orientation: 'h', text: blocks.y.map(String), textposition: 'auto', marker: { color: '#f472b6' }
        }], {...getPlotlyLayout('Top 15 Blocks', { l: 150 }), yaxis:{autorange:'reversed'}});

        // Calculate Units with Block combination logic
        const uCounts = {};
        data.forEach(d => {
            let k = String((d.Block && d.Block !== 'N/A' ? d.Block + '-' : '') + (d.Unit || 'Unknown'));
            if (k.length > 20) k = k.substring(0, 20) + '...';
            uCounts[k] = (uCounts[k] || 0) + 1;
        });
        let sUnits = Object.entries(uCounts).sort((a,b) => b[1] - a[1]).slice(0, 15);
        const units = { x: sUnits.map(i => i[0]), y: sUnits.map(i => i[1]) };

        drawPlot('chart-top-units', [{
            x: units.y, y: units.x, type: 'bar', orientation: 'h', text: units.y.map(String), textposition: 'auto', marker: { color: '#fb923c' }
        }], {...getPlotlyLayout('Top 15 Units (Click to Filter)', { l: 150 }), yaxis:{autorange:'reversed'}});

        document.getElementById('chart-top-units').on('plotly_click', evt => {
            applyFilter('BlockUnit', evt.points[0].y || evt.points[0].label);
        });

        // 8. Block Status
        const stTypes = Array.from(new Set(data.map(d=>d.Status)));
        const bStatData = stTypes.map(st => ({
            x: blocks.x.slice(0,10), y: blocks.x.slice(0,10).map(b => data.filter(d=>d.Block===b && d.Status===st).length),
            name: st, type: 'bar', text: blocks.x.slice(0,10).map(b => { let val = data.filter(d=>d.Block===b && d.Status===st).length; return val > 0 ? val : ''; }), textposition: 'inside', marker: { color: getStatusColor(st) }
        }));
        drawPlot('chart-block-status', bStatData, {...getPlotlyLayout('Status Dist (Top 10 Blocks)', { b: 100 }), barmode: 'stack'});

        // 9. Zone Status
        const zStatData = stTypes.map(st => ({
            x: Object.keys(zCfg), y: Object.keys(zCfg).map(z => data.filter(d=>d.Zone===z && d.Status===st).length),
            name: st, type: 'bar', text: Object.keys(zCfg).map(z => { let val = data.filter(d=>d.Zone===z && d.Status===st).length; return val > 0 ? val : ''; }), textposition: 'inside', marker: { color: getStatusColor(st) }
        }));
        drawPlot('chart-zone-status', zStatData, {...getPlotlyLayout('Status Dist by Zone', { b: 100 }), barmode: 'stack'});


        // --- NEW MULTIDIMENSIONAL INSIGHTS ---

        // 10. Aging Analysis
        const ageBuckets = {'0-3 days':0, '4-7 days':0, '1-2 weeks':0, '2+ weeks':0};
        data.forEach(d => {
            if((d.Status === 'OPEN' || d.Status === 'IN_PROGRESS' || d.Status === 'ON_HOLD') && d.CreatedOnDate) {
                const diff = Math.floor((new Date() - d.CreatedOnDate) / (1000*60*60*24));
                if(diff <= 3) ageBuckets['0-3 days']++;
                else if(diff <= 7) ageBuckets['4-7 days']++;
                else if(diff <= 14) ageBuckets['1-2 weeks']++;
                else ageBuckets['2+ weeks']++;
            }
        });
        const abs = Object.keys(ageBuckets);
        drawPlot('chart-aging', [{
            x: abs, y: abs.map(k=>ageBuckets[k]), type: 'bar', text: abs.map(k=>ageBuckets[k]), textposition: 'auto',
            marker: { color: ['#34d399', '#fbbf24', '#f87171', '#991b1b'] }
        }], getPlotlyLayout('Aging Unresolved Tickets'));

        // 11. Day of Week Heatmap (Time vs Volume)
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const dayCounts = [0,0,0,0,0,0,0];
        data.forEach(d => {
            if(d.CreatedOnDate && !isNaN(d.CreatedOnDate.getDay())) {
                dayCounts[d.CreatedOnDate.getDay()]++;
            }
        });
        drawPlot('chart-heatmap', [{
            x: days, y: dayCounts, type: 'bar', text: dayCounts.map(String), textposition: 'auto', marker: { color: '#a78bfa' }
        }], getPlotlyLayout('Creation Volume by Day of Week'));

        // 12. Resolution Matrix (Zone vs Time vs Volume Scatter Bubble)
        const zArr = Object.keys(zCfg);
        const zMatrixData = [];
        zArr.forEach(z => {
            const zD = data.filter(r => r.Zone === z);
            const zRs = zD.filter(r => r.ResolutionDays !== null);
            if(zD.length > 0) {
                const avg = zRs.length > 0 ? (zRs.reduce((sum, r)=>sum+r.ResolutionDays,0)/zRs.length) : 0;
                zMatrixData.push({ zone: z, vol: zD.length, avg: avg, color: zCfg[z] ? zCfg[z].color : '#999' });
            }
        });
        
        drawPlot('chart-resolution-matrix', [{
            x: zMatrixData.map(z=>z.zone),
            y: zMatrixData.map(z=>z.avg),
            text: zMatrixData.map(z=>`Volume: ${z.vol}`),
            mode: 'markers',
            marker: {
                size: zMatrixData.map(z=> Math.max(10, Math.min(60, z.vol * 0.5))),
                color: zMatrixData.map(z=>z.color),
                opacity: 0.8, line: {width:2, color:'#fff'}
            }
        }], {...getPlotlyLayout('Zone Impact Matrix (Size = Ticket Volume, Y = Avg Resolution Time)'), 
             yaxis: { title: 'Avg Time to Resolve (Days)' }});

        // Trigger resize event after short delay to ensure widths sync properly in grid
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }

    function renderTable(data) {
        if (dataTable) {
            dataTable.destroy();
            $('#tickets-table').empty(); // Clear table internals to prevent redraw errors
            // re-init header
            $('#tickets-table').html(`
                <thead>
                    <tr>
                        <th>Ticket ID</th>
                        <th>Zone</th>
                        <th>Block</th>
                        <th>Unit</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created On</th>
                        <th>Resolved On</th>
                        <th>TTL (Days)</th>
                        <th>Created By</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `);
        }

        const tableBody = data.map(d => [
            d.Ticket_ID,
            d.Zone,
            d.Block,
            d.Unit,
            d.Category,
            d.Priority,
            d.Status,
            d.CreatedOnStr,
            d.ResolvedTimeStr,
            d.ResolutionDays === null ? '-' : d.ResolutionDays,
            d.CreatedBy
        ]);

        dataTable = $('#tickets-table').DataTable({
            data: tableBody,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            order: [[7, 'desc']],
            deferRender: true,
            createdRow: function(row, data, dataIndex) {
                const zone = data[1];
                const zCfg = window.getZoneConfig();
                const color = zCfg[zone] ? zCfg[zone].color : '#94a3b8';
                $('td', row).eq(1).html(`<span class="zone-badge" style="background-color: ${color}">${zone}</span>`);
                
                const prio = data[5];
                let pClass = prio === 'HIGH' ? 'priority-high' : prio === 'MEDIUM' ? 'priority-medium' : 'priority-low';
                $('td', row).eq(5).html(`<span class="${pClass}">${prio}</span>`);

                 const status = data[6];
                 let sClass = status === 'OPEN' ? 'status-open' : (status === 'RESOLVED' ? 'status-resolved' : (status === 'CLOSED' ? 'status-closed' : 'status-inprogress'));
                 $('td', row).eq(6).html(`<span class="status-badge ${sClass}">${status}</span>`);
            }
        });
    }

    // Initialize: Load consolidated data from all upload sessions
    async function initializeApp() {
        try {
            // First, try to load from upload sessions (consolidated)
            const consolidatedData = await window.UploadManager.consolidateAllSessions();
            
            if (consolidatedData && consolidatedData.length > 0) {
                masterData = consolidatedData;
                currentData = [...masterData];
                
                await updateUploadHistory();
                renderDashboard(currentData);
                
                dropZone.classList.add('hidden');
                dashboard.classList.remove('hidden');
                exportBtn.style.display = 'inline-flex';
                exportJsonBtn.style.display = 'inline-flex';
                importJsonBtn.style.display = 'inline-flex';
                addMoreFilesBtn.style.display = 'inline-flex';
                uploadHistory.classList.remove('hidden');
                
                console.log(`✅ Loaded ${consolidatedData.length} tickets from ${(await window.UploadManager.getAllSessions()).length} session(s)`);
                return;
            }
            
            // Fallback: Try loading from old IndexedDB format (for backwards compatibility)
            const savedData = await window.loadDataFromIndexedDB();
            if (savedData && savedData.data && savedData.data.length > 0) {
                masterData = savedData.data;
                currentData = [...masterData];
                renderDashboard(currentData);
                
                dropZone.classList.add('hidden');
                dashboard.classList.remove('hidden');
                exportBtn.style.display = 'inline-flex';
                exportJsonBtn.style.display = 'inline-flex';
                importJsonBtn.style.display = 'inline-flex';
                
                console.log('⚠️ Loaded previously saved data (old format). Please re-upload to use new session management.');
            }
        } catch (err) {
            console.warn('Could not load saved data:', err);
            // Silently fail - user will upload files normally
        }
    }

    // Initialize app on load
    initializeApp();
});
