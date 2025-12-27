import os
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import warnings
import json
warnings.filterwarnings('ignore')

print("=" * 80)
print("BHRTOA Facility Management Report Generator")
print("=" * 80)

# Path to data folder
data_dir = 'nbh-data'

# Function to load all CSVs and XLSX files
def load_data():
    data = {}
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if file.endswith(('.csv', '.xlsx')):
                filepath = os.path.join(root, file)
                try:
                    if file.endswith('.csv'):
                        df = pd.read_csv(filepath)
                    else:
                        df = pd.read_excel(filepath)
                    
                    if not df.empty:
                        data[file] = df
                        print(f"  {file}: {len(df)} rows")
                except Exception as e:
                    print(f"  ERROR {file}: {e}")
    return data

# Load data
print("\nLoading data sources...")
data = load_data()
print(f"\nTotal sources: {len(data)}")

# Find support ticket file
support_tickets_df = None
for filename, df in data.items():
    if 'SUPPORT_TICKET_COMMENTS_STATUS' in filename and '.xlsx' in filename:
        support_tickets_df = df
        print(f"Using: {filename} ({len(df)} tickets)")
        break

if support_tickets_df is None:
    print("ERROR: No SUPPORT_TICKET file found!")
    exit(1)

# Process support ticket data
print("\nProcessing support ticket data...")
for col in ['CreatedOn', 'Last_updatedon', 'Resolved Time', 'Closed Time']:
    if col in support_tickets_df.columns:
        support_tickets_df[col] = pd.to_datetime(support_tickets_df[col], errors='coerce')

# Calculate ticket analytics
support_tickets_df['resolution_time_days'] = (support_tickets_df['Resolved Time'] - support_tickets_df['CreatedOn']).dt.days
support_tickets_df['closure_time_days'] = (support_tickets_df['Closed Time'] - support_tickets_df['CreatedOn']).dt.days
support_tickets_df['age_days'] = (pd.Timestamp.now() - support_tickets_df['CreatedOn']).dt.days
support_tickets_df['is_resolved'] = support_tickets_df['Resolved Time'].notna()
support_tickets_df['is_closed'] = support_tickets_df['Closed Time'].notna()

# Parse Issue_Location to split Block and Unit (format: "BLOCK-UNIT")
if 'Issue_Location' in support_tickets_df.columns:
    support_tickets_df['Block'] = support_tickets_df['Issue_Location'].str.split('-').str[0].str.strip()
    support_tickets_df['Unit'] = support_tickets_df['Issue_Location'].apply(
        lambda x: '-'.join(x.split('-')[1:]).strip() if pd.notna(x) and '-' in str(x) else 'Unspecified'
    )
else:
    support_tickets_df['Block'] = 'N/A'
    support_tickets_df['Unit'] = 'N/A'

# Load zone configuration
print("\nLoading zone configuration...")
try:
    with open('zone_config.json', 'r') as f:
        zone_config = json.load(f)
    zones = zone_config['zones']
    print(f"  Loaded {len(zones)} zones")
except Exception as e:
    print(f"  WARNING: Could not load zone_config.json: {e}")
    zones = {}

# Function to extract base block number (remove suffixes a, b, c, d)
def get_base_block(block_str):
    """Extract base block number, ignoring suffixes"""
    if pd.isna(block_str) or block_str == 'N/A':
        return None
    block_str = str(block_str).strip()
    # Remove trailing letters (a, b, c, d)
    import re
    match = re.match(r'^(\d+)', block_str)
    return match.group(1) if match else block_str

# Assign zones based on block
def get_zone(block):
    """Get zone for a given block"""
    if pd.isna(block):
        return 'Unassigned'
    base_block = get_base_block(block)
    for zone_name, zone_data in zones.items():
        if base_block in zone_data['blocks']:
            return zone_name
    return 'Unassigned'

# Add Zone column to dataframe
support_tickets_df['Zone'] = support_tickets_df['Block'].apply(get_zone)

