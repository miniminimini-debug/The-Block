import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FriendRoom, AppEnvironment, TimeOfDay } from '@types/models';

interface NeighborhoodState {
  rooms: FriendRoom[];
  activeRoomId: string | null;
  environment: AppEnvironment;
  isLoaded: boolean;
  visitingRoomId: string | null;

  // Actions
  setRooms: (rooms: FriendRoom[]) => void;
  updateRoom: (friendId: string, patch: Partial<FriendRoom>) => void;
  setRoomNewPost: (friendId: string, hasNew: boolean) => void;
  setActiveRoom: (id: string | null) => void;
  setVisitingRoom: (id: string | null) => void;
  setEnvironment: (env: Partial<AppEnvironment>) => void;
  markRoomVisited: (friendId: string) => void;
}

function deriveTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'golden';
  return 'night';
}

function deriveSeason(): AppEnvironment['season'] {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export const useNeighborhoodStore = create<NeighborhoodState>()(
  immer((set) => ({
    rooms: [],
    activeRoomId: null,
    visitingRoomId: null,
    isLoaded: false,
    environment: {
      timeOfDay: deriveTimeOfDay(),
      season: deriveSeason(),
      isRaining: false,
    },

    setRooms: (rooms) =>
      set((state) => {
        state.rooms = rooms;
        state.isLoaded = true;
      }),

    updateRoom: (friendId, patch) =>
      set((state) => {
        const idx = state.rooms.findIndex((r) => r.friendId === friendId);
        if (idx !== -1) Object.assign(state.rooms[idx], patch);
      }),

    setRoomNewPost: (friendId, hasNew) =>
      set((state) => {
        const room = state.rooms.find((r) => r.friendId === friendId);
        if (room) room.hasNewPost = hasNew;
      }),

    setActiveRoom: (id) =>
      set((state) => {
        state.activeRoomId = id;
      }),

    setVisitingRoom: (id) =>
      set((state) => {
        state.visitingRoomId = id;
      }),

    setEnvironment: (env) =>
      set((state) => {
        Object.assign(state.environment, env);
      }),

    markRoomVisited: (friendId) =>
      set((state) => {
        const room = state.rooms.find((r) => r.friendId === friendId);
        if (room) {
          room.isVisited = true;
          room.hasNewPost = false;
        }
      }),
  }))
);
