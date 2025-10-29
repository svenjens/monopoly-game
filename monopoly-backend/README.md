# Monopoly Game Backend

PHP Symfony backend voor een vereenvoudigde Monopoly-game met REST API en WebSocket support voor real-time updates.

## 🚀 Features

- **REST API** voor game management (create, join, roll dice, get state)
- **WebSocket Server** voor real-time game updates
- **In-Memory Storage** - Geen database nodig
- **Complete Game Logic** - Alle Monopoly regels geïmplementeerd
- **PHPDoc Comments** - Volledige code documentatie
- **Type-safe** - Strict types en PHP 8.2 features

## 📋 Requirements

- PHP 8.2 of hoger
- Composer
- (Optional) Symfony CLI

## 🛠️ Installation

### Via Docker (Recommended)

```bash
# Zie hoofdproject README.md
docker-compose up
```

### Lokale Installation

```bash
# Install dependencies
composer install

# Copy environment file
cp .env .env.local

# (Optional) Update environment variables in .env.local
```

## 🎮 Running the Server

### Start REST API Server

```bash
# Option 1: Symfony CLI
symfony server:start

# Option 2: PHP built-in server
php -S localhost:8000 -t public/

# Option 3: Docker
docker-compose up backend
```

Server runs on: **http://localhost:8000**

### Start WebSocket Server

In a separate terminal:

```bash
# Start WebSocket server
php bin/console websocket:start
```

WebSocket server runs on: **ws://localhost:8080**

## 📡 API Endpoints

### Base URL: `http://localhost:8000/api/games`

#### 1. Create New Game

```http
POST /api/games
```

**Response:**
```json
{
  "success": true,
  "message": "Game created successfully",
  "data": {
    "id": "game-uuid",
    "status": "waiting",
    "players": [],
    "currentPlayerIndex": 0,
    ...
  }
}
```

#### 2. Get Game State

```http
GET /api/games/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "game-uuid",
    "status": "in_progress",
    "players": [...],
    "board": [...],
    "bank": {...},
    "sidePot": {...}
  }
}
```

#### 3. Add Player

```http
POST /api/games/{id}/players
Content-Type: application/json

{
  "name": "Player Name",
  "token": "car"
}
```

**Available Tokens:** boot, car, ship, thimble, hat, dog, wheelbarrow, iron

**Response:**
```json
{
  "success": true,
  "message": "Player added successfully",
  "data": {
    "player": {...},
    "game": {...}
  }
}
```

#### 4. Execute Turn (Roll Dice)

```http
POST /api/games/{id}/roll
```

**Response:**
```json
{
  "success": true,
  "message": "Turn executed successfully",
  "data": {
    "player": {...},
    "dice": {
      "dice1": 3,
      "dice2": 4,
      "total": 7
    },
    "movement": {
      "oldPosition": 5,
      "newPosition": 12,
      "passedGo": false
    },
    "tileInteraction": {
      "action": "property_purchased",
      "amount": 100,
      "message": "..."
    },
    "nextPlayer": {...},
    "gameState": {...}
  }
}
```

#### 5. Get Board State

```http
GET /api/games/{id}/board
```

#### 6. Delete Game

```http
DELETE /api/games/{id}
```

#### 7. List All Games

```http
GET /api/games
```

