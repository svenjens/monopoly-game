<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\TileType;

/**
 * Abstract Tile Class
 * 
 * Base class for all board tiles in the Monopoly game.
 * Each tile has a position, name, and type, and implements
 * specific behavior when a player lands on it.
 * 
 * This is an abstract class that must be extended by concrete
 * tile implementations (GoTile, PropertyTile, etc.).
 */
abstract class Tile
{
    /**
     * The tile's position on the board (0-39).
     */
    protected int $position;

    /**
     * The tile's display name.
     */
    protected string $name;

    /**
     * The tile's type (from TileType enum).
     */
    protected TileType $type;

    /**
     * Initialize a tile with position and name.
     * 
     * @param int $position Position on board (0-39)
     * @param string $name Display name of the tile
     * @param TileType $type Type of tile
     */
    public function __construct(int $position, string $name, TileType $type)
    {
        $this->position = $position;
        $this->name = $name;
        $this->type = $type;
    }

    /**
     * Get the tile's position on the board.
     */
    public function getPosition(): int
    {
        return $this->position;
    }

    /**
     * Get the tile's display name.
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Get the tile's type.
     */
    public function getType(): TileType
    {
        return $this->type;
    }

    /**
     * Handle player landing on this tile.
     * Must be implemented by each concrete tile class.
     * 
     * @param Game $game The current game instance
     * @param Player $player The player who landed on this tile
     * @return array Interaction result with action details
     */
    abstract public function onLand(Game $game, Player $player): array;
}

