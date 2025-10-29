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
        
        // Check if player is in jail
        $jailResult = null;
        $movementResult = null;
        $tileInteraction = null;
        
        if ($player->isInJail()) {
            // Handle jail turn
            $jailResult = $this->handleJailTurn($player, $diceResult, $game->getBank());
            
            // If player was released, they can move
            if ($jailResult['released']) {
                $movementResult = $this->movePlayer($player, $diceResult['total'], $game->getBoard());
                
                // Handle Go passing (unlikely from jail, but possible)
                if ($movementResult['passedGo']) {
                    $this->handleGoPass($player, $game->getBank());
                }
                
                $tile = $game->getBoard()->getTile($player->getPosition());
                $tileInteraction = $this->handleTileLanding($game, $player, $tile);
            }
        } else {
            // Normal turn - not in jail
            // Step 2: Move player and check for Go passing
            $movementResult = $this->movePlayer($player, $diceResult['total'], $game->getBoard());

            // Step 3: Handle Go passing bonus
            if ($movementResult['passedGo']) {
                $this->handleGoPass($player, $game->getBank());
            }

            // Step 4: Handle tile landing
            $tile = $game->getBoard()->getTile($player->getPosition());
            $tileInteraction = $this->handleTileLanding($game, $player, $tile);
        }

        // Step 5: Check for bankruptcy
        $bankruptcyResult = $this->checkBankruptcy($game, $player);
        
        // Step 6: Advance to next player (skip if game ended)
        $gameEnded = $bankruptcyResult['isBankrupt'] && $bankruptcyResult['gameEnded'];
        if (!$gameEnded) {
            // Move to next active player
            $this->advanceToNextActivePlayer($game);
        }

        // Return complete turn result
        return [
            'player' => [
                'id' => $player->getId(),
                'name' => $player->getName(),
                'balance' => $player->getBalance(),
                'position' => $player->getPosition(),
                'isActive' => $player->isActive(),
                'inJail' => $player->isInJail(),
                'jailTurns' => $player->getJailTurns(),
            ],
            'dice' => $diceResult,
            'jail' => $jailResult,
            'movement' => $movementResult,
            'tileInteraction' => $tileInteraction,
            'bankruptcy' => $bankruptcyResult,
            'nextPlayer' => !$gameEnded ? [
                'id' => $game->getCurrentPlayer()->getId(),
                'name' => $game->getCurrentPlayer()->getName(),
            ] : null,
            'gameFinished' => $game->isFinished(),
        ];
    }

    /**
     * Advance to the next active player.
     * Skips inactive (bankrupt) players.
     * 
     * @param Game $game The current game instance
     */
    private function advanceToNextActivePlayer(Game $game): void
    {
        $players = $game->getPlayers();
        $playerCount = count($players);
        $currentIndex = $game->getCurrentPlayerIndex();
        
        // Find next active player
        $attempts = 0;
        do {
            $game->nextTurn();
            $attempts++;
            
            // Safety check to prevent infinite loop
            if ($attempts > $playerCount) {
                break;
            }
        } while (!$game->getCurrentPlayer()->isActive() && $attempts < $playerCount);
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

    /**
     * Handle a turn for a player in jail.
     * 
     * Jail escape options:
     * 1. Roll doubles - immediate release and move
     * 2. After 3 turns - automatic release (must pay €50)
     * 
     * @param Player $player The player in jail
     * @param array $diceResult The dice roll result
     * @param \App\Entity\Bank $bank The game's bank
     * @return array Jail turn result
     */
    private function handleJailTurn(Player $player, array $diceResult, \App\Entity\Bank $bank): array
    {
        $player->incrementJailTurns();
        $isDoubles = $diceResult['dice1'] === $diceResult['dice2'];
        $jailFee = 50;
        $currentJailTurns = $player->getJailTurns();
        
        // Option 1: Rolled doubles - immediate release
        if ($isDoubles) {
            $player->releaseFromJail();
            
            return [
                'inJail' => false,
                'released' => true,
                'releaseMethod' => 'doubles',
                'turnsInJail' => $currentJailTurns,
                'message' => sprintf(
                    '%s gooide dubbel (%d-%d) en is bevrijd uit de gevangenis!',
                    $player->getName(),
                    $diceResult['dice1'],
                    $diceResult['dice2']
                ),
            ];
        }
        
        // Option 2: After 3 turns - automatic release (must pay)
        if ($currentJailTurns >= 3) {
            // Player must pay to get out
            $player->deductBalance($jailFee);
            $bank->addBalance($jailFee);
            $player->releaseFromJail();
            
            return [
                'inJail' => false,
                'released' => true,
                'releaseMethod' => 'max_turns',
                'paid' => $jailFee,
                'turnsInJail' => $currentJailTurns,
                'message' => sprintf(
                    '%s heeft 3 beurten in de gevangenis gezeten en moet €%d betalen om vrij te komen',
                    $player->getName(),
                    $jailFee
                ),
            ];
        }
        
        // Still in jail
        return [
            'inJail' => true,
            'released' => false,
            'turnsInJail' => $currentJailTurns,
            'turnsRemaining' => 3 - $currentJailTurns,
            'message' => sprintf(
                '%s zit in de gevangenis (beurt %d/3). Gooi dubbel om vrij te komen!',
                $player->getName(),
                $currentJailTurns
            ),
        ];
    }

    /**
     * Check if a player is bankrupt and handle bankruptcy.
     * A player is bankrupt if their balance is negative.
     * When bankrupt:
     * - Player becomes inactive
     * - All properties return to the bank (become available for purchase)
     * - Game ends only when one player remains
     * 
     * @param Game $game The current game instance
     * @param Player $player The player to check
     * @return array Bankruptcy result
     */
    private function checkBankruptcy(Game $game, Player $player): array
    {
        $isBankrupt = $player->getBalance() < 0;
        
        if ($isBankrupt) {
            // Mark player as inactive
            $player->setActive(false);
            
            // Return all properties to the bank
            $releasedProperties = [];
            foreach ($player->getProperties() as $property) {
                $property->setOwner(null);
                $releasedProperties[] = $property->getName();
            }
            $player->clearProperties();
            
            // Check if game should end (only 1 active player left)
            $activePlayers = array_filter($game->getPlayers(), fn($p) => $p->isActive());
            $activePlayerCount = count($activePlayers);
            
            $winner = null;
            $gameEnded = false;
            
            if ($activePlayerCount === 1) {
                // Game ends - one winner remains
                $game->finish();
                $gameEnded = true;
                $winner = reset($activePlayers); // Get the only remaining player
            } elseif ($activePlayerCount === 0) {
                // Edge case: all players bankrupt (shouldn't happen)
                $game->finish();
                $gameEnded = true;
            }
            
            return [
                'isBankrupt' => true,
                'bankruptPlayer' => [
                    'id' => $player->getId(),
                    'name' => $player->getName(),
                    'balance' => $player->getBalance(),
                ],
                'releasedProperties' => $releasedProperties,
                'activePlayers' => $activePlayerCount,
                'gameEnded' => $gameEnded,
                'winner' => $winner ? [
                    'id' => $winner->getId(),
                    'name' => $winner->getName(),
                    'balance' => $winner->getBalance(),
                ] : null,
                'message' => $gameEnded 
                    ? sprintf(
                        '%s is failliet! %s heeft gewonnen met €%s!',
                        $player->getName(),
                        $winner ? $winner->getName() : 'Niemand',
                        $winner ? number_format($winner->getBalance(), 0, ',', '.') : '0'
                    )
                    : sprintf(
                        '%s is failliet en uit het spel! %d speler(s) over.',
                        $player->getName(),
                        $activePlayerCount
                    ),
            ];
        }
        
        return [
            'isBankrupt' => false,
        ];
    }
}

