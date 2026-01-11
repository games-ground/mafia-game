import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Timer } from 'lucide-react';
import { Room } from '@/types/game';

interface VotingTimerConfigProps {
  room: Room;
  onUpdateConfig: (config: Partial<Pick<Room, 'mafia_count' | 'doctor_count' | 'detective_count' | 'voting_duration'>>) => void;
}

// Duration presets in seconds
const MIN_DURATION = 30;
const MAX_DURATION = 300;
const DEFAULT_DURATION = 120;

export function VotingTimerConfig({ room, onUpdateConfig }: VotingTimerConfigProps) {
  const isTimerEnabled = room.voting_duration !== null && room.voting_duration !== undefined;
  const currentDuration = room.voting_duration ?? DEFAULT_DURATION;

  const handleToggleTimer = (enabled: boolean) => {
    if (enabled) {
      onUpdateConfig({ voting_duration: DEFAULT_DURATION });
    } else {
      // Set to 0 to indicate disabled (we'll handle this as null in the backend)
      onUpdateConfig({ voting_duration: 0 });
    }
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

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <Timer className="w-5 h-5" />
          Voting Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Enable Voting Timer</Label>
            <p className="text-xs text-muted-foreground">
              Set a time limit for the voting phase
            </p>
          </div>
          <Switch
            checked={isTimerEnabled}
            onCheckedChange={handleToggleTimer}
          />
        </div>

        {/* Duration Slider */}
        {isTimerEnabled && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Duration</Label>
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30s</span>
              <span>5 min</span>
            </div>
          </div>
        )}

        {!isTimerEnabled && (
          <p className="text-xs text-muted-foreground italic">
            Without a timer, voting continues until all players vote or manually advance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
