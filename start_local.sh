#!/bin/bash

echo "===================================================================="
echo "🍽️  Restaurant Business Intelligence - Setup and Launch"
echo "===================================================================="
echo

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    echo "   Please install Python 3.7+ from https://python.org"
    echo "   Or use your package manager:"
    echo "   • Ubuntu/Debian: sudo apt install python3"
    echo "   • macOS: brew install python3"
    echo "   • CentOS/RHEL: sudo yum install python3"
    exit 1
fi

echo "✅ Python detected"
python3 --version
echo

if [ ! -d "web_app" ]; then
    echo "❌ web_app directory not found!"
    echo "   Please run this script from the restaurant-bi project root directory"
    exit 1
fi

if [ ! -f "web_app/index.html" ]; then
    echo "❌ web_app/index.html not found!"
    echo "   Please ensure the project files are properly set up"
    exit 1
fi

echo "✅ Project structure verified"
echo

echo "📊 Checking data availability..."
if [ -d "web_app/data" ]; then
    data_files=$(find web_app/data -name "*.json" | wc -l)
    if [ $data_files -gt 0 ]; then
        echo "✅ Found $data_files data files"
    else
        echo "⚠️  No JSON data files found in web_app/data/"
        echo "   The platform will still work but with limited functionality"
    fi
else
    echo "⚠️  web_app/data directory not found"
    echo "   The platform will still work but with limited functionality"
fi
echo

echo "🌐 Starting development server..."
echo
echo "🎯 The dashboard will be available at:"
echo "   📍 Local:    http://localhost:8000"
echo "   📍 Direct:   http://localhost:8000/index.html"
echo
echo "⌨️  Press Ctrl+C to stop the server when done"
echo "🔄 Server starting..."
echo

cd web_app

if python3 -m http.server --help >/dev/null 2>&1; then
    echo "🚀 Starting HTTP server on port 8000..."
    python3 -m http.server 8000
elif python3 -c "import http.server" >/dev/null 2>&1; then
    echo "🚀 Starting HTTP server on port 8000..."
    python3 -c "
import http.server
import socketserver
import os

PORT = 8000
os.chdir('.')

Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Server running at http://localhost:{PORT}/')
    print('Press Ctrl+C to stop...')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServer stopped.')
"
else
    echo "❌ Unable to start HTTP server"
    echo "   Please check your Python installation"
    exit 1
fi

cd ..

echo
echo "   💡 Tip: You can also use npm commands:"
echo "      npm run serve-local  (for development)"
echo "      npm run serve-docs   (for GitHub Pages testing)"
