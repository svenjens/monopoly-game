# Monopoly Game - Vereenvoudigde Versie

Een moderne implementatie van een vereenvoudigde Monopoly-game met PHP Symfony backend en Next.js frontend. De game state wordt volledig in-memory opgeslagen zonder database.

## 🎮 Features

- **Turn-by-turn gameplay** voor 2-4 spelers
- **Real-time updates** via WebSockets
- **Moderne UI** met clean, modern design
- **Smooth animaties** met Framer Motion
- **Docker support** - Start met één command
- **In-memory storage** - Geen database nodig

## 🏗️ Architecture Overview

```mermaid
graph TB
    Frontend[Next.js Frontend<br/>Port 3000]
    Backend[Symfony Backend<br/>Port 8000]
    WebSocket[WebSocket Server<br/>Port 8080]
    
    Frontend -->|REST API| Backend
    Frontend -->|WebSocket| WebSocket
    Backend -->|Events| WebSocket
    
    style Frontend fill:#3b82f6
    style Backend fill:#8b5cf6
    style WebSocket fill:#6366f1
```

## 📊 UML Class Diagram

```mermaid
classDiagram
    %% Core Game Classes
    class Game {
        -string id
        -Player[] players
        -Board board
        -int currentPlayerIndex
        -Bank bank
        -SidePot sidePot
        -GameStatus status
        -DateTime createdAt
        -DateTime lastActivityAt
        +__construct()
        +getId() string
        +addPlayer(name: string, token: PlayerToken) Player
        +getPlayers() Player[]
        +getCurrentPlayer() Player
        +nextTurn() void
        +getBoard() Board
        +getBank() Bank
        +getSidePot() SidePot
        +getStatus() GameStatus
        +start() void
        +isStarted() bool
        +canAddPlayer() bool
    }

    class Player {
        -string id
        -string name
        -int balance
        -int position
        -PlayerToken token
        -PropertyTile[] properties
        -bool isActive
        +__construct(name: string, token: PlayerToken)
        +getId() string
        +getName() string
        +getBalance() int
        +addBalance(amount: int) void
        +deductBalance(amount: int) void
        +getPosition() int
        +setPosition(position: int) void
        +move(spaces: int) int
        +getToken() PlayerToken
        +getProperties() PropertyTile[]
        +addProperty(property: PropertyTile) void
        +hasProperty(property: PropertyTile) bool
        +getPropertyCount() int
        +getRailroadCount() int
        +getUtilityCount() int
        +isActive() bool
    }

    class Board {
        -Tile[] tiles
        +__construct()
        +getTiles() Tile[]
        +getTile(position: int) Tile
        +getTileCount() int
        +getPropertiesByColor(color: string) PropertyTile[]
    }

    class Bank {
        -int balance
        +__construct()
        +getBalance() int
        +addBalance(amount: int) void
        +deductBalance(amount: int) void
        +canDeduct(amount: int) bool
    }

    class SidePot {
        -int balance
        +__construct()
        +getBalance() int
        +addTax(amount: int) void
        +collectAll() int
        +reset() void
    }

    %% Tile Classes
    class Tile {
        <<abstract>>
        -int position
        -string name
        -TileType type
        +__construct(position: int, name: string)
        +getPosition() int
        +getName() string
        +getType() TileType
        +onLand(game: Game, player: Player)* void
    }

    class GoTile {
        -int passAmount
        -int landAmount
        +__construct(position: int)
        +onLand(game: Game, player: Player) void
        +getPassAmount() int
        +getLandAmount() int
    }

    class PropertyTile {
        -string color
        -int price
        -int rent
        -Player owner
        +__construct(position: int, name: string, color: string, price: int, rent: int)
        +onLand(game: Game, player: Player) void
        +getColor() string
        +getPrice() int
        +getRent() int
        +getOwner() Player|null
        +setOwner(player: Player) void
        +isOwned() bool
        +canBePurchased(player: Player) bool
    }

    class RailroadTile {
        -int basePrice
        -int baseRent
        -Player owner
        +__construct(position: int, name: string)
        +onLand(game: Game, player: Player) void
        +getPrice() int
        +getRent(railroadCount: int) int
        +getOwner() Player|null
        +setOwner(player: Player) void
        +isOwned() bool
    }

    class UtilityTile {
        -int price
        -Player owner
        +__construct(position: int, name: string)
        +onLand(game: Game, player: Player) void
        +getPrice() int
        +getRent(diceRoll: int, utilityCount: int) int
        +getOwner() Player|null
        +setOwner(player: Player) void
        +isOwned() bool
    }

    class TaxTile {
        -int taxAmount
        +__construct(position: int, name: string, amount: int)
        +onLand(game: Game, player: Player) void
        +getTaxAmount() int
    }

    class JailTile {
        +__construct(position: int)
        +onLand(game: Game, player: Player) void
    }

    class FreeParkingTile {
        +__construct(position: int)
        +onLand(game: Game, player: Player) void
    }

    class GoToJailTile {
        -int jailPosition
        +__construct(position: int)
        +onLand(game: Game, player: Player) void
    }

    %% Service Classes
    class GameEngine {
        -DiceService diceService
        +__construct(diceService: DiceService)
        +executeTurn(game: Game) TurnResult
        +rollDice() DiceResult
        +movePlayer(player: Player, spaces: int, board: Board) MovementResult
        +handleTileLanding(game: Game, player: Player, tile: Tile) TileInteractionResult
        -checkGoPass(oldPosition: int, newPosition: int) bool
        -handleGoPass(player: Player, bank: Bank) void
    }

    class DiceService {
        +roll() int
        +rollTwo() DiceResult
    }

    %% DTOs and Value Objects
    class DiceResult {
        +int dice1
        +int dice2
        +int total
        +__construct(dice1: int, dice2: int)
        +getTotal() int
    }

    class TurnResult {
        +Player player
        +DiceResult diceResult
        +MovementResult movement
        +TileInteractionResult interaction
        +Game gameState
        +__construct(...)
    }

    class MovementResult {
        +int oldPosition
        +int newPosition
        +bool passedGo
        +int goBonus
        +__construct(...)
    }

    class TileInteractionResult {
        +string action
        +int amount
        +Player beneficiary
        +string message
        +__construct(...)
    }

    %% Enums
    class GameStatus {
        <<enumeration>>
        WAITING
        IN_PROGRESS
        FINISHED
    }

    class PlayerToken {
        <<enumeration>>
        BOOT
        CAR
        SHIP
        THIMBLE
    }

    class TileType {
        <<enumeration>>
        GO
        PROPERTY
        RAILROAD
        UTILITY
        TAX
        JAIL
        FREE_PARKING
        GO_TO_JAIL
    }

    %% Relationships
    Game "1" --> "*" Player : has
    Game "1" --> "1" Board : has
    Game "1" --> "1" Bank : has
    Game "1" --> "1" SidePot : has
    Game "1" --> "1" GameStatus : has
    
    Board "1" --> "40" Tile : contains
    
    Player "1" --> "*" PropertyTile : owns
    Player "1" --> "1" PlayerToken : has
    
    PropertyTile --> Player : owned by
    RailroadTile --> Player : owned by
    UtilityTile --> Player : owned by
    
    Tile <|-- GoTile : extends
    Tile <|-- PropertyTile : extends
    Tile <|-- RailroadTile : extends
    Tile <|-- UtilityTile : extends
    Tile <|-- TaxTile : extends
    Tile <|-- JailTile : extends
    Tile <|-- FreeParkingTile : extends
    Tile <|-- GoToJailTile : extends
    
    Tile --> TileType : has
    
    GameEngine --> DiceService : uses
    GameEngine --> Game : operates on
    GameEngine --> TurnResult : returns
    
    TurnResult --> DiceResult : contains
    TurnResult --> MovementResult : contains
    TurnResult --> TileInteractionResult : contains
```

