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
        // Property is unowned - offer to purchase
        if ($this->owner === null) {
            $canAfford = $player->getBalance() >= $this->price;
            
            return [
                'action' => 'property_available',
                'propertyName' => $this->name,
                'price' => $this->price,
                'canAfford' => $canAfford,
                'message' => $canAfford 
                    ? sprintf('%s kan %s kopen voor €%s', $player->getName(), $this->name, number_format($this->price, 0, ',', '.'))
                    : sprintf('%s heeft niet genoeg geld voor %s (kost €%s)', $player->getName(), $this->name, number_format($this->price, 0, ',', '.')),
            ];
        }

        // Property is owned by another player - pay rent
        if ($this->owner !== $player) {
            // Calculate rent (double if owner has monopoly)
            $actualRent = $this->calculateRent($game);
            
            $player->deductBalance($actualRent);
            $this->owner->addBalance($actualRent);

            return [
                'action' => 'rent_paid',
                'amount' => $actualRent,
                'beneficiary' => $this->owner->getName(),
                'property' => $this->name,
                'message' => sprintf('%s betaalde €%s huur aan %s voor %s', $player->getName(), number_format($actualRent, 0, ',', '.'), $this->owner->getName(), $this->name),
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

    public function setOwner(?Player $player): void
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

    /**
     * Calculate the actual rent for this property.
     * Rent is doubled if the owner has a monopoly (owns all properties of this color).
     * 
     * @param Game $game The current game instance
     * @return int The calculated rent amount
     */
    private function calculateRent(Game $game): int
    {
        if ($this->owner === null) {
            return 0;
        }

        // Check if owner has monopoly on this color group
        $hasMonopoly = $this->ownerHasMonopoly($game);

        // Double rent for monopoly
        return $hasMonopoly ? $this->rent * 2 : $this->rent;
    }

    /**
     * Check if the current owner has a monopoly on this property's color group.
     * 
     * @param Game $game The current game instance
     * @return bool True if owner owns all properties of this color
     */
    private function ownerHasMonopoly(Game $game): bool
    {
        if ($this->owner === null) {
            return false;
        }

        // Get all properties of the same color from the board
        $colorGroupProperties = [];
        foreach ($game->getBoard()->getTiles() as $tile) {
            if ($tile instanceof PropertyTile && $tile->getColor() === $this->color) {
                $colorGroupProperties[] = $tile;
            }
        }

        // Check if owner owns all properties in this color group
        foreach ($colorGroupProperties as $property) {
            if ($property->getOwner() !== $this->owner) {
                return false;
            }
        }

        return true;
    }
}

