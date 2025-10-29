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
 * Default timeout for API requests (in milliseconds).
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Fetch with timeout support.
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds
 * @returns Response
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - server niet bereikbaar');
    }
    throw error;
  }
}

/**
 * Get user-friendly error message based on HTTP status.
 * 
 * @param status - HTTP status code
 * @returns User-friendly error message
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Ongeldige aanvraag';
    case 404:
      return 'Spel niet gevonden';
    case 409:
      return 'Conflict - actie niet mogelijk';
    case 422:
      return 'Validatie fout';
    case 500:
      return 'Server fout';
    case 503:
      return 'Service tijdelijk niet beschikbaar';
    default:
      return `Onverwachte fout (${status})`;
  }
}

/**
 * Base fetch wrapper with error handling, timeout, and retries.
 * 
 * @param endpoint - API endpoint (relative to base URL)
 * @param options - Fetch options
 * @param retries - Number of retry attempts for network errors
 * @returns API response
 */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 0
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle non-JSON responses (e.g., HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Non-JSON response:', response.status, response.statusText);
      return {
        success: false,
        error: getErrorMessage(response.status),
      };
    }

    // Parse JSON response
    const data = await response.json();

    // If response is not ok, but we got JSON, use that error
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || getErrorMessage(response.status),
      };
    }

    // Return data (backend provides success/error structure)
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // Retry on network errors
    if (retries > 0 && error instanceof Error) {
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      return apiFetch<T>(endpoint, options, retries - 1);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Netwerk fout - controleer je verbinding',
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
  }, 2); // Retry twice on network errors
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
  return apiFetch<Game>(`/api/games/${gameId}`, {}, 3); // Retry 3 times for critical read operation
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
 * Start a game (change status from waiting to in_progress).
 * 
 * POST /api/games/{id}/start
 * 
 * @param gameId - Game identifier
 * @returns Updated game state
 */
export async function startGame(gameId: string): Promise<ApiResponse<Game>> {
  return apiFetch<Game>(`/api/games/${gameId}/start`, {
    method: 'POST',
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
 * End a game (set status to finished).
 * 
 * POST /api/games/{id}/end
 * 
 * @param gameId - Game identifier
 * @returns Updated game state
 */
export async function endGame(gameId: string): Promise<ApiResponse<Game>> {
  return apiFetch<Game>(`/api/games/${gameId}/end`, {
    method: 'POST',
  });
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

/**
 * Purchase a property.
 * 
 * POST /api/games/{id}/purchase
 * 
 * @param gameId - Game identifier
 * @returns Purchase result with updated game state
 */
export async function purchaseProperty(gameId: string): Promise<ApiResponse<{ purchase: any; gameState: Game }>> {
  return apiFetch<{ purchase: any; gameState: Game }>(`/api/games/${gameId}/purchase`, {
    method: 'POST',
  });
}

/**
 * Pay €50 to get out of jail.
 * 
 * POST /api/games/{id}/pay-jail
 * 
 * @param gameId - Game identifier
 * @returns Jail result with updated game state
 */
export async function payJailFee(gameId: string): Promise<ApiResponse<{ jail: any; gameState: Game }>> {
  return apiFetch<{ jail: any; gameState: Game }>(`/api/games/${gameId}/pay-jail`, {
    method: 'POST',
  });
}