print(f"\nZone Analysis:")
for zone_name in sorted(zones.keys()):
    count = len(support_tickets_df[support_tickets_df['Zone'] == zone_name])
    print(f"  {zone_name}: {count} tickets")

print(f"  Parsed {len(support_tickets_df['Block'].unique())} unique blocks")
print(f"  Parsed {len(support_tickets_df['Unit'].unique())} unique units")

# Generate charts
print("\nGenerating charts...")
charts_html = []

# Chart 1: Status Distribution
if 'Status' in support_tickets_df.columns:
    status_counts = support_tickets_df['Status'].value_counts()
    fig = px.pie(names=status_counts.index, values=status_counts.values, 
                 title='Ticket Status Distribution')
    fig.update_layout(height=500)
    charts_html.append(fig.to_html(include_plotlyjs='cdn'))
    print("  [+] Status distribution")

# Chart 2: Priority Distribution
if 'Priority' in support_tickets_df.columns:
    priority_counts = support_tickets_df['Priority'].value_counts()
    fig = px.bar(x=priority_counts.index, y=priority_counts.values, 
                 title='Tickets by Priority',
                 labels={'x': 'Priority', 'y': 'Count'})
    fig.update_layout(height=400)
    charts_html.append(fig.to_html(include_plotlyjs='cdn'))
    print("  [+] Priority distribution")

# Chart 3: Top Categories
if 'Category' in support_tickets_df.columns:
    category_counts = support_tickets_df['Category'].value_counts().head(12)
    fig = px.bar(x=category_counts.values, y=category_counts.index, orientation='h',
                  title='Top 12 Issue Categories',
                  labels={'x': 'Count', 'y': 'Category'})
    fig.update_layout(height=400)
    charts_html.append(fig.to_html(include_plotlyjs='cdn'))
    print("  [+] Category distribution")

# Chart 4: Resolution Time Distribution
if 'resolution_time_days' in support_tickets_df.columns:
    resolution_data = support_tickets_df[support_tickets_df['resolution_time_days'].notna()]['resolution_time_days'].astype(float)
    if len(resolution_data) > 0:
        fig = px.histogram(resolution_data, nbins=40,
                           title='Resolution Time Distribution',
                           labels={'value': 'Days', 'count': 'Tickets'})
        fig.update_layout(height=400)
        charts_html.append(fig.to_html(include_plotlyjs='cdn'))
        print("  [+] Resolution time")

# Chart 5: Top Blocks by Tickets
block_counts = support_tickets_df['Block'].value_counts().head(15)
fig = px.bar(x=block_counts.values, y=block_counts.index, orientation='h',
              title='Top 15 Blocks by Ticket Volume',
              labels={'x': 'Tickets', 'y': 'Block'})
fig.update_layout(height=450)
charts_html.append(fig.to_html(include_plotlyjs='cdn'))
print("  [+] Block analysis")

# Chart 6: Top Units by Tickets
unit_counts = support_tickets_df['Unit'].value_counts().head(15)
fig = px.bar(x=unit_counts.values, y=unit_counts.index, orientation='h',
              title='Top 15 Units by Ticket Volume',
              labels={'x': 'Tickets', 'y': 'Unit'})
fig.update_layout(height=450)
charts_html.append(fig.to_html(include_plotlyjs='cdn'))
print("  [+] Unit analysis")

# Chart 7: Block Status Distribution
block_status = pd.crosstab(support_tickets_df['Block'], support_tickets_df['Status']).head(10)
fig = px.bar(block_status, title='Status Distribution by Top 10 Blocks',
              labels={'value': 'Count', 'Block': 'Block'}, barmode='stack')
fig.update_layout(height=400)
charts_html.append(fig.to_html(include_plotlyjs='cdn'))
print("  [+] Block status")

