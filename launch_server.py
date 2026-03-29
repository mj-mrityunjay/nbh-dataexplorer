#!/usr/bin/env python3
"""
Simple HTTP Server to serve the BHRTOA report locally
No special characters to avoid encoding issues on Windows
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import time
import socket
from urllib.parse import unquote

PORT = 8000
REPORT_FILE = 'index.html'

def is_port_available(port):
    """Check if a port is available"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result != 0
    except:
        return True

def find_available_port(start_port=8000, max_attempts=10):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(port):
            return port
    return None

class ReportHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve report.html for root
        if self.path == '/' or self.path == '':
            self.path = '/' + REPORT_FILE
        
        # Prevent directory listing
        if self.path.endswith('/'):
            self.send_error(404)
            return
        
        # Serve the file
        try:
            self.send_response(200)
            
            # Determine content type
            if self.path.endswith('.html'):
                self.send_header('Content-type', 'text/html; charset=utf-8')
            elif self.path.endswith('.css'):
                self.send_header('Content-type', 'text/css')
            elif self.path.endswith('.js'):
                self.send_header('Content-type', 'application/javascript')
            else:
                self.send_header('Content-type', 'application/octet-stream')
            
            self.end_headers()
            
            # Read and send file
            filepath = unquote(self.path[1:])
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404)
        except Exception as e:
            self.send_error(500, str(e))

    def log_message(self, format, *args):
        # Simple logging without fancy characters
        if '%s' in format:
            print(f"[SERVER] {args[0]}", flush=True)

def main():
    global PORT
    
    # Check if report exists
    if not os.path.exists(REPORT_FILE):
        print("=" * 70)
        print("ERROR: report.html not found!")
        print("=" * 70)
        print()
        print("Step 1: Generate the report first")
        print("  Command: python generate_report.py")
        print()
        print("Step 2: Then start the server")
        print("  Command: python launch_server.py")
        print()
        print("=" * 70)
        sys.exit(1)
    
    # Find available port
    print("Checking for available port...")
    
    if not is_port_available(PORT):
        print(f"\nPort {PORT} is already in use.")
        print()
        print("Options:")
        print(f"  1. Kill existing process: Get-Process python | Stop-Process -Force")
        print(f"  2. Use different port: (Searching...)")
        print()
        
        available_port = find_available_port(PORT + 1, max_attempts=10)
        
        if available_port:
            PORT = available_port
            print(f"  Found available port: {PORT}")
            print(f"  Using port {PORT} instead")
            print()
        else:
            print("ERROR: Could not find available port (8000-8009)")
            print()
            print("To free port 8000:")
            print("  PowerShell: Get-Process python | Stop-Process -Force")
            print()
            sys.exit(1)
    
    # Create server
    try:
        with socketserver.TCPServer(("", PORT), ReportHandler) as httpd:
            url = f"http://localhost:{PORT}"
            
            print("=" * 70)
            print("BHRTOA Report Server - RUNNING")
            print("=" * 70)
            print()
            print("URL:  " + url)
            print("File: " + REPORT_FILE)
            print()
            print("Controls:")
            print("  - Open browser: Press any key")
            print("  - Stop server: Press Ctrl+C")
            print()
            print("=" * 70)
            
            # Open browser after a short delay
            time.sleep(1)
            try:
                webbrowser.open(url)
            except:
                print("[INFO] Could not auto-open browser")
            
            # Serve
            httpd.serve_forever()
    
    except KeyboardInterrupt:
        print()
        print("=" * 70)
        print("SERVER STOPPED")
        print("=" * 70)
        sys.exit(0)
    except OSError as e:
        print()
        print("=" * 70)
        print("ERROR: Could not start server")
        print("=" * 70)
        print(f"Issue: {e}")
        print()
        if "Address already in use" in str(e):
            print("The port 8000 is already in use.")
            print("Try: Change PORT in launch_server.py or close other servers")
        print()
        print("=" * 70)
        sys.exit(1)

if __name__ == '__main__':
    main()
