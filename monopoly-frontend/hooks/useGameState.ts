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
   * CRITICAL: This should only be set once and never be null after initial set!
   */
  setCurrentPlayerId: (playerId) => {
    const currentId = get().currentPlayerId;
    
    // Log all changes
    console.log('🔑 setCurrentPlayerId called:', { 
      from: currentId, 
      to: playerId,
      stack: new Error().stack?.split('\n')[2] // Show where it's called from
    });
    
    // SAFETY: Don't allow clearing if already set (protect from accidental resets)
    if (currentId && !playerId) {
      console.warn('⚠️ Attempted to clear currentPlayerId - BLOCKED for safety!');
      return;
    }
    
    set({ currentPlayerId: playerId });
  },

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
    
    console.log('📨 WebSocket event received:', event, data);

    switch (event) {
      case WS_EVENTS.CONNECTED:
        set({ isWsConnected: true });
        console.log('✅ WebSocket connected');
        break;

      case WS_EVENTS.GAME_UPDATED:
      case WS_EVENTS.PLAYER_JOINED:
      case WS_EVENTS.TURN_ENDED:
        // All these events should update the full game state
        if (data?.game || data?.gameState || data) {
          const gameData = data.game || data.gameState || data;
          console.log('🔄 Updating game state from WebSocket:', gameData);
          set({ 
            game: gameData,
            isRolling: false,
          });
        }
        break;

      case WS_EVENTS.DICE_ROLLED:
        console.log('🎲 Dice rolled:', data);
        // Could trigger dice animation in future
        break;

      case WS_EVENTS.PLAYER_MOVED:
        console.log('👟 Player moved:', data);
        // Game state will be updated via TURN_ENDED
        break;

      case WS_EVENTS.PROPERTY_PURCHASED:
        console.log('🏠 Property purchased:', data);
        break;

      case WS_EVENTS.RENT_PAID:
        console.log('💰 Rent paid:', data);
        break;

      case 'subscribed':
        console.log('✅ Subscribed to game:', data);
        break;

      case 'pong':
        // Ping response, connection alive
        break;

      default:
        console.log('❓ Unhandled WebSocket event:', event, data);
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
  
  if (!game || !currentPlayerId) {
    console.log('❌ useIsMyTurn: Missing data', { game: !!game, currentPlayerId });
    return false;
  }
  
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentPlayerId;
  
  console.log('🎯 useIsMyTurn check:', {
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayerInGame: currentPlayer?.name,
    currentPlayerInGameId: currentPlayer?.id,
    myPlayerId: currentPlayerId,
    isMyTurn,
  });
  
  return isMyTurn;
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

