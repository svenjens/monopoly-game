/**
 * Type Definitions for Monopoly Game
 * 
 * These types mirror the PHP backend entities and API responses.
 */

/**
 * Game status enumeration.
 */
export type GameStatus = 'waiting' | 'in_progress' | 'finished';

/**
 * Player token types.
 */
export type PlayerToken = 'boot' | 'car' | 'ship' | 'thimble' | 'hat' | 'dog' | 'wheelbarrow' | 'iron';

/**
 * Tile types on the board.
 */
export type TileType = 'go' | 'property' | 'railroad' | 'utility' | 'tax' | 'jail' | 'free_parking' | 'go_to_jail';

/**
 * Property color groups.
 */
export type PropertyColor = 'brown' | 'light_blue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'dark_blue';

/**
 * Player interface.
 */
export interface Player {
  id: string;
  name: string;
  balance: number;
  position: number;
  token: PlayerToken;
  propertyCount: number;
  railroadCount: number;
  utilityCount: number;
  isActive: boolean;
  inJail: boolean;
  jailTurns: number;
  properties?: Tile[]; // Array of owned properties
}

/**
 * Tile interface (base).
 */
export interface Tile {
  position: number;
  name: string;
  type: TileType;
  price?: number;
  rent?: number;
  color?: PropertyColor;
  owner?: string | null; // Owner ID
  houses?: number; // Number of houses (0-4) or 5 for hotel
  buildCost?: number; // Cost to build a house
}

/**
 * Bank state.
 */
export interface Bank {
  balance: number;
}

/**
 * Side pot state.
 */
export interface SidePot {
  balance: number;
}

/**
 * Complete game state.
 */
export interface Game {
  id: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  board: Tile[];
  bank: Bank;
  sidePot: SidePot;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Dice roll result.
 */
export interface DiceResult {
  dice1: number;
  dice2: number;
  total: number;
}

/**
 * Player movement result.
 */
export interface MovementResult {
  oldPosition: number;
  newPosition: number;
  spaces: number;
  passedGo: boolean;
}

/**
 * Tile interaction result.
 */
export interface TileInteraction {
  action: string;
  amount: number;
  beneficiary?: string;
  property?: string;
  message: string;
  [key: string]: any; // Additional fields
}

/**
 * Turn execution result.
 */
export interface TurnResult {
  player: {
    id: string;
    name: string;
    balance: number;
    position: number;
  };
  dice?: DiceResult;
  movement?: MovementResult;
  tileInteraction?: TileInteraction;
  jail?: {
    released: boolean;
    message: string;
    jailTurns?: number;
  };
  bankruptcy?: {
    isBankrupt: boolean;
    message: string;
  };
  gameFinished?: boolean;
  nextPlayer: {
    id: string;
    name: string;
  };
  gameState: Game;
}

/**
 * API response wrapper.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * WebSocket message interface.
 */
export interface WebSocketMessage {
  event: string;
  gameId?: string;
  data?: any;
  timestamp?: number;
  message?: string;
  error?: string;
}

/**
 * Create game request.
 */
export interface CreateGameRequest {
  // Currently no body needed
}

/**
 * Join game request.
 */
export interface JoinGameRequest {
  name: string;
  token: PlayerToken;
}

/**
 * Game summary for list view.
 */
export interface GameSummary {
  id: string;
  status: GameStatus;
  playerCount: number;
  createdAt: string;
}

