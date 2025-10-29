<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Bank Entity
 * 
 * Manages the bank's money reserves in the game. The bank provides
 * money to players (Go passing, property sales) and receives money
 * from players (property purchases, rent to unowned properties).
 * 
 * In this simplified version, the bank has unlimited funds.
 */
class Bank
{
    /**
     * The bank's current balance.
     * Theoretically unlimited, but tracked for game state visibility.
     */
    private int $balance;

    /**
     * Initialize the bank with starting capital.
     */
    public function __construct()
    {
        // Bank starts with substantial reserves (theoretically infinite)
        $this->balance = 1000000;
    }

    /**
     * Get the current bank balance.
     */
    public function getBalance(): int
    {
        return $this->balance;
    }

    /**
     * Add money to the bank (e.g., from property purchases, taxes).
     * 
     * @param int $amount Amount to add to bank balance
     */
    public function addBalance(int $amount): void
    {
        $this->balance += $amount;
    }

    /**
     * Remove money from the bank (e.g., for Go passing, salary payments).
     * 
     * @param int $amount Amount to deduct from bank balance
     */
    public function deductBalance(int $amount): void
    {
        $this->balance -= $amount;
    }

    /**
     * Check if the bank can deduct a certain amount.
     * In this game, the bank always has funds (returns true).
     * 
     * @param int $amount Amount to check
     * @return bool Always true (bank has unlimited funds)
     */
    public function canDeduct(int $amount): bool
    {
        return true; // Bank has unlimited funds in this version
    }
}

