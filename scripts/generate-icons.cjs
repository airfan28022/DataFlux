const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  // RGBA pixels
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.48 : 0.44);
  const innerRadius = width * (isMaskable ? 0.35 : 0.38);

  // Background color: Emerald #059669 -> [5, 150, 105, 255]
  // Accent gradient: Teal #0d9488 -> [13, 148, 136, 255]
  // Cap/Book icon: White [255, 255, 255, 255] and Gold [251, 191, 36, 255]

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 5, g = 150, b = 105, a = 255; // default emerald bg

      if (isMaskable) {
        // Full bleed background with subtle gradient
        const t = (x + y) / (width + height);
        r = Math.round(5 * (1 - t) + 13 * t);
        g = Math.round(150 * (1 - t) + 148 * t);
        b = Math.round(105 * (1 - t) + 136 * t);
        a = 255;
      } else {
        // Rounded squircle badge
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        const roundRadius = width * 0.22;
        const cornerX = Math.max(0, Math.abs(dx) - (cx - roundRadius));
        const cornerY = Math.max(0, Math.abs(dy) - (cy - roundRadius));
        const cornerEdge = Math.sqrt(cornerX * cornerX + cornerY * cornerY);

        if (cornerEdge > roundRadius) {
          a = 0; // transparent outside rounded squircle
        } else {
          const t = (x + y) / (width + height);
          r = Math.round(5 * (1 - t) + 15 * t);
          g = Math.round(150 * (1 - t) + 118 * t);
          b = Math.round(105 * (1 - t) + 110 * t);
          a = 255;
        }
      }

      if (a > 0) {
        // Draw Graduation Cap / Teacher School Icon in the center (scale ~ 0.5 of width)
        const scale = width / 512;
        const iconY = y - cy;
        const iconX = x - cx;

        // Cap diamond top: |iconX| / 140 + |iconY + 30| / 70 <= 1
        const diamondTop = Math.abs(iconX) / (130 * scale) + Math.abs(iconY + 25 * scale) / (55 * scale);
        // Cap base band:
        const bandDistX = Math.abs(iconX);
        const inBand = bandDistX <= (75 * scale) && (iconY >= 20 * scale && iconY <= 65 * scale);

        // Open book pages at bottom
        const inBook = Math.abs(iconY - 80 * scale) < (25 * scale) && Math.abs(iconX) < (100 * scale) && (Math.abs(iconX) > 8 * scale);

        if (diamondTop <= 1.0) {
          // White cap top
          r = 255; g = 255; b = 255;
        } else if (inBand) {
          // Cap band
          r = 240; g = 253; b = 250;
        } else if (inBook) {
          // Open book / school emblem
          r = 254; g = 240; b = 138; // soft gold
        }

        // Tassel
        if (iconX >= 90 * scale && iconX <= 110 * scale && iconY >= -20 * scale && iconY <= 40 * scale) {
          r = 251; g = 191; b = 36; // amber gold
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk: 13 bytes (width: 4, height: 4, bit depth: 1, color type: 6 (RGBA), comp: 0, filter: 0, interlace: 0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // non-interlaced
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk (compressed rawData)
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// 1. pwa-192x192.png
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));

// 2. pwa-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));

// 3. pwa-maskable-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

// 5. favicon.ico / icon (48x48)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(48, 48, false));

console.log('Successfully generated all PWA icons in public/ directory!');
