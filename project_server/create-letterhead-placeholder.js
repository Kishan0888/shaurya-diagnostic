/**
 * Run: node create-letterhead-placeholder.js
 * Creates a sample letterhead PNG in assets/ for testing.
 * Replace assets/letterhead.png with your actual letterhead before production.
 */
require('dotenv').config();
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// This script requires the 'canvas' package: npm install canvas
// If canvas is not available, manually place your letterhead.png in server/assets/

const WIDTH = 1240; // ~A4 width at 150dpi
const HEIGHT = 230;

try {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Blue top bar
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, WIDTH, 8);

  // Left section: clinic name
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('SHAURYA DIAGNOSTIC CENTRE', 40, 80);

  ctx.fillStyle = '#374151';
  ctx.font = '22px Arial';
  ctx.fillText('Advanced Medical Laboratory & Diagnostic Services', 40, 115);

  ctx.fillStyle = '#6b7280';
  ctx.font = '18px Arial';
  ctx.fillText('📍 123, Medical Complex, Delhi – 110001', 40, 148);
  ctx.fillText('📞 +91 98765 43210  |  📧 info@shauryadiagnostic.com', 40, 175);
  ctx.fillText('🌐 www.shauryadiagnostic.com  |  NABL Accredited Lab', 40, 200);

  // Divider line
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 218);
  ctx.lineTo(WIDTH - 40, 218);
  ctx.stroke();

  // Blue bottom bar
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, HEIGHT - 8, WIDTH, 8);

  const outPath = path.join(__dirname, 'assets', 'letterhead.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log('✓ Placeholder letterhead created at assets/letterhead.png');
} catch (err) {
  console.error('canvas package not available. Please manually place letterhead.png in server/assets/');
  console.error('The letterhead should be an A4-width PNG (~1240px wide, ~230px tall)');
}
