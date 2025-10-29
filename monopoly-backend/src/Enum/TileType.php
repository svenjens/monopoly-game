<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Tile Type Enumeration
 * 
 * Categorizes the different types of tiles on the Monopoly board.
 * Each tile type has specific behavior when a player lands on it.
 */
enum TileType: string
{
    case GO = 'go';
    case PROPERTY = 'property';
    case RAILROAD = 'railroad';
    case UTILITY = 'utility';
    case TAX = 'tax';
    case CHANCE = 'chance';
    case COMMUNITY_CHEST = 'community_chest';
    case JAIL = 'jail';
    case FREE_PARKING = 'free_parking';
    case GO_TO_JAIL = 'go_to_jail';
}

