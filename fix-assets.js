const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([tb, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([len, tb, data, crcBuf]);
}

function makePNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < width; x++) raw.push(r, g, b);
  }
  const compressed = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const dir = path.join(__dirname, 'assets');

console.log('Creating icon.png (512x512)...');
fs.writeFileSync(path.join(dir, 'icon.png'), makePNG(512, 512, 107, 82, 224));

console.log('Creating adaptive-icon.png (512x512)...');
fs.writeFileSync(path.join(dir, 'adaptive-icon.png'), makePNG(512, 512, 13, 13, 20));

console.log('Creating favicon.png (48x48)...');
fs.writeFileSync(path.join(dir, 'favicon.png'), makePNG(48, 48, 107, 82, 224));

console.log('Creating splash.png (640x1136)...');
fs.writeFileSync(path.join(dir, 'splash.png'), makePNG(640, 1136, 13, 13, 20));

console.log('Creating notification-icon.png (96x96)...');
fs.writeFileSync(path.join(dir, 'notification-icon.png'), makePNG(96, 96, 155, 143, 255));

console.log('Done! All PNG assets are now valid.');
