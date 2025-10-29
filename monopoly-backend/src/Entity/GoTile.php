<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Go Tile
 * 
 * The starting tile on the Monopoly board (position 0).
 * Players receive money when passing Go (200) or landing on it (400).
 * 
 * The passing bonus is handled separately in the GameEngine when
 * detecting circular board movement.
 */
class GoTile extends Tile
{
    /**
     * Amount given when passing Go (not landing).
     */
    private const PASS_AMOUNT = 200;

    /**
     * Amount given when landing directly on Go.
     */
    private const LAND_AMOUNT = 400;

    /**
     * Initialize the Go tile.
     * 
     * @param int $position Position on board (typically 0)
     */
    public function __construct(int $position = 0)
    {
        parent::__construct($position, 'Go', TileType::GO);
    }

    /**
     * Handle player landing on Go.
     * Player receives the land amount (400) from the bank.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on Go
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Give player the land bonus
        $player->addBalance(self::LAND_AMOUNT);
        $game->getBank()->deductBalance(self::LAND_AMOUNT);

        return [
            'action' => 'go_land',
            'amount' => self::LAND_AMOUNT,
            'message' => sprintf('%s landed on Go and collected %d!', $player->getName(), self::LAND_AMOUNT),
        ];
    }

    /**
     * Get the amount given when passing Go.
     */
    public function getPassAmount(): int
    {
        return self::PASS_AMOUNT;
    }

    /**
     * Get the amount given when landing on Go.
     */
    public function getLandAmount(): int
    {
        return self::LAND_AMOUNT;
    }
}