# Chart 8: Block Priority Distribution
block_priority = pd.crosstab(support_tickets_df['Block'], support_tickets_df['Priority']).head(10)
fig = px.bar(block_priority, title='Priority Distribution by Top 10 Blocks',
              labels={'value': 'Count', 'Block': 'Block'}, barmode='stack')
fig.update_layout(height=400)
charts_html.append(fig.to_html(include_plotlyjs='cdn'))
print("  [+] Block priority")

# Chart 9: Timeline
if 'CreatedOn' in support_tickets_df.columns:
    timeline = support_tickets_df.groupby(support_tickets_df['CreatedOn'].dt.date).size()
    fig = px.line(x=timeline.index, y=timeline.values,
                  title='Tickets Created Over Time',
                  labels={'x': 'Date', 'y': 'Tickets'})
    fig.update_layout(height=400)
    charts_html.append(fig.to_html(include_plotlyjs='cdn'))
    print("  [+] Timeline")

# Chart 10: Average Resolution Time by Block
if 'resolution_time_days' in support_tickets_df.columns:
    avg_res = support_tickets_df.groupby('Block')['resolution_time_days'].mean().sort_values(ascending=True).tail(12)
    fig = px.bar(x=avg_res.values, y=avg_res.index, orientation='h',
                  title='Average Resolution Time by Block (Top 12)',
                  labels={'x': 'Days', 'y': 'Block'})
    fig.update_layout(height=400)
    charts_html.append(fig.to_html(include_plotlyjs='cdn'))
    print("  [+] Avg resolution by block")

# Chart 11: Zone Distribution (Pie Chart)
if zones:
    zone_counts = support_tickets_df['Zone'].value_counts()
    zone_counts = zone_counts[zone_counts.index != 'Unassigned']  # Exclude unassigned for cleaner view
    if len(zone_counts) > 0:
        fig = px.pie(names=zone_counts.index, values=zone_counts.values,
                     title='Ticket Distribution by Zone',
                     color_discrete_sequence=[zones[zone]['color'] for zone in zone_counts.index if zone in zones])
        fig.update_layout(height=500)
        charts_html.append(fig.to_html(include_plotlyjs='cdn'))
        print("  [+] Zone distribution")

# Chart 12: Zone Status Distribution
if zones:
    zone_status = pd.crosstab(support_tickets_df['Zone'], support_tickets_df['Status'])
    zone_status = zone_status[zone_status.index != 'Unassigned']
    if len(zone_status) > 0:
        fig = px.bar(zone_status, title='Status Distribution by Zone',
                      labels={'value': 'Count', 'Zone': 'Zone'}, barmode='stack')
        fig.update_layout(height=400)
        charts_html.append(fig.to_html(include_plotlyjs='cdn'))
        print("  [+] Zone status")

# Chart 13: Zone Priority Distribution
if zones:
    zone_priority = pd.crosstab(support_tickets_df['Zone'], support_tickets_df['Priority'])
    zone_priority = zone_priority[zone_priority.index != 'Unassigned']
    if len(zone_priority) > 0:
        fig = px.bar(zone_priority, title='Priority Distribution by Zone',
                      labels={'value': 'Count', 'Zone': 'Zone'}, barmode='stack')
        fig.update_layout(height=400)
        charts_html.append(fig.to_html(include_plotlyjs='cdn'))
        print("  [+] Zone priority")

