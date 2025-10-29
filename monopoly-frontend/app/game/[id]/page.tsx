/**
 * Game Page
 * 
 * Main game interface where players roll dice, move tokens, and play Monopoly.
 * Features real-time updates via WebSocket and smooth animations.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGameState, useIsMyTurn, useMyPlayer, useCurrentPlayer } from '@/hooks/useGameState';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getGame, joinGame, rollDice } from '@/lib/api';
import { PLAYER_TOKENS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { PlayerToken } from '@/lib/types';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Users, DollarSign, Trophy } from 'lucide-react';

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  
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
  
  // Join game state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedToken, setSelectedToken] = useState<PlayerToken>('car');
  
  // WebSocket
  const { isConnected, subscribe } = useWebSocket(handleWebSocketMessage);
  
  /**
   * Load game on mount.
   */
  useEffect(() => {
    loadGame();
  }, [gameId]);
  
  /**
   * Subscribe to WebSocket updates when connected.
   */
  useEffect(() => {
    if (isConnected && gameId) {
      subscribe(gameId);
    }
  }, [isConnected, gameId, subscribe]);
  
  /**
   * Load game data from API.
   */
  const loadGame = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getGame(gameId);
      
      if (response.success && response.data) {
        setGame(response.data);
        
        // Show join dialog if not already in game
        if (!currentPlayerId && response.data.status === 'waiting') {
          setShowJoinDialog(true);
        }
      } else {
        setError(response.error || 'Failed to load game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Join the game as a new player.
   */
  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await joinGame(gameId, {
        name: playerName.trim(),
        token: selectedToken,
      });
      
      if (response.success && response.data) {
        setGame(response.data.game);
        setCurrentPlayerId(response.data.player.id);
        setShowJoinDialog(false);
      } else {
        setError(response.error || 'Failed to join game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Roll dice and execute turn.
   */
  const handleRollDice = async () => {
    setIsRolling(true);
    setError(null);
    
    try {
      const response = await rollDice(gameId);
      
      if (response.success && response.data) {
        setLastTurnResult(response.data);
        setGame(response.data.gameState);
        
        // Reset rolling after animation
        setTimeout(() => {
          setIsRolling(false);
        }, 600);
      } else {
        setError(response.error || 'Failed to roll dice');
        setIsRolling(false);
      }
    } catch (err) {
      setError('Network error');
      setIsRolling(false);
    }
  };
  
  // Loading state
  if (isLoading && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Loading game...</p>
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
            <CardTitle>Join Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Choose Token</label>
              <div className="grid grid-cols-4 gap-2">
                {PLAYER_TOKENS.map((token) => (
                  <button
                    key={token.value}
                    onClick={() => setSelectedToken(token.value)}
                    className={`p-3 rounded-lg border-2 text-2xl transition-smooth ${
                      selectedToken === token.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-primary/50'
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
            
            <Button onClick={handleJoinGame} disabled={isLoading} className="w-full">
              {isLoading ? 'Joining...' : 'Join Game'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Game interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Monopoly
            </h1>
            <p className="text-sm text-gray-600">Game ID: {gameId}</p>
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
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players ({game?.players.length || 0}/4)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {game?.players.map((player, idx) => {
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
                            <p className="font-semibold">{player.name}</p>
                            {isMe && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">You</span>}
                          </div>
                          <p className="text-sm text-gray-600">{formatCurrency(player.balance)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            
            {/* Roll Dice */}
            {game?.status === 'in_progress' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Turn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Current Player</p>
                    <p className="text-lg font-bold">{currentPlayer?.name}</p>
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
            
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Game Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bank:</span>
                  <span className="font-semibold">{formatCurrency(game?.bank.balance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Side Pot:</span>
                  <span className="font-semibold">{formatCurrency(game?.sidePot.balance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="font-semibold capitalize">{game?.status}</span>
                </div>
              </CardContent>
            </Card>
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
                {/* Simplified board visualization */}
                <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-8 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-6xl font-bold text-green-800 mb-2">MONOPOLY</p>
                      <p className="text-lg text-green-700">Vereenvoudigde Versie</p>
                      {myPlayer && (
                        <div className="mt-6 p-4 bg-white/80 rounded-lg shadow">
                          <p className="text-sm text-gray-600">Your Position</p>
                          <p className="text-3xl font-bold text-primary">{myPlayer.position}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Last Turn Result */}
                {lastTurnResult && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-semibold mb-2">Last Turn:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Dice:</span>
                        <span className="ml-2 font-semibold">{lastTurnResult.dice.dice1} + {lastTurnResult.dice.dice2} = {lastTurnResult.dice.total}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Moved:</span>
                        <span className="ml-2 font-semibold">{lastTurnResult.movement.oldPosition} → {lastTurnResult.movement.newPosition}</span>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-700">{lastTurnResult.tileInteraction.message}</p>
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

