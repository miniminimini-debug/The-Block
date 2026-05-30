import type { Sticker } from './stickers';

// ─── How to add your own stickers ────────────────────────────────────────────
//
// 1. Drop your PNG or JPG file into: assets/stickers/
//    e.g.  assets/stickers/washi-tape.png
//          assets/stickers/star-doodle.png
//
// 2. Add an entry below:
//    { id: 'washi-tape', label: 'washi tape', source: require('../../assets/stickers/washi-tape.png') },
//
// The sticker will appear at the END of the picker grid.
// ─────────────────────────────────────────────────────────────────────────────

export const USER_STICKERS: Sticker[] = [
  // Add your custom stickers here ↓
  // { id: 'example', label: 'example', source: require('../../assets/stickers/example.png') },
];
