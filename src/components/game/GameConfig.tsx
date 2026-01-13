import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings, Minus, Plus, AlertCircle, Timer } from 'lucide-react';
import { Room, getRecommendedMafiaCount } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GameConfigProps {
  room: Room;
  playerCount: number;
  onUpdateConfig: (config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'voting_duration'>>) => void;
}

// Voting timer constants
const MIN_DURATION = 30;
const MAX_DURATION = 300;
const DEFAULT_DURATION = 120;

export function GameConfig({ room, playerCount, onUpdateConfig }: GameConfigProps) {
  const totalSpecialRoles = room.mafia_count + room.doctor_count + room.detective_count;
  const remainingCivilians = Math.max(0, playerCount - totalSpecialRoles);
  const recommendedMafia = getRecommendedMafiaCount(playerCount);
  
  // Voting timer state - explicitly check for null/undefined, 0 means disabled
  const isTimerEnabled = room.voting_duration !== null && room.voting_duration !== undefined && room.voting_duration > 0;
  const currentDuration = isTimerEnabled ? room.voting_duration : DEFAULT_DURATION;
  
  // Auto-set recommended mafia count when player count changes
  useEffect(() => {
    if (playerCount > 0 && room.mafia_count !== recommendedMafia) {
      if (room.mafia_count === 1 && recommendedMafia > 1) {
        onUpdateConfig({ mafia_count: recommendedMafia });
      }
    }
  }, [playerCount, recommendedMafia]);

  const handleIncrement = (field: 'mafia_count' | 'doctor_count' | 'detective_count') => {
    const newValue = room[field] + 1;
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

  const handleToggleTimer = (enabled: boolean) => {
    onUpdateConfig({ voting_duration: enabled ? DEFAULT_DURATION : 0 });
  };

  const handleDurationChange = (value: number[]) => {
    onUpdateConfig({ voting_duration: value[0] });
  };

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
    }
    return `${seconds}s`;
  };

  const isUnbalanced = room.mafia_count >= Math.ceil(playerCount / 2);

  // Role config row component for compact display
  const RoleRow = ({ 
    label, 
    value, 
    field, 
    colorClass, 
    minValue = 0,
    showRecommended = false 
  }: { 
    label: string; 
    value: number; 
    field: 'mafia_count' | 'doctor_count' | 'detective_count'; 
    colorClass: string;
    minValue?: number;
    showRecommended?: boolean;
  }) => (
    <div className={cn("flex items-center justify-between py-2 px-3 rounded-md", colorClass)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        {showRecommended && value === recommendedMafia && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
            Rec
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDecrement(field)}
          disabled={value <= minValue}
          className="h-7 w-7 p-0 hover:bg-background/50"
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-6 text-center font-bold text-sm">{value}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleIncrement(field)}
          className="h-7 w-7 p-0 hover:bg-background/50"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="glass-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Game Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Warning */}
        {isUnbalanced && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Too many Mafia for balanced gameplay</span>
          </div>
        )}
        
        {/* Role Distribution - Compact Grid */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Roles
          </Label>
          <div className="space-y-1">
            <RoleRow 
              label="Mafia" 
              value={room.mafia_count} 
              field="mafia_count" 
              colorClass="bg-red-500/10 text-red-400"
              minValue={1}
              showRecommended
            />
            <RoleRow 
              label="Doctor" 
              value={room.doctor_count} 
              field="doctor_count" 
              colorClass="bg-emerald-500/10 text-emerald-400"
            />
            <RoleRow 
              label="Detective" 
              value={room.detective_count} 
              field="detective_count" 
              colorClass="bg-blue-500/10 text-blue-400"
            />
            <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 text-muted-foreground">
              <span className="text-sm font-medium">Civilians</span>
              <span className="w-6 text-center font-bold text-sm mr-[60px]">{remainingCivilians}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Voting Timer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Voting Timer</Label>
            </div>
            <Switch
              checked={isTimerEnabled}
              onCheckedChange={handleToggleTimer}
            />
          </div>
          
          {isTimerEnabled && (
            <div className="space-y-2 pl-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="text-sm font-bold text-primary">
                  {formatDuration(currentDuration)}
                </span>
              </div>
              <Slider
                value={[currentDuration]}
                onValueChange={handleDurationChange}
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={15}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>30s</span>
                <span>5 min</span>
              </div>
            </div>
          )}
          
          {!isTimerEnabled && (
            <p className="text-xs text-muted-foreground pl-6">
              No time limit for voting phase
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
