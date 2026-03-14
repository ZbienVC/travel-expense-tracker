#!/usr/bin/env node

/**
 * QR Code Generator for Travel Expense Tracker Deployment
 * Generates QR codes for Expo app links and backend URLs
 */

const fs = require('fs');
const path = require('path');

// Try to use qrcode package if available
let QRCode;
try {
    QRCode = require('qrcode');
} catch (e) {
    console.log('⚠️  qrcode package not found');
    console.log('Install with: npm install qrcode');
    process.exit(1);
}

const config = {
    backendUrl: process.argv[2] || 'https://travel-expense-tracker.up.railway.app',
    expoUrl: process.argv[3] || 'https://expo.dev/@zach/travel-expense-tracker',
    outputDir: path.join(__dirname, '..', 'deployment-qrcodes'),
};

// Create output directory
if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
}

console.log('🎯 Generating QR Codes for Travel Expense Tracker\n');
console.log('Configuration:');
console.log(`  Backend URL: ${config.backendUrl}`);
console.log(`  Expo URL: ${config.expoUrl}`);
console.log(`  Output: ${config.outputDir}\n`);

// Generate QR codes
const qrCodes = [
    {
        name: 'Backend API',
        url: config.backendUrl,
        file: 'backend-url-qr.png',
    },
    {
        name: 'Mobile App (Expo)',
        url: config.expoUrl,
        file: 'expo-app-qr.png',
    },
    {
        name: 'Backend Health Check',
        url: `${config.backendUrl}/health`,
        file: 'backend-health-qr.png',
    },
];

Promise.all(
    qrCodes.map(qr =>
        QRCode.toFile(path.join(config.outputDir, qr.file), qr.url, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000',
                light: '#FFF',
            },
        })
            .then(() => {
                console.log(`✓ Generated: ${qr.name}`);
                console.log(`  File: ${qr.file}`);
                console.log(`  URL: ${qr.url}\n`);
                return qr;
            })
            .catch(err => {
                console.error(`✗ Failed to generate ${qr.name}:`, err);
            })
    )
).then(results => {
    // Create HTML preview
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Travel Expense Tracker - QR Codes</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #7f8c8d;
            margin-bottom: 40px;
        }
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }
        .qr-card {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .qr-card h2 {
            color: #2c3e50;
            margin: 0 0 20px 0;
            font-size: 18px;
        }
        .qr-code {
            width: 300px;
            height: 300px;
            margin: 0 auto 20px;
            border: 2px solid #ecf0f1;
            border-radius: 4px;
            padding: 10px;
            background: white;
        }
        .url {
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #7f8c8d;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .button {
            display: inline-block;
            margin-top: 10px;
            padding: 8px 16px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
        }
        .button:hover {
            background: #2980b9;
        }
        .info-box {
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box h3 {
            margin-top: 0;
            color: #2c3e50;
        }
        .instructions {
            background: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .instructions h3 {
            color: #2c3e50;
            margin-top: 0;
        }
        .instructions ol {
            color: #34495e;
            line-height: 1.8;
        }
        .footer {
            text-align: center;
            color: #7f8c8d;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
        }
        .timestamp {
            font-size: 12px;
            color: #95a5a6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Travel Expense Tracker</h1>
        <p class="subtitle">Production Deployment QR Codes</p>

        <div class="info-box">
            <h3>📱 How to Use</h3>
            <ol>
                <li><strong>For Backend API:</strong> Use the "Backend API" QR code to access the API endpoint or test it</li>
                <li><strong>For Mobile App:</strong> Open Expo Go on your phone and scan the "Mobile App" QR code to install instantly</li>
                <li><strong>For Health Check:</strong> Use the "Backend Health" QR code to verify your backend is running</li>
            </ol>
        </div>

        <div class="qr-grid">
${qrCodes
    .map(
        qr => `
            <div class="qr-card">
                <h2>${qr.name}</h2>
                <img src="${qr.file}" alt="${qr.name}" class="qr-code">
                <div class="url">${qr.url}</div>
                <a href="${qr.url}" class="button" target="_blank">Open URL</a>
            </div>
`
    )
    .join('')}
        </div>

        <div class="instructions">
            <h3>📲 Testing Instructions</h3>
            <ol>
                <li><strong>Test Backend Health:</strong>
                    <ul>
                        <li>Scan "Backend Health" QR code</li>
                        <li>Should see: <code>{"status":"ok","timestamp":"..."}</code></li>
                    </ul>
                </li>
                <li><strong>Install Mobile App:</strong>
                    <ul>
                        <li>Install Expo Go app from App Store or Google Play</li>
                        <li>Scan "Mobile App" QR code</li>
                        <li>App loads instantly</li>
                    </ul>
                </li>
                <li><strong>Test Features:</strong>
                    <ul>
                        <li>Create a new trip</li>
                        <li>Add expenses</li>
                        <li>Test receipt scanning</li>
                        <li>View analytics dashboard</li>
                        <li>Track distances</li>
                    </ul>
                </li>
            </ol>
        </div>

        <div class="info-box" style="background: #f0f8f4; border-left-color: #27ae60;">
            <h3>✅ Deployment Status</h3>
            <p>Backend: <strong>${config.backendUrl}</strong></p>
            <p>Mobile App: <strong>${config.expoUrl}</strong></p>
            <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="footer">
            <p>Travel Expense Tracker v0.1.0</p>
            <p>Repository: <a href="https://github.com/ZbienVC/travel-expense-tracker">ZbienVC/travel-expense-tracker</a></p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(
        path.join(config.outputDir, 'index.html'),
        htmlContent
    );

    console.log('✅ QR Code generation complete!\n');
    console.log('📁 Output files:');
    console.log(`   Directory: ${config.outputDir}`);
    console.log('   - backend-url-qr.png');
    console.log('   - expo-app-qr.png');
    console.log('   - backend-health-qr.png');
    console.log('   - index.html (preview page)\n');

    console.log('🎯 Next Steps:');
    console.log(`   1. Open: ${path.join(config.outputDir, 'index.html')}`);
    console.log('   2. Scan QR codes on mobile device');
    console.log('   3. Test backend and app\n');

    console.log('🚀 Ready for testing!\n');
});
