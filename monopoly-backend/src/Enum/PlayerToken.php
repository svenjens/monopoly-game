<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Player Token Enumeration
 * 
 * Represents the different tokens that players can choose
 * to represent themselves on the game board. Each player
 * must have a unique token.
 */
enum PlayerToken: string
{
    case BOOT = 'boot';
    case CAR = 'car';
    case SHIP = 'ship';
    case THIMBLE = 'thimble';
    case HAT = 'hat';
    case DOG = 'dog';
    case WHEELBARROW = 'wheelbarrow';
    case IRON = 'iron';
}

