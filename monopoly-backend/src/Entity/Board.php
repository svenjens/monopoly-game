<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Board Entity
 * 
 * Represents the Monopoly game board with 40 tiles arranged in a circle.
 * Initializes all tiles with their positions, names, prices, and rents.
 * 
 * Board layout (simplified Monopoly):
 * - Position 0: Go
 * - Positions 1-39: Various properties, railroads, utilities, taxes, etc.
 */
class Board
{
    /**
     * Total number of tiles on the board.
     */
    private const TILE_COUNT = 40;

    /**
     * Array of all tiles on the board.
     * 
     * @var Tile[]
     */
    private array $tiles = [];

    /**
     * Initialize the board with all 40 tiles.
     */
    public function __construct()
    {
        $this->initializeTiles();
    }

    /**
     * Initialize all tiles on the board.
     * Creates the standard Monopoly board layout (simplified).
     */
    private function initializeTiles(): void
    {
        $this->tiles = [
            // Position 0
            0 => new GoTile(0),
            
            // Positions 1-9
            1 => new PropertyTile(1, 'Mediterranean Avenue', 'brown', 60, 2),
            2 => new TaxTile(2, 'Community Chest', 0), // Simplified: no action
            3 => new PropertyTile(3, 'Baltic Avenue', 'brown', 60, 4),
            4 => new TaxTile(4, 'Income Tax', 200),
            5 => new RailroadTile(5, 'Reading Railroad'),
            6 => new PropertyTile(6, 'Oriental Avenue', 'light_blue', 100, 6),
            7 => new TaxTile(7, 'Chance', 0), // Simplified: no action
            8 => new PropertyTile(8, 'Vermont Avenue', 'light_blue', 100, 6),
            9 => new PropertyTile(9, 'Connecticut Avenue', 'light_blue', 120, 8),
            
            // Position 10
            10 => new JailTile(10),
            
            // Positions 11-19
            11 => new PropertyTile(11, 'St. Charles Place', 'pink', 140, 10),
            12 => new UtilityTile(12, 'Electric Company'),
            13 => new PropertyTile(13, 'States Avenue', 'pink', 140, 10),
            14 => new PropertyTile(14, 'Virginia Avenue', 'pink', 160, 12),
            15 => new RailroadTile(15, 'Pennsylvania Railroad'),
            16 => new PropertyTile(16, 'St. James Place', 'orange', 180, 14),
            17 => new TaxTile(17, 'Community Chest', 0), // Simplified: no action
            18 => new PropertyTile(18, 'Tennessee Avenue', 'orange', 180, 14),
            19 => new PropertyTile(19, 'New York Avenue', 'orange', 200, 16),
            
            // Position 20
            20 => new FreeParkingTile(20),
            
            // Positions 21-29
            21 => new PropertyTile(21, 'Kentucky Avenue', 'red', 220, 18),
            22 => new TaxTile(22, 'Chance', 0), // Simplified: no action
            23 => new PropertyTile(23, 'Indiana Avenue', 'red', 220, 18),
            24 => new PropertyTile(24, 'Illinois Avenue', 'red', 240, 20),
            25 => new RailroadTile(25, 'B&O Railroad'),
            26 => new PropertyTile(26, 'Atlantic Avenue', 'yellow', 260, 22),
            27 => new PropertyTile(27, 'Ventnor Avenue', 'yellow', 260, 22),
            28 => new UtilityTile(28, 'Water Works'),
            29 => new PropertyTile(29, 'Marvin Gardens', 'yellow', 280, 24),
            
            // Position 30
            30 => new GoToJailTile(30),
            
            // Positions 31-39
            31 => new PropertyTile(31, 'Pacific Avenue', 'green', 300, 26),
            32 => new PropertyTile(32, 'North Carolina Avenue', 'green', 300, 26),
            33 => new TaxTile(33, 'Community Chest', 0), // Simplified: no action
            34 => new PropertyTile(34, 'Pennsylvania Avenue', 'green', 320, 28),
            35 => new RailroadTile(35, 'Short Line'),
            36 => new TaxTile(36, 'Chance', 0), // Simplified: no action
            37 => new PropertyTile(37, 'Park Place', 'dark_blue', 350, 35),
            38 => new TaxTile(38, 'Luxury Tax', 100),
            39 => new PropertyTile(39, 'Boardwalk', 'dark_blue', 400, 50),
        ];
    }

    /**
     * Get all tiles on the board.
     * 
     * @return Tile[] Array of all 40 tiles
     */
    public function getTiles(): array
    {
        return $this->tiles;
    }

    /**
     * Get a specific tile by position.
     * 
     * @param int $position Position on board (0-39)
     * @return Tile The tile at that position
     * @throws \OutOfBoundsException If position is invalid
     */
    public function getTile(int $position): Tile
    {
        if ($position < 0 || $position >= self::TILE_COUNT) {
            throw new \OutOfBoundsException("Invalid tile position: {$position}");
        }

        return $this->tiles[$position];
    }

    /**
     * Get the total number of tiles on the board.
     */
    public function getTileCount(): int
    {
        return self::TILE_COUNT;
    }

    /**
     * Get all properties of a specific color.
     * 
     * @param string $color Color group name
     * @return PropertyTile[] Array of properties in that color
     */
    public function getPropertiesByColor(string $color): array
    {
        return array_filter(
            $this->tiles,
            fn($tile) => $tile instanceof PropertyTile && $tile->getColor() === $color
        );
    }
}

