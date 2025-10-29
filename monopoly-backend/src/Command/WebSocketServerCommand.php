<?php

declare(strict_types=1);

namespace App\Command;

use App\Websocket\GameWebSocketServer;
use Predis\Client;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use React\EventLoop\Loop;
use Clue\React\Redis\Factory;

/**
 * WebSocket Server Command
 * 
 * Starts the WebSocket server for real-time game updates.
 * 
 * Usage: php bin/console websocket:start
 */
#[AsCommand(
    name: 'websocket:start',
    description: 'Start the WebSocket server for real-time game updates',
)]
class WebSocketServerCommand extends Command
{
    /**
     * Execute the command.
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $host = $_ENV['WEBSOCKET_HOST'] ?? '0.0.0.0';
        $port = (int) ($_ENV['WEBSOCKET_PORT'] ?? 8080);
        $redisHost = $_ENV['REDIS_HOST'] ?? 'redis';
        $redisPort = (int) ($_ENV['REDIS_PORT'] ?? 6379);

        $io->title('Monopoly WebSocket Server');
        $io->info("Starting WebSocket server on {$host}:{$port}");
        $io->info("Connecting to Redis at {$redisHost}:{$redisPort}");

        try {
            // Create the WebSocket server instance
            $gameServer = new GameWebSocketServer();
            
            // Get React Event Loop
            $loop = Loop::get();
            
            // Create the Ratchet WebSocket server with custom loop
            $socket = new \React\Socket\SocketServer("$host:$port", [], $loop);
            $wsServer = new \Ratchet\Server\IoServer(
                new HttpServer(
                    new WsServer($gameServer)
                ),
                $socket,
                $loop
            );

            $io->success("WebSocket server running on ws://{$host}:{$port}");
            
            // Start Redis subscriber using React periodic timer
            $this->startRedisSubscriber($gameServer, $redisHost, $redisPort, $io, $loop);
            
            $io->comment('Press Ctrl+C to stop the server');
            
            // Run the event loop (blocks until stopped)
            $loop->run();

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('Failed to start WebSocket server: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
    
    /**
     * Start Redis subscriber to listen for game events.
     * Uses a queue-based approach with periodic polling.
     */
    private function startRedisSubscriber(
        GameWebSocketServer $gameServer,
        string $redisHost,
        int $redisPort,
        SymfonyStyle $io,
        $loop
    ): void {
        try {
            // Use a queue in Redis as a simpler alternative to Pub/Sub
            $redis = new Client([
                'scheme' => 'tcp',
                'host' => $redisHost,
                'port' => $redisPort,
            ]);
            
            $io->info('Redis subscriber connected, polling for events...');
            
            // Poll Redis list every 100ms for new events
            $loop->addPeriodicTimer(0.1, function () use ($redis, $gameServer) {
                try {
                    // Use RPOP to get events from queue (non-blocking)
                    // Process up to 10 events per tick
                    for ($i = 0; $i < 10; $i++) {
                        $message = $redis->rpop('game_events_queue');
                        
                        if (!$message) {
                            break; // No more messages
                        }
                        
                        $data = json_decode($message, true);
                        
                        if ($data && isset($data['type'])) {
                            if ($data['type'] === 'game_event' && isset($data['gameId'], $data['event'], $data['data'])) {
                                echo "[Redis] Broadcasting {$data['event']} to game {$data['gameId']}\n";
                                $gameServer->broadcastToGame(
                                    $data['gameId'],
                                    $data['event'],
                                    $data['data']
                                );
                            } elseif ($data['type'] === 'global_event' && isset($data['event'], $data['data'])) {
                                echo "[Redis] Broadcasting {$data['event']} to all clients\n";
                                $gameServer->broadcastToAll(
                                    $data['event'],
                                    $data['data']
                                );
                            }
                        }
                    }
                } catch (\Exception $e) {
                    echo "[Redis] Error: {$e->getMessage()}\n";
                }
            });
            
        } catch (\Exception $e) {
            $io->error('Redis subscriber error: ' . $e->getMessage());
        }
    }
}

