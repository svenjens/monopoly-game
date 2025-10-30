<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Game;
use App\Enum\PlayerToken;
use App\Repository\GameRepository;
use App\Service\GameEngine;
use App\Service\WebSocketBroadcaster;
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
        private readonly GameEngine $gameEngine,
        private readonly WebSocketBroadcaster $broadcaster
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
            $gameStarted = false;
            if (count($game->getPlayers()) >= 2 && !$game->isStarted()) {
                $game->start();
                $this->gameRepository->save($game);
                $gameStarted = true;
            }

            $gameState = GameStateDTO::fromGame($game);

            // Broadcast player:joined event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'player:joined',
                [
                    'player' => [
                        'id' => $player->getId(),
                        'name' => $player->getName(),
                        'token' => $player->getToken()->value,
                    ],
                    'game' => $gameState->toArray(),
                ]
            );

            // If game just started, also broadcast game:started
            if ($gameStarted) {
                $this->broadcaster->broadcastToGame(
                    $id,
                    'game:started',
                    ['game' => $gameState->toArray()]
                );
            }

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

            // Broadcast turn:ended event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'turn:ended',
                $turnResultDTO->toArray()
            );

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
     * Purchase a property.
     * 
     * POST /api/games/{id}/purchase
     * 
     * @param string $id Game identifier
     * @return JsonResponse Purchase result with updated game state
     */
    #[Route('/{id}/purchase', name: 'purchase', methods: ['POST'])]
    public function purchaseProperty(string $id, Request $request): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = json_decode($request->getContent(), true);
            $position = $data['position'] ?? null;
            
            // Find the player who wants to buy (not necessarily current player)
            $playerId = $data['playerId'] ?? null;
            $player = null;
            
            if ($playerId) {
                foreach ($game->getPlayers() as $p) {
                    if ($p->getId() === $playerId) {
                        $player = $p;
                        break;
                    }
                }
            }
            
            if (!$player) {
                $player = $game->getCurrentPlayer();
            }
            
            // Use provided position or fall back to current position
            $tilePosition = $position ?? $player->getPosition();
            $tile = $game->getBoard()->getTile($tilePosition);

            // Check if tile is a purchasable property
            if (!method_exists($tile, 'getOwner') || !method_exists($tile, 'setOwner')) {
                return $this->json([
                    'success' => false,
                    'error' => 'Dit hokje is geen property die je kunt kopen',
                    'message' => 'This tile is not a property',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check if property is already owned
            if ($tile->getOwner() !== null) {
                $ownerName = $tile->getOwner()->getName();
                return $this->json([
                    'success' => false,
                    'error' => "Deze property is al verkocht aan {$ownerName}",
                    'message' => 'Property is already owned',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Get price
            $price = method_exists($tile, 'getPrice') ? $tile->getPrice() : 0;

            // Check if player can afford it
            if ($player->getBalance() < $price) {
                return $this->json([
                    'success' => false,
                    'error' => "Niet genoeg geld! Je hebt €{$player->getBalance()}, maar dit kost €{$price}",
                    'message' => 'Insufficient funds',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Execute purchase
            $player->deductBalance($price);
            $game->getBank()->addBalance($price);
            $tile->setOwner($player);
            $player->addProperty($tile);
            
            // Advance to next player now that decision has been made
            $game->advanceToNextPlayer();

            $this->gameRepository->save($game);

            // Build response
            $gameState = GameStateDTO::fromGame($game);

            $purchaseResult = [
                'action' => 'property_purchased',
                'propertyName' => $tile->getName(),
                'price' => $price,
                'player' => [
                    'id' => $player->getId(),
                    'name' => $player->getName(),
                    'balance' => $player->getBalance(),
                ],
                'message' => sprintf('%s kocht %s voor €%s', $player->getName(), $tile->getName(), number_format($price, 0, ',', '.')),
            ];

            // Broadcast property:purchased event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'property:purchased',
                [
                    'purchase' => $purchaseResult,
                    'gameState' => $gameState->toArray(),
                ]
            );

            return $this->json([
                'success' => true,
                'data' => [
                    'purchase' => $purchaseResult,
                    'gameState' => $gameState->toArray(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            return $this->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Decline a property purchase offer.
     * 
     * POST /api/games/{id}/decline-property
     * 
     * @param string $id Game identifier
     * @return JsonResponse Result with updated game state
     */
    #[Route('/{id}/decline-property', name: 'decline_property', methods: ['POST'])]
    public function declineProperty(string $id, Request $request): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = json_decode($request->getContent(), true);
            $playerId = $data['playerId'] ?? null;
            
            // Find the player who is declining
            $player = null;
            if ($playerId) {
                foreach ($game->getPlayers() as $p) {
                    if ($p->getId() === $playerId) {
                        $player = $p;
                        break;
                    }
                }
            }
            
            if (!$player) {
                $player = $game->getCurrentPlayer();
            }
            
            // Advance to next player now that decision has been made
            $game->advanceToNextPlayer();
            
            $this->gameRepository->save($game);

            // Build response
            $gameState = GameStateDTO::fromGame($game);

            // Broadcast property:declined event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'property:declined',
                [
                    'player' => [
                        'id' => $player->getId(),
                        'name' => $player->getName(),
                    ],
                    'gameState' => $gameState->toArray(),
                ]
            );

            return $this->json([
                'success' => true,
                'data' => [
                    'gameState' => $gameState->toArray(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            return $this->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Pay €50 to get out of jail.
     * 
     * POST /api/games/{id}/pay-jail
     * 
     * @param string $id Game identifier
     * @return JsonResponse Result with updated game state
     */
    #[Route('/{id}/pay-jail', name: 'pay_jail', methods: ['POST'])]
    public function payJailFee(string $id): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $player = $game->getCurrentPlayer();

            // Check if player is in jail
            if (!$player->isInJail()) {
                return $this->json([
                    'success' => false,
                    'message' => 'Player is not in jail',
                ], Response::HTTP_BAD_REQUEST);
            }

            $jailFee = 50;

            // Check if player can afford it
            if ($player->getBalance() < $jailFee) {
                return $this->json([
                    'success' => false,
                    'message' => 'Insufficient funds to pay jail fee',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Pay and release
            $player->deductBalance($jailFee);
            $game->getBank()->addBalance($jailFee);
            $player->releaseFromJail();

            $this->gameRepository->save($game);

            // Build response
            $gameState = GameStateDTO::fromGame($game);

            $jailResult = [
                'released' => true,
                'paid' => $jailFee,
                'player' => [
                    'id' => $player->getId(),
                    'name' => $player->getName(),
                    'balance' => $player->getBalance(),
                    'inJail' => false,
                ],
                'message' => sprintf('%s betaalde €50 om uit de gevangenis te komen', $player->getName()),
            ];

            // Broadcast jail:released event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'jail:released',
                [
                    'jail' => $jailResult,
                    'gameState' => $gameState->toArray(),
                ]
            );

            return $this->json([
                'success' => true,
                'data' => [
                    'jail' => $jailResult,
                    'gameState' => $gameState->toArray(),
                ],
            ]);
        } catch (\RuntimeException $e) {
            return $this->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Build a house on a property.
     * 
     * POST /api/games/{id}/build-house
     * Body: { "position": 1 }
     * 
     * @param string $id Game identifier
     * @return JsonResponse Result with updated game state
     */
    #[Route('/{id}/build-house', name: 'build_house', methods: ['POST'])]
    public function buildHouse(string $id, Request $request): JsonResponse
    {
        $game = $this->gameRepository->find($id);

        if (!$game) {
            return $this->json([
                'success' => false,
                'message' => 'Game not found',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $data = json_decode($request->getContent(), true);
            $position = $data['position'] ?? null;

            if ($position === null) {
                return $this->json([
                    'success' => false,
                    'message' => 'Position is required',
                ], Response::HTTP_BAD_REQUEST);
            }

            $player = $game->getCurrentPlayer();
            $tile = $game->getBoard()->getTile($position);

            // Check if tile is a property
            if (!$tile instanceof \App\Entity\PropertyTile) {
                return $this->json([
                    'success' => false,
                    'message' => 'This is not a buildable property',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check if player owns this property
            if ($tile->getOwner() !== $player) {
                return $this->json([
                    'success' => false,
                    'message' => 'You do not own this property',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check if building is allowed
            if (!$tile->canBuildHouse($game)) {
                return $this->json([
                    'success' => false,
                    'message' => 'Cannot build house (need monopoly or max houses reached)',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check if player can afford it
            $buildCost = $tile->getBuildCost();
            if ($player->getBalance() < $buildCost) {
                return $this->json([
                    'success' => false,
                    'message' => 'Insufficient funds',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Build the house
            $player->deductBalance($buildCost);
            $game->getBank()->addBalance($buildCost);
            $tile->buildHouse();

            $this->gameRepository->save($game);

            // Build response
            $gameState = GameStateDTO::fromGame($game);

            $buildResult = [
                'position' => $position,
                'propertyName' => $tile->getName(),
                'houses' => $tile->getHouses(),
                'cost' => $buildCost,
                'message' => $tile->hasHotel() 
                    ? sprintf('%s bouwde een hotel op %s voor €%s', $player->getName(), $tile->getName(), number_format($buildCost, 0, ',', '.'))
                    : sprintf('%s bouwde huis #%d op %s voor €%s', $player->getName(), $tile->getHouses(), $tile->getName(), number_format($buildCost, 0, ',', '.')),
            ];

            // Broadcast house:built event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'house:built',
                [
                    'build' => $buildResult,
                    'gameState' => $gameState->toArray(),
                ]
            );

            return $this->json([
                'success' => true,
                'data' => [
                    'build' => $buildResult,
                    'gameState' => $gameState->toArray(),
                ],
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

            // Broadcast game:ended event via WebSocket
            $this->broadcaster->broadcastToGame(
                $id,
                'game:ended',
                ['game' => $gameState->toArray()]
            );

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

