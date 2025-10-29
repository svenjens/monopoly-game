<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Side Pot Entity
 * 
 * Accumulates tax money from Income Tax and Luxury Tax tiles.
 * When a player lands on Free Parking, they collect all money
 * in the side pot.
 * 
 * This is a house rule variation not in the official Monopoly rules,
 * but commonly played and included in this version.
 */
class SidePot
{
    /**
     * The current amount of money in the side pot.
     */
    private int $balance;

    /**
     * Initialize an empty side pot.
     */
    public function __construct()
    {
        $this->balance = 0;
    }

    /**
     * Get the current side pot balance.
     */
    public function getBalance(): int
    {
        return $this->balance;
    }

    /**
     * Add tax money to the side pot.
     * Called when a player pays Income Tax or Luxury Tax.
     * 
     * @param int $amount Tax amount to add
     */
    public function addTax(int $amount): void
    {
        $this->balance += $amount;
    }

    /**
     * Add money to the side pot.
     * Generic method for adding money (taxes, fines, etc.)
     * 
     * @param int $amount Amount to add
     */
    public function addBalance(int $amount): void
    {
        $this->balance += $amount;
    }

    /**
     * Collect all money from the side pot.
     * Called when a player lands on Free Parking.
     * Resets the pot to zero and returns the collected amount.
     * 
     * @return int The total amount collected
     */
    public function collectAll(): int
    {
        $amount = $this->balance;
        $this->balance = 0;
        return $amount;
    }

    /**
     * Reset the side pot to zero.
     * Useful for game initialization or debugging.
     */
    public function reset(): void
    {
        $this->balance = 0;
    }
}

