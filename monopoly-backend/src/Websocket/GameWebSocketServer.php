<?php

declare(strict_types=1);

namespace App\Websocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

/**
 * Game WebSocket Server
 * 
 * Manages WebSocket connections for real-time game updates.
 * Clients can subscribe to specific games and receive events
 * when game state changes.
 * 
 * Events broadcasted:
 * - game:updated - Full game state update
 * - player:joined - New player added
 * - turn:started - Turn beginning
 * - dice:rolled - Dice results
 * - player:moved - Player position changed
 * - property:purchased - Property bought
 * - rent:paid - Rent transaction
 * - turn:ended - Turn completed
 */
class GameWebSocketServer implements MessageComponentInterface
{
    /**
     * All active connections.
     * 
     * @var \SplObjectStorage
     */
    protected $clients;

    /**
     * Game subscriptions map.
     * Key: game ID, Value: array of ConnectionInterface objects
     * 
     * @var array<string, array<ConnectionInterface>>
     */
    protected array $gameSubscriptions = [];

    /**
     * Initialize the WebSocket server.
     */
    public function __construct()
    {
        $this->clients = new \SplObjectStorage();
        echo "WebSocket server initialized\n";
    }

    /**
     * Handle new connection.
     * 
     * @param ConnectionInterface $conn New connection
     */
    public function onOpen(ConnectionInterface $conn): void
    {
        $this->clients->attach($conn);
        echo "New connection: {$conn->resourceId}\n";

        // Send welcome message
        $conn->send(json_encode([
            'event' => 'connected',
            'message' => 'Connected to Monopoly Game Server',
            'connectionId' => $conn->resourceId,
        ]));
    }

    /**
     * Handle incoming message from client.
     * 
     * Expected message format:
     * {
     *   "action": "subscribe"|"unsubscribe",
     *   "gameId": "game-uuid"
     * }
     * 
     * @param ConnectionInterface $from Sender connection
     * @param string $msg Raw message
     */
    public function onMessage(ConnectionInterface $from, $msg): void
    {
        echo "Message from {$from->resourceId}: {$msg}\n";

        try {
            $data = json_decode($msg, true);

            if (!$data || !isset($data['action'])) {
                $from->send(json_encode([
                    'error' => 'Invalid message format',
                ]));
                return;
            }

            switch ($data['action']) {
                case 'subscribe':
                    $this->handleSubscribe($from, $data['gameId'] ?? null);
                    break;

                case 'unsubscribe':
                    $this->handleUnsubscribe($from, $data['gameId'] ?? null);
                    break;

                case 'ping':
                    $from->send(json_encode(['event' => 'pong']));
                    break;

                default:
                    $from->send(json_encode([
                        'error' => 'Unknown action: ' . $data['action'],
                    ]));
            }
        } catch (\Exception $e) {
            $from->send(json_encode([
                'error' => 'Error processing message: ' . $e->getMessage(),
            ]));
        }
    }

    /**
     * Handle connection close.
     * 
     * @param ConnectionInterface $conn Closed connection
     */
    public function onClose(ConnectionInterface $conn): void
    {
        // Remove from all game subscriptions
        foreach ($this->gameSubscriptions as $gameId => $subscribers) {
            $this->gameSubscriptions[$gameId] = array_filter(
                $subscribers,
                fn($subscriber) => $subscriber !== $conn
            );
        }

        $this->clients->detach($conn);
        echo "Connection {$conn->resourceId} disconnected\n";
    }

    /**
     * Handle connection error.
     * 
     * @param ConnectionInterface $conn Connection with error
     * @param \Exception $e The error
     */
    public function onError(ConnectionInterface $conn, \Exception $e): void
    {
        echo "Error on connection {$conn->resourceId}: {$e->getMessage()}\n";
        $conn->close();
    }

    /**
     * Handle subscribe action.
     * 
     * @param ConnectionInterface $conn Client connection
     * @param string|null $gameId Game identifier
     */
    private function handleSubscribe(ConnectionInterface $conn, ?string $gameId): void
    {
        if (!$gameId) {
            $conn->send(json_encode([
                'error' => 'gameId is required for subscribe action',
            ]));
            return;
        }

        // Initialize game subscription array if doesn't exist
        if (!isset($this->gameSubscriptions[$gameId])) {
            $this->gameSubscriptions[$gameId] = [];
        }

        // Add connection to game subscriptions
        if (!in_array($conn, $this->gameSubscriptions[$gameId], true)) {
            $this->gameSubscriptions[$gameId][] = $conn;
        }

        $conn->send(json_encode([
            'event' => 'subscribed',
            'gameId' => $gameId,
            'message' => "Subscribed to game {$gameId}",
        ]));

        echo "Connection {$conn->resourceId} subscribed to game {$gameId}\n";
    }

    /**
     * Handle unsubscribe action.
     * 
     * @param ConnectionInterface $conn Client connection
     * @param string|null $gameId Game identifier
     */
    private function handleUnsubscribe(ConnectionInterface $conn, ?string $gameId): void
    {
        if (!$gameId) {
            $conn->send(json_encode([
                'error' => 'gameId is required for unsubscribe action',
            ]));
            return;
        }

        if (isset($this->gameSubscriptions[$gameId])) {
            $this->gameSubscriptions[$gameId] = array_filter(
                $this->gameSubscriptions[$gameId],
                fn($subscriber) => $subscriber !== $conn
            );
        }

        $conn->send(json_encode([
            'event' => 'unsubscribed',
            'gameId' => $gameId,
            'message' => "Unsubscribed from game {$gameId}",
        ]));

        echo "Connection {$conn->resourceId} unsubscribed from game {$gameId}\n";
    }

    /**
     * Broadcast an event to all subscribers of a game.
     * This method should be called from controllers when game state changes.
     * 
     * @param string $gameId Game identifier
     * @param string $event Event name (e.g., 'game:updated')
     * @param array $data Event data
     */
    public function broadcastToGame(string $gameId, string $event, array $data): void
    {
        if (!isset($this->gameSubscriptions[$gameId])) {
            return;
        }

        $message = json_encode([
            'event' => $event,
            'gameId' => $gameId,
            'data' => $data,
            'timestamp' => time(),
        ]);

        foreach ($this->gameSubscriptions[$gameId] as $subscriber) {
            $subscriber->send($message);
        }

        echo "Broadcasted {$event} to " . count($this->gameSubscriptions[$gameId]) . " subscribers of game {$gameId}\n";
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
            'event' => $event,
            'data' => $data,
            'timestamp' => time(),
        ]);

        foreach ($this->clients as $client) {
            $client->send($message);
        }

        echo "Broadcasted {$event} to all {$this->clients->count()} clients\n";
    }
}

