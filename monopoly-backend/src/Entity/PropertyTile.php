<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Property Tile
 * 
 * Represents a standard property on the Monopoly board.
 * Properties can be purchased by players and generate rent
 * when other players land on them.
 * 
 * Properties are grouped by color, though color groups don't
 * affect rent in this simplified version (no rent multipliers).
 */
class PropertyTile extends Tile
{
    /**
     * The color group of this property (e.g., 'brown', 'light_blue').
     */
    private string $color;

    /**
     * The purchase price of this property.
     */
    private int $price;

    /**
     * The base rent amount charged to players who land here.
     */
    private int $rent;

    /**
     * The player who owns this property (null if unowned).
     */
    private ?Player $owner = null;

    /**
     * Initialize a property tile.
     * 
     * @param int $position Position on board
     * @param string $name Property name
     * @param string $color Color group
     * @param int $price Purchase price
     * @param int $rent Base rent amount
     */
    public function __construct(int $position, string $name, string $color, int $price, int $rent)
    {
        parent::__construct($position, $name, TileType::PROPERTY);
        $this->color = $color;
        $this->price = $price;
        $this->rent = $rent;
    }

    /**
     * Handle player landing on this property.
     * 
     * If unowned and player has sufficient balance, auto-purchase.
     * If owned by another player, pay rent.
     * If owned by landing player, no action.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on this property
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Property is unowned - attempt to purchase
        if ($this->owner === null) {
            if ($player->getBalance() >= $this->price) {
                // Auto-purchase property
                $player->deductBalance($this->price);
                $game->getBank()->addBalance($this->price);
                $this->owner = $player;
                $player->addProperty($this);

                return [
                    'action' => 'property_purchased',
                    'amount' => $this->price,
                    'property' => $this->name,
                    'message' => sprintf('%s kocht %s voor €%s', $player->getName(), $this->name, number_format($this->price, 0, ',', '.')),
                ];
            }

            // Cannot afford property
            return [
                'action' => 'insufficient_funds',
                'amount' => 0,
                'message' => sprintf('%s cannot afford %s (costs %d)', $player->getName(), $this->name, $this->price),
            ];
        }

        // Property is owned by another player - pay rent
        if ($this->owner !== $player) {
            $player->deductBalance($this->rent);
            $this->owner->addBalance($this->rent);

            return [
                'action' => 'rent_paid',
                'amount' => $this->rent,
                'beneficiary' => $this->owner->getName(),
                'property' => $this->name,
                'message' => sprintf('%s betaalde €%s huur aan %s voor %s', $player->getName(), number_format($this->rent, 0, ',', '.'), $this->owner->getName(), $this->name),
            ];
        }

        // Player owns this property - no action
        return [
            'action' => 'own_property',
            'amount' => 0,
            'message' => sprintf('%s kwam op eigen terrein (%s)', $player->getName(), $this->name),
        ];
    }

    public function getColor(): string
    {
        return $this->color;
    }

    public function getPrice(): int
    {
        return $this->price;
    }

    public function getRent(): int
    {
        return $this->rent;
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

    public function canBePurchased(Player $player): bool
    {
        return $this->owner === null && $player->getBalance() >= $this->price;
    }
}

