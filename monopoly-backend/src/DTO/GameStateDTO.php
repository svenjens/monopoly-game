<?php

declare(strict_types=1);

namespace App\DTO;

use App\Entity\Game;

/**
 * Game State Data Transfer Object
 * 
 * Serializable representation of the complete game state.
 * Used for API responses to send game data to clients.
 */
class GameStateDTO
{
    public string $id;
    public string $status;
    public array $players;
    public int $currentPlayerIndex;
    public array $board;
    public int $bankBalance;
    public int $sidePotBalance;
    public string $createdAt;
    public string $lastActivityAt;

    /**
     * Create a DTO from a Game entity.
     * 
     * @param Game $game The game entity to convert
     * @return self
     */
    public static function fromGame(Game $game): self
    {
        $dto = new self();
        $dto->id = $game->getId();
        $dto->status = $game->getStatus()->value;
        $dto->currentPlayerIndex = $game->getCurrentPlayerIndex();
        $dto->bankBalance = $game->getBank()->getBalance();
        $dto->sidePotBalance = $game->getSidePot()->getBalance();
        $dto->createdAt = $game->getCreatedAt()->format('Y-m-d H:i:s');
        $dto->lastActivityAt = $game->getLastActivityAt()->format('Y-m-d H:i:s');

        // Convert players to array
        $dto->players = array_map(function($player) {
            return [
                'id' => $player->getId(),
                'name' => $player->getName(),
                'balance' => $player->getBalance(),
                'position' => $player->getPosition(),
                'token' => $player->getToken()->value,
                'propertyCount' => count($player->getProperties()),
                'railroadCount' => $player->getRailroadCount(),
                'utilityCount' => $player->getUtilityCount(),
                'isActive' => $player->isActive(),
                'inJail' => $player->isInJail(),
                'jailTurns' => $player->getJailTurns(),
            ];
        }, $game->getPlayers());

        // Convert board tiles to array (simplified)
        $dto->board = array_map(function($tile) {
            $tileData = [
                'position' => $tile->getPosition(),
                'name' => $tile->getName(),
                'type' => $tile->getType()->value,
            ];

            // Add property-specific data if applicable
            if (method_exists($tile, 'getPrice')) {
                $tileData['price'] = $tile->getPrice();
            }
            if (method_exists($tile, 'getRent')) {
                // For PropertyTile, getRent() has no parameters
                // For RailroadTile and UtilityTile, we'll show base rent
                if ($tile instanceof \App\Entity\PropertyTile) {
                    $tileData['rent'] = $tile->getRent();
                } elseif ($tile instanceof \App\Entity\RailroadTile) {
                    $tileData['rent'] = $tile->getRent(1); // Base rent for 1 railroad
                } elseif ($tile instanceof \App\Entity\UtilityTile) {
                    $tileData['rent'] = $tile->getRent(7, 1); // Base rent: dice roll 7, 1 utility
                }
            }
            if (method_exists($tile, 'getColor')) {
                $tileData['color'] = $tile->getColor();
            }
            if (method_exists($tile, 'getOwner')) {
                $owner = $tile->getOwner();
                $tileData['owner'] = $owner ? $owner->getId() : null;
            }
            if (method_exists($tile, 'getHouses')) {
                $tileData['houses'] = $tile->getHouses();
            }
            if (method_exists($tile, 'getBuildCost')) {
                $tileData['buildCost'] = $tile->getBuildCost();
            }

            return $tileData;
        }, $game->getBoard()->getTiles());

        return $dto;
    }

    /**
     * Convert to array for JSON serialization.
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'players' => $this->players,
            'currentPlayerIndex' => $this->currentPlayerIndex,
            'board' => $this->board,
            'bank' => [
                'balance' => $this->bankBalance,
            ],
            'sidePot' => [
                'balance' => $this->sidePotBalance,
            ],
            'createdAt' => $this->createdAt,
            'lastActivityAt' => $this->lastActivityAt,
        ];
    }
}

