import type { Tables, MoodType, RoomType } from './database';

export type User = Tables<'users'>;
export type Post = Tables<'posts'>;
export type Friendship = Tables<'friendships'>;

export interface FriendRoom {
  friendId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  roomType: RoomType;
  roomTheme: RoomTheme;
  currentMood: MoodType | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  latestPostAt: string | null;
  hasNewPost: boolean;
  friendshipLevel: number;
  // Client-side positioning for neighborhood map
  position?: { x: number; y: number };
  isVisited?: boolean;
}

export interface RoomTheme {
  wallColor: string;
  floorColor: string;
  accentColor: string;
  lightingMode: 'day' | 'night' | 'golden' | 'rainy';
  furnitureItems: FurnitureItem[];
  customization?: Record<string, unknown>;
}

export interface FurnitureItem {
  id: string;
  type: string;
  position: { x: number; y: number };
  variant: string;
}

export interface DailyPrompt {
  id: string;
  text: string;
  category: string;
  moodTags: MoodType[];
}

export interface WeatherContext {
  condition: string;
  temperatureC: number;
  description: string;
}

export interface AuthSession {
  userId: string;
  phone: string;
  accessToken: string;
  refreshToken: string;
}

export interface FriendSummary {
  id: string;
  friendId: string;
  username: string;
  displayName: string | null;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  currentMood: string | null;
  friendshipLevel: number;
  streakDays: number;
  lastInteractionAt: string | null;
}

export interface FriendRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarEmoji: string | null;
  createdAt: string;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'golden' | 'night';

export interface AppEnvironment {
  timeOfDay: TimeOfDay;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  isRaining: boolean;
}

// ─── Disposable Camera Rolls ──────────────────────────────────────────────────

export type RollStatus = 'active' | 'developing' | 'developed';

export interface Roll {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  coverEmoji: string;
  maxShots: number;
  shotsTaken: number;
  status: RollStatus;
  developedAt: string | null;
  isRevealed: boolean;
  createdAt: string;
  // joined via query
  members?: RollMember[];
  shots?: RollShot[];
}

export interface RollMember {
  id: string;
  rollId: string;
  userId: string;
  joinedAt: string;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

export interface RollShot {
  id: string;
  rollId: string;
  photographerId: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  storagePath: string;
  note: string | null;
  shotNumber: number;
  takenAt: string;
  photographer?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Time Capsules ────────────────────────────────────────────────────────────

export type CapsuleUnlockType = 'date' | 'milestone';

export interface Capsule {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  coverEmoji: string;
  unlockType: CapsuleUnlockType;
  unlockAt: string | null;
  milestoneLabel: string | null;
  isOpened: boolean;
  openedAt: string | null;
  createdAt: string;
  // joined via query
  members?: CapsuleMember[];
  submissions?: CapsuleSubmission[];
  memberCount?: number;
  submissionCount?: number;
}

export interface CapsuleMember {
  id: string;
  capsuleId: string;
  userId: string;
  hasSubmitted: boolean;
  joinedAt: string;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

export interface CapsuleSubmission {
  id: string;
  capsuleId: string;
  userId: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  storagePath: string | null;
  note: string | null;
  submittedAt: string;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Camera Pass ──────────────────────────────────────────────────────────────

export interface CameraPass {
  id: string;
  creatorId: string;
  title: string | null;
  isComplete: boolean;
  currentHolderId: string | null;
  timeLimitHours: number | null;
  createdAt: string;
  // joined via query
  participants?: PassParticipant[];
  shots?: PassShot[];
}

export interface PassParticipant {
  id: string;
  passId: string;
  userId: string;
  orderIndex: number;
  completed: boolean;
  completedAt: string | null;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

export interface PassShot {
  id: string;
  passId: string;
  photographerId: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  storagePath: string;
  note: string | null;
  orderIndex: number;
  takenAt: string;
  photographer?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Desk Drops ───────────────────────────────────────────────────────────────

export interface DeskDrop {
  id: string;
  senderId: string;
  recipientId: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  storagePath: string | null;
  note: string | null;
  isDiscovered: boolean;
  discoveredAt: string | null;
  createdAt: string;
  sender?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Camera Modes ─────────────────────────────────────────────────────────────

export type CameraMode = 'normal' | 'oneshot' | 'booth';

// ─── Cork Boards ──────────────────────────────────────────────────────────────

export type CorkBoardItemType = 'photo' | 'note' | 'sticker';

export interface CorkBoard {
  id: string;
  creatorId: string;
  title: string;
  coverEmoji: string;
  createdAt: string;
  members?: CorkBoardMember[];
  items?: CorkBoardItem[];
}

export interface CorkBoardMember {
  id: string;
  boardId: string;
  userId: string;
  joinedAt: string;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

export interface CorkBoardItem {
  id: string;
  boardId: string;
  creatorId: string;
  type: CorkBoardItemType;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  storagePath: string | null;
  noteText: string | null;
  stickerId?: string;
  color: string;
  posX: number;
  posY: number;
  rotation: number;
  zIndex: number;
  createdAt: string;
  creator?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Friendship Boards ────────────────────────────────────────────────────────

export interface FriendshipBoard {
  id: string;
  title: string | null;
  coverEmoji: string;
  createdAt: string;
  members?: FriendshipBoardMember[];
}

export interface FriendshipBoardMember {
  id: string;
  boardId: string;
  userId: string;
  joinedAt: string;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Polaroid Scrapbooks ──────────────────────────────────────────────────────

export interface Scrapbook {
  id: string;
  creatorId: string;
  title: string;
  coverEmoji: string;
  description: string | null;
  isFinished: boolean;
  createdAt: string;
  members?: ScrapbookMember[];
  pages?: ScrapbookPage[];
  pageCount?: number;
}

export interface ScrapbookMember {
  id: string;
  scrapbookId: string;
  userId: string;
  joinedAt: string;
  user?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

export interface ScrapbookPage {
  id: string;
  scrapbookId: string;
  pageNumber: number;
  layout: 'single' | 'grid' | 'collage';
  title: string | null;
  createdAt: string;
  items?: ScrapbookItem[];
}

export interface ScrapbookItem {
  id: string;
  pageId: string;
  scrapbookId: string;
  creatorId: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  storagePath: string | null;
  note: string | null;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
  orderIndex: number;
  createdAt: string;
  // Extended client-side item types
  itemType?: 'photo' | 'text' | 'sticker';
  textContent?: string;
  fontColor?: string;
  stickerId?: string;
  slotIndex?: number; // for photos: which slot (0-3) in the 2x2 grid
  creator?: { username: string; display_name: string | null; avatar_emoji: string | null };
}

// ─── Seasonal Memory Drops ────────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalRecap {
  id: string;
  userId: string;
  season: Season;
  year: number;
  label: string;
  photoUrls: string[];
  participantIds: string[];
  isOpened: boolean;
  openedAt: string | null;
  createdAt: string;
  participants?: { username: string; display_name: string | null; avatar_emoji: string | null }[];
}
