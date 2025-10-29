<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\GameStatus;
use App\Enum\PlayerToken;
use Symfony\Component\Uid\Uuid;

/**
 * Game Entity
 * 
 * Main game controller that manages the Monopoly game state.
 * Tracks players, board, bank, side pot, current turn, and game status.
 * 
 * This is the central entity that coordinates all game activities.
 */
class Game
{
    /**
     * Minimum number of players required.
     */
    private const MIN_PLAYERS = 2;

    /**
     * Maximum number of players allowed.
     */
    private const MAX_PLAYERS = 4;

    /**
     * Unique game identifier.
     */
    private string $id;

    /**
     * Players in this game.
     * 
     * @var Player[]
     */
    private array $players = [];

    /**
     * The game board with all tiles.
     */
    private Board $board;

    /**
     * Index of the current player (whose turn it is).
     */
    private int $currentPlayerIndex = 0;

    /**
     * The bank managing money flow.
     */
    private Bank $bank;

    /**
     * The side pot for tax collection.
     */
    private SidePot $sidePot;

    /**
     * Current game status.
     */
    private GameStatus $status;

    /**
     * Timestamp when game was created.
     */
    private \DateTimeImmutable $createdAt;

    /**
     * Timestamp of last activity (for cleanup).
     */
    private \DateTimeImmutable $lastActivityAt;

    /**
     * Last dice roll sum (stored for utility rent calculation).
     */
    private int $lastDiceRoll = 0;

    /**
     * Initialize a new game.
     */
    public function __construct()
    {
        $this->id = Uuid::v4()->toRfc4122();
        $this->board = new Board();
        $this->bank = new Bank();
        $this->sidePot = new SidePot();
        $this->status = GameStatus::WAITING;
        $this->createdAt = new \DateTimeImmutable();
        $this->lastActivityAt = new \DateTimeImmutable();
    }

    public function getId(): string
    {
        return $this->id;
    }

    /**
     * Add a player to the game.
     * 
     * @param string $name Player's name
     * @param PlayerToken $token Player's chosen token
     * @return Player The created player
     * @throws \RuntimeException If game is full or token already taken
     */
    public function addPlayer(string $name, PlayerToken $token): Player
    {
        if (!$this->canAddPlayer()) {
            throw new \RuntimeException('Game is full (max 4 players)');
        }

        if ($this->isStarted()) {
            throw new \RuntimeException('Cannot add players to a game in progress');
        }

        // Check if token is already taken
        foreach ($this->players as $player) {
            if ($player->getToken() === $token) {
                throw new \RuntimeException('Token already taken');
            }
        }

        $player = new Player($name, $token);
        $this->players[] = $player;
        $this->updateActivity();

        return $player;
    }

    /**
     * Get all players in the game.
     * 
     * @return Player[]
     */
    public function getPlayers(): array
    {
        return $this->players;
    }

    /**
     * Get the current player (whose turn it is).
     * 
     * @return Player
     * @throws \RuntimeException If game has no players
     */
    public function getCurrentPlayer(): Player
    {
        if (empty($this->players)) {
            throw new \RuntimeException('No players in game');
        }

        return $this->players[$this->currentPlayerIndex];
    }

    /**
     * Get the index of the current player.
     */
    public function getCurrentPlayerIndex(): int
    {
        return $this->currentPlayerIndex;
    }

    /**
     * Advance to the next player's turn.
     */
    public function nextTurn(): void
    {
        $this->currentPlayerIndex = ($this->currentPlayerIndex + 1) % count($this->players);
        $this->updateActivity();
    }

    public function getBoard(): Board
    {
        return $this->board;
    }

    public function getBank(): Bank
    {
        return $this->bank;
    }

    public function getSidePot(): SidePot
    {
        return $this->sidePot;
    }

    public function getStatus(): GameStatus
    {
        return $this->status;
    }

    /**
     * Start the game.
     * Requires minimum number of players.
     * 
     * @throws \RuntimeException If not enough players
     */
    public function start(): void
    {
        if (count($this->players) < self::MIN_PLAYERS) {
            throw new \RuntimeException('Need at least 2 players to start');
        }

        $this->status = GameStatus::IN_PROGRESS;
        $this->updateActivity();
    }

    /**
     * Check if the game has started.
     */
    public function isStarted(): bool
    {
        return $this->status === GameStatus::IN_PROGRESS;
    }

    /**
     * Check if more players can be added.
     */
    public function canAddPlayer(): bool
    {
        return count($this->players) < self::MAX_PLAYERS && !$this->isStarted();
    }

    /**
     * End the game.
     */
    public function finish(): void
    {
        $this->status = GameStatus::FINISHED;
        $this->updateActivity();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastActivityAt(): \DateTimeImmutable
    {
        return $this->lastActivityAt;
    }

    /**
     * Update the last activity timestamp.
     */
    public function updateActivity(): void
    {
        $this->lastActivityAt = new \DateTimeImmutable();
    }

    /**
     * Store the last dice roll (for utility rent calculation).
     * 
     * @param int $roll The sum of the dice
     */
    public function setLastDiceRoll(int $roll): void
    {
        $this->lastDiceRoll = $roll;
    }

    /**
     * Get the last dice roll.
     */
    public function getLastDiceRoll(): int
    {
        return $this->lastDiceRoll;
    }

    /**
     * Get a player by ID.
     * 
     * @param string $playerId Player's unique ID
     * @return Player|null The player if found, null otherwise
     */
    public function getPlayerById(string $playerId): ?Player
    {
        foreach ($this->players as $player) {
            if ($player->getId() === $playerId) {
                return $player;
            }
        }

        return null;
    }
}

