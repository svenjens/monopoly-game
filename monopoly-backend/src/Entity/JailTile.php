<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Jail Tile
 * 
 * Represents the "Just Visiting" jail tile.
 * In this simplified version, landing on Jail has no effect.
 * Players are not stuck and can continue playing normally.
 * 
 * Note: This is different from "Go To Jail" which sends
 * players to this position.
 */
class JailTile extends Tile
{
    /**
     * Initialize the jail tile.
     * 
     * @param int $position Position on board (typically 10)
     */
    public function __construct(int $position)
    {
        parent::__construct($position, 'Jail / Just Visiting', TileType::JAIL);
    }

    /**
     * Handle player landing on or visiting jail.
     * No action required in this simplified version.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player at jail
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        return [
            'action' => 'jail_visit',
            'amount' => 0,
            'message' => sprintf('%s is just visiting Jail', $player->getName()),
        ];
    }
}

