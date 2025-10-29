<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Game;
use Predis\Client as RedisClient;

/**
 * Game Repository
 * 
 * In-memory storage for active games using Redis.
 * Redis allows data to persist across PHP requests and can be shared
 * between multiple processes (API + WebSocket).
 * 
 * Note: All data is lost when Redis restarts.
 * For production, consider using Redis persistence (RDB/AOF).
 */
class GameRepository
{
    /**
     * Redis key prefix for games.
     */
    private const CACHE_PREFIX = 'monopoly:game:';
    
    /**
     * Redis key for the games index (set of all game IDs).
     */
    private const INDEX_KEY = 'monopoly:games:index';

    /**
     * Cleanup threshold - games inactive for this long are removed (in seconds).
     */
    private const CLEANUP_THRESHOLD = 7200; // 2 hours
    
    /**
     * TTL for Redis cache entries (in seconds).
     */
    private const CACHE_TTL = 7200; // 2 hours

    /**
     * Redis client instance.
     */
    private RedisClient $redis;

    /**
     * Initialize repository with Redis connection.
     */
    public function __construct()
    {
        // Connect to Redis (via Docker network or localhost)
        $redisHost = getenv('REDIS_HOST') ?: 'redis';
        $redisPort = getenv('REDIS_PORT') ?: 6379;
        
        $this->redis = new RedisClient([
            'scheme' => 'tcp',
            'host' => $redisHost,
            'port' => $redisPort,
        ]);
    }

    /**
     * Save a game to the repository.
     * 
     * @param Game $game The game to save
     */
    public function save(Game $game): void
    {
        // Serialize and store the game with TTL
        $serialized = serialize($game);
        $key = self::CACHE_PREFIX . $game->getId();
        
        $this->redis->setex($key, self::CACHE_TTL, $serialized);
        
        // Add to index
        $this->redis->sadd(self::INDEX_KEY, [$game->getId()]);
        $this->redis->expire(self::INDEX_KEY, self::CACHE_TTL);
    }

    /**
     * Find a game by its ID.
     * 
     * @param string $id Game identifier
     * @return Game|null The game if found, null otherwise
     */
    public function find(string $id): ?Game
    {
        $key = self::CACHE_PREFIX . $id;
        $serialized = $this->redis->get($key);
        
        if ($serialized === null) {
            return null;
        }
        
        return unserialize($serialized);
    }

    /**
     * Get all active games.
     * 
     * @return Game[] Array of all games
     */
    public function findAll(): array
    {
        $games = [];
        $gameIds = $this->redis->smembers(self::INDEX_KEY);
        
        foreach ($gameIds as $id) {
            $game = $this->find($id);
            if ($game !== null) {
                $games[] = $game;
            }
        }
        
        return $games;
    }

    /**
     * Delete a game from the repository.
     * 
     * @param string $id Game identifier
     */
    public function delete(string $id): void
    {
        $key = self::CACHE_PREFIX . $id;
        $this->redis->del([$key]);
        $this->redis->srem(self::INDEX_KEY, $id);
    }

    /**
     * Check if a game exists.
     * 
     * @param string $id Game identifier
     * @return bool True if game exists, false otherwise
     */
    public function exists(string $id): bool
    {
        $key = self::CACHE_PREFIX . $id;
        return $this->redis->exists($key) > 0;
    }

    /**
     * Get the total number of active games.
     */
    public function count(): int
    {
        return $this->redis->scard(self::INDEX_KEY);
    }

    /**
     * Clean up inactive games.
     * Removes games that haven't had activity in the last 2 hours.
     * 
     * Note: With Redis TTL, this is mostly automatic, but we can
     * manually remove old entries from the index.
     * 
     * @return int Number of games removed
     */
    public function cleanupInactive(): int
    {
        $now = new \DateTimeImmutable();
        $removed = 0;
        $gameIds = $this->redis->smembers(self::INDEX_KEY);

        foreach ($gameIds as $id) {
            $game = $this->find($id);
            
            // If game doesn't exist (expired) or is too old, remove from index
            if ($game === null) {
                $this->redis->srem(self::INDEX_KEY, $id);
                $removed++;
            } elseif (method_exists($game, 'getLastActivityAt')) {
                $inactiveSeconds = $now->getTimestamp() - $game->getLastActivityAt()->getTimestamp();
                
                if ($inactiveSeconds > self::CLEANUP_THRESHOLD) {
                    $this->delete($id);
                    $removed++;
                }
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
        $games = $this->findAll();
        
        return array_filter(
            $games,
            fn(Game $game) => $game->getStatus() === $status
        );
    }
}

