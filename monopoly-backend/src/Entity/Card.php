<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Card
 * 
 * Represents a Chance or Community Chest card.
 * Cards can move players, give/take money, or trigger special actions.
 */
class Card
{
    /**
     * Card type: 'chance' or 'community_chest'
     */
    private string $type;

    /**
     * Card description in Dutch
     */
    private string $description;

    /**
     * Action to perform when card is drawn
     */
    private string $action;

    /**
     * Action parameters (e.g., amount for money, position for movement)
     */
    private array $params;

    /**
     * @param string $type 'chance' or 'community_chest'
     * @param string $description Dutch description shown to player
     * @param string $action Action type (e.g., 'collect', 'pay', 'move', 'move_to')
     * @param array $params Action parameters
     */
    public function __construct(string $type, string $description, string $action, array $params = [])
    {
        $this->type = $type;
        $this->description = $description;
        $this->action = $action;
        $this->params = $params;
    }

    /**
     * Execute the card's action on the player.
     * 
     * @param Player $player The player who drew the card
     * @param Game $game The current game
     * @return array Result of the card action
     */
    public function execute(Player $player, Game $game): array
    {
        switch ($this->action) {
            case 'collect':
                // Collect money from bank
                $amount = $this->params['amount'];
                $player->addBalance($amount);
                $game->getBank()->deductBalance($amount);
                
                return [
                    'action' => 'card_collect',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'amount' => $amount,
                    'message' => sprintf('%s trok een kaart: %s en ontving €%s', 
                        $player->getName(), 
                        $this->description,
                        number_format($amount, 0, ',', '.')
                    ),
                ];

            case 'pay':
                // Pay money to bank
                $amount = $this->params['amount'];
                $player->deductBalance($amount);
                $game->getBank()->addBalance($amount);
                
                return [
                    'action' => 'card_pay',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'amount' => $amount,
                    'message' => sprintf('%s trok een kaart: %s en betaalde €%s', 
                        $player->getName(), 
                        $this->description,
                        number_format($amount, 0, ',', '.')
                    ),
                ];

            case 'pay_to_pot':
                // Pay money to side pot (for Free Parking)
                $amount = $this->params['amount'];
                $player->deductBalance($amount);
                $game->getSidePot()->addBalance($amount);
                
                return [
                    'action' => 'card_pay_to_pot',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'amount' => $amount,
                    'message' => sprintf('%s trok een kaart: %s en betaalde €%s naar de pot', 
                        $player->getName(), 
                        $this->description,
                        number_format($amount, 0, ',', '.')
                    ),
                ];

            case 'move':
                // Move forward/backward X spaces
                $spaces = $this->params['spaces'];
                $oldPosition = $player->getPosition();
                $newPosition = ($oldPosition + $spaces) % 40;
                
                // Handle negative positions (wrap around)
                if ($newPosition < 0) {
                    $newPosition += 40;
                }
                
                $player->setPosition($newPosition);
                
                return [
                    'action' => 'card_move',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'spaces' => $spaces,
                    'oldPosition' => $oldPosition,
                    'newPosition' => $newPosition,
                    'message' => sprintf('%s trok een kaart: %s', 
                        $player->getName(), 
                        $this->description
                    ),
                ];

            case 'move_to':
                // Move to specific position
                $position = $this->params['position'];
                $oldPosition = $player->getPosition();
                $player->setPosition($position);
                
                // Check if player passed GO
                $passedGo = $position < $oldPosition;
                if ($passedGo) {
                    $goBonus = 200; // GO bonus amount
                    $player->addBalance($goBonus);
                    $game->getBank()->deductBalance($goBonus);
                }
                
                return [
                    'action' => 'card_move_to',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'position' => $position,
                    'oldPosition' => $oldPosition,
                    'passedGo' => $passedGo,
                    'message' => sprintf('%s trok een kaart: %s%s', 
                        $player->getName(), 
                        $this->description,
                        $passedGo ? ' (en passeerde Start!)' : ''
                    ),
                ];

            case 'go_to_jail':
                // Send player to jail
                $player->setPosition(10); // Jail position
                $player->setInJail(true);
                
                return [
                    'action' => 'card_go_to_jail',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'message' => sprintf('%s trok een kaart: %s', 
                        $player->getName(), 
                        $this->description
                    ),
                ];

            case 'get_out_of_jail_free':
                // Give player a "Get Out of Jail Free" card
                // For now, just give them money equivalent
                $player->addBalance(50);
                
                return [
                    'action' => 'card_jail_free',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'message' => sprintf('%s trok een kaart: %s', 
                        $player->getName(), 
                        $this->description
                    ),
                ];

            default:
                return [
                    'action' => 'card_unknown',
                    'cardType' => $this->type,
                    'description' => $this->description,
                    'message' => sprintf('%s trok een kaart: %s', 
                        $player->getName(), 
                        $this->description
                    ),
                ];
        }
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function getParams(): array
    {
        return $this->params;
    }

    /**
     * Convert card to array for JSON serialization.
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'description' => $this->description,
            'action' => $this->action,
            'params' => $this->params,
        ];
    }
}

