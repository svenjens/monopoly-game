<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\PlayerToken;
use Symfony\Component\Uid\Uuid;

/**
 * Player Entity
 * 
 * Represents a player in the Monopoly game.
 * Tracks balance, position, token, properties, and activity status.
 */
class Player
{
    /**
     * Starting balance for all players.
     */
    private const STARTING_BALANCE = 1500;

    /**
     * Starting position on the board (Go tile).
     */
    private const STARTING_POSITION = 0;

    /**
     * Unique player identifier.
     */
    private string $id;

    /**
     * Player's display name.
     */
    private string $name;

    /**
     * Current money balance.
     */
    private int $balance;

    /**
     * Current position on board (0-39).
     */
    private int $position;

    /**
     * The token representing this player on the board.
     */
    private PlayerToken $token;

    /**
     * Properties owned by this player (includes PropertyTile, RailroadTile, UtilityTile).
     */
    private array $properties = [];

    /**
     * Whether this player is active in the game.
     */
    private bool $isActive;

    /**
     * Initialize a new player.
     * 
     * @param string $name Player's name
     * @param PlayerToken $token Player's chosen token
     */
    public function __construct(string $name, PlayerToken $token)
    {
        $this->id = Uuid::v4()->toRfc4122();
        $this->name = $name;
        $this->token = $token;
        $this->balance = self::STARTING_BALANCE;
        $this->position = self::STARTING_POSITION;
        $this->isActive = true;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Get the player's current balance.
     */
    public function getBalance(): int
    {
        return $this->balance;
    }

    /**
     * Add money to the player's balance.
     * 
     * @param int $amount Amount to add
     */
    public function addBalance(int $amount): void
    {
        $this->balance += $amount;
    }

    /**
     * Deduct money from the player's balance.
     * Allows negative balances in this simplified version.
     * 
     * @param int $amount Amount to deduct
     */
    public function deductBalance(int $amount): void
    {
        $this->balance -= $amount;
    }

    /**
     * Get the player's current board position.
     */
    public function getPosition(): int
    {
        return $this->position;
    }

    /**
     * Set the player's board position directly.
     * Used for special movements like Go To Jail.
     * 
     * @param int $position New position (0-39)
     */
    public function setPosition(int $position): void
    {
        $this->position = $position;
    }

    /**
     * Move the player forward by a number of spaces.
     * Handles circular board wrapping.
     * 
     * @param int $spaces Number of spaces to move forward
     * @return int New position after moving
     */
    public function move(int $spaces): int
    {
        $this->position = ($this->position + $spaces) % 40;
        return $this->position;
    }

    /**
     * Get the player's token.
     */
    public function getToken(): PlayerToken
    {
        return $this->token;
    }

    /**
     * Get all properties owned by this player.
     * 
     * @return array Array of Tile objects (PropertyTile, RailroadTile, UtilityTile)
     */
    public function getProperties(): array
    {
        return $this->properties;
    }

    /**
     * Add a property to this player's ownership.
     * 
     * @param Tile $property The property tile to add
     */
    public function addProperty(Tile $property): void
    {
        $this->properties[] = $property;
    }

    /**
     * Check if player owns a specific property.
     * 
     * @param Tile $property The property to check
     * @return bool True if owned, false otherwise
     */
    public function hasProperty(Tile $property): bool
    {
        return in_array($property, $this->properties, true);
    }

    /**
     * Get the total number of properties owned.
     */
    public function getPropertyCount(): int
    {
        return count(array_filter($this->properties, fn($p) => $p instanceof PropertyTile));
    }

    /**
     * Get the number of railroads owned.
     */
    public function getRailroadCount(): int
    {
        return count(array_filter($this->properties, fn($p) => $p instanceof RailroadTile));
    }

    /**
     * Get the number of utilities owned.
     */
    public function getUtilityCount(): int
    {
        return count(array_filter($this->properties, fn($p) => $p instanceof UtilityTile));
    }

    /**
     * Check if the player is active.
     */
    public function isActive(): bool
    {
        return $this->isActive;
    }

    /**
     * Set the player's active status.
     * 
     * @param bool $isActive Active status
     */
    public function setActive(bool $isActive): void
    {
        $this->isActive = $isActive;
    }
}

