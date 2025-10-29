<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Game;

/**
 * Game Repository
 * 
 * In-memory storage for active games.
 * Stores games in a PHP array (singleton service).
 * 
 * Note: All data is lost when the application restarts.
 * For production, consider using Redis or similar for persistence.
 */
class GameRepository
{
    /**
     * Storage for active games.
     * Key: game ID, Value: Game entity
     * 
     * @var array<string, Game>
     */
    private array $games = [];

    /**
     * Cleanup threshold - games inactive for this long are removed (in seconds).
     */
    private const CLEANUP_THRESHOLD = 7200; // 2 hours

    /**
     * Save a game to the repository.
     * 
     * @param Game $game The game to save
     */
    public function save(Game $game): void
    {
        $this->games[$game->getId()] = $game;
    }

    /**
     * Find a game by its ID.
     * 
     * @param string $id Game identifier
     * @return Game|null The game if found, null otherwise
     */
    public function find(string $id): ?Game
    {
        return $this->games[$id] ?? null;
    }

    /**
     * Get all active games.
     * 
     * @return Game[] Array of all games
     */
    public function findAll(): array
    {
        return array_values($this->games);
    }

    /**
     * Delete a game from the repository.
     * 
     * @param string $id Game identifier
     */
    public function delete(string $id): void
    {
        unset($this->games[$id]);
    }

    /**
     * Check if a game exists.
     * 
     * @param string $id Game identifier
     * @return bool True if game exists, false otherwise
     */
    public function exists(string $id): bool
    {
        return isset($this->games[$id]);
    }

    /**
     * Get the total number of active games.
     */
    public function count(): int
    {
        return count($this->games);
    }

    /**
     * Clean up inactive games.
     * Removes games that haven't had activity in the last 2 hours.
     * 
     * This should be called periodically (e.g., via a cron job or middleware).
     * 
     * @return int Number of games removed
     */
    public function cleanupInactive(): int
    {
        $now = new \DateTimeImmutable();
        $removed = 0;

        foreach ($this->games as $id => $game) {
            $inactiveSeconds = $now->getTimestamp() - $game->getLastActivityAt()->getTimestamp();
            
            if ($inactiveSeconds > self::CLEANUP_THRESHOLD) {
                unset($this->games[$id]);
                $removed++;
            }
        }

        return $removed;
    }

    /**
     * Get games by status.
     * 
     * @param \App\Enum\GameStatus $status Status to filter by
     * @return Game[] Array of games with that status
     */
    public function findByStatus(\App\Enum\GameStatus $status): array
    {
        return array_filter(
            $this->games,
            fn(Game $game) => $game->getStatus() === $status
        );
    }
}

