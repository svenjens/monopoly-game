/**
 * Game Page
 * 
 * Main game interface where players roll dice, move tokens, and play Monopoly.
 * Features real-time updates via WebSocket and smooth animations.
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useGameState, useIsMyTurn, useMyPlayer, useCurrentPlayer } from '@/hooks/useGameState';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getGame, joinGame, rollDice, startGame, endGame } from '@/lib/api';
import { validatePlayerName, validateToken, sanitizeString, rateLimiter } from '@/lib/validation';
import { PLAYER_TOKENS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { PlayerToken } from '@/lib/types';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, DollarSign, Trophy, Copy, Check, Share2 } from 'lucide-react';

// Dynamic import for Confetti (client-side only)
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

/**
 * Monopoly Board Tile Names (simplified)
 * 40 tiles arranged clockwise from position 0 (GO)
 */
const BOARD_TILES = [
  { pos: 0, name: 'GO', color: 'bg-red-500', type: 'corner' },
  { pos: 1, name: 'Straat 1', color: 'bg-amber-700' },
  { pos: 2, name: 'Algemeen Fonds', color: 'bg-cyan-400', icon: '💰' },
  { pos: 3, name: 'Straat 2', color: 'bg-amber-700' },
  { pos: 4, name: 'Belasting', color: 'bg-gray-400' },
  { pos: 5, name: 'Station 1', color: 'bg-black' },
  { pos: 6, name: 'Straat 3', color: 'bg-blue-400' },
  { pos: 7, name: 'Kans', color: 'bg-orange-400', icon: '?' },
  { pos: 8, name: 'Straat 4', color: 'bg-blue-400' },
  { pos: 9, name: 'Straat 5', color: 'bg-blue-400' },
  { pos: 10, name: 'Gevangenis', color: 'bg-orange-500', type: 'corner' },
  { pos: 11, name: 'Straat 6', color: 'bg-purple-600' },
  { pos: 12, name: 'Nuts', color: 'bg-yellow-300' },
  { pos: 13, name: 'Straat 7', color: 'bg-purple-600' },
  { pos: 14, name: 'Straat 8', color: 'bg-purple-600' },
  { pos: 15, name: 'Station 2', color: 'bg-black' },
  { pos: 16, name: 'Straat 9', color: 'bg-orange-600' },
  { pos: 17, name: 'Algemeen Fonds', color: 'bg-cyan-400', icon: '💰' },
  { pos: 18, name: 'Straat 10', color: 'bg-orange-600' },
  { pos: 19, name: 'Straat 11', color: 'bg-orange-600' },
  { pos: 20, name: 'Parkeren', color: 'bg-red-500', type: 'corner' },
  { pos: 21, name: 'Straat 12', color: 'bg-red-600' },
  { pos: 22, name: 'Kans', color: 'bg-orange-400', icon: '?' },
  { pos: 23, name: 'Straat 13', color: 'bg-red-600' },
  { pos: 24, name: 'Straat 14', color: 'bg-red-600' },
  { pos: 25, name: 'Station 3', color: 'bg-black' },
  { pos: 26, name: 'Straat 15', color: 'bg-yellow-500' },
  { pos: 27, name: 'Straat 16', color: 'bg-yellow-500' },
  { pos: 28, name: 'Nuts', color: 'bg-yellow-300' },
  { pos: 29, name: 'Straat 17', color: 'bg-yellow-500' },
  { pos: 30, name: '→ Gevangenis', color: 'bg-orange-500', type: 'corner' },
  { pos: 31, name: 'Straat 18', color: 'bg-green-600' },
  { pos: 32, name: 'Straat 19', color: 'bg-green-600' },
  { pos: 33, name: 'Algemeen Fonds', color: 'bg-cyan-400', icon: '💰' },
  { pos: 34, name: 'Straat 20', color: 'bg-green-600' },
  { pos: 35, name: 'Station 4', color: 'bg-black' },
  { pos: 36, name: 'Kans', color: 'bg-orange-400', icon: '?' },
  { pos: 37, name: 'Straat 21', color: 'bg-blue-900' },
  { pos: 38, name: 'Belasting', color: 'bg-gray-400' },
  { pos: 39, name: 'Straat 22', color: 'bg-blue-900' },
];

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.id as string;
  const nameFromUrl = searchParams.get('name') || '';
  
  // State
  const game = useGameState((state) => state.game);
  const currentPlayerId = useGameState((state) => state.currentPlayerId);
  const isLoading = useGameState((state) => state.isLoading);
  const error = useGameState((state) => state.error);
  const isRolling = useGameState((state) => state.isRolling);
  const lastTurnResult = useGameState((state) => state.lastTurnResult);
  const setGame = useGameState((state) => state.setGame);
  const setCurrentPlayerId = useGameState((state) => state.setCurrentPlayerId);
  const setLoading = useGameState((state) => state.setLoading);
  const setError = useGameState((state) => state.setError);
  const setIsRolling = useGameState((state) => state.setIsRolling);
  const setLastTurnResult = useGameState((state) => state.setLastTurnResult);
  const handleWebSocketMessage = useGameState((state) => state.handleWebSocketMessage);
  
  const isMyTurn = useIsMyTurn();
  const myPlayer = useMyPlayer();
  const currentPlayer = useCurrentPlayer();
  
  // Debug turn state
  useEffect(() => {
    if (game && currentPlayerId) {
      console.log('Turn state:', {
        isMyTurn,
        currentPlayerId,
        currentPlayerIndex: game.currentPlayerIndex,
        currentPlayerInGame: game.players[game.currentPlayerIndex],
        myPlayer,
        allPlayers: game.players.map(p => ({ id: p.id, name: p.name, token: p.token }))
      });
    }
  }, [game?.currentPlayerIndex, currentPlayerId, isMyTurn, myPlayer, currentPlayer]);
  
  // Join game state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [playerName, setPlayerName] = useState(nameFromUrl);
  const [selectedToken, setSelectedToken] = useState<PlayerToken>('car');
  const [copied, setCopied] = useState(false);
  
  // Game log
  const [gameLog, setGameLog] = useState<Array<{
    id: string;
    timestamp: Date;
    type: string;
    message: string;
    playerId?: string;
    playerName?: string;
  }>>([]);
  
  // WebSocket
  const { isConnected, subscribe } = useWebSocket(handleWebSocketMessage);
  
  /**
   * Determine winner (player with most money) when game is finished.
   */
  const winner = useMemo(() => {
    if (!game || game.status !== 'finished') return null;
    
    // Find player with highest balance
    return game.players.reduce((richest, player) => 
      player.balance > richest.balance ? player : richest
    , game.players[0]);
  }, [game?.status, game?.players]);
  
  /**
   * Show confetti if current player is the winner.
   */
  const showConfetti = useMemo(() => {
    return winner && currentPlayerId && winner.id === currentPlayerId;
  }, [winner, currentPlayerId]);
  
  /**
   * Load game on mount.
   */
  // Initial load - restore player ID from sessionStorage if exists
  useEffect(() => {
    loadGame();
    
    // Try to restore player ID from sessionStorage (per-tab, not shared!)
    const storedPlayerId = sessionStorage.getItem(`game_${gameId}_player`);
    if (storedPlayerId) {
      console.log('📥 Restored player ID from sessionStorage:', storedPlayerId);
      setCurrentPlayerId(storedPlayerId);
    }
  }, [gameId]);
  
  /**
   * CRITICAL: Auto-restore currentPlayerId from sessionStorage on EVERY render
   * if it somehow got lost (e.g., due to state reset or re-render).
   */
  useEffect(() => {
    // If we DON'T have currentPlayerId in state but DO have it in sessionStorage, restore it!
    if (!currentPlayerId) {
      const storedPlayerId = sessionStorage.getItem(`game_${gameId}_player`);
      if (storedPlayerId) {
        console.warn('⚠️ currentPlayerId was missing - RESTORING from sessionStorage:', storedPlayerId);
        setCurrentPlayerId(storedPlayerId);
      }
    }
  }, [currentPlayerId, gameId, setCurrentPlayerId]); // Run whenever currentPlayerId changes
  
  /**
   * Restore player ID from game data if we have a name match but no stored ID.
   * This handles the case where sessionStorage was cleared but we're still in the game.
   */
  useEffect(() => {
    if (currentPlayerId || !game || !nameFromUrl) return;
    
    console.log('Attempting player ID restore:', {
      currentPlayerId,
      nameFromUrl,
      players: game.players.map(p => ({ id: p.id, name: p.name }))
    });
    
    // Find player by name
    const matchingPlayer = game.players.find(p => p.name === nameFromUrl);
    if (matchingPlayer) {
      console.log('✅ Restored player ID from game data (name match):', matchingPlayer.id);
      setCurrentPlayerId(matchingPlayer.id);
      sessionStorage.setItem(`game_${gameId}_player`, matchingPlayer.id);
    } else {
      console.log('❌ No matching player found for name:', nameFromUrl);
    }
  }, [game, currentPlayerId, nameFromUrl, gameId]);
  
  /**
   * Subscribe to WebSocket updates when connected.
   */
  useEffect(() => {
    if (isConnected && gameId) {
      subscribe(gameId);
    }
  }, [isConnected, gameId, subscribe]);

  /**
   * Auto-show join dialog if name is in URL and not yet joined.
   * Only show once - prevent duplicate joins on refresh.
   * Uses sessionStorage to track if we've already attempted auto-join.
   */
  useEffect(() => {
    if (!nameFromUrl || !game) return;
    
    // Check sessionStorage flag to prevent duplicate auto-joins
    const hasAttempted = sessionStorage.getItem(`game_${gameId}_autoJoinAttempted`);
    
    // Debug logging
    console.log('Auto-join check:', {
      nameFromUrl,
      currentPlayerId,
      hasAttempted,
      gameStatus: game.status,
      players: game.players.map(p => ({ id: p.id, name: p.name }))
    });
    
    // CRITICAL: If we already have a currentPlayerId, NEVER show join dialog
    if (currentPlayerId) {
      console.log('✅ Have currentPlayerId, skip auto-join entirely');
      return;
    }
    
    // If we've already attempted, don't try again
    if (hasAttempted) {
      console.log('❌ Already attempted auto-join, skipping');
      return;
    }
    
    // Check if player already in game (by name match)
    const alreadyInGame = game.players.some(p => p.name === nameFromUrl);
    if (alreadyInGame) {
      console.log('❌ Player already in game, skipping');
      // Mark as attempted so we don't check again
      sessionStorage.setItem(`game_${gameId}_autoJoinAttempted`, 'true');
      return;
    }
    
    // Only show if game is waiting AND not already in game
    if (game.status === 'waiting') {
      console.log('✅ Showing join dialog for', nameFromUrl);
      setShowJoinDialog(true);
      // Mark IMMEDIATELY to prevent re-triggers
      sessionStorage.setItem(`game_${gameId}_autoJoinAttempted`, 'true');
    }
  }, [nameFromUrl, game, currentPlayerId, gameId]);

  /**
   * Poll for game updates - ONLY as fallback when WebSocket disconnected.
   * WebSocket should handle all real-time updates!
   */
  useEffect(() => {
    if (!game || isConnected) {
      // Don't poll if WebSocket is connected - it will push updates
      return;
    }
    
    console.log('⚠️ WebSocket disconnected, using polling as fallback');
    
    // Fallback polling (slower) only when WebSocket is down
    const pollInterval = setInterval(() => {
      console.log('📡 Fallback polling (WebSocket disconnected)...');
      loadGame();
    }, 5000); // Slower fallback polling
    
    return () => clearInterval(pollInterval);
  }, [game?.status, isConnected]);
  
  /**
   * Load game data from API with retry logic.
   */
  const loadGame = async (retryCount = 8) => {
    // Only set loading on first attempt
    if (retryCount === 8) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const response = await getGame(gameId);
      
      if (response.success && response.data) {
        setGame(response.data);
        setLoading(false);
        
        // Show join dialog if not already in game
        if (!currentPlayerId && response.data.status === 'waiting') {
          setShowJoinDialog(true);
        }
      } else {
        const errorMsg = response.error || 'Kon spel niet laden';
        
        // If game not found and we have retries left, try again after a delay
        // This handles the case where a game was just created
        if ((errorMsg.includes('niet gevonden') || errorMsg.includes('not found')) && retryCount > 0) {
          // Exponential backoff: 300ms, 600ms, 1200ms, etc. Max 3s
          const delay = Math.min(300 * Math.pow(2, 8 - retryCount), 3000);
          
          console.log(`Game not found, retrying in ${delay}ms... (${retryCount} attempts left)`);
          
          // Keep loading state active during retry
          setTimeout(() => {
            loadGame(retryCount - 1);
          }, delay);
          return;
        }
        
        // No more retries - show error
        setError(errorMsg);
        setLoading(false);
      }
    } catch (err) {
      const errorMsg = 'Netwerk fout bij laden spel';
      
      // Retry on network errors
      if (retryCount > 0) {
        console.log(`Network error, retrying... (${retryCount} attempts left)`);
        setTimeout(() => {
          loadGame(retryCount - 1);
        }, 1000);
        return;
      }
      
      // No more retries - show error
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
    }
  };
  
  /**
   * Join the game as a new player.
   */
  const handleJoinGame = async () => {
    setError(null);
    
    // Rate limiting
    if (!rateLimiter.isAllowed(`join-game-${gameId}`, 3, 30000)) {
      const seconds = rateLimiter.getTimeUntilReset(`join-game-${gameId}`, 30000);
      const errorMsg = `Te veel pogingen. Wacht ${seconds} seconden.`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    // Sanitize input
    const sanitizedName = sanitizeString(playerName);
    
    // Validate player name
    const nameValidation = validatePlayerName(sanitizedName);
    if (!nameValidation.valid) {
      setError(nameValidation.error || 'Ongeldige naam');
      toast.error(nameValidation.error || 'Ongeldige naam');
      return;
    }
    
    // Validate token
    const tokenValidation = validateToken(selectedToken);
    if (!tokenValidation.valid) {
      setError(tokenValidation.error || 'Ongeldige token');
      toast.error(tokenValidation.error || 'Ongeldige token');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await joinGame(gameId, {
        name: sanitizedName,
        token: selectedToken,
      });
      
      if (response.success && response.data) {
        const playerId = response.data.player.id;
        setGame(response.data.game);
        setCurrentPlayerId(playerId);
        
        // Store player ID in sessionStorage (per-tab, not shared between windows!)
        sessionStorage.setItem(`game_${gameId}_player`, playerId);
        console.log('Saved player ID to sessionStorage:', playerId);
        
        setShowJoinDialog(false);
        toast.success(`Welkom ${sanitizedName}! 👋`);
      } else {
        const errorMsg = response.error || 'Kon niet deelnemen aan spel';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Netwerk fout';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Start the game (first player only).
   */
  const handleStartGame = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await startGame(gameId);
      
      if (response.success && response.data) {
        setGame(response.data);
        toast.success('Spel gestart! 🎮');
      } else {
        const errorMsg = response.error || 'Kon spel niet starten';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Netwerk fout bij starten spel';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * End the game.
   */
  const handleEndGame = async () => {
    if (!confirm('Weet je zeker dat je het spel wilt beëindigen?')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await endGame(gameId);
      
      if (response.success && response.data) {
        setGame(response.data);
        toast.success('Spel beëindigd! 🏁');
      } else {
        const errorMsg = response.error || 'Kon spel niet beëindigen';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Netwerk fout bij beëindigen spel';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Copy game link to clipboard for inviting friends.
   */
  const handleCopyGameLink = async () => {
    try {
      // Share just the game URL without any player name
      // This allows others to enter their own name when joining
      const gameUrl = `${window.location.origin}/game/${gameId}`;
      
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      toast.success('Link gekopieerd! 📋');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Kon link niet kopiëren');
    }
  };
  
  /**
   * Add entry to game log.
   */
  const addToGameLog = (type: string, message: string, playerId?: string, playerName?: string) => {
    setGameLog(prev => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type,
        message,
        playerId,
        playerName,
      },
      ...prev,
    ].slice(0, 50)); // Keep last 50 entries
  };

  /**
   * Roll dice and execute turn.
   */
  const handleRollDice = async () => {
    if (!isMyTurn) {
      toast.warning('Het is niet jouw beurt');
      return;
    }
    
    // Rate limiting for dice rolls
    if (!rateLimiter.isAllowed(`roll-dice-${gameId}`, 10, 10000)) {
      toast.error('Te snel! Wacht even.');
      return;
    }
    
    setIsRolling(true);
    setError(null);
    
    try {
      const response = await rollDice(gameId);
      
      if (response.success && response.data) {
        setLastTurnResult(response.data);
        setGame(response.data.gameState);
        
        // Add to game log
        const turnResult = response.data;
        const player = turnResult.player;
        
        // Dice roll
        if (turnResult.dice) {
          addToGameLog(
            'dice',
            `🎲 ${player.name} gooide ${turnResult.dice[0]} + ${turnResult.dice[1]} = ${turnResult.dice[0] + turnResult.dice[1]}`,
            player.id,
            player.name
          );
        }
        
        // Jail
        if (turnResult.jail) {
          const jail = turnResult.jail;
          if (jail.released) {
            addToGameLog(
              'jail',
              `🔓 ${jail.message}`,
              player.id,
              player.name
            );
          } else {
            addToGameLog(
              'jail',
              `🔒 ${jail.message}`,
              player.id,
              player.name
            );
          }
        }
        
        // Movement
        if (turnResult.movement) {
          const movement = turnResult.movement;
          addToGameLog(
            'movement',
            `👟 ${player.name} verplaatst van ${movement.oldPosition} → ${movement.newPosition}${movement.passedGo ? ' (passeerde Start! +€200)' : ''}`,
            player.id,
            player.name
          );
        }
        
        // Tile interaction
        if (turnResult.tileInteraction) {
          const tile = turnResult.tileInteraction;
          if (tile.action === 'property_purchased') {
            addToGameLog(
              'purchase',
              `🏠 ${player.name} kocht ${tile.propertyName} voor €${tile.price}`,
              player.id,
              player.name
            );
          } else if (tile.action === 'rent_paid') {
            addToGameLog(
              'rent',
              `💰 ${player.name} betaalde €${tile.amount} huur aan ${tile.ownerName}`,
              player.id,
              player.name
            );
          } else if (tile.message) {
            addToGameLog(
              'tile',
              tile.message,
              player.id,
              player.name
            );
          }
        }
        
        // Bankruptcy
        if (turnResult.bankruptcy?.isBankrupt) {
          addToGameLog(
            'bankruptcy',
            `💔 ${turnResult.bankruptcy.message}`,
            player.id,
            player.name
          );
        }
        
        // Show dice roll result (defensive programming)
        const dice = response.data.dice;
        if (dice && Array.isArray(dice) && dice.length === 2) {
          const total = dice[0] + dice[1];
          toast.info(`🎲 Gegooid: ${dice[0]} + ${dice[1]} = ${total}`);
        } else {
          // Fallback if dice data is missing
          console.warn('Dice data missing or invalid:', dice);
          toast.info('🎲 Dobbelstenen gegooid!');
        }
        
        // Reset rolling after animation
        setTimeout(() => {
          setIsRolling(false);
        }, 600);
      } else {
        const errorMsg = response.error || 'Kon niet gooien';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsRolling(false);
      }
    } catch (err) {
      const errorMsg = 'Netwerk fout bij gooien';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsRolling(false);
    }
  };
  
  // Loading state
  if (isLoading && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-900">Loading game...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - Game not found
  if (error === 'Spel niet gevonden' || error === 'Game not found' || (!isLoading && !game)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Spel Niet Gevonden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-900 leading-relaxed">
              Dit spel bestaat niet of is verloren gegaan. Spellen worden in het geheugen opgeslagen en gaan verloren wanneer de server herstart.
            </p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Terug naar Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Join dialog - ONLY show if we don't have a player ID yet
  if (showJoinDialog && !currentPlayerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-gray-900">Deelnemen aan Spel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Je Naam</label>
              <Input
                placeholder="Voer je naam in..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Kies Token</label>
              <div className="grid grid-cols-4 gap-2">
                {PLAYER_TOKENS.map((token) => (
                  <button
                    key={token.value}
                    onClick={() => setSelectedToken(token.value)}
                    className={`p-3 rounded-lg border-2 text-2xl transition-smooth ${
                      selectedToken === token.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {token.emoji}
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            
            <Button onClick={handleJoinGame} disabled={isLoading || !playerName.trim()} className="w-full">
              {isLoading ? 'Deelnemen...' : 'Deelnemen aan Spel'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Game interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
      {/* Confetti for winner */}
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Monopoly
            </h1>
            <p className="text-sm text-gray-900 font-medium">Game ID: {gameId}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar - Players and Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Players List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Users className="w-5 h-5" />
                  Spelers ({game?.players.length || 0}/4)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {game?.players.length === 0 ? (
                  <div className="text-center py-8 text-gray-900">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nog geen spelers</p>
                    <p className="text-xs mt-1">Wachten op spelers...</p>
                  </div>
                ) : (
                  game?.players.map((player, idx) => {
                    const token = PLAYER_TOKENS.find(t => t.value === player.token);
                    const isCurrent = idx === game.currentPlayerIndex;
                    const isMe = player.id === currentPlayerId;
                    
                    return (
                      <div
                        key={player.id}
                        className={`p-3 rounded-lg border-2 transition-smooth ${
                          isCurrent
                            ? 'border-primary bg-primary/10'
                            : player.inJail
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{token?.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{player.name}</p>
                              {isMe && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">Jij</span>}
                              {player.inJail && (
                                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded flex items-center gap-1">
                                  🔒 Gevangenis ({player.jailTurns}/3)
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 font-medium">{formatCurrency(player.balance)}</p>
                            {player.inJail && (
                              <p className="text-xs text-orange-700 mt-1">
                                Gooi dubbel of wacht {3 - player.jailTurns} beurt(en)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            
            {/* Dobbelsteen Gooien */}
            {game?.status === 'in_progress' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Jouw Beurt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900 font-medium mb-2">Huidige Speler</p>
                    <p className="text-lg font-bold text-gray-900">{currentPlayer?.name}</p>
                  </div>
                  
                  <Button
                    onClick={handleRollDice}
                    disabled={!isMyTurn || isRolling}
                    className="w-full"
                    size="lg"
                  >
                    {isRolling ? 'Gooien...' : isMyTurn ? 'Gooi Dobbelstenen' : 'Wachten op beurt...'}
                  </Button>
                  
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </CardContent>
              </Card>
            )}
            
            {/* Join Game Button */}
            {game?.status === 'waiting' && !currentPlayerId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Deelnemen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-900 mb-4">
                    Het spel wacht op spelers. Doe nu mee!
                  </p>
                  <Button onClick={() => setShowJoinDialog(true)} className="w-full">
                    Deelnemen aan Spel
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Spel Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <DollarSign className="w-5 h-5" />
                  Spel Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Bank:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(game?.bank.balance || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Pot:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(game?.sidePot.balance || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Status:</span>
                  <span className="font-bold capitalize text-gray-900">{game?.status}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Invite Friends (alleen als speler in game zit) */}
            {currentPlayerId && game?.status === 'waiting' && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Nodig Vrienden Uit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-blue-800">
                    Deel deze link om vrienden uit te nodigen:
                  </p>
                  
                  {/* Game Code Display */}
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Game ID</p>
                    <p className="font-mono font-bold text-gray-900 text-sm break-all">
                      {gameId}
                    </p>
                  </div>
                  
                  {/* Copy Button */}
                  <Button
                    onClick={handleCopyGameLink}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={copied}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Gekopieerd!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Kopieer Uitnodigingslink
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-blue-700 text-center">
                    {game.players.length}/4 spelers • Wachten op meer spelers...
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Start Game Button (voor first player) */}
            {game?.status === 'waiting' && game?.players.length >= 2 && currentPlayerId === game?.players[0]?.id && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-900">Klaar om te Starten</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-800 mb-4">
                    Er zijn {game.players.length} spelers. Je kunt het spel nu starten!
                  </p>
                  <Button 
                    onClick={handleStartGame}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading ? 'Starten...' : 'Start Spel'}
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* End Game Button */}
            {game?.status === 'in_progress' && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Spel Beëindigen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-800 mb-4">
                    Klaar met spelen? Beëindig het spel en zie de winnaar!
                  </p>
                  <Button 
                    onClick={handleEndGame}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full"
                  >
                    {isLoading ? 'Beëindigen...' : 'Beëindig Spel'}
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Game Finished - Winner Display */}
            {game?.status === 'finished' && winner && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Winnaar! 🎉
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {PLAYER_TOKENS.find(t => t.value === winner.token)?.emoji}
                    </div>
                    <p className="text-xl font-bold text-yellow-900 mb-2">
                      {winner.name}
                    </p>
                    <p className="text-lg text-yellow-800">
                      {formatCurrency(winner.balance)}
                    </p>
                    {winner.id === currentPlayerId && (
                      <p className="text-sm text-yellow-700 mt-4 font-semibold">
                        🎉 Gefeliciteerd! Je hebt gewonnen!
                      </p>
                    )}
                  </div>
                  
                  {/* Back to Home Button */}
                  <Link href="/" className="block">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      Nieuw Spel Starten 🎮
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Main Area - Board */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Speelbord
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Monopoly Board - Square layout with 40 tiles */}
                <div className="aspect-square bg-green-100 rounded-lg p-2 relative">
                  {/* Board Grid: 11x11 */}
                  <div className="grid grid-cols-11 grid-rows-11 gap-1 h-full">
                    {/* Generate all 121 cells */}
                    {Array.from({ length: 121 }).map((_, idx) => {
                      const row = Math.floor(idx / 11);
                      const col = idx % 11;
                      
                      // Determine if this is a board tile or center area
                      let tilePos = -1;
                      let isCorner = false;
                      
                      // Bottom row (positions 0-10, right to left)
                      if (row === 10) {
                        tilePos = 10 - col;
                        isCorner = col === 0 || col === 10;
                      }
                      // Left column (positions 11-19, bottom to top)
                      else if (col === 0 && row > 0 && row < 10) {
                        tilePos = 10 + (10 - row);
                      }
                      // Top row (positions 20-30, left to right)
                      else if (row === 0) {
                        tilePos = 20 + col;
                        isCorner = col === 0 || col === 10;
                      }
                      // Right column (positions 31-39, top to bottom)
                      else if (col === 10 && row > 0 && row < 10) {
                        tilePos = 30 + row;
                      }
                      
                      // Center area (not a tile)
                      if (tilePos === -1) {
                        return (
                          <div key={idx} className="bg-green-200 rounded flex items-center justify-center">
                            {row === 5 && col === 5 && (
                              <div className="text-center">
                                <p className="text-lg font-bold text-green-800">🎲</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                          // Find tile data
                          const tile = BOARD_TILES.find(t => t.pos === tilePos);
                          if (!tile) return <div key={idx} className="bg-gray-200" />;
                          
                          // Find players on this tile
                          const playersHere = game?.players.filter(p => p.position === tilePos) || [];
                          
                          // Find tile data from game state to check ownership
                          // board is an array of tiles
                          const gameTile = game?.board?.find((t: any) => t.position === tilePos);
                          const owner = gameTile?.owner 
                            ? game?.players.find(p => p.id === gameTile.owner)
                            : null;
                          const ownerToken = owner 
                            ? PLAYER_TOKENS.find(t => t.value === owner.token)
                            : null;
                          
                          // Create tooltip with tile info
                          const tileInfo = `Positie ${tilePos}: ${tile.name}${
                            owner ? `\n🏠 Eigenaar: ${owner.name}` : ''
                          }${
                            gameTile?.type === 'property' ? `\n💰 Huur: €${gameTile.rent || 0}` : ''
                          }`;
                          
                          return (
                            <div
                              key={idx}
                              className={`
                                ${tile.type === 'corner' ? 'col-span-1 row-span-1' : ''}
                                ${tile.color} 
                                rounded border border-gray-300 
                                flex flex-col items-center justify-center
                                relative overflow-hidden
                                ${playersHere.length > 0 ? 'ring-2 ring-yellow-400' : ''}
                                ${owner ? 'ring-2 ring-green-500' : ''}
                                cursor-help transition-all hover:scale-105 hover:z-10
                              `}
                              title={tileInfo}
                            >
                          {/* Owner badge (top right corner) */}
                          {owner && ownerToken && (
                            <div 
                              className="absolute top-0 right-0 bg-green-500 rounded-bl-lg px-1 text-xs border-l border-b border-white"
                              title={`Eigenaar: ${owner.name}`}
                            >
                              {ownerToken.emoji}
                            </div>
                          )}
                          
                          {/* Tile name */}
                          <div className="text-[0.5rem] font-bold text-white text-center px-0.5 drop-shadow-md flex flex-col items-center">
                            {tile.icon && <span className="text-lg">{tile.icon}</span>}
                            <span>{tile.name}</span>
                          </div>
                          
                          {/* Players on this tile */}
                          {playersHere.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 pb-0.5">
                              {playersHere.map(player => {
                                const token = PLAYER_TOKENS.find(t => t.value === player.token);
                                const isMe = player.id === currentPlayerId;
                                const isTurn = player.id === currentPlayer?.id;
                                return (
                                  <div
                                    key={player.id}
                                    className={`
                                      text-lg bg-white rounded-full w-5 h-5 flex items-center justify-center border
                                      cursor-help transition-transform hover:scale-150 hover:z-50
                                      ${isMe ? 'border-blue-500 border-2' : 'border-gray-300'}
                                      ${isTurn ? 'ring-2 ring-yellow-400' : ''}
                                    `}
                                    title={`${player.name} - ${formatCurrency(player.balance)}${isMe ? ' (Jij)' : ''}${isTurn ? ' (Aan de beurt)' : ''}`}
                                  >
                                    <span className="text-xs">{token?.emoji || '❓'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Center Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center bg-green-200/80 rounded-lg p-4">
                      <p className="text-2xl font-bold text-green-800">MONOPOLY</p>
                      <p className="text-xs text-green-700">Vereenvoudigde Versie</p>
                    </div>
                  </div>
                </div>
                
                {/* Laatste Beurt Resultaat */}
                {lastTurnResult && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">Laatste Beurt:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-900 font-medium">Dobbelstenen:</span>
                        <span className="ml-2 font-semibold text-gray-900">{lastTurnResult.dice.dice1} + {lastTurnResult.dice.dice2} = {lastTurnResult.dice.total}</span>
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium">Verplaatst:</span>
                        <span className="ml-2 font-semibold text-gray-900">{lastTurnResult.movement.oldPosition} → {lastTurnResult.movement.newPosition}</span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-900">{lastTurnResult.tileInteraction.message}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Game Log */}
                {gameLog.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-gray-900 mb-2">Spel Geschiedenis:</p>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
                      {gameLog.map((entry) => (
                        <div
                          key={entry.id}
                   className={`text-xs p-2 rounded ${
                     entry.type === 'bankruptcy' ? 'bg-red-100 text-red-800' :
                     entry.type === 'purchase' ? 'bg-green-100 text-green-800' :
                     entry.type === 'rent' ? 'bg-yellow-100 text-yellow-800' :
                     entry.type === 'dice' ? 'bg-blue-100 text-blue-800' :
                     entry.type === 'jail' ? 'bg-orange-100 text-orange-800' :
                     'bg-gray-100 text-gray-800'
                   }`}
                        >
                          <span className="text-[10px] text-gray-600 mr-2">
                            {entry.timestamp.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span>{entry.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

