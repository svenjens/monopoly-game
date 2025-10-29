<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Utility Tile
 * 
 * Special property representing utilities (Electric Company, Water Works).
 * Rent is calculated based on the dice roll:
 * - 1 utility owned: rent = dice roll × 4
 * - 2 utilities owned: rent = dice roll × 10
 */
class UtilityTile extends Tile
{
    /**
     * Purchase price for all utilities.
     */
    private const PRICE = 150;

    /**
     * Rent multiplier when owning 1 utility.
     */
    private const SINGLE_MULTIPLIER = 4;

    /**
     * Rent multiplier when owning both utilities.
     */
    private const BOTH_MULTIPLIER = 10;

    /**
     * The player who owns this utility (null if unowned).
     */
    private ?Player $owner = null;

    /**
     * Initialize a utility tile.
     * 
     * @param int $position Position on board
     * @param string $name Utility name (e.g., "Electric Company")
     */
    public function __construct(int $position, string $name)
    {
        parent::__construct($position, $name, TileType::UTILITY);
    }

    /**
     * Handle player landing on this utility.
     * 
     * If unowned and player has sufficient balance, auto-purchase.
     * If owned by another player, pay rent based on dice roll and utility count.
     * If owned by landing player, no action.
     * 
     * Note: The dice roll from the turn must be passed in the game context
     * to calculate rent correctly.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on this utility
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Utility is unowned - attempt to purchase
        if ($this->owner === null) {
            if ($player->getBalance() >= self::PRICE) {
                // Auto-purchase utility
                $player->deductBalance(self::PRICE);
                $game->getBank()->addBalance(self::PRICE);
                $this->owner = $player;
                $player->addProperty($this);

                return [
                    'action' => 'utility_purchased',
                    'amount' => self::PRICE,
                    'property' => $this->name,
                    'message' => sprintf('%s kocht %s voor €%s', $player->getName(), $this->name, number_format(self::PRICE, 0, ',', '.')),
                ];
            }

            // Cannot afford utility
            return [
                'action' => 'insufficient_funds',
                'amount' => 0,
                'message' => sprintf('%s cannot afford %s (costs %d)', $player->getName(), $this->name, self::PRICE),
            ];
        }

        // Utility is owned by another player - pay rent
        if ($this->owner !== $player) {
            // Get the last dice roll from the game (stored in game state)
            $diceRoll = $game->getLastDiceRoll();
            $utilityCount = $this->owner->getUtilityCount();
            $rent = $this->getRent($diceRoll, $utilityCount);
            
            $player->deductBalance($rent);
            $this->owner->addBalance($rent);

            return [
                'action' => 'rent_paid',
                'amount' => $rent,
                'beneficiary' => $this->owner->getName(),
                'property' => $this->name,
                'diceRoll' => $diceRoll,
                'utilityCount' => $utilityCount,
                'message' => sprintf('%s betaalde €%s huur aan %s voor %s (worp %d, %d nutsbedrijven)', 
                    $player->getName(), number_format($rent, 0, ',', '.'), $this->owner->getName(), $this->name, $diceRoll, $utilityCount),
            ];
        }

        // Player owns this utility - no action
        return [
            'action' => 'own_property',
            'amount' => 0,
            'message' => sprintf('%s kwam op eigen nutsbedrijf (%s)', $player->getName(), $this->name),
        ];
    }

    /**
     * Calculate rent based on dice roll and number of utilities owned.
     * 
     * @param int $diceRoll The sum of the dice that brought player here
     * @param int $utilityCount Number of utilities owned by the same player (1 or 2)
     * @return int Calculated rent amount
     */
    public function getRent(int $diceRoll, int $utilityCount): int
    {
        $multiplier = $utilityCount === 2 ? self::BOTH_MULTIPLIER : self::SINGLE_MULTIPLIER;
        return $diceRoll * $multiplier;
    }

    public function getPrice(): int
    {
        return self::PRICE;
    }

    public function getOwner(): ?Player
    {
        return $this->owner;
    }

    public function setOwner(Player $player): void
    {
        $this->owner = $player;
    }

    public function isOwned(): bool
    {
        return $this->owner !== null;
    }
}

