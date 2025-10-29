<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Community Chest Tile
 * 
 * Player draws a Community Chest card when landing here.
 */
class CommunityChestTile extends Tile
{
    public function __construct(int $position, string $name = 'Algemeen Fonds')
    {
        parent::__construct($position, $name, TileType::COMMUNITY_CHEST);
    }

    /**
     * Player lands on Community Chest tile and draws a card.
     * 
     * @param Game $game The current game
     * @param Player $player The player who landed
     * @return array Action result
     */
    public function onLand(Game $game, Player $player): array
    {
        // Draw a community chest card from the game's community chest deck
        $card = $game->drawCommunityChestCard();
        
        if (!$card) {
            return [
                'action' => 'community_chest_no_card',
                'message' => sprintf('%s kwam op Algemeen Fonds, maar er zijn geen kaarten meer', $player->getName()),
            ];
        }

        // Execute the card action
        $result = $card->execute($player, $game);
        
        return $result;
    }
}

