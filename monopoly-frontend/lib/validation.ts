/**
 * Validation & Security Utilities
 * 
 * Input validation, sanitization, and security helpers.
 */

/**
 * Validation patterns for common inputs.
 */
export const ValidationPatterns = {
  // Player name: 2-20 characters, letters, numbers, spaces, hyphens
  playerName: /^[a-zA-Z0-9\s\-]{2,20}$/,
  
  // Game ID: UUID format
  gameId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // Token: Only allow specific tokens
  token: /^(car|dog|ship|hat|shoe|thimble|cat|penguin)$/,
};

/**
 * Validation error messages (Dutch).
 */
export const ValidationMessages = {
  playerName: {
    required: 'Naam is verplicht',
    invalid: 'Naam moet 2-20 tekens zijn (alleen letters, cijfers, spaties en -)',
    tooShort: 'Naam moet minimaal 2 tekens zijn',
    tooLong: 'Naam mag maximaal 20 tekens zijn',
  },
  gameId: {
    required: 'Game ID is verplicht',
    invalid: 'Ongeldig Game ID formaat',
  },
  token: {
    required: 'Kies een token',
    invalid: 'Ongeldige token geselecteerd',
  },
};

/**
 * Sanitize string input to prevent XSS attacks.
 * Removes HTML tags and encodes special characters.
 * 
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Encode special characters
    .replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return entities[char] || char;
    })
    // Trim whitespace
    .trim();
}

/**
 * Validate player name.
 * 
 * @param name - Player name
 * @returns Validation result
 */
export function validatePlayerName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: ValidationMessages.playerName.required };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: ValidationMessages.playerName.tooShort };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: ValidationMessages.playerName.tooLong };
  }
  
  if (!ValidationPatterns.playerName.test(trimmed)) {
    return { valid: false, error: ValidationMessages.playerName.invalid };
  }
  
  return { valid: true };
}

/**
 * Validate game ID format.
 * 
 * @param gameId - Game identifier
 * @returns Validation result
 */
export function validateGameId(gameId: string): { valid: boolean; error?: string } {
  if (!gameId || gameId.trim().length === 0) {
    return { valid: false, error: ValidationMessages.gameId.required };
  }
  
  if (!ValidationPatterns.gameId.test(gameId.trim())) {
    return { valid: false, error: ValidationMessages.gameId.invalid };
  }
  
  return { valid: true };
}

/**
 * Validate player token.
 * 
 * @param token - Player token
 * @returns Validation result
 */
export function validateToken(token: string): { valid: boolean; error?: string } {
  if (!token) {
    return { valid: false, error: ValidationMessages.token.required };
  }
  
  if (!ValidationPatterns.token.test(token)) {
    return { valid: false, error: ValidationMessages.token.invalid };
  }
  
  return { valid: true };
}

/**
 * Rate limiter for client-side actions.
 * Prevents spam and abuse of API endpoints.
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  /**
   * Check if action is allowed under rate limit.
   * 
   * @param key - Unique identifier for the action (e.g., 'create-game')
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns True if action is allowed
   */
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  /**
   * Get remaining attempts.
   * 
   * @param key - Action identifier
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns Number of remaining attempts
   */
  getRemaining(key: string, maxAttempts: number = 5, windowMs: number = 60000): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    return Math.max(0, maxAttempts - recentAttempts.length);
  }
  
  /**
   * Get time until reset in seconds.
   * 
   * @param key - Action identifier
   * @param windowMs - Time window in milliseconds
   * @returns Seconds until rate limit resets
   */
  getTimeUntilReset(key: string, windowMs: number = 60000): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + windowMs;
    const now = Date.now();
    
    return Math.max(0, Math.ceil((resetTime - now) / 1000));
  }
  
  /**
   * Clear rate limit for a specific key.
   * 
   * @param key - Action identifier
   */
  clear(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Global rate limiter instance.
 */
export const rateLimiter = new RateLimiter();

/**
 * Escape HTML to prevent XSS when displaying user content.
 * 
 * @param html - Potentially unsafe HTML string
 * @returns Escaped safe string
 */
export function escapeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Validate and sanitize player name for safe use.
 * 
 * @param name - Raw player name input
 * @returns Sanitized and validated name, or null if invalid
 */
export function safePlayerName(name: string): string | null {
  const sanitized = sanitizeString(name);
  const validation = validatePlayerName(sanitized);
  
  return validation.valid ? sanitized : null;
}