## 🎲 Game Rules

### General
- 2-4 spelers per game
- Circular board met 40 posities
- Start balance: 1500 per speler
- Negative balances zijn toegestaan (game eindigt niet)

### Tiles
- **Go** (Position 0): 200 bij passeren, 400 bij landen
- **Properties**: Automatisch kopen als balance toereikend is
- **Railroads**: Rent verdubbelt per railroad (1x, 2x, 4x, 8x)
- **Utilities**: Rent = dice roll × (4 voor 1 utility, 10 voor 2)
- **Tax**: Gaat naar Side Pot
- **Free Parking**: Collecteer Side Pot
- **Go To Jail**: Verplaatst naar Jail (geen penalty)
- **Jail**: Geen effect (niet stuck)

### Turn Flow
1. Speler gooit 2 dobbelstenen
2. Token beweegt (position + sum) % 40
3. Check Go passing → +200
4. Handle tile landing (purchase/rent/tax/etc.)
5. Volgende speler aan de beurt

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) PHP 8.2+ en Composer voor lokale backend development
- (Optional) Node 20+ voor lokale frontend development

### One Command Start

```bash
# Clone or navigate to project directory
cd monopoly-game

# Start all services with Docker Compose
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

De applicatie is beschikbaar op:
- **Frontend**: http://localhost:3000 - Game UI (Next.js)
- **Backend API**: http://localhost:8000 - REST API (Symfony)
- **WebSocket**: ws://localhost:8080 - Real-time updates

### Stoppen

```bash
# Stop services
docker-compose down

