# 🎲 Monopoly Game

Een moderne Monopoly implementatie met PHP Symfony backend en Next.js frontend, volledig in-memory met real-time WebSocket updates.

## 🏗️ Architectuur

### Systeem Architectuur
```mermaid
graph TB
    Frontend[Next.js Frontend<br/>Port 3000]
    Backend[Symfony Backend<br/>Port 8000]
    WebSocket[WebSocket Server<br/>Port 8080]
    Redis[(Redis<br/>Port 6379)]
    
    Frontend -->|REST API| Backend
    Frontend -->|WebSocket| WebSocket
    Backend -->|Events| WebSocket
    Backend -->|Game State| Redis
    WebSocket -->|Read State| Redis
    
    style Frontend fill:#3b82f6
    style Backend fill:#8b5cf6
    style WebSocket fill:#6366f1
    style Redis fill:#dc2626
```

### UML Class Diagram (Backend Entities)
```mermaid
classDiagram
    class Game {
        -string id
        -Player[] players
        -Board board
        -Bank bank
        -SidePot sidePot
        -Card[] chanceCards
        -Card[] communityChestCards
        -GameStatus status
        -int currentPlayerIndex
        +addPlayer(name, token)
        +start()
        +nextTurn()
        +drawChanceCard()
        +drawCommunityChestCard()
    }
    
    class Board {
        -Tile[] tiles
        +getTile(position)
        +getAllTiles()
    }
    
    class Tile {
        <<abstract>>
        #int position
        #string name
        #TileType type
        +onLand(player, game, diceRoll)*
    }
    
    class PropertyTile {
        -string color
        -int price
        -int rent
        -Player owner
        +onLand(player, game, diceRoll)
        +canBePurchased(player)
    }
    
    class ChanceTile {
        +onLand(player, game, diceRoll)
    }
    
    class CommunityChestTile {
        +onLand(player, game, diceRoll)
    }
    
    class Card {
        -string type
        -string description
        -string action
        -array params
        +execute(player, game)
    }
    
    class Player {
        -string id
        -string name
        -PlayerToken token
        -int balance
        -int position
        -Tile[] properties
        +move(spaces)
        +addBalance(amount)
        +deductBalance(amount)
    }
    
    class Bank {
        -int balance
        +addBalance(amount)
        +deductBalance(amount)
    }
    
    class SidePot {
        -int balance
        +addBalance(amount)
        +collectAll()
    }
    
    Game "1" *-- "2..4" Player
    Game "1" *-- "1" Board
    Game "1" *-- "1" Bank
    Game "1" *-- "1" SidePot
    Game "1" *-- "0..*" Card : chanceCards
    Game "1" *-- "0..*" Card : communityChestCards
    Board "1" *-- "40" Tile
    Tile <|-- PropertyTile
    Tile <|-- ChanceTile
    Tile <|-- CommunityChestTile
    Tile <|-- RailroadTile
    Tile <|-- UtilityTile
    Tile <|-- GoTile
    Tile <|-- TaxTile
    Tile <|-- JailTile
    Tile <|-- FreeParkingTile
    Tile <|-- GoToJailTile
    PropertyTile "0..1" o-- "0..1" Player : owner
    Player "0..*" o-- "0..*" PropertyTile : properties
```

## ✨ Features

- 🎮 **Turn-by-turn gameplay** - Klassiek Monopoly spel met volledige spelregels
- 💾 **In-memory state** - Geen database nodig, alle game state in geheugen
- 🔄 **Real-time updates** - WebSocket integratie voor live game updates
- 🎨 **Clean, modern design** - Responsive UI met smooth animaties
- 🐳 **Docker ready** - Complete setup met één command
- 📡 **RESTful API** - Voor game management en turn execution
- 🚀 **WebSocket server** - Voor real-time game events

## 🚀 Quick Start

### Met Docker (Aanbevolen)

```bash
# Clone de repository
git clone <repository-url>
cd monopoly-game

# Start alle services
docker-compose up -d

# Bekijk logs (optioneel)
docker-compose logs -f
```

De applicatie draait nu op:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **WebSocket**: ws://localhost:8080

### Stoppen

```bash
docker-compose down
```

## 🛠️ Lokale Development

### Backend (PHP Symfony)

```bash
cd monopoly-backend
composer install
php bin/console websocket:start  # WebSocket server
php -S localhost:8000 -t public/  # HTTP server
```

### Frontend (Next.js)

