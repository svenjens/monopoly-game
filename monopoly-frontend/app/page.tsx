/**
 * Homepage / Lobby Page
 * 
 * Landing page where users can create or join a game.
 * Features clean, modern hero section with gradient background.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { createGame } from '@/lib/api';
import { validatePlayerName, validateGameId, sanitizeString, rateLimiter } from '@/lib/validation';
import { Gamepad2, Plus, LogIn } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatorName, setCreatorName] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new game and navigate to it.
   */
  const handleCreateGame = async () => {
    setError(null);
    
    // Rate limiting check
    if (!rateLimiter.isAllowed('create-game', 3, 60000)) {
      const seconds = rateLimiter.getTimeUntilReset('create-game', 60000);
      setError(`Te veel pogingen. Probeer over ${seconds} seconden opnieuw.`);
      toast.error(`Wacht ${seconds} seconden voordat je opnieuw een spel maakt`);
      return;
    }
    
    // Sanitize input
    const sanitizedName = sanitizeString(creatorName);
    
    // Validate player name
    const validation = validatePlayerName(sanitizedName);
    if (!validation.valid) {
      setError(validation.error || 'Ongeldige naam');
      toast.error(validation.error || 'Ongeldige naam');
      return;
    }

    setIsCreating(true);

    try {
      const response = await createGame();
      
      if (response.success && response.data) {
        toast.success('Spel aangemaakt! 🎮');
        // Navigate to game page (will show join dialog)
        router.push(`/game/${response.data.id}?name=${encodeURIComponent(sanitizedName)}`);
      } else {
        const errorMsg = response.error || 'Kon spel niet aanmaken';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Netwerk fout. Controleer je verbinding.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Join an existing game by ID.
   */
  const handleJoinGame = () => {
    setError(null);
    
    // Sanitize input
    const sanitizedGameId = sanitizeString(joinGameId);
    
    // Validate game ID
    const validation = validateGameId(sanitizedGameId);
    if (!validation.valid) {
      setError(validation.error || 'Ongeldig Game ID');
      toast.error(validation.error || 'Ongeldig Game ID');
      return;
    }

    toast.info('Deelnemen aan spel...');
    // Navigate to game page
    router.push(`/game/${sanitizedGameId}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-primary rounded-full shadow-glass-lg">
              <Gamepad2 className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Monopoly
          </h1>
          
          <p className="text-xl text-gray-900 max-w-2xl mx-auto">
            Een moderne, vereenvoudigde versie van het klassieke bordspel.
            Speel real-time met 2-4 spelers!
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Create Game Card */}
          <Card className="transition-smooth hover:scale-105 hover:shadow-glass-lg">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Nieuw Spel</CardTitle>
              </div>
              <CardDescription>
                Start een nieuw spel en nodig tot 4 spelers uit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Je naam..."
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGame()}
              />
              <Button
                onClick={handleCreateGame}
                disabled={isCreating || !creatorName.trim()}
                className="w-full"
                size="lg"
              >
                {isCreating ? 'Spel aanmaken...' : 'Spel Aanmaken'}
              </Button>
            </CardContent>
          </Card>

          {/* Join Game Card */}
          <Card className="transition-smooth hover:scale-105 hover:shadow-glass-lg">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <LogIn className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Deelnemen</CardTitle>
              </div>
              <CardDescription>
                Join een bestaand spel met een Game ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Voer Game ID in..."
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              />
              <Button
                onClick={handleJoinGame}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                Deelnemen aan Spel
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto mt-6">
            <Card className="border-red-300 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-700 font-medium text-center">
                  {error}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Game Info */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Hoe te Spelen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">1</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Maak een Spel</h3>
                  <p className="text-sm text-gray-900">
                    Start een nieuw spel en ontvang een unieke Game ID
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">2</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Voeg Spelers Toe</h3>
                  <p className="text-sm text-gray-900">
                    Deel de Game ID met vrienden (2-4 spelers)
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">3</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Speel!</h3>
                  <p className="text-sm text-gray-900">
                    Gooi de dobbelstenen en bouw jouw monopolie
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

