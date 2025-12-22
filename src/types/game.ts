export type GamePhase = 'lobby' | 'night' | 'day_discussion' | 'day_voting' | 'game_over';
export type RoleType = 'mafia' | 'detective' | 'doctor' | 'civilian';

export interface Player {
  id: string;
  browser_id: string;
  nickname: string;
  games_played: number;
  games_won: number;
  games_won_as_mafia: number;
  games_won_as_civilian: number;
  total_kills: number;
  total_saves: number;
  visittotal_investigations: number;
  correct_investigations: number;
  created_at: string;
  updated_at: string;
}

export type NightMode = 'timed' | 'action_complete';

export interface Room {
  id: string;
  code: string;
  host_id: string | null;
  status: string;
  min_players: number;
  max_players: number;
  mafia_count: number;
  doctor_count: number;
  detective_count: number;
  night_mode: NightMode;
  night_duration: number;
  day_duration: number;
  show_vote_counts: boolean;
  reveal_roles_on_death: boolean;
  created_at: string;
  updated_at: string;
}

// Recommended mafia count based on player count
export function getRecommendedMafiaCount(playerCount: number): number {
  if (playerCount <= 5) return 1;
  if (playerCount <= 7) return 1;
  if (playerCount <= 10) return 2;
  if (playerCount <= 12) return 3;
  if (playerCount <= 15) return 4;
  return Math.floor(playerCount / 4);
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  is_ready: boolean;
  role: RoleType | null;
  is_alive: boolean;
  joined_at: string;
  player?: Player;
}

export interface GameState {
  id: string;
  room_id: string;
  phase: GamePhase;
  phase_end_time: string | null;
  day_number: number;
  mafia_target_id: string | null;
  doctor_target_id: string | null;
  detective_target_id: string | null;
  detective_result: string | null;
  winner: string | null;
  // Spectator mode info for dead players
  last_mafia_target_name: string | null;
  last_doctor_target_name: string | null;
  last_detective_target_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  voter_id: string;
  target_id: string | null;
  day_number: number;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  player_id: string | null;
  content: string;
  is_system: boolean;
  is_mafia_only: boolean;
  created_at: string;
  player?: RoomPlayer;
}

export interface GameAction {
  id: string;
  room_id: string;
  actor_id: string | null;
  action_type: string;
  target_id: string | null;
  result: string | null;
  day_number: number;
  phase: GamePhase;
  created_at: string;
}

export const ROLE_INFO: Record<RoleType, { name: string; description: string; color: string }> = {
  mafia: {
    name: 'Mafia',
    description: 'Eliminate civilians each night. Win when you equal or outnumber the town.',
    color: 'mafia',
  },
  detective: {
    name: 'Detective',
    description: 'Investigate one player each night to learn if they are Mafia.',
    color: 'detective',
  },
  doctor: {
    name: 'Doctor',
    description: 'Protect one player each night from being killed.',
    color: 'doctor',
  },
  civilian: {
    name: 'Civilian',
    description: 'Find and eliminate the Mafia through discussion and voting.',
    color: 'civilian',
  },
};
