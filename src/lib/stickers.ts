export interface Sticker {
  id: string;
  label: string;
  emoji?: string;
  source?: any; // require() result for local image stickers
}

export const STICKERS: Sticker[] = [
  { id: 'heart', emoji: '❤️', label: 'heart' },
  { id: 'orange-heart', emoji: '🧡', label: 'orange heart' },
  { id: 'yellow-heart', emoji: '💛', label: 'yellow heart' },
  { id: 'green-heart', emoji: '💚', label: 'green heart' },
  { id: 'blue-heart', emoji: '💙', label: 'blue heart' },
  { id: 'purple-heart', emoji: '💜', label: 'purple heart' },
  { id: 'star', emoji: '⭐', label: 'star' },
  { id: 'sparkles', emoji: '✨', label: 'sparkles' },
  { id: 'dizzy', emoji: '💫', label: 'dizzy' },
  { id: 'blossom', emoji: '🌸', label: 'blossom' },
  { id: 'sunflower', emoji: '🌻', label: 'sunflower' },
  { id: 'rose', emoji: '🌹', label: 'rose' },
  { id: 'tulip', emoji: '🌷', label: 'tulip' },
  { id: 'butterfly', emoji: '🦋', label: 'butterfly' },
  { id: 'rainbow', emoji: '🌈', label: 'rainbow' },
  { id: 'sun', emoji: '☀️', label: 'sun' },
  { id: 'moon', emoji: '🌙', label: 'moon' },
  { id: 'leaf', emoji: '🍃', label: 'leaf' },
  { id: 'ribbon', emoji: '🎀', label: 'ribbon' },
  { id: 'camera', emoji: '📷', label: 'camera' },
  { id: 'music', emoji: '🎵', label: 'music' },
  { id: 'gem', emoji: '💎', label: 'gem' },
  { id: 'fire', emoji: '🔥', label: 'fire' },
  { id: 'snowflake', emoji: '❄️', label: 'snowflake' },
  { id: 'four-leaf', emoji: '🍀', label: 'four-leaf' },
  { id: 'shooting-star', emoji: '🌠', label: 'shooting star' },
  { id: 'cloud', emoji: '☁️', label: 'cloud' },
  { id: 'lightning', emoji: '⚡', label: 'lightning' },
  { id: 'mushroom', emoji: '🍄', label: 'mushroom' },
  { id: 'feather', emoji: '🪶', label: 'feather' },
];

// Merge built-in emoji stickers with user's custom image stickers
import { USER_STICKERS } from './userStickers';
export const ALL_STICKERS: Sticker[] = [...STICKERS, ...USER_STICKERS];
