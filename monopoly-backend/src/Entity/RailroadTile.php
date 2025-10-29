<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Railroad Tile
 * 
 * Special property that represents railroad stations.
 * Rent doubles for each railroad owned by the same player:
 * - 1 railroad: base rent (25)
 * - 2 railroads: 2x base rent (50)
 * - 3 railroads: 4x base rent (100)
 * - 4 railroads: 8x base rent (200)
 */
class RailroadTile extends Tile
{
    /**
     * Base purchase price for all railroads.
     */
    private const BASE_PRICE = 200;

    /**
     * Base rent when owning 1 railroad.
     */
    private const BASE_RENT = 25;

    /**
     * The player who owns this railroad (null if unowned).
     */
    private ?Player $owner = null;

    /**
     * Initialize a railroad tile.
     * 
     * @param int $position Position on board
     * @param string $name Railroad name (e.g., "Reading Railroad")
     */
    public function __construct(int $position, string $name)
    {
        parent::__construct($position, $name, TileType::RAILROAD);
    }

    /**
     * Handle player landing on this railroad.
     * 
     * If unowned and player has sufficient balance, auto-purchase.
     * If owned by another player, pay rent based on railroad count.
     * If owned by landing player, no action.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on this railroad
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Railroad is unowned - attempt to purchase
        if ($this->owner === null) {
            if ($player->getBalance() >= self::BASE_PRICE) {
                // Auto-purchase railroad
                $player->deductBalance(self::BASE_PRICE);
                $game->getBank()->addBalance(self::BASE_PRICE);
                $this->owner = $player;
                $player->addProperty($this);

                return [
                    'action' => 'railroad_purchased',
                    'amount' => self::BASE_PRICE,
                    'property' => $this->name,
                    'message' => sprintf('%s kocht %s voor €%s', $player->getName(), $this->name, number_format(self::BASE_PRICE, 0, ',', '.')),
                ];
            }

            // Cannot afford railroad
            return [
                'action' => 'insufficient_funds',
                'amount' => 0,
                'message' => sprintf('%s cannot afford %s (costs %d)', $player->getName(), $this->name, self::BASE_PRICE),
            ];
        }

        // Railroad is owned by another player - pay rent
        if ($this->owner !== $player) {
            $railroadCount = $this->owner->getRailroadCount();
            $rent = $this->getRent($railroadCount);
            
            $player->deductBalance($rent);
            $this->owner->addBalance($rent);

            return [
                'action' => 'rent_paid',
                'amount' => $rent,
                'beneficiary' => $this->owner->getName(),
                'property' => $this->name,
                'railroadCount' => $railroadCount,
                'message' => sprintf('%s betaalde €%s huur aan %s voor %s (%d stations)', 
                    $player->getName(), number_format($rent, 0, ',', '.'), $this->owner->getName(), $this->name, $railroadCount),
            ];
        }

        // Player owns this railroad - no action
        return [
            'action' => 'own_property',
            'amount' => 0,
            'message' => sprintf('%s kwam op eigen station (%s)', $player->getName(), $this->name),
        ];
    }

    /**
     * Calculate rent based on number of railroads owned.
     * Rent doubles for each additional railroad.
     * 
     * @param int $railroadCount Number of railroads owned by the same player
     * @return int Calculated rent amount
     */
    public function getRent(int $railroadCount): int
    {
        return match($railroadCount) {
            1 => self::BASE_RENT,
            2 => self::BASE_RENT * 2,
            3 => self::BASE_RENT * 4,
            4 => self::BASE_RENT * 8,
            default => self::BASE_RENT,
        };
    }

    public function getPrice(): int
    {
        return self::BASE_PRICE;
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