# Stop en verwijder volumes
docker-compose down -v
```

### Lokale Development (zonder Docker)

#### Backend
```bash
cd monopoly-backend

# Install dependencies
composer install

# Start REST API server
php -S localhost:8000 -t public/

# In een apart terminal venster: Start WebSocket server
php bin/console websocket:start
```

#### Frontend
```bash
cd monopoly-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in je browser

## 📁 Project Structure

```
.
├── monopoly-backend/          # Symfony PHP backend
│   ├── src/
│   │   ├── Entity/           # Domain models
│   │   ├── Service/          # Business logic
│   │   ├── Repository/       # In-memory storage
│   │   ├── Controller/       # REST API
│   │   ├── Websocket/        # WebSocket server
│   │   ├── DTO/              # Data Transfer Objects
│   │   └── Enum/             # Enumerations
│   └── config/
│
├── monopoly-frontend/         # Next.js TypeScript frontend
│   ├── app/                  # Pages (App Router)
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   └── lib/                  # Utilities & types
│
├── docker-compose.yml         # Docker orchestration
└── README.md                 # This file
```

## 🔌 API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create nieuwe game |
| GET | `/api/games/{id}` | Haal game state op |
| POST | `/api/games/{id}/players` | Voeg speler toe |
| POST | `/api/games/{id}/roll` | Voer turn uit (dobbelen) |
| GET | `/api/games/{id}/board` | Haal board state op |
| DELETE | `/api/games/{id}` | Beëindig game |

### WebSocket Events

#### Server → Client
- `game:updated` - Complete game state update
- `player:joined` - Nieuwe speler toegevoegd
- `turn:started` - Turn begonnen
- `dice:rolled` - Dobbelstenen gegooid
- `player:moved` - Speler verplaatst
- `property:purchased` - Property gekocht
- `rent:paid` - Huur betaald
- `turn:ended` - Turn afgerond

## 🎨 Design System

### Clean-Style Theme
- **Primary**: Blue gradient (#3b82f6 → #6366f1)
- **Secondary**: Purple accent (#8b5cf6)
- **Background**: Light (#f8fafc) / Dark (#0f172a)
- **Cards**: Glassmorphism met backdrop blur
- **Animations**: Framer Motion smooth transitions

### UI Components
- Circular game board met 40 tiles
- Animated player tokens
- 3D dice roll animation
- Real-time balance updates
- Property cards met hover states
- Toast notifications

## 🛠️ Technology Stack

### Backend
- **Framework**: Symfony 6.4
- **Language**: PHP 8.2
- **WebSocket**: Ratchet
- **Storage**: In-memory (PHP arrays)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State**: Zustand
- **UI**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 📝 Development Notes

- Alle code bevat **PHPDoc/JSDoc comments**
- **Type hints** overal gebruikt
- **Strict mode** enabled
- **Hot reload** in development mode
- **Auto cleanup** van inactive games (2 uur)

## 📄 License

MIT License - Vrij te gebruiken voor educatieve doeleinden.

---

**Made with ❤️ using Symfony, Next.js, and Docker**

