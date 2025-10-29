<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Game Status Enumeration
 * 
 * Represents the current state of a Monopoly game:
 * - WAITING: Game created, waiting for players to join
 * - IN_PROGRESS: Game started, players taking turns
 * - FINISHED: Game completed (manually ended)
 */
enum GameStatus: string
{
    case WAITING = 'waiting';
    case IN_PROGRESS = 'in_progress';
    case FINISHED = 'finished';
}