## 🔌 WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8080');
```

### Subscribe to Game Updates

```json
{
  "action": "subscribe",
  "gameId": "game-uuid"
}
```

### Unsubscribe from Game

```json
{
  "action": "unsubscribe",
  "gameId": "game-uuid"
}
```

### Ping/Pong (Keep-Alive)

```json
{
  "action": "ping"
}
```

### Events Received from Server

- `connected` - Initial connection confirmation
- `subscribed` - Subscription confirmation
- `unsubscribed` - Unsubscription confirmation
- `game:updated` - Game state changed
- `player:joined` - New player added
- `turn:started` - Turn beginning
- `dice:rolled` - Dice results
- `player:moved` - Player moved
- `property:purchased` - Property bought
- `rent:paid` - Rent paid
- `turn:ended` - Turn completed

**Event Format:**
```json
{
  "event": "player:moved",
  "gameId": "game-uuid",
  "data": {...},
  "timestamp": 1234567890
}
```

## 📂 Project Structure

```
monopoly-backend/
├── src/
│   ├── Command/              # Console commands
│   │   └── WebSocketServerCommand.php
│   ├── Controller/           # REST API endpoints
│   │   └── GameController.php
│   ├── DTO/                  # Data Transfer Objects
│   │   ├── GameStateDTO.php
│   │   └── TurnResultDTO.php
│   ├── Entity/               # Domain models
│   │   ├── Game.php
│   │   ├── Player.php
│   │   ├── Board.php
│   │   ├── Bank.php
│   │   ├── SidePot.php
│   │   ├── Tile.php          # Abstract base
│   │   ├── GoTile.php
│   │   ├── PropertyTile.php
│   │   ├── RailroadTile.php
│   │   ├── UtilityTile.php
│   │   ├── TaxTile.php
│   │   ├── JailTile.php
│   │   ├── FreeParkingTile.php
│   │   └── GoToJailTile.php
│   ├── Enum/                 # Enumerations
│   │   ├── GameStatus.php
│   │   ├── PlayerToken.php
│   │   └── TileType.php
│   ├── Repository/           # Data storage
│   │   └── GameRepository.php
│   ├── Service/              # Business logic
│   │   ├── DiceService.php
│   │   └── GameEngine.php
│   ├── Websocket/            # WebSocket server
│   │   └── GameWebSocketServer.php
│   └── Kernel.php            # Application kernel
├── config/                   # Configuration
│   ├── packages/
│   ├── routes.yaml
│   └── services.yaml
├── public/
│   └── index.php             # Entry point
├── composer.json             # Dependencies
├── .env                      # Environment variables
└── README.md                 # This file
```

## 🎲 Game Logic

### Board Layout

40 tiles in circular layout (positions 0-39):
- **Position 0**: Go
- **Positions 1-39**: Properties, Railroads, Utilities, Taxes, Special tiles

### Turn Flow

1. Player rolls two dice (1-6 each)
2. Player moves forward by sum of dice
3. Check if player passed Go → +200
4. Handle tile landing:
   - **Property**: Auto-purchase if unowned and affordable, or pay rent
   - **Railroad**: Rent doubles per railroad owned (25, 50, 100, 200)
   - **Utility**: Rent = dice roll × (4 or 10)
   - **Tax**: Payment goes to Side Pot
   - **Free Parking**: Collect Side Pot
   - **Go To Jail**: Move to Jail position
5. Advance to next player

### Game Rules

- **Starting Balance**: 1500 per player
- **Go Bonus**: 200 when passing, 400 when landing
- **Negative Balances**: Allowed (no game over)
- **Players**: 2-4 required
- **Auto-Purchase**: Properties bought automatically if affordable

## 🧪 Testing

```bash
# Run PHPUnit tests (if implemented)
php bin/phpunit

# Test REST API
curl http://localhost:8000/api/games

# Test WebSocket
# Use a WebSocket client like wscat:
wscat -c ws://localhost:8080
```

## 🔧 Configuration

### Environment Variables (.env)

```env
APP_ENV=dev
APP_SECRET=your-secret-key

WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_PORT=8080

CORS_ALLOW_ORIGIN=^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$
```

### Services Configuration (config/services.yaml)

```yaml
services:
    App\Repository\GameRepository:
        shared: true  # Singleton for in-memory storage
        
    App\Service\GameEngine:
        arguments:
            $diceService: '@App\Service\DiceService'
```

## 📝 Development Notes

### In-Memory Storage

Games are stored in a PHP array in `GameRepository`. All data is lost on server restart. For production:

- Consider using Redis/Memcached
- Implement persistence layer
- Add session management

### Game Cleanup

Inactive games (2 hours) can be cleaned up:

```php
$gameRepository->cleanupInactive();
```

Consider running this as a cron job or middleware.

### Adding New Tile Types

1. Create new class extending `Tile`
2. Implement `onLand(Game $game, Player $player): array`
3. Add to `Board::initializeTiles()`
4. Add to `TileType` enum

## 📚 Additional Documentation

- [Main Project README](../README.md) - Project overview
- [Frontend README](../monopoly-frontend/README.md) - Next.js frontend docs
- [UML Diagram](../README.md#uml-class-diagram) - Class structure

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### WebSocket Connection Failed

- Check firewall settings
- Ensure WebSocket server is running
- Verify correct port (8080)
- Check CORS configuration

### Composer Install Fails

```bash
# Update composer
composer self-update

# Clear cache
composer clear-cache

# Install with verbose output
composer install -vvv
```

## 📄 License

MIT License - See main project README for details.

---

**Backend Status**: ✅ Complete and Ready

For complete project setup including Docker, see [main README](../README.md).

