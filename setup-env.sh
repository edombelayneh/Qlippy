#!/bin/bash

echo "🔧 Qlippy Environment Setup"
echo "=========================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔑 Picovoice Access Key Setup"
echo "=============================="
echo ""

# Check if access key is configured
if grep -q "YOUR_ACCESS_KEY_HERE" .env; then
    echo "❌ Access key not configured"
    echo ""
    echo "To get a free access key:"
    echo "1. Go to https://console.picovoice.ai/"
    echo "2. Create an account or log in"
    echo "3. Get your free access key"
    echo "4. Edit the .env file and replace YOUR_ACCESS_KEY_HERE with your key"
    echo ""
    echo "Or run this command to open the .env file:"
    echo "   open .env"
else
    echo "✅ Access key is configured"
fi

echo ""
echo "🚀 You can now run the app with:"
echo "   npm run dev    # For web development"
echo "   npm run electron  # For desktop app with voice features" 