import os
import pandas as pd
import plotly.express as px
import json
from pathlib import Path

# Path to data folder
data_dir = 'nbh-data'

# Function to load all CSVs from subfolders
def load_data():
    data = {}
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if file.endswith('.csv'):
                filepath = os.path.join(root, file)
                try:
                    df = pd.read_csv(filepath)
                    if not df.empty:
                        data[file] = df
                except Exception as e:
                    print(f"Error loading {file}: {e}")
            elif file.endswith('.xlsx'):
                filepath = os.path.join(root, file)
                try:
                    df = pd.read_excel(filepath)
                    if not df.empty:
                        data[file] = df
                except Exception as e:
                    print(f"Error loading {file}: {e}")
    return data

# Load data
data = load_data()

# Process complaint summary
if 'COMPLAINT_SUMMARY_WITH_PREVIOUS_TICKETS_8a9696ce88922af9018895bd9d232ffc_1766800253551.csv' in data:
    comp_df = data['COMPLAINT_SUMMARY_WITH_PREVIOUS_TICKETS_8a9696ce88922af9018895bd9d232ffc_1766800253551.csv']
    # Group by category, sum totals
    comp_summary = comp_df.groupby('category').sum(numeric_only=True).reset_index()
    # Group by area
    area_summary = comp_df.groupby('area').sum(numeric_only=True).reset_index()
else:
    comp_summary = pd.DataFrame()
    area_summary = pd.DataFrame()

# Process escalation matrix
if 'ESCALATION_MATRIX_8a9696ce88922af9018895bd9d232ffc_1766800495496.csv' in data:
    esc_df = data['ESCALATION_MATRIX_8a9696ce88922af9018895bd9d232ffc_1766800495496.csv']
    # Clean data, some columns have commas
    esc_df['first_response_time_minutes'] = pd.to_numeric(esc_df['first_response_time_minutes'], errors='coerce')
    esc_df['tickets_exceeding_first_response_time'] = pd.to_numeric(esc_df['tickets_exceeding_first_response_time'], errors='coerce')
    # Similarly for others, but for simplicity, keep as is
else:
    esc_df = pd.DataFrame()

# Load support ticket details
support_tickets_df = pd.DataFrame()
for filename in data.keys():
    if 'SUPPORT_TICKET_COMMENTS_STATUS' in filename:
        support_tickets_df = data[filename]
        break

# Generate HTML
html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>BHRTOA Facility Management Data Explorer</title>
    <script src="https://cdn.plotly.com/plotly-latest.min.js"></script>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
</head>
<body>
    <h1>BHRTOA Facility Management Analytics Report</h1>
    <p>Data from nobrokerhood.com, last 90 days.</p>
    <p>Note: Individual ticket data not available in current exports. For full drill down to individual tickets, provide detailed ticket CSV with dates for aging analysis.</p>
    <button onclick="regenerate()">Regenerate Report</button>
