/**
 * Game Constants
 * 
 * Shared constants for the Monopoly game.
 */

import type { PlayerToken } from './types';

/**
 * API configuration.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

/**
 * Game configuration.
 */
export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  STARTING_BALANCE: 1500,
  GO_PASS_BONUS: 200,
  GO_LAND_BONUS: 400,
  BOARD_SIZE: 40,
} as const;

/**
 * Player tokens with display metadata.
 */
export const PLAYER_TOKENS: Array<{
  value: PlayerToken;
  label: string;
  emoji: string;
}> = [
  { value: 'boot', label: 'Boot', emoji: '👢' },
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'ship', label: 'Ship', emoji: '🚢' },
  { value: 'thimble', label: 'Thimble', emoji: '🪡' },
  { value: 'hat', label: 'Hat', emoji: '🎩' },
  { value: 'dog', label: 'Dog', emoji: '🐕' },
  { value: 'wheelbarrow', label: 'Wheelbarrow', emoji: '🛒' },
  { value: 'iron', label: 'Iron', emoji: '🔨' },
];

/**
 * Property color definitions for UI.
 */
export const PROPERTY_COLORS: Record<string, string> = {
  brown: '#8B4513',
  light_blue: '#87CEEB',
  pink: '#FF69B4',
  orange: '#FFA500',
  red: '#FF0000',
  yellow: '#FFFF00',
  green: '#008000',
  dark_blue: '#00008B',
};

/**
 * Tile type display names.
 */
export const TILE_TYPE_LABELS: Record<string, string> = {
  go: 'Go',
  property: 'Property',
  railroad: 'Railroad',
  utility: 'Utility',
  tax: 'Tax',
  jail: 'Jail',
  free_parking: 'Free Parking',
  go_to_jail: 'Go To Jail',
};

/**
 * WebSocket events.
 */
export const WS_EVENTS = {
  CONNECTED: 'connected',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  GAME_UPDATED: 'game:updated',
  PLAYER_JOINED: 'player:joined',
  TURN_STARTED: 'turn:started',
  DICE_ROLLED: 'dice:rolled',
  PLAYER_MOVED: 'player:moved',
  PROPERTY_PURCHASED: 'property:purchased',
  RENT_PAID: 'rent:paid',
  TURN_ENDED: 'turn:ended',
} as const;

/**
 * Animation durations (milliseconds).
 */
export const ANIMATIONS = {
  DICE_ROLL: 600,
  TOKEN_MOVE: 400,
  BALANCE_UPDATE: 300,
  PAGE_TRANSITION: 200,
  TOAST_DURATION: 3000,
} as const;

