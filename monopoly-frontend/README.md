# Monopoly Game Frontend

Modern Next.js frontend voor Monopoly game met clean, moderne design en real-time multiplayer support via WebSockets.

## 🚀 Features

- **Next.js 14** met App Router en Server Components
- **TypeScript** strict mode voor type safety
- **Tailwind CSS** met custom clean-style theme
- **Framer Motion** voor smooth animaties
- **Zustand** voor state management
- **WebSocket** real-time game updates
- **Responsive Design** voor mobile en desktop

## 📋 Requirements

- Node.js 18+
- npm 9+

## 🛠️ Installation

### Via Docker (Recommended)

```bash
# Zie hoofdproject README.md
docker-compose up
```

### Lokale Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎨 Design System

### Clean-Style Theme

**Kleuren:**
- Primary: Blue gradient (#3b82f6 → #6366f1)
- Secondary: Purple accent (#8b5cf6)
- Background: Light (#f8fafc) / Dark (#0f172a)

**Effecten:**
- Glassmorphism cards met backdrop blur
- Smooth transitions (200-300ms)
- Gradient text en backgrounds
- Subtle shadows en borders

### Components

#### Base UI Components
- `Button` - Styled buttons met variants
- `Card` - Glassmorphism containers
- `Input` - Form inputs met focus states

#### Game Components
- `PlayerList` - Active players display
- `GameBoard` - Board visualization
- `DiceRoll` - Animated dice
- `TurnIndicator` - Current turn display

## 📁 Project Structure

```
monopoly-frontend/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Homepage/Lobby
│   ├── game/[id]/
│   │   └── page.tsx            # Game page
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   └── game/                   # Game-specific components
├── hooks/
│   ├── useGameState.ts         # Zustand store
│   └── useWebSocket.ts         # WebSocket hook
├── lib/
│   ├── api.ts                  # REST API client
│   ├── types.ts                # TypeScript types
│   ├── constants.ts            # Game constants
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

## 🔌 API Integration

### REST API Calls

```typescript
import { createGame, getGame, joinGame, rollDice } from '@/lib/api';

// Create new game
const response = await createGame();

// Get game state
const game = await getGame(gameId);

// Join game
await joinGame(gameId, { name: 'Player', token: 'car' });

// Roll dice
const result = await rollDice(gameId);
```

### WebSocket Integration

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

// In component
const { isConnected, subscribe, lastMessage } = useWebSocket(
  (message) => {
    console.log('Received:', message);
  }
);

// Subscribe to game updates
useEffect(() => {
  if (isConnected) {
    subscribe(gameId);
  }
}, [isConnected, gameId]);
```

### State Management

```typescript
import { useGameState, useIsMyTurn, useMyPlayer } from '@/hooks/useGameState';

// In component
const game = useGameState((state) => state.game);
const isMyTurn = useIsMyTurn();
const myPlayer = useMyPlayer();
```

## 🎮 Pages

### Homepage (`/`)
- Create new game
- Join existing game
- Game instructions

### Game Page (`/game/[id]`)
- Players list
- Game board
- Roll dice button
- Game stats (bank, side pot)
- Real-time turn updates

## 🔧 Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NODE_ENV=development
```

## 📝 Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🧪 Development

### Adding New Components

```tsx
// components/game/MyComponent.tsx
'use client';

import { motion } from 'framer-motion';

export function MyComponent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="..."
    >
      ...
    </motion.div>
  );
}
```

### Using Tailwind Classes

```tsx
<div className="bg-gradient-primary glass rounded-xl p-6 shadow-glass-lg transition-smooth hover:scale-105">
  ...
</div>
```

## 🔥 Hot Features

- **Auto-reconnect**: WebSocket automatically reconnects on disconnect
- **Optimistic updates**: UI updates before server confirmation
- **Loading states**: Skeleton loaders en spinners
- **Error handling**: User-friendly error messages
- **Responsive**: Mobile-first design

## 🐛 Troubleshooting

### WebSocket niet verbonden
- Check backend WebSocket server draait op port 8080
- Verify NEXT_PUBLIC_WS_URL in .env.local
- Check browser console voor errors

### API calls falen
- Verify backend draait op port 8000
- Check NEXT_PUBLIC_API_URL in .env.local
- Check CORS instellingen in backend

### Build errors
```bash
# Clear cache en rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

## 📚 Additional Documentation

- [Main Project README](../README.md)
- [Backend README](../monopoly-backend/README.md)
- [UML Diagram](../README.md#uml-class-diagram)

## 📄 License

MIT License - See main project README for details.

---

**Frontend Status**: ✅ Complete and Ready

Voor complete project setup inclusief Docker, zie [main README](../README.md).

