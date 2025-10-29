<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Game;
use App\Entity\Player;
use App\Entity\Board;
use App\Entity\Tile;
use App\Entity\GoTile;

/**
 * Game Engine Service
 * 
 * Core game logic handler for Monopoly.
 * Executes turns, handles dice rolling, player movement,
 * Go passing bonuses, and tile landing interactions.
 * 
 * This is the main orchestrator of game flow.
 */
class GameEngine
{
    /**
     * Number of tiles on the board (for circular movement).
     */
    private const BOARD_SIZE = 40;

    /**
     * Amount given when passing Go.
     */
    private const GO_PASS_BONUS = 200;

    /**
     * Position of the Go tile.
     */
    private const GO_POSITION = 0;

    private DiceService $diceService;

    /**
     * Initialize the game engine.
     * 
     * @param DiceService $diceService Service for rolling dice
     */
    public function __construct(DiceService $diceService)
    {
        $this->diceService = $diceService;
    }

    /**
     * Execute a complete turn for the current player.
     * 
     * This orchestrates the entire turn flow:
     * 1. Roll dice
     * 2. Move player
     * 3. Check for Go passing
     * 4. Handle tile landing
     * 5. Advance to next player
     * 
     * @param Game $game The active game instance
     * @return array Complete turn result with all actions
     */
    public function executeTurn(Game $game): array
    {
        if (!$game->isStarted()) {
            throw new \RuntimeException('Game has not started yet');
        }

        $player = $game->getCurrentPlayer();
        
        // Step 1: Roll dice
        $diceResult = $this->rollDice();
        $game->setLastDiceRoll($diceResult['total']);

        // Step 2: Move player and check for Go passing
        $movementResult = $this->movePlayer($player, $diceResult['total'], $game->getBoard());

        // Step 3: Handle Go passing bonus
        if ($movementResult['passedGo']) {
            $this->handleGoPass($player, $game->getBank());
        }

        // Step 4: Handle tile landing
        $tile = $game->getBoard()->getTile($player->getPosition());
        $tileInteraction = $this->handleTileLanding($game, $player, $tile);

        // Step 5: Advance to next player
        $game->nextTurn();

        // Return complete turn result
        return [
            'player' => [
                'id' => $player->getId(),
                'name' => $player->getName(),
                'balance' => $player->getBalance(),
                'position' => $player->getPosition(),
            ],
            'dice' => $diceResult,
            'movement' => $movementResult,
            'tileInteraction' => $tileInteraction,
            'nextPlayer' => [
                'id' => $game->getCurrentPlayer()->getId(),
                'name' => $game->getCurrentPlayer()->getName(),
            ],
        ];
    }

    /**
     * Roll two dice and return the results.
     * 
     * @return array Dice results (dice1, dice2, total)
     */
    public function rollDice(): array
    {
        return $this->diceService->rollTwo();
    }

    /**
     * Move a player forward by the specified number of spaces.
     * Handles circular board wrapping and detects Go passing.
     * 
     * @param Player $player The player to move
     * @param int $spaces Number of spaces to move forward
     * @param Board $board The game board
     * @return array Movement details (oldPosition, newPosition, passedGo)
     */
    public function movePlayer(Player $player, int $spaces, Board $board): array
    {
        $oldPosition = $player->getPosition();
        
        // Move player (handles circular wrapping)
        $newPosition = $player->move($spaces);
        
        // Check if player passed Go
        $passedGo = $this->checkGoPass($oldPosition, $newPosition);

        return [
            'oldPosition' => $oldPosition,
            'newPosition' => $newPosition,
            'spaces' => $spaces,
            'passedGo' => $passedGo,
        ];
    }

    /**
     * Handle tile landing interaction.
     * Delegates to the specific tile's onLand method.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on the tile
     * @param Tile $tile The tile that was landed on
     * @return array Tile interaction result
     */
    public function handleTileLanding(Game $game, Player $player, Tile $tile): array
    {
        return $tile->onLand($game, $player);
    }

    /**
     * Check if a player passed Go during their movement.
     * This happens when the new position is less than the old position
     * (circular board wrapping occurred).
     * 
     * @param int $oldPosition Position before moving
     * @param int $newPosition Position after moving
     * @return bool True if Go was passed, false otherwise
     */
    private function checkGoPass(int $oldPosition, int $newPosition): bool
    {
        // If new position is less than old position, we wrapped around (passed Go)
        // But not if we landed exactly on Go (that's a landing, not a passing)
        return $newPosition < $oldPosition && $newPosition !== self::GO_POSITION;
    }

    /**
     * Handle Go passing bonus.
     * Give player money from the bank when they pass Go.
     * 
     * @param Player $player The player who passed Go
     * @param \App\Entity\Bank $bank The game's bank
     */
    private function handleGoPass(Player $player, \App\Entity\Bank $bank): void
    {
        $player->addBalance(self::GO_PASS_BONUS);
        $bank->deductBalance(self::GO_PASS_BONUS);
    }
}

