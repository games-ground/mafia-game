import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Users, Minus, Plus, AlertCircle } from 'lucide-react';
import { Room, getRecommendedMafiaCount } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

interface GameConfigProps {
  room: Room;
  playerCount: number;
  onUpdateConfig: (config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count'>>) => void;
}

export function GameConfig({ room, playerCount, onUpdateConfig }: GameConfigProps) {
  const totalSpecialRoles = room.mafia_count + room.doctor_count + room.detective_count;
  const remainingCivilians = Math.max(0, playerCount - totalSpecialRoles);
  const recommendedMafia = getRecommendedMafiaCount(playerCount);
  
  // Auto-set recommended mafia count when player count changes
  useEffect(() => {
    if (playerCount > 0 && room.mafia_count !== recommendedMafia) {
      // Only auto-update if the current value seems like default
      if (room.mafia_count === 1 && recommendedMafia > 1) {
        onUpdateConfig({ mafia_count: recommendedMafia });
      }
    }
  }, [playerCount, recommendedMafia]);

  const handleIncrement = (field: 'mafia_count' | 'doctor_count' | 'detective_count') => {
    const newValue = room[field] + 1;
    // Ensure we don't exceed player count minus other roles
    const otherRoles = totalSpecialRoles - room[field];
    if (otherRoles + newValue < playerCount) {
      onUpdateConfig({ [field]: newValue });
    }
  };

  const handleDecrement = (field: 'mafia_count' | 'doctor_count' | 'detective_count') => {
    const minValue = field === 'mafia_count' ? 1 : 0;
    if (room[field] > minValue) {
      onUpdateConfig({ [field]: room[field] - 1 });
    }
  };

  // Check if configuration is balanced
  const isUnbalanced = room.mafia_count >= Math.ceil(playerCount / 2);

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Game Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Counts */}
        <div className="space-y-4">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Role Distribution
          </Label>
          
          {isUnbalanced && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Warning: Too many Mafia for a balanced game!</span>
            </div>
          )}
          
          <div className="space-y-3">
            {/* Mafia */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-400">Mafia</span>
                {room.mafia_count === recommendedMafia && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                    Recommended
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecrement('mafia_count')}
                  disabled={room.mafia_count <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold">{room.mafia_count}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleIncrement('mafia_count')}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-sm font-medium text-emerald-400">Doctor</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecrement('doctor_count')}
                  disabled={room.doctor_count <= 0}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold">{room.doctor_count}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleIncrement('doctor_count')}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Detective */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <span className="text-sm font-medium text-blue-400">Detective</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDecrement('detective_count')}
                  disabled={room.detective_count <= 0}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold">{room.detective_count}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleIncrement('detective_count')}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Civilians (calculated) */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-500/10 border border-gray-500/30">
              <span className="text-sm font-medium text-gray-400">Civilians</span>
              <span className="w-8 text-center font-bold">{remainingCivilians}</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
