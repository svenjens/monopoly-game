<?php

declare(strict_types=1);

namespace App\Service;

use Predis\Client;

/**
 * WebSocket Broadcaster Service
 * 
 * Publishes game events to Redis Pub/Sub channel for WebSocket server to broadcast.
 * This allows the REST API controllers to trigger real-time updates.
 */
class WebSocketBroadcaster
{
    private Client $redis;
    private const CHANNEL = 'game_events';

    public function __construct()
    {
        // Connect to Redis
        $redisHost = $_ENV['REDIS_HOST'] ?? 'redis';
        $redisPort = (int) ($_ENV['REDIS_PORT'] ?? 6379);
        
        $this->redis = new Client([
            'scheme' => 'tcp',
            'host' => $redisHost,
            'port' => $redisPort,
        ]);
    }

    /**
     * Broadcast an event to a specific game.
     * 
     * @param string $gameId Game identifier
     * @param string $event Event name (e.g., 'player:joined', 'turn:ended')
     * @param array $data Event data
     */
    public function broadcastToGame(string $gameId, string $event, array $data): void
    {
        $message = json_encode([
            'type' => 'game_event',
            'gameId' => $gameId,
            'event' => $event,
            'data' => $data,
            'timestamp' => time(),
        ]);

        // Use both Pub/Sub and Queue for reliability
        $this->redis->publish(self::CHANNEL, $message);
        $this->redis->lpush('game_events_queue', [$message]);
    }

    /**
     * Broadcast to all connected clients.
     * 
     * @param string $event Event name
     * @param array $data Event data
     */
    public function broadcastToAll(string $event, array $data): void
    {
        $message = json_encode([
            'type' => 'global_event',
            'event' => $event,
            'data' => $data,
            'timestamp' => time(),
        ]);

        // Use both Pub/Sub and Queue for reliability
        $this->redis->publish(self::CHANNEL, $message);
        $this->redis->lpush('game_events_queue', [$message]);
    }
}

