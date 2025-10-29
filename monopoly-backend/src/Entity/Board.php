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
            
            // Positions 1-9 (Brown €50, Light Blue €50 per house)
            1 => new PropertyTile(1, 'Mediterranean Avenue', 'brown', 60, 2, 50),
            2 => new CommunityChestTile(2),
            3 => new PropertyTile(3, 'Baltic Avenue', 'brown', 60, 4, 50),
            4 => new TaxTile(4, 'Income Tax', 200),
            5 => new RailroadTile(5, 'Reading Railroad'),
            6 => new PropertyTile(6, 'Oriental Avenue', 'light_blue', 100, 6, 50),
            7 => new ChanceTile(7),
            8 => new PropertyTile(8, 'Vermont Avenue', 'light_blue', 100, 6, 50),
            9 => new PropertyTile(9, 'Connecticut Avenue', 'light_blue', 120, 8, 50),
            
            // Position 10
            10 => new JailTile(10),
            
            // Positions 11-19 (Pink €100, Orange €100 per house)
            11 => new PropertyTile(11, 'St. Charles Place', 'pink', 140, 10, 100),
            12 => new UtilityTile(12, 'Electric Company'),
            13 => new PropertyTile(13, 'States Avenue', 'pink', 140, 10, 100),
            14 => new PropertyTile(14, 'Virginia Avenue', 'pink', 160, 12, 100),
            15 => new RailroadTile(15, 'Pennsylvania Railroad'),
            16 => new PropertyTile(16, 'St. James Place', 'orange', 180, 14, 100),
            17 => new CommunityChestTile(17),
            18 => new PropertyTile(18, 'Tennessee Avenue', 'orange', 180, 14, 100),
            19 => new PropertyTile(19, 'New York Avenue', 'orange', 200, 16, 100),
            
            // Position 20
            20 => new FreeParkingTile(20),
            
            // Positions 21-29 (Red €150, Yellow €150 per house)
            21 => new PropertyTile(21, 'Kentucky Avenue', 'red', 220, 18, 150),
            22 => new ChanceTile(22),
            23 => new PropertyTile(23, 'Indiana Avenue', 'red', 220, 18, 150),
            24 => new PropertyTile(24, 'Illinois Avenue', 'red', 240, 20, 150),
            25 => new RailroadTile(25, 'B&O Railroad'),
            26 => new PropertyTile(26, 'Atlantic Avenue', 'yellow', 260, 22, 150),
            27 => new PropertyTile(27, 'Ventnor Avenue', 'yellow', 260, 22, 150),
            28 => new UtilityTile(28, 'Water Works'),
            29 => new PropertyTile(29, 'Marvin Gardens', 'yellow', 280, 24, 150),
            
            // Position 30
            30 => new GoToJailTile(30),
            
            // Positions 31-39 (Green €200, Dark Blue €200 per house)
            31 => new PropertyTile(31, 'Pacific Avenue', 'green', 300, 26, 200),
            32 => new PropertyTile(32, 'North Carolina Avenue', 'green', 300, 26, 200),
            33 => new CommunityChestTile(33),
            34 => new PropertyTile(34, 'Pennsylvania Avenue', 'green', 320, 28, 200),
            35 => new RailroadTile(35, 'Short Line'),
            36 => new ChanceTile(36),
            37 => new PropertyTile(37, 'Park Place', 'dark_blue', 350, 35, 200),
            38 => new TaxTile(38, 'Luxury Tax', 100),
            39 => new PropertyTile(39, 'Boardwalk', 'dark_blue', 400, 50, 200),
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

