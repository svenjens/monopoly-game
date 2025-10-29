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
            
            // Create the Ratchet WebSocket server
            $server = IoServer::factory(
                new HttpServer(
                    new WsServer($gameServer)
                ),
                $port,
                $host
            );

            $io->success("WebSocket server running on ws://{$host}:{$port}");
            
            // Start Redis subscriber in a background process
            $pid = pcntl_fork();
            
            if ($pid == -1) {
                throw new \RuntimeException('Could not fork Redis subscriber process');
            } elseif ($pid == 0) {
                // Child process: Redis subscriber
                $this->startRedisSubscriber($gameServer, $redisHost, $redisPort, $io);
                exit(0);
            } else {
                // Parent process: WebSocket server
                $io->comment('Redis subscriber started in background');
                $io->comment('Press Ctrl+C to stop the server');
                
                // Run the server (blocks until stopped)
                $server->run();
                
                // Clean up child process
                pcntl_wait($status);
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('Failed to start WebSocket server: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
    
    /**
     * Start Redis subscriber to listen for game events.
     */
    private function startRedisSubscriber(
        GameWebSocketServer $gameServer,
        string $redisHost,
        int $redisPort,
        SymfonyStyle $io
    ): void {
        try {
            $redis = new Client([
                'scheme' => 'tcp',
                'host' => $redisHost,
                'port' => $redisPort,
            ]);
            
            $io->info('Redis subscriber connected, listening for events...');
            
            // Subscribe to game_events channel
            $pubsub = $redis->pubSubLoop();
            $pubsub->subscribe('game_events');
            
            foreach ($pubsub as $message) {
                if ($message->kind === 'message') {
                    try {
                        $data = json_decode($message->payload, true);
                        
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
                    } catch (\Exception $e) {
                        echo "[Redis] Error processing message: {$e->getMessage()}\n";
                    }
                }
            }
        } catch (\Exception $e) {
            $io->error('Redis subscriber error: ' . $e->getMessage());
        }
    }
}