# Build HTML
print("\nBuilding HTML report...")
html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BHRTOA Facility Management Analytics</title>
    <script src="https://cdn.plotly.com/plotly-latest.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.3.6/css/buttons.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.3.6/js/dataTables.buttons.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.3.6/js/buttons.print.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; }}
        header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; }}
        header h1 {{ font-size: 2em; margin-bottom: 5px; }}
        .container {{ max-width: 1600px; margin: 20px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h2 {{ color: #667eea; margin: 30px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea; }}
        .metrics {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }}
        .metric {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }}
        .metric-value {{ font-size: 2em; font-weight: bold; }}
        .metric-label {{ font-size: 0.9em; opacity: 0.9; }}
        .chart-container {{ margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        thead {{ background: #667eea; color: white; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        tbody tr:hover {{ background: #f5f5f5; }}
        .status-open {{ color: #e74c3c; font-weight: bold; }}
        .status-closed {{ color: #27ae60; font-weight: bold; }}
        .status-resolved {{ color: #2980b9; font-weight: bold; }}
        .priority-high {{ color: #e74c3c; font-weight: bold; }}
        .priority-medium {{ color: #f39c12; font-weight: bold; }}
        .priority-low {{ color: #27ae60; font-weight: bold; }}
        .dataTables_wrapper {{ margin: 20px 0; }}
        .dataTables_filter input {{ padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 250px; }}
        .footer {{ text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 0.9em; }}
        
        /* Modal Styles */
        .modal {{ display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }}
        .modal-content {{ background-color: white; margin: 5% auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto; }}
        .modal-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }}
        .modal-header h2 {{ color: #667eea; margin: 0; }}
        .close-btn {{ background: none; border: none; font-size: 28px; cursor: pointer; color: #667eea; }}
        .close-btn:hover {{ color: #764ba2; }}
        .detail-group {{ margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; border-left: 4px solid #667eea; }}
        .detail-label {{ font-weight: bold; color: #667eea; margin-bottom: 5px; }}
        .detail-value {{ color: #333; word-break: break-word; }}
        .clickable-row {{ cursor: pointer; }}
        .clickable-row:hover {{ background-color: #e8e8ff !important; }}
        .zone-badge {{ display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; margin: 2px; }}
    </style>
</head>
<body>
    <header>
        <h1>BHRTOA Facility Management Analytics Dashboard</h1>
        <p>Data Period: Last 90 Days | Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
    </header>
    
    <div class="container">
        <h2>📊 Key Metrics</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">{len(support_tickets_df)}</div>
                <div class="metric-label">Total Tickets</div>
            </div>
            <div class="metric">
                <div class="metric-value">{support_tickets_df['Block'].nunique()}</div>
                <div class="metric-label">Blocks</div>
            </div>
            <div class="metric">
                <div class="metric-value">{support_tickets_df['Unit'].nunique()}</div>
                <div class="metric-label">Units</div>
            </div>
            <div class="metric">
                <div class="metric-value">{len(support_tickets_df[support_tickets_df['Status'] == 'OPEN'])}</div>
                <div class="metric-label">Open Tickets</div>
            </div>
            <div class="metric">
                <div class="metric-value">{len(zones)}</div>
                <div class="metric-label">Zones</div>
            </div>
        </div>

        <h2>Zone Summary</h2>
        <table style="margin-bottom: 20px;">
            <thead>
                <tr>
                    <th>Zone</th>
                    <th>Open</th>
                    <th>In Progress</th>
                    <th>On Hold</th>
                    <th>Resolved</th>
                    <th>Closed</th>
                    <th>Other</th>
                    <th>Total</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
"""

# Add zone summary rows with status breakdown
for zone_name in sorted(zones.keys()):
    zone_df = support_tickets_df[support_tickets_df['Zone'] == zone_name]
    zone_count = len(zone_df)
    zone_pct = (zone_count / len(support_tickets_df) * 100) if len(support_tickets_df) > 0 else 0
    zone_color = zones[zone_name]['color']
    
    # Count by status
    open_count = len(zone_df[zone_df['Status'] == 'OPEN'])
    in_progress_count = len(zone_df[zone_df['Status'] == 'IN_PROGRESS'])
    on_hold_count = len(zone_df[zone_df['Status'] == 'ON_HOLD'])
    resolved_count = len(zone_df[zone_df['Status'] == 'RESOLVED'])
    closed_count = len(zone_df[zone_df['Status'] == 'CLOSED'])
    other_count = zone_count - open_count - in_progress_count - on_hold_count - resolved_count - closed_count
    
    html += f"""
                <tr>
                    <td><span class="zone-badge" style="background-color: {zone_color};">{zone_name}</span></td>
                    <td><span class="status-open">{open_count}</span></td>
                    <td><span style="color: #FF9800; font-weight: bold;">{in_progress_count}</span></td>
                    <td><span style="color: #2196F3; font-weight: bold;">{on_hold_count}</span></td>
                    <td><span class="status-resolved">{resolved_count}</span></td>
                    <td><span class="status-closed">{closed_count}</span></td>
                    <td><span style="color: #9C27B0; font-weight: bold;">{other_count}</span></td>
                    <td><strong>{zone_count}</strong></td>
                    <td>{zone_pct:.1f}%</td>
                </tr>
"""

html += """
            </tbody>
        </table>

        <div style="background-color: #f5f5f5; padding: 12px; margin-bottom: 20px; border-left: 4px solid #9C27B0; border-radius: 4px;">
            <strong>Note:</strong> <span style="color: #9C27B0;">●</span> <strong>Other (Purple)</strong> includes tickets with statuses: AUTO_CLOSE and NOT_AN_ISSUE
        </div>

        <h2>📈 Analytics Charts</h2>
"""

# Add all charts
for chart_html in charts_html:
    html += f'<div class="chart-container">{chart_html}</div>\n'

# Add detail modal
html += """
        <!-- Ticket Detail Modal -->
        <div id="ticketModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Ticket Details</h2>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div id="modalBody"></div>
            </div>
        </div>

        <h2>🎫 Support Ticket Details</h2>
        <p><strong>Total: {len(support_tickets_df)} tickets</strong></p>
        <p><small>Click on any ticket row to view complete details</small></p>
        <table id="ticketsTable" class="display" style="width:100%">
            <thead>
                <tr>
                    <th>Ticket ID</th>
                    <th>Zone</th>
                    <th>Block</th>
                    <th>Unit</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Resolved</th>
                    <th>Days to Resolve</th>
                    <th>Created By</th>
                    <th>Rating</th>
                </tr>
            </thead>
            <tbody>
"""

for idx, row in support_tickets_df.iterrows():
    ticket_id = row.get('Ticket_ID', '-')
    zone = row.get('Zone', '-')
    block = row.get('Block', '-')
    unit = row.get('Unit', '-')
    category = str(row.get('Category', '-'))[:25]
    priority = row.get('Priority', '-')
    status = row.get('Status', '-')
    created = str(row.get('CreatedOn', '-'))[:10]
    resolved = str(row.get('Resolved Time', '-'))[:10]
    res_days = int(row.get('resolution_time_days', 0)) if pd.notna(row.get('resolution_time_days')) else '-'
    created_by = str(row.get('Created_By', '-'))[:15]
    rating = row.get('Rating', '-')
    
    # Get zone color
    zone_color = zones.get(zone, {}).get('color', '#999999') if zone in zones else '#999999'
    
    status_class = 'status-closed' if 'CLOSED' in str(status) else 'status-resolved' if 'RESOLVED' in str(status) else 'status-open'
    priority_class = 'priority-high' if 'HIGH' in str(priority) else 'priority-medium' if 'MEDIUM' in str(priority) else 'priority-low'
    
    # Create JSON data for modal (properly escaped)
    ticket_data = {
        'Ticket_ID': ticket_id,
        'Zone': zone,
        'Block': block,
        'Unit': unit,
        'Category': row.get('Category', '-'),
        'Priority': priority,
        'Status': status,
        'CreatedOn': created,
        'ResolvedTime': resolved,
        'ResolutionDays': res_days,
        'CreatedBy': created_by,
        'Rating': rating,
        'Description': str(row.get('Description', ''))[:500],
        'Resolution': str(row.get('Resolution', ''))[:500],
        'Comments': str(row.get('Comments', ''))[:500],
    }
    
    ticket_json = json.dumps(ticket_data).replace('"', '&quot;')
    
    html += f"""
                <tr class="clickable-row" onclick="showTicketDetails('{ticket_json}')">
                    <td>{ticket_id}</td>
                    <td><span class="zone-badge" style="background-color: {zone_color};">{zone}</span></td>
                    <td>{block}</td>
                    <td>{unit}</td>
                    <td>{category}</td>
                    <td><span class="{priority_class}">{priority}</span></td>
                    <td><span class="{status_class}">{status}</span></td>
                    <td>{created}</td>
                    <td>{resolved}</td>
                    <td>{res_days}</td>
                    <td>{created_by}</td>
                    <td>{rating}</td>
                </tr>
"""
    
    if (idx + 1) % 500 == 0:
        print(f"  Added {idx + 1} rows...")

html += """
            </tbody>
        </table>

        <div class="footer">
            <p>BHRTOA Facility Management Data Explorer | Source: nobrokerhood.com</p>
            <p>Data Period: Last 90 Days</p>
        </div>
    </div>

    <script>
        $(document).ready(function() {
            $('#ticketsTable').DataTable({
                "pageLength": 50,
                "lengthMenu": [[25, 50, 100, 250], [25, 50, 100, 250]],
                "scrollX": true,
                "processing": true,
                "dom": 'Bfrtip',
                "buttons": [
                    'copy',
                    'csv',
                    'excel',
                    {
                        extend: 'pdf',
                        orientation: 'landscape',
                        pageSize: 'A4',
                        title: 'BHRTOA Support Tickets Report',
                        customize: function(doc) {
                            doc.defaultStyle.fontSize = 9;
                            doc.styles.tableHeader.fontSize = 9;
                        }
                    },
                    'print'
                ],
                "order": [[6, 'desc']]
            });
        });

        // Modal functions
        function showTicketDetails(jsonData) {
            try {
                const data = JSON.parse(jsonData.replace(/&quot;/g, '"'));
                let html = '';
                
                const fields = [
                    ['Ticket ID', 'Ticket_ID'],
                    ['Zone', 'Zone'],
                    ['Block', 'Block'],
                    ['Unit', 'Unit'],
                    ['Category', 'Category'],
                    ['Priority', 'Priority'],
                    ['Status', 'Status'],
                    ['Created On', 'CreatedOn'],
                    ['Resolved On', 'ResolvedTime'],
                    ['Days to Resolve', 'ResolutionDays'],
                    ['Created By', 'CreatedBy'],
                    ['Rating', 'Rating'],
                    ['Description', 'Description'],
                    ['Resolution', 'Resolution'],
                    ['Comments', 'Comments']
                ];
                
                fields.forEach(([label, key]) => {
                    const value = data[key] || '-';
                    html += `<div class="detail-group">
                        <div class="detail-label">${label}:</div>
                        <div class="detail-value">${value}</div>
                    </div>`;
                });
                
                document.getElementById('modalBody').innerHTML = html;
                document.getElementById('ticketModal').style.display = 'block';
            } catch(e) {
                console.error('Error:', e);
            }
        }

        function closeModal() {
            document.getElementById('ticketModal').style.display = 'none';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('ticketModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    </script>
</body>
</html>
"""

# Write to file
print("\nWriting report...")
with open('report.html', 'w', encoding='utf-8') as f:
    f.write(html)

file_size_mb = os.path.getsize('report.html') / (1024 * 1024)
print(f"\n[SUCCESS] Report generated!")
print(f"  File: report.html")
print(f"  Size: {file_size_mb:.2f} MB")
print(f"  Tickets: {len(support_tickets_df)}")
print(f"  Blocks: {support_tickets_df['Block'].nunique()}")
print(f"  Units: {support_tickets_df['Unit'].nunique()}")
print(f"  Zones: {len(zones)}")
