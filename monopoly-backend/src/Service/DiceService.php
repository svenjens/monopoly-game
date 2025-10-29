<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Dice Service
 * 
 * Handles rolling of dice for the game.
 * Simulates two 6-sided dice with random number generation.
 */
class DiceService
{
    /**
     * Minimum value on a die.
     */
    private const MIN_VALUE = 1;

    /**
     * Maximum value on a die.
     */
    private const MAX_VALUE = 6;

    /**
     * Roll a single die.
     * 
     * @return int Random value between 1 and 6
     */
    public function roll(): int
    {
        return random_int(self::MIN_VALUE, self::MAX_VALUE);
    }

    /**
     * Roll two dice and return both values plus total.
     * 
     * @return array Array with keys: dice1, dice2, total
     */
    public function rollTwo(): array
    {
        $dice1 = $this->roll();
        $dice2 = $this->roll();

        return [
            'dice1' => $dice1,
            'dice2' => $dice2,
            'total' => $dice1 + $dice2,
        ];
    }
}

