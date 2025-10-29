<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Free Parking Tile
 * 
 * When a player lands on Free Parking, they collect all money
 * from the Side Pot (accumulated from tax payments).
 * 
 * This is a house rule variation, not in official Monopoly rules,
 * but commonly played and included in this version for fun.
 */
class FreeParkingTile extends Tile
{
    /**
     * Initialize the Free Parking tile.
     * 
     * @param int $position Position on board (typically 20)
     */
    public function __construct(int $position)
    {
        parent::__construct($position, 'Free Parking', TileType::FREE_PARKING);
    }

    /**
     * Handle player landing on Free Parking.
     * Player collects all money from the side pot.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on Free Parking
     * @return array Interaction result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Collect all money from side pot
        $amount = $game->getSidePot()->collectAll();
        
        if ($amount > 0) {
            $player->addBalance($amount);
            
            return [
                'action' => 'free_parking_collected',
                'amount' => $amount,
                'message' => sprintf('%s kwam op Vrij Parkeren en ontving €%s uit de pot!', 
                    $player->getName(), number_format($amount, 0, ',', '.')),
            ];
        }

        // Side pot was empty
        return [
            'action' => 'free_parking_empty',
            'amount' => 0,
            'message' => sprintf('%s kwam op Vrij Parkeren, maar de pot is leeg', $player->getName()),
        ];
    }
}

