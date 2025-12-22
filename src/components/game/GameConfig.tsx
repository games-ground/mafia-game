import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Settings, Users, Clock, Zap, Minus, Plus } from 'lucide-react';
import { Room, NightMode } from '@/types/game';

interface GameConfigProps {
  room: Room;
  playerCount: number;
  onUpdateConfig: (config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'night_mode' | 'night_duration' | 'day_duration'>>) => void;
}

export function GameConfig({ room, playerCount, onUpdateConfig }: GameConfigProps) {
  const totalSpecialRoles = room.mafia_count + room.doctor_count + room.detective_count;
  const remainingCivilians = Math.max(0, playerCount - totalSpecialRoles);
  
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

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

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
          
          <div className="space-y-3">
            {/* Mafia */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <span className="text-sm font-medium text-red-400">Mafia</span>
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

        {/* Night Mode */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Night Phase Mode</Label>
          <RadioGroup
            value={room.night_mode}
            onValueChange={(value: NightMode) => onUpdateConfig({ night_mode: value })}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <RadioGroupItem value="timed" id="timed" />
              <Label htmlFor="timed" className="flex items-center gap-2 cursor-pointer flex-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Timed</p>
                  <p className="text-xs text-muted-foreground">Custom timer for each phase</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <RadioGroupItem value="action_complete" id="action_complete" />
              <Label htmlFor="action_complete" className="flex items-center gap-2 cursor-pointer flex-1">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Action Complete</p>
                  <p className="text-xs text-muted-foreground">Night ends when all roles act</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Timer Duration (only for timed mode) */}
        {room.night_mode === 'timed' && (
          <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/30">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Phase Durations
            </Label>
            
            {/* Night Duration */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Night Phase</span>
                <span className="font-medium text-indigo-400">{formatDuration(room.night_duration)}</span>
              </div>
              <Slider
                value={[room.night_duration]}
                onValueChange={([value]) => onUpdateConfig({ night_duration: value })}
                min={15}
                max={120}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15s</span>
                <span>2m</span>
              </div>
            </div>

            {/* Day Duration */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Day Phase (Voting)</span>
                <span className="font-medium text-orange-400">{formatDuration(room.day_duration)}</span>
              </div>
              <Slider
                value={[room.day_duration]}
                onValueChange={([value]) => onUpdateConfig({ day_duration: value })}
                min={30}
                max={180}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>30s</span>
                <span>3m</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}