<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Game;
use App\Enum\PlayerToken;
use App\Repository\GameRepository;
use App\Service\GameEngine;
use App\DTO\GameStateDTO;
use App\DTO\TurnResultDTO;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Game Controller
 * 
 * REST API endpoints for managing Monopoly games.
 * Handles game creation, player joining, turn execution, and state retrieval.
 */
#[Route('/api/games', name: 'api_games_')]
class GameController extends AbstractController
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly GameEngine $gameEngine
    ) {}

    /**
     * Create a new game.
     * 
     * POST /api/games
     * 
     * @return JsonResponse Game state with ID
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        $game = new Game();
        $this->gameRepository->save($game);

        $gameState = GameStateDTO::fromGame($game);

        return $this->json([
            'success' => true,
            'message' => 'Game created successfully',
            'data' => $gameState->toArray(),
        ], Response::HTTP_CREATED);
    }

    /**
     * Get game state by ID.
     * 
     * GET /api/games/{id}
     * 
     * @param string $id Game identifier
     * @return JsonResponse Game state
     */
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $gameState = GameStateDTO::fromGame($game);

        return $this->json([
            'success' => true,
            'data' => $gameState->toArray(),
        ]);
    }

    /**
     * Add a player to a game.
     * 
     * POST /api/games/{id}/players
     * Body: {"name": "Player Name", "token": "car"}
     * 
     * @param string $id Game identifier
     * @param Request $request HTTP request
     * @return JsonResponse Updated game state
     */
    #[Route('/{id}/players', name: 'add_player', methods: ['POST'])]
    public function addPlayer(string $id, Request $request): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        // Parse request body
        $data = json_decode($request->getContent(), true);
        $name = $data['name'] ?? null;
        $tokenValue = $data['token'] ?? null;

        // Validate input
        if (!$name || !$tokenValue) {
            return $this->json([
                'success' => false,
                'message' => 'Name and token are required',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validate token
        try {
            $token = PlayerToken::from($tokenValue);
        } catch (\ValueError $e) {
            return $this->json([
                'success' => false,
                'message' => 'Invalid token. Available tokens: boot, car, ship, thimble, hat, dog, wheelbarrow, iron',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Add player
        try {
            $player = $game->addPlayer($name, $token);
            $this->gameRepository->save($game);

            // Auto-start game if minimum players reached
            if (count($game->getPlayers()) >= 2 && !$game->isStarted()) {
                $game->start();
                $this->gameRepository->save($game);
            }

            $gameState = GameStateDTO::fromGame($game);

            return $this->json([
                'success' => true,
                'message' => 'Player added successfully',
                'data' => [
                    'player' => [
                        'id' => $player->getId(),
                        'name' => $player->getName(),
                        'token' => $player->getToken()->value,
                    ],
                    'game' => $gameState->toArray(),
                ],
            ], Response::HTTP_CREATED);
        } catch (\RuntimeException $e) {
            return $this->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Execute a turn (roll dice and move).
     * 
     * POST /api/games/{id}/roll
     * 
     * @param string $id Game identifier
     * @return JsonResponse Turn result with updated game state
     */
    #[Route('/{id}/roll', name: 'roll', methods: ['POST'])]
    public function roll(string $id): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        if (!$game->isStarted()) {
            return $this->json([
                'success' => false,
                'message' => 'Game has not started yet. Need at least 2 players.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            // Execute turn
            $turnResult = $this->gameEngine->executeTurn($game);
            $this->gameRepository->save($game);

            // Build response
            $gameState = GameStateDTO::fromGame($game);
            $turnResultDTO = TurnResultDTO::fromTurnResult($turnResult, $gameState);

            return $this->json([
                'success' => true,
                'message' => 'Turn executed successfully',
                'data' => $turnResultDTO->toArray(),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * End a game.
     * 
     * POST /api/games/{id}/end
     * 
     * @param string $id Game identifier
     * @return JsonResponse Success message
     */
    #[Route('/{id}/end', name: 'end', methods: ['POST'])]
    public function endGame(string $id): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $game->finish();
            $this->gameRepository->save($game);

            $gameState = GameStateDTO::fromGame($game);

            return $this->json([
                'success' => true,
                'message' => 'Game ended successfully',
                'data' => $gameState->toArray(),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get board state.
     * 
     * GET /api/games/{id}/board
     * 
     * @param string $id Game identifier
     * @return JsonResponse Board tiles
     */
    #[Route('/{id}/board', name: 'board', methods: ['GET'])]
    public function board(string $id): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $tiles = array_map(function($tile) {
            $tileData = [
                'position' => $tile->getPosition(),
                'name' => $tile->getName(),
                'type' => $tile->getType()->value,
            ];

            // Add property-specific data
            if (method_exists($tile, 'getPrice')) {
                $tileData['price'] = $tile->getPrice();
            }
            if (method_exists($tile, 'getRent')) {
                $tileData['rent'] = $tile->getRent();
            }
            if (method_exists($tile, 'getColor')) {
                $tileData['color'] = $tile->getColor();
            }
            if (method_exists($tile, 'getOwner')) {
                $owner = $tile->getOwner();
                $tileData['owner'] = $owner ? [
                    'id' => $owner->getId(),
                    'name' => $owner->getName(),
                ] : null;
            }

            return $tileData;
        }, $game->getBoard()->getTiles());

        return $this->json([
            'success' => true,
            'data' => [
                'tiles' => $tiles,
            ],
        ]);
    }

    /**
     * Delete a game.
     * 
     * DELETE /api/games/{id}
     * 
     * @param string $id Game identifier
     * @return JsonResponse Success message
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        if (!$this->gameRepository->exists($id)) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $this->gameRepository->delete($id);

        return $this->json([
            'success' => true,
            'message' => 'Game deleted successfully',
        ]);
    }

    /**
     * List all games.
     * 
     * GET /api/games
     * 
     * @return JsonResponse List of all games
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $games = $this->gameRepository->findAll();

        $gamesList = array_map(function($game) {
            return [
                'id' => $game->getId(),
                'status' => $game->getStatus()->value,
                'playerCount' => count($game->getPlayers()),
                'createdAt' => $game->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
        }, $games);

        return $this->json([
            'success' => true,
            'data' => [
                'games' => $gamesList,
                'total' => count($gamesList),
            ],
        ]);
    }
}

