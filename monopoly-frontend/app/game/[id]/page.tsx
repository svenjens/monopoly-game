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
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, DollarSign, Trophy } from 'lucide-react';

// Dynamic import for Confetti (client-side only)
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

/**
 * Monopoly Board Tile Names (simplified)
 * 40 tiles arranged clockwise from position 0 (GO)
 */
const BOARD_TILES = [
  { pos: 0, name: 'GO', color: 'bg-red-500', type: 'corner' },
  { pos: 1, name: 'Straat 1', color: 'bg-amber-700' },
  { pos: 2, name: 'Kans', color: 'bg-orange-300' },
  { pos: 3, name: 'Straat 2', color: 'bg-amber-700' },
  { pos: 4, name: 'Belasting', color: 'bg-gray-400' },
  { pos: 5, name: 'Station 1', color: 'bg-black' },
  { pos: 6, name: 'Straat 3', color: 'bg-blue-400' },
  { pos: 7, name: 'Kans', color: 'bg-orange-300' },
  { pos: 8, name: 'Straat 4', color: 'bg-blue-400' },
  { pos: 9, name: 'Straat 5', color: 'bg-blue-400' },
  { pos: 10, name: 'Gevangenis', color: 'bg-orange-500', type: 'corner' },
  { pos: 11, name: 'Straat 6', color: 'bg-purple-600' },
  { pos: 12, name: 'Nuts', color: 'bg-yellow-300' },
  { pos: 13, name: 'Straat 7', color: 'bg-purple-600' },
  { pos: 14, name: 'Straat 8', color: 'bg-purple-600' },
  { pos: 15, name: 'Station 2', color: 'bg-black' },
  { pos: 16, name: 'Straat 9', color: 'bg-orange-600' },
  { pos: 17, name: 'Kans', color: 'bg-orange-300' },
  { pos: 18, name: 'Straat 10', color: 'bg-orange-600' },
  { pos: 19, name: 'Straat 11', color: 'bg-orange-600' },
  { pos: 20, name: 'Parkeren', color: 'bg-red-500', type: 'corner' },
  { pos: 21, name: 'Straat 12', color: 'bg-red-600' },
  { pos: 22, name: 'Kans', color: 'bg-orange-300' },
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
  { pos: 33, name: 'Kans', color: 'bg-orange-300' },
  { pos: 34, name: 'Straat 20', color: 'bg-green-600' },
  { pos: 35, name: 'Station 4', color: 'bg-black' },
  { pos: 36, name: 'Kans', color: 'bg-orange-300' },
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
      console.log('Restored player ID from sessionStorage:', storedPlayerId);
      setCurrentPlayerId(storedPlayerId);
    }
  }, [gameId]);
  
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
    if (!nameFromUrl || !game || game.status !== 'waiting') return;
    
    // Check sessionStorage flag to prevent duplicate auto-joins
    const hasAttempted = sessionStorage.getItem(`game_${gameId}_autoJoinAttempted`);
    
    // Debug logging
    console.log('Auto-join check:', {
      nameFromUrl,
      currentPlayerId,
      hasAttempted,
      players: game.players.map(p => ({ id: p.id, name: p.name }))
    });
    
    if (hasAttempted) {
      console.log('Already attempted auto-join, skipping');
      return;
    }
    
    // Check if player already in game (by name match)
    const alreadyInGame = game.players.some(p => p.name === nameFromUrl);
    
    // Only show join dialog if not already in game AND no current player ID
    if (!alreadyInGame && !currentPlayerId) {
      console.log('✅ Showing join dialog for', nameFromUrl);
      setShowJoinDialog(true);
      // Mark in sessionStorage that we've attempted (persistent across renders!)
      sessionStorage.setItem(`game_${gameId}_autoJoinAttempted`, 'true');
    } else {
      console.log('❌ Not showing join dialog:', { alreadyInGame, currentPlayerId });
    }
  }, [nameFromUrl, game, currentPlayerId, gameId]);

  /**
   * Poll for game updates.
   * - During 'waiting': every 3 seconds to see new players joining
   * - During 'in_progress': every 2 seconds to see turn updates
   */
  useEffect(() => {
    if (!game) return;
    
    let pollInterval: NodeJS.Timeout;
    
    if (game.status === 'waiting') {
      pollInterval = setInterval(() => {
        console.log('Polling for game updates (waiting for players)...');
        loadGame();
      }, 3000);
    } else if (game.status === 'in_progress') {
      pollInterval = setInterval(() => {
        console.log('Polling for game updates (in progress)...');
        loadGame();
      }, 2000); // Faster polling during active game
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [game?.status]);
  
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
  
  // Join dialog
  if (showJoinDialog) {
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
                  Players ({game?.players.length || 0}/4)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {game?.players.length === 0 ? (
                  <div className="text-center py-8 text-gray-900">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No players yet</p>
                    <p className="text-xs mt-1">Waiting for players to join...</p>
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
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{token?.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{player.name}</p>
                              {isMe && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">You</span>}
                            </div>
                            <p className="text-sm text-gray-900 font-medium">{formatCurrency(player.balance)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            
            {/* Roll Dice */}
            {game?.status === 'in_progress' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-gray-900">Your Turn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900 font-medium mb-2">Current Player</p>
                    <p className="text-lg font-bold text-gray-900">{currentPlayer?.name}</p>
                  </div>
                  
                  <Button
                    onClick={handleRollDice}
                    disabled={!isMyTurn || isRolling}
                    className="w-full"
                    size="lg"
                  >
                    {isRolling ? 'Rolling...' : isMyTurn ? 'Roll Dice' : 'Waiting for turn...'}
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
            
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <DollarSign className="w-5 h-5" />
                  Game Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Bank:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(game?.bank.balance || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Side Pot:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(game?.sidePot.balance || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Status:</span>
                  <span className="font-bold capitalize text-gray-900">{game?.status}</span>
                </div>
              </CardContent>
            </Card>
            
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
                  Game Board
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
                          `}
                        >
                          {/* Tile name */}
                          <div className="text-[0.5rem] font-bold text-white text-center px-0.5 drop-shadow-md">
                            {tile.name}
                          </div>
                          
                          {/* Players on this tile */}
                          {playersHere.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 pb-0.5">
                              {playersHere.map(player => {
                                const token = PLAYER_TOKENS.find(t => t.value === player.token);
                                return (
                                  <div
                                    key={player.id}
                                    className={`
                                      text-lg bg-white rounded-full w-5 h-5 flex items-center justify-center border
                                      ${player.id === currentPlayerId ? 'border-blue-500 border-2' : 'border-gray-300'}
                                      ${player.id === currentPlayer?.id ? 'ring-2 ring-yellow-400' : ''}
                                    `}
                                    title={player.name}
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
                
                {/* Last Turn Result */}
                {lastTurnResult && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">Last Turn:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-900 font-medium">Dice:</span>
                        <span className="ml-2 font-semibold text-gray-900">{lastTurnResult.dice.dice1} + {lastTurnResult.dice.dice2} = {lastTurnResult.dice.total}</span>
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium">Moved:</span>
                        <span className="ml-2 font-semibold text-gray-900">{lastTurnResult.movement.oldPosition} → {lastTurnResult.movement.newPosition}</span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-900">{lastTurnResult.tileInteraction.message}</p>
                      </div>
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

