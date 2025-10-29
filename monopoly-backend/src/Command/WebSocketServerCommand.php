<?php

declare(strict_types=1);

namespace App\Command;

use App\Websocket\GameWebSocketServer;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

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

        $io->title('Monopoly WebSocket Server');
        $io->info("Starting WebSocket server on {$host}:{$port}");

        try {
            $server = IoServer::factory(
                new HttpServer(
                    new WsServer(
                        new GameWebSocketServer()
                    )
                ),
                $port,
                $host
            );

            $io->success("WebSocket server running on ws://{$host}:{$port}");
            $io->comment('Press Ctrl+C to stop the server');

            // Run the server (blocks until stopped)
            $server->run();

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $io->error('Failed to start WebSocket server: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

