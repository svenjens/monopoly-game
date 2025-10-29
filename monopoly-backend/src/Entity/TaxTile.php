<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Tax Tile
 * 
 * Represents tax collection tiles (Income Tax, Luxury Tax).
 * When a player lands here, they must pay the specified tax amount.
 * Tax money goes to the Side Pot and can be collected at Free Parking.
 */
class TaxTile extends Tile
{
    /**
     * The tax amount to be paid.
     */
    private int $taxAmount;

    /**
     * Initialize a tax tile.
     * 
     * @param int $position Position on board
     * @param string $name Tax name (e.g., "Income Tax", "Luxury Tax")
     * @param int $taxAmount Amount of tax to pay
     */
    public function __construct(int $position, string $name, int $taxAmount)
    {
        parent::__construct($position, $name, TileType::TAX);
        $this->taxAmount = $taxAmount;
    }

    /**
     * Handle player landing on tax tile.
     * Player pays the tax amount, which goes to the side pot.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on this tax tile
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Deduct tax from player
        $player->deductBalance($this->taxAmount);
        
        // Add tax to side pot
        $game->getSidePot()->addTax($this->taxAmount);

        return [
            'action' => 'tax_paid',
            'amount' => $this->taxAmount,
            'message' => sprintf('%s paid %d in %s', $player->getName(), $this->taxAmount, $this->name),
        ];
    }

    /**
     * Get the tax amount for this tile.
     */
    public function getTaxAmount(): int
    {
        return $this->taxAmount;
    }
}

