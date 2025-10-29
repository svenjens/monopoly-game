<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Chance Tile
 * 
 * Player draws a Chance card when landing here.
 */
class ChanceTile extends Tile
{
    public function __construct(int $position, string $name = 'Kans')
    {
        parent::__construct($position, $name, TileType::CHANCE);
    }

    /**
     * Player lands on Chance tile and draws a card.
     * 
     * @param Player $player The player who landed
     * @param Game $game The current game
     * @param int $diceRoll The dice roll that brought player here
     * @return array Action result
     */
    public function onLand(Player $player, Game $game, int $diceRoll): array
    {
        // Draw a chance card from the game's chance deck
        $card = $game->drawChanceCard();
        
        if (!$card) {
            return [
                'action' => 'chance_no_card',
                'message' => sprintf('%s kwam op Kans, maar er zijn geen kaarten meer', $player->getName()),
            ];
        }

        // Execute the card action
        $result = $card->execute($player, $game);
        
        return $result;
    }
}

