/**
 * Game State Hook
 * 
 * Zustand store for managing global game state.
 * Handles game data, WebSocket updates, and UI state.
 */

'use client';

import { create } from 'zustand';
import type { Game, TurnResult, WebSocketMessage } from '@/lib/types';
import { WS_EVENTS } from '@/lib/constants';

/**
 * Game state interface.
 */
interface GameState {
  // Game data
  game: Game | null;
  currentPlayerId: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isRolling: boolean;
  lastTurnResult: TurnResult | null;
  
  // WebSocket state
  isWsConnected: boolean;
  
  // Actions
  setGame: (game: Game | null) => void;
  setCurrentPlayerId: (playerId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsRolling: (rolling: boolean) => void;
  setLastTurnResult: (result: TurnResult | null) => void;
  setWsConnected: (connected: boolean) => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  reset: () => void;
}

/**
 * Initial state.
 */
const initialState = {
  game: null,
  currentPlayerId: null,
  isLoading: false,
  error: null,
  isRolling: false,
  lastTurnResult: null,
  isWsConnected: false,
};

/**
 * Zustand store for game state.
 */
export const useGameState = create<GameState>((set, get) => ({
  ...initialState,

  /**
   * Set the game state.
   */
  setGame: (game) => set({ game, error: null }),

  /**
   * Set the current player ID (this client's player).
   */
  setCurrentPlayerId: (playerId) => set({ currentPlayerId: playerId }),

  /**
   * Set loading state.
   */
  setLoading: (loading) => set({ isLoading: loading }),

  /**
   * Set error message.
   */
  setError: (error) => set({ error }),

  /**
   * Set dice rolling animation state.
   */
  setIsRolling: (rolling) => set({ isRolling: rolling }),

  /**
   * Set last turn result.
   */
  setLastTurnResult: (result) => set({ lastTurnResult: result }),

  /**
   * Set WebSocket connection state.
   */
  setWsConnected: (connected) => set({ isWsConnected: connected }),

  /**
   * Handle incoming WebSocket messages.
   * Updates game state based on event type.
   */
  handleWebSocketMessage: (message) => {
    const { event, data } = message;

    switch (event) {
      case WS_EVENTS.CONNECTED:
        set({ isWsConnected: true });
        break;

      case WS_EVENTS.GAME_UPDATED:
        if (data) {
          set({ game: data });
        }
        break;

      case WS_EVENTS.PLAYER_JOINED:
        // Refresh game state
        if (data?.game) {
          set({ game: data.game });
        }
        break;

      case WS_EVENTS.TURN_ENDED:
        // Update game state after turn
        if (data?.gameState) {
          set({ 
            game: data.gameState,
            isRolling: false,
          });
        }
        break;

      case WS_EVENTS.DICE_ROLLED:
        // Could trigger dice animation
        console.log('Dice rolled:', data);
        break;

      case WS_EVENTS.PLAYER_MOVED:
        // Player position updated
        console.log('Player moved:', data);
        break;

      case WS_EVENTS.PROPERTY_PURCHASED:
        // Property ownership changed
        console.log('Property purchased:', data);
        break;

      case WS_EVENTS.RENT_PAID:
        // Rent transaction occurred
        console.log('Rent paid:', data);
        break;

      default:
        console.log('Unhandled WebSocket event:', event);
    }
  },

  /**
   * Reset state to initial values.
   */
  reset: () => set(initialState),
}));

/**
 * Computed selectors for derived state.
 */
export const useIsMyTurn = () => {
  const game = useGameState((state) => state.game);
  const currentPlayerId = useGameState((state) => state.currentPlayerId);
  
  if (!game || !currentPlayerId) return false;
  
  const currentPlayer = game.players[game.currentPlayerIndex];
  return currentPlayer?.id === currentPlayerId;
};

export const useCurrentPlayer = () => {
  const game = useGameState((state) => state.game);
  
  if (!game) return null;
  
  return game.players[game.currentPlayerIndex];
};

export const useMyPlayer = () => {
  const game = useGameState((state) => state.game);
  const currentPlayerId = useGameState((state) => state.currentPlayerId);
  
  if (!game || !currentPlayerId) return null;
  
  return game.players.find((p) => p.id === currentPlayerId) || null;
};

