<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Go To Jail Tile
 * 
 * When a player lands here, they are moved to the Jail position.
 * In this simplified version, there's no penalty or being stuck,
 * just a forced movement to the Jail tile.
 */
class GoToJailTile extends Tile
{
    /**
     * The jail position on the board (typically 10).
     */
    private const JAIL_POSITION = 10;

    /**
     * Initialize the Go To Jail tile.
     * 
     * @param int $position Position on board (typically 30)
     */
    public function __construct(int $position)
    {
        parent::__construct($position, 'Go To Jail', TileType::GO_TO_JAIL);
    }

    /**
     * Handle player landing on Go To Jail.
     * Player is immediately moved to the Jail position.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on Go To Jail
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Move player directly to jail
        $player->setPosition(self::JAIL_POSITION);

        return [
            'action' => 'sent_to_jail',
            'amount' => 0,
            'newPosition' => self::JAIL_POSITION,
            'message' => sprintf('%s was sent to Jail!', $player->getName()),
        ];
    }

    /**
     * Get the jail position constant.
     */
    public function getJailPosition(): int
    {
        return self::JAIL_POSITION;
    }
}