"""

# Complaint Summary Chart
if not comp_summary.empty:
    fig = px.bar(comp_summary, x='category', y='total_tickets', title='Total Tickets by Category')
    html_content += fig.to_html(full_html=False)

    # Resolution rate: resolved / total
    comp_summary['resolution_rate'] = comp_summary['resolved'] / comp_summary['total_tickets']
    fig2 = px.bar(comp_summary, x='category', y='resolution_rate', title='Resolution Rate by Category')
    html_content += fig2.to_html(full_html=False)

# Area wise
if not area_summary.empty:
    fig_area = px.bar(area_summary, x='area', y='total_tickets', title='Total Tickets by Area')
    html_content += fig_area.to_html(full_html=False)

# Aging (open tickets)
if not comp_summary.empty:
    fig_aging = px.bar(comp_summary, x='category', y='open', title='Open Tickets (Aging) by Category')
    html_content += fig_aging.to_html(full_html=False)

# Status distribution
if not comp_summary.empty:
    status_cols = ['resolved', 'closed', 'open', 'in_progress', 'on_hold', 'reopened']
    fig_status = px.bar(comp_summary.melt(id_vars='category', value_vars=status_cols, var_name='status', value_name='count'), x='category', y='count', color='status', title='Status Distribution by Category')
    html_content += fig_status.to_html(full_html=False)

# Calculate Quality Metrics
if not comp_summary.empty:
    comp_summary['auto_close_rate'] = comp_summary['auto_close'] / comp_summary['total_tickets']
    comp_summary['not_issue_rate'] = comp_summary['not_an_issue'] / comp_summary['total_tickets']
    comp_summary['cancel_rate'] = comp_summary['cancelled'] / comp_summary['total_tickets']
    comp_summary['reopen_rate'] = comp_summary['reopened'] / comp_summary['total_tickets']
    comp_summary['closure_rate'] = (comp_summary['closed'] + comp_summary['auto_close']) / comp_summary['total_tickets']
    
    # Auto-close rate (team efficiency)
    fig_auto = px.bar(comp_summary, x='category', y='auto_close_rate', title='Auto-Close Rate by Category (System Efficiency)', color='auto_close_rate', color_continuous_scale='RdYlGn')
    html_content += fig_auto.to_html(full_html=False)
    
    # Reopen rate (quality indicator - lower is better)
    fig_reopen = px.bar(comp_summary, x='category', y='reopen_rate', title='Re-Open Rate by Category (Quality Indicator - Lower is Better)', color='reopen_rate', color_continuous_scale='RdYlGn_r')
    html_content += fig_reopen.to_html(full_html=False)
    
    # Not-an-issue rate (categorization quality)
    fig_not_issue = px.bar(comp_summary, x='category', y='not_issue_rate', title='Not-An-Issue Rate by Category (Categorization Quality)', color='not_issue_rate', color_continuous_scale='Viridis')
    html_content += fig_not_issue.to_html(full_html=False)

# Escalation Chart
if not esc_df.empty:
    fig3 = px.bar(esc_df, x='category', y='total_tickets', title='Total Tickets by Category (Escalation)')
    html_content += fig3.to_html(full_html=False)

    # Clean escalation columns for calculation
    esc_df['tickets_reaching_first_escalation'] = pd.to_numeric(esc_df['tickets_reaching_first_escalation'], errors='coerce').fillna(0)
    esc_df['tickets_reaching_second_escalation'] = pd.to_numeric(esc_df['tickets_reaching_second_escalation'], errors='coerce').fillna(0)
    esc_df['tickets_reaching_third_escalation'] = pd.to_numeric(esc_df['tickets_reaching_third_escalation'], errors='coerce').fillna(0)
    esc_df['tickets_reaching_fourth_escalation'] = pd.to_numeric(esc_df['tickets_reaching_fourth_escalation'], errors='coerce').fillna(0)
    
    # Escalation rates
    esc_df['escalation_rate'] = esc_df['tickets_reaching_first_escalation'] / esc_df['total_tickets']
    esc_df['second_escalation_rate'] = esc_df['tickets_reaching_second_escalation'] / esc_df['total_tickets']
    esc_df['third_escalation_rate'] = esc_df['tickets_reaching_third_escalation'] / esc_df['total_tickets']
    
    fig4 = px.bar(esc_df, x='category', y='escalation_rate', title='First Escalation Rate by Category (Lower is Better)', color='escalation_rate', color_continuous_scale='RdYlGn_r')
    html_content += fig4.to_html(full_html=False)
    
    # Second and Third escalation rates
    fig_esc2 = px.bar(esc_df, x='category', y='second_escalation_rate', title='Second Escalation Rate by Category')
    html_content += fig_esc2.to_html(full_html=False)
    
    # Response time performance
    fig_response = px.bar(esc_df, x='category', y='first_response_time_minutes', title='First Response Time (Minutes) by Category', color='first_response_time_minutes', color_continuous_scale='RdYlGn_r')
    html_content += fig_response.to_html(full_html=False)
    
    # SLA Compliance - tickets exceeding response time
    esc_df['sla_compliance'] = 1 - (esc_df['tickets_exceeding_first_response_time'] / esc_df['total_tickets'])
    fig_sla = px.bar(esc_df, x='category', y='sla_compliance', title='SLA Compliance Rate by Category (Target: >95%)', color='sla_compliance', color_continuous_scale='RdYlGn')
    html_content += fig_sla.to_html(full_html=False)
    
    # Escalation depth analysis
    esc_melt = esc_df.melt(id_vars='category', value_vars=['tickets_reaching_first_escalation', 'tickets_reaching_second_escalation', 'tickets_reaching_third_escalation', 'tickets_reaching_fourth_escalation'], var_name='escalation_level', value_name='count')
    fig_depth = px.bar(esc_melt, x='category', y='count', color='escalation_level', title='Escalation Depth Distribution')
    html_content += fig_depth.to_html(full_html=False)

# Tables
if not comp_summary.empty:
    html_content += "<h2>Complaint Summary Table</h2><table id='comp-table' class='display'><thead><tr>"
    for col in comp_summary.columns:
        html_content += f"<th>{col}</th>"
    html_content += "</tr></thead><tbody>"
    for _, row in comp_summary.iterrows():
        html_content += "<tr>"
        for val in row:
            html_content += f"<td>{val}</td>"
        html_content += "</tr>"
    html_content += "</tbody></table>"

if not esc_df.empty:
    html_content += "<h2>Escalation Matrix Table</h2><table id='esc-table' class='display'><thead><tr>"
    for col in esc_df.columns:
        html_content += f"<th>{col}</th>"
    html_content += "</tr></thead><tbody>"
    for _, row in esc_df.iterrows():
        html_content += "<tr>"
        for val in row:
            html_content += f"<td>{val}</td>"
        html_content += "</tr>"
    html_content += "</tbody></table>"

# Support Ticket Details Grid
if not support_tickets_df.empty:
    html_content += "<h2>Support Ticket Details Grid (All Tickets)</h2>"
    html_content += f"<p><strong>Total Tickets: {len(support_tickets_df)}</strong></p>"
    html_content += "<table id='tickets-table' class='display'><thead><tr>"
    
    # Select key columns to display
    display_cols = ['Ticket_ID', 'Society_Name', 'Issue_Location', 'Category', 'Sub_Category', 'Priority', 'Status', 
                    'CreatedOn', 'Last_updatedon', 'Resolved Time', 'EscalatedLevel', 'Created_By', 'Rating']
    
    # Only include columns that exist in the dataframe
    display_cols = [col for col in display_cols if col in support_tickets_df.columns]
    
    for col in display_cols:
        html_content += f"<th>{col}</th>"
    html_content += "</tr></thead><tbody>"
    
    # Limit to most recent 500 tickets for performance
    tickets_to_show = support_tickets_df[display_cols].head(500)
    for _, row in tickets_to_show.iterrows():
        html_content += "<tr>"
        for col in display_cols:
            val = row[col]
            # Format dates and handle NaN values
            if pd.isna(val):
                html_content += "<td>-</td>"
            else:
                html_content += f"<td>{str(val)[:100]}</td>"  # Truncate long values
        html_content += "</tr>"
    
    html_content += "</tbody></table>"

# Effectiveness Scorecard
if not comp_summary.empty and not esc_df.empty:
    html_content += "<h2>Facility Team Effectiveness Scorecard</h2><table id='scorecard-table' class='display'><thead><tr>"
    html_content += "<th>Category</th><th>Total Tickets</th><th>Resolution %</th><th>First Contact %</th><th>Re-open %</th><th>Escalation %</th><th>SLA Compliance %</th><th>Overall Score</th>"
    html_content += "</tr></thead><tbody>"
    
    for idx, row in comp_summary.iterrows():
        cat = row['category']
        total = int(row['total_tickets'])
        resolution = row['resolution_rate'] * 100 if 'resolution_rate' in row else 0
        first_contact = ((row['resolved'] + row['auto_close']) / row['total_tickets'] * 100) if row['total_tickets'] > 0 else 0
        reopen = row['reopen_rate'] * 100 if 'reopen_rate' in row else 0
        
        # Get escalation data
        esc_cat = esc_df[esc_df['category'] == cat.upper()]
        if not esc_cat.empty:
            esc_pct = (esc_cat['tickets_reaching_first_escalation'].values[0] / esc_cat['total_tickets'].values[0] * 100) if esc_cat['total_tickets'].values[0] > 0 else 0
            sla_pct = (1 - esc_cat['tickets_exceeding_first_response_time'].values[0] / esc_cat['total_tickets'].values[0] * 100) if esc_cat['total_tickets'].values[0] > 0 else 0
        else:
            esc_pct = 0
            sla_pct = 100
        
        # Calculate overall score (weighted)
        overall_score = (resolution * 0.3 + first_contact * 0.25 + (100 - reopen) * 0.2 + (100 - esc_pct) * 0.15 + sla_pct * 0.1)
        
        # Color coding
        color = 'lightgreen' if overall_score >= 80 else 'lightyellow' if overall_score >= 60 else 'lightcoral'
        html_content += f"<tr style='background-color:{color}'>"
        html_content += f"<td>{cat}</td><td>{total}</td><td>{resolution:.1f}%</td><td>{first_contact:.1f}%</td><td>{reopen:.1f}%</td>"
        html_content += f"<td>{esc_pct:.1f}%</td><td>{sla_pct:.1f}%</td><td><strong>{overall_score:.1f}</strong></td>"
        html_content += "</tr>"
    
    html_content += "</tbody></table>"

# Insights - Team Effectiveness & Incident Handling
insights = []
if not comp_summary.empty:
    total_tickets = comp_summary['total_tickets'].sum()
    resolved_total = comp_summary['resolved'].sum()
    open_total = comp_summary['open'].sum()
    auto_close_total = comp_summary['auto_close'].sum()
    reopen_total = comp_summary['reopened'].sum()
    closure_total = comp_summary['closed'].sum()
    not_issue_total = comp_summary['not_an_issue'].sum()
    
    resolution_rate = resolved_total / total_tickets if total_tickets > 0 else 0
    auto_close_rate_overall = auto_close_total / total_tickets if total_tickets > 0 else 0
    reopen_rate_overall = reopen_total / total_tickets if total_tickets > 0 else 0
    first_contact_resolution = (resolved_total + auto_close_total) / total_tickets if total_tickets > 0 else 0
    categorization_accuracy = (total_tickets - not_issue_total) / total_tickets if total_tickets > 0 else 0
    
    insights.append(f"<strong>OVERALL PERFORMANCE METRICS:</strong>")
    insights.append(f"Total Tickets (90 days): {int(total_tickets)}")
    insights.append(f"Overall Resolution Rate: {resolution_rate:.2%}")
    insights.append(f"First Contact Resolution Rate (Resolved + Auto-Closed): {first_contact_resolution:.2%}")
    insights.append(f"Auto-Close Rate (System Efficiency): {auto_close_rate_overall:.2%}")
    insights.append(f"Open/Aging Tickets: {int(open_total)}")
    
    insights.append(f"<strong>QUALITY METRICS:</strong>")
    insights.append(f"Re-open Rate (Lower is Better): {reopen_rate_overall:.2%}")
    insights.append(f"Categorization Accuracy: {categorization_accuracy:.2%}")
    insights.append(f"Ticket Closure Rate: {(closure_total / total_tickets):.2%}")
    
    # Best and worst performing categories
    if 'resolution_rate' in comp_summary.columns:
        best_cat = comp_summary.loc[comp_summary['resolution_rate'].idxmax()]
        worst_cat = comp_summary.loc[comp_summary['resolution_rate'].idxmin()]
        insights.append(f"<strong>CATEGORY PERFORMANCE:</strong>")
        insights.append(f"Best Performing Category: {best_cat['category']} ({best_cat['resolution_rate']:.2%} resolution rate)")
        insights.append(f"Needs Improvement: {worst_cat['category']} ({worst_cat['resolution_rate']:.2%} resolution rate)")
        
        # Highest reopen rate
        worst_quality = comp_summary.loc[comp_summary['reopen_rate'].idxmax()]
        insights.append(f"Highest Re-open Rate: {worst_quality['category']} ({worst_quality['reopen_rate']:.2%}) - Quality concern")

if not esc_df.empty:
    total_esc_tickets = esc_df['total_tickets'].sum()
    first_esc_total = esc_df['tickets_reaching_first_escalation'].sum()
    second_esc_total = esc_df['tickets_reaching_second_escalation'].sum()
    third_esc_total = esc_df['tickets_reaching_third_escalation'].sum()
    exceeding_sla_total = esc_df['tickets_exceeding_first_response_time'].sum()
    
    esc_rate = first_esc_total / total_esc_tickets if total_esc_tickets > 0 else 0
    sla_compliance_overall = 1 - (exceeding_sla_total / total_esc_tickets) if total_esc_tickets > 0 else 0
    avg_response_time = esc_df['first_response_time_minutes'].mean() if not esc_df['first_response_time_minutes'].isna().all() else 0
    
    insights.append(f"<strong>INCIDENT HANDLING CAPABILITY:</strong>")
    insights.append(f"First Escalation Rate: {esc_rate:.2%} - {'GOOD' if esc_rate < 0.1 else 'NEEDS IMPROVEMENT' if esc_rate < 0.2 else 'CRITICAL'}")
    insights.append(f"Second Escalation Rate: {(second_esc_total / total_esc_tickets):.2%}")
    insights.append(f"SLA Compliance (First Response): {sla_compliance_overall:.2%} - {'EXCEEDS 95% TARGET' if sla_compliance_overall >= 0.95 else 'BELOW 95% TARGET'}")
    insights.append(f"Avg First Response Time: {avg_response_time:.0f} minutes")
    insights.append(f"Tickets Exceeding SLA: {int(exceeding_sla_total)}")
    
    # Security incidents
    if 'SECURITY_INCIDENT' in esc_df['category'].values:
        sec_df = esc_df[esc_df['category'] == 'SECURITY_INCIDENT']
        if not sec_df.empty:
            sec_open = sec_df['open_on_hold_inprogress_reopened_tickets'].sum()
            insights.append(f"<strong>SECURITY INCIDENTS:</strong>")
            insights.append(f"Total Security Incidents: {int(sec_df['total_tickets'].sum())}")
            insights.append(f"Open/Pending Security Issues: {int(sec_open)} - URGENT ATTENTION NEEDED" if sec_open > 5 else f"Open/Pending Security Issues: {int(sec_open)}")

html_content += "<h2>Team Effectiveness & Incident Handling Insights</h2><ul>"
for ins in insights:
    html_content += f"<li>{ins}</li>"
html_content += "</ul>"

# Export buttons
if not comp_summary.empty:
    csv_data = comp_summary.to_csv(index=False)
    csv_data_escaped = json.dumps(csv_data)
    html_content += f'<button onclick="downloadCSV({csv_data_escaped}, \'complaint_summary.csv\')">Download Complaint Summary CSV</button>'

if not esc_df.empty:
    csv_data2 = esc_df.to_csv(index=False)
    csv_data2_escaped = json.dumps(csv_data2)
    html_content += f'<button onclick="downloadCSV({csv_data2_escaped}, \'escalation_matrix.csv\')">Download Escalation Matrix CSV</button>'

html_content += """
    <script>
        $(document).ready(function() {
            $('#comp-table').DataTable();
            $('#esc-table').DataTable();
            $('#scorecard-table').DataTable();
            $('#tickets-table').DataTable({
                "pageLength": 50,
                "scrollX": true,
                "order": [[7, 'desc']]  // Sort by CreatedOn date descending
            });
        });
        function downloadCSV(data, filename) {
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        function regenerate() {
            location.reload();
        }
    </script>
"""

html_content += """
</body>
</html>
"""

# Write to file
with open('report.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Report generated: report.html")