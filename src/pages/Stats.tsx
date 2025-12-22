import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Skull, Heart, Search, Target } from 'lucide-react';

export default function Stats() {
  const navigate = useNavigate();
  const { player, loading } = usePlayer();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="animate-pulse text-foreground font-display text-2xl">Loading...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No player data found</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const winRate = player.games_played > 0 
    ? Math.round((player.games_won / player.games_played) * 100) 
    : 0;

  const investigationAccuracy = player.visittotal_investigations > 0
    ? Math.round((player.correct_investigations / player.visittotal_investigations) * 100)
    : 0;

  const stats = [
    { 
      label: 'Games Played', 
      value: player.games_played, 
      icon: Target,
      color: 'text-foreground' 
    },
    { 
      label: 'Win Rate', 
      value: `${winRate}%`, 
      icon: Trophy,
      color: 'text-accent' 
    },
    { 
      label: 'Mafia Wins', 
      value: player.games_won_as_mafia, 
      icon: Skull,
      color: 'text-mafia' 
    },
    { 
      label: 'Town Wins', 
      value: player.games_won_as_civilian, 
      icon: Heart,
      color: 'text-doctor' 
    },
    { 
      label: 'Total Kills', 
      value: player.total_kills, 
      icon: Skull,
      color: 'text-destructive' 
    },
    { 
      label: 'Lives Saved', 
      value: player.total_saves, 
      icon: Heart,
      color: 'text-success' 
    },
    { 
      label: 'Investigations', 
      value: player.visittotal_investigations, 
      icon: Search,
      color: 'text-detective' 
    },
    { 
      label: 'Investigation Accuracy', 
      value: `${investigationAccuracy}%`, 
      icon: Search,
      color: 'text-detective' 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark relative">
      <div className="fog-overlay" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              {player.nickname}
            </h1>
            <p className="text-muted-foreground">Your Statistics</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="glass-card hover-glow transition-all">
                <CardHeader className="pb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-display font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
