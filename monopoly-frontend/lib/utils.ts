/**
 * Utility Functions
 * 
 * Helper functions for the application.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes.
 * Combines clsx and tailwind-merge for optimal class handling.
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency amount.
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/**
 * Format player name with truncation.
 * 
 * @param name - Player name
 * @param maxLength - Maximum length before truncation
 * @returns Formatted name
 */
export function formatPlayerName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength - 3)}...`;
}

/**
 * Get initials from name.
 * 
 * @param name - Full name
 * @returns Initials (max 2 characters)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Sleep utility for delays.
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate position on circular board.
 * 
 * @param position - Current position (0-39)
 * @param boardSize - Size of the board
 * @returns Normalized position
 */
export function normalizePosition(position: number, boardSize: number = 40): number {
  return ((position % boardSize) + boardSize) % boardSize;
}

/**
 * Check if it's a player's turn.
 * 
 * @param playerId - Player ID to check
 * @param currentPlayerIndex - Current turn index
 * @param players - Array of players
 * @returns True if it's the player's turn
 */
export function isPlayerTurn(playerId: string, currentPlayerIndex: number, players: any[]): boolean {
  return players[currentPlayerIndex]?.id === playerId;
}

/**
 * Get tile background color based on type and color.
 * 
 * @param type - Tile type
 * @param color - Property color (optional)
 * @returns Tailwind CSS classes
 */
export function getTileColor(type: string, color?: string): string {
  if (type === 'property' && color) {
    const colorMap: Record<string, string> = {
      brown: 'bg-orange-900',
      light_blue: 'bg-sky-300',
      pink: 'bg-pink-400',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-400',
      green: 'bg-green-500',
      dark_blue: 'bg-blue-900',
    };
    return colorMap[color] || 'bg-gray-300';
  }
  
  const typeColorMap: Record<string, string> = {
    go: 'bg-gradient-primary',
    railroad: 'bg-gray-800',
    utility: 'bg-yellow-200',
    tax: 'bg-red-300',
    jail: 'bg-gray-400',
    free_parking: 'bg-green-300',
    go_to_jail: 'bg-red-600',
  };
  
  return typeColorMap[type] || 'bg-gray-200';
}