```bash
cd monopoly-frontend
npm install
npm run dev
```

## 📁 Project Structuur

```
monopoly-game/
├── monopoly-backend/          # Symfony backend
│   ├── src/
│   │   ├── Controller/       # REST API endpoints
│   │   ├── Entity/          # Game entities (Player, Tile, etc.)
│   │   ├── Service/         # Game logic (GameEngine, DiceService)
│   │   ├── DTO/             # Data Transfer Objects
│   │   ├── Repository/      # In-memory game storage
│   │   ├── Websocket/       # WebSocket server
│   │   └── Command/         # Console commands
│   └── config/              # Symfony configuratie
│
├── monopoly-frontend/         # Next.js frontend
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks (WebSocket, GameState)
│   └── lib/                 # Utilities & API client
│
└── docker-compose.yml        # Docker orchestration
```

## 🎮 Game Features

### Tiles
- **Go** - Ontvang €200 bij passeren
- **Properties** - Koop en verzamel eigenschappen
- **Railroads** - Speciale eigenschappen met multiplier rent
- **Utilities** - Rent gebaseerd op dobbelsteenworp
- **Chance** 🎲 - Trek een Kans kaart (7 verschillende)
- **Community Chest** 💰 - Trek een Algemeen Fonds kaart (7 verschillende)
- **Tax** - Betaal belasting
- **Jail** - Gevangenis tile
- **Go To Jail** - Ga direct naar gevangenis
- **Free Parking** - Side pot verzameling

### Gameplay
- 🎲 Rol dobbelstenen en beweeg over het bord
- 🏠 Koop automatisch eigenschappen als je voldoende geld hebt
- 💰 Betaal huur aan andere spelers
- 🎴 Trek Kans en Algemeen Fonds kaarten
- 🎁 Free Parking side pot verzameling
- 🏦 Bank balans management
- ⚡ Real-time updates via WebSocket
- 🎯 Volledig Nederlands met tooltips

## 🎨 Design Patterns & Architecture

### Backend Design Patterns
1. **Repository Pattern** (`GameRepository`)
   - Abstractie over Redis storage
   - Clean data access layer

2. **Strategy Pattern** (`Card.execute()`)
   - Verschillende card acties (collect, pay, move, etc.)
   - Polymorphism voor card behavior

3. **Template Method** (`Tile.onLand()`)
   - Abstract base class met concrete implementations
   - Elke tile type heeft eigen onLand logic

4. **Factory Pattern** (`Board.__construct()`)
   - Board creëert alle tiles
   - Centralized tile initialization

5. **Service Layer** (`GameEngine`, `DiceService`)
   - Business logic gescheiden van controllers
   - Herbruikbare game logic

### SOLID Principles
✅ **Single Responsibility**: Elke class heeft 1 doel  
✅ **Open/Closed**: Tiles extendable via inheritance  
✅ **Liskov Substitution**: Alle Tile types vervangbaar  
✅ **Interface Segregation**: Kleine, focused interfaces  
✅ **Dependency Inversion**: Controllers depend on abstractions  

### Clean Code Practices
- 📝 Uitgebreide comments in Nederlands
- 🏷️ Type hints overal (PHP 8.2)
- 🎯 Descriptive method names
- 🧪 Defensive programming (input validation)
- 🔒 Rate limiting & security
- 🚫 No magic numbers/strings

## 🔌 API Endpoints

### Game Management
- `POST /api/games` - Maak nieuw spel
- `GET /api/games/{id}` - Haal game state op
- `POST /api/games/{id}/join` - Join een spel
- `POST /api/games/{id}/start` - Start het spel
- `POST /api/games/{id}/turn` - Speel een turn

### WebSocket Events
- `game_updated` - Game state veranderd
- `player_joined` - Speler joined game
- `turn_completed` - Turn afgerond
- `game_started` - Game gestart

## 🧪 Tech Stack

### Backend
- PHP 8.2
- Symfony 6
- Ratchet (WebSocket)
- In-memory storage

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (Animaties)
- Zustand (State Management)

### DevOps
- Docker & Docker Compose
- Multi-stage builds
- Hot reload tijdens development

## 📝 Development Notes

- Game state is volledig in-memory (geen persistence tussen restarts)
- WebSocket connecties worden automatisch opnieuw verbonden
- CORS is geconfigureerd voor local development
- Alle code bevat uitgebreide comments

## 📄 License

MIT

## 👤 Author

Ontwikkeld met ❤️ voor Monopoly fans
