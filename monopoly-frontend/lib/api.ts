/**
 * API Client
 * 
 * Functions for communicating with the Symfony backend REST API.
 * All API calls return typed responses with error handling.
 */

import { API_BASE_URL } from './constants';
import type {
  ApiResponse,
  Game,
  GameSummary,
  JoinGameRequest,
  TurnResult,
} from './types';

/**
 * Base fetch wrapper with error handling.
 * 
 * @param endpoint - API endpoint (relative to base URL)
 * @param options - Fetch options
 * @returns API response
 */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Parse JSON response
    const data = await response.json();

    // Return data (backend already provides success/error structure)
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Create a new game.
 * 
 * POST /api/games
 * 
 * @returns New game state
 */
export async function createGame(): Promise<ApiResponse<Game>> {
  return apiFetch<Game>('/api/games', {
    method: 'POST',
  });
}

/**
 * Get game state by ID.
 * 
 * GET /api/games/{id}
 * 
 * @param gameId - Game identifier
 * @returns Game state
 */
export async function getGame(gameId: string): Promise<ApiResponse<Game>> {
  return apiFetch<Game>(`/api/games/${gameId}`);
}

/**
 * Join a game as a new player.
 * 
 * POST /api/games/{id}/players
 * 
 * @param gameId - Game identifier
 * @param request - Player join request
 * @returns Updated game state with new player
 */
export async function joinGame(
  gameId: string,
  request: JoinGameRequest
): Promise<ApiResponse<{ player: any; game: Game }>> {
  return apiFetch<{ player: any; game: Game }>(`/api/games/${gameId}/players`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Execute a turn (roll dice and move).
 * 
 * POST /api/games/{id}/roll
 * 
 * @param gameId - Game identifier
 * @returns Turn result with updated game state
 */
export async function rollDice(gameId: string): Promise<ApiResponse<TurnResult>> {
  return apiFetch<TurnResult>(`/api/games/${gameId}/roll`, {
    method: 'POST',
  });
}

/**
 * Get board state.
 * 
 * GET /api/games/{id}/board
 * 
 * @param gameId - Game identifier
 * @returns Board tiles
 */
export async function getBoard(gameId: string): Promise<ApiResponse<{ tiles: any[] }>> {
  return apiFetch<{ tiles: any[] }>(`/api/games/${gameId}/board`);
}

/**
 * Delete a game.
 * 
 * DELETE /api/games/{id}
 * 
 * @param gameId - Game identifier
 * @returns Success message
 */
export async function deleteGame(gameId: string): Promise<ApiResponse> {
  return apiFetch(`/api/games/${gameId}`, {
    method: 'DELETE',
  });
}

/**
 * List all games.
 * 
 * GET /api/games
 * 
 * @returns List of game summaries
 */
export async function listGames(): Promise<ApiResponse<{ games: GameSummary[]; total: number }>> {
  return apiFetch<{ games: GameSummary[]; total: number }>('/api/games');
}

