#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generate report and launch server
.DESCRIPTION
    One-click to generate BHRTOA analytics report and launch web server
.EXAMPLE
    .\run.ps1
#>

# Colors
$green = "`e[32m"
$blue = "`e[34m"
$yellow = "`e[33m"
$reset = "`e[0m"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "BHRTOA Facility Management Analytics" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Generate report
Write-Host "${blue}Step 1: Generating Report...${reset}" -NoNewline
Write-Host ""
python generate_report.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "${yellow}Error generating report${reset}"
    exit 1
}

# Start server
Write-Host ""
Write-Host "${blue}Step 2: Starting Web Server...${reset}" -NoNewline
Write-Host ""
python launch_server.py
