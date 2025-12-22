import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameState, RoomPlayer, Player, ROLE_INFO } from '@/types/game';
import { Eye, Target, Shield, Search, Skull } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SpectatorPanelProps {
  gameState: GameState;
  roomPlayers: (RoomPlayer & { player: Player })[];
  isNight: boolean;
}

export function SpectatorPanel({ gameState, roomPlayers, isNight }: SpectatorPanelProps) {
  // Find targets by ID
  const mafiaTarget = roomPlayers.find(p => p.id === gameState.mafia_target_id);
  const doctorTarget = roomPlayers.find(p => p.id === gameState.doctor_target_id);
  const detectiveTarget = roomPlayers.find(p => p.id === gameState.detective_target_id);

  // Get target names from stored names (for after phase ends) or from current targets
  const mafiaTargetName = gameState.last_mafia_target_name || mafiaTarget?.player.nickname;
  const doctorTargetName = gameState.last_doctor_target_name || doctorTarget?.player.nickname;
  const detectiveTargetName = gameState.last_detective_target_name || detectiveTarget?.player.nickname;

  // Get role counts for living players
  const alivePlayers = roomPlayers.filter(p => p.is_alive);
  const mafiaAlive = alivePlayers.filter(p => p.role === 'mafia').length;
  const doctorsAlive = alivePlayers.filter(p => p.role === 'doctor').length;
  const detectivesAlive = alivePlayers.filter(p => p.role === 'detective').length;

  const hasNightActions = mafiaTargetName || doctorTargetName || detectiveTargetName;

  return (
    <Card className="glass-card border-purple-500/30 bg-purple-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-purple-300 text-base">
          <Eye className="w-5 h-5" />
          Spectator View
          <Badge variant="outline" className="ml-auto text-xs bg-purple-500/10 border-purple-500/30">
            <Skull className="w-3 h-3 mr-1" />
            Dead
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          You are watching from beyond. You can see night actions but cannot interact.
        </p>

        {/* Role Overview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alive Roles</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              Mafia: {mafiaAlive}
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Doctors: {doctorsAlive}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              Detectives: {detectivesAlive}
            </Badge>
          </div>
        </div>

        {/* Night Actions */}
        {isNight && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tonight's Actions</p>
            <div className="space-y-2">
              {/* Mafia Target */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Target className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">Mafia targets:</span>
                <span className="text-sm font-medium text-red-400 ml-auto">
                  {mafiaTargetName || (mafiaAlive > 0 ? 'Deciding...' : 'N/A')}
                </span>
              </div>

              {/* Doctor Target */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">Doctor protects:</span>
                <span className="text-sm font-medium text-emerald-400 ml-auto">
                  {doctorTargetName || (doctorsAlive > 0 ? 'Deciding...' : 'N/A')}
                </span>
              </div>

              {/* Detective Target */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Search className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">Detective checks:</span>
                <span className="text-sm font-medium text-blue-400 ml-auto">
                  {detectiveTargetName || (detectivesAlive > 0 ? 'Deciding...' : 'N/A')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Previous Night Actions (during day) */}
        {!isNight && hasNightActions && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Night's Actions</p>
            <div className="space-y-2">
              {mafiaTargetName && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Target className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300">Mafia targeted:</span>
                  <span className="text-sm font-medium text-red-400 ml-auto">{mafiaTargetName}</span>
                </div>
              )}
              {doctorTargetName && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">Doctor protected:</span>
                  <span className="text-sm font-medium text-emerald-400 ml-auto">{doctorTargetName}</span>
                </div>
              )}
              {detectiveTargetName && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Search className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300">Detective checked:</span>
                  <span className="text-sm font-medium text-blue-400 ml-auto">{detectiveTargetName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Player Roles (Spectator can see everything) */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Player Roles</p>
          <div className="grid grid-cols-2 gap-1">
            {roomPlayers.map(player => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-1.5 rounded text-xs ${
                  player.is_alive 
                    ? 'bg-secondary/50' 
                    : 'bg-secondary/20 opacity-60'
                }`}
              >
                <span className={!player.is_alive ? 'line-through text-muted-foreground' : ''}>
                  {player.player.nickname}
                </span>
                {player.role && (
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] px-1.5 py-0 ${
                      player.role === 'mafia' ? 'text-red-400 border-red-500/30' :
                      player.role === 'doctor' ? 'text-emerald-400 border-emerald-500/30' :
                      player.role === 'detective' ? 'text-blue-400 border-blue-500/30' :
                      'text-gray-400 border-gray-500/30'
                    }`}
                  >
                    {ROLE_INFO[player.role].name}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}