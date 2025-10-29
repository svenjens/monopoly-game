<?php

declare(strict_types=1);

namespace App\DTO;

/**
 * Turn Result Data Transfer Object
 * 
 * Serializable representation of a turn execution result.
 * Contains dice roll, movement, tile interaction, and updated game state.
 */
class TurnResultDTO
{
    public array $player;
    public array $dice;
    public array $movement;
    public array $tileInteraction;
    public array $nextPlayer;
    public array $gameState;

    /**
     * Create a DTO from turn execution result.
     * 
     * @param array $turnResult Result from GameEngine::executeTurn()
     * @param GameStateDTO $gameState Current game state after turn
     * @return self
     */
    public static function fromTurnResult(array $turnResult, GameStateDTO $gameState): self
    {
        $dto = new self();
        $dto->player = $turnResult['player'];
        $dto->dice = $turnResult['dice'];
        $dto->movement = $turnResult['movement'];
        $dto->tileInteraction = $turnResult['tileInteraction'];
        $dto->nextPlayer = $turnResult['nextPlayer'];
        $dto->gameState = $gameState->toArray();

        return $dto;
    }

    /**
     * Convert to array for JSON serialization.
     */
    public function toArray(): array
    {
        return [
            'player' => $this->player,
            'dice' => $this->dice,
            'movement' => $this->movement,
            'tileInteraction' => $this->tileInteraction,
            'nextPlayer' => $this->nextPlayer,
            'gameState' => $this->gameState,
        ];
    }
}

