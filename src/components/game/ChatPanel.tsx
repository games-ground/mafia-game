import { useState, useRef, useEffect } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Skull, Eye, Stethoscope, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleType } from '@/types/game';
import { SystemMessage } from './SystemMessage';
interface ChatPanelProps {
  roomId: string;
  currentRoomPlayerId: string;
  currentRole: RoleType | null;
  isNight: boolean;
  isAlive: boolean;
}

export function ChatPanel({
  roomId,
  currentRoomPlayerId,
  currentRole,
  isNight,
  isAlive,
}: ChatPanelProps) {
  const { messages, sendMessage } = useMessages(roomId, currentRole, isNight);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !isAlive) return;
    
    // During night, only special roles can send messages (role-specific)
    // During day, everyone can send public messages
    if (isNight) {
      if (!currentRole || !['mafia', 'doctor', 'detective'].includes(currentRole)) return;
      sendMessage(input, currentRoomPlayerId, currentRole);
    } else {
      // Day phase - public messages
      sendMessage(input, currentRoomPlayerId, null);
    }
    setInput('');
  };

  const canChat = isAlive && (
    !isNight || 
    (currentRole && ['mafia', 'doctor', 'detective'].includes(currentRole))
  );

  // Get chat title and icon based on phase and role
  const getChatInfo = () => {
    if (!isNight) {
      return { title: 'Town Chat', icon: Users, color: 'text-foreground' };
    }
    
    switch (currentRole) {
      case 'mafia':
        return { title: 'Mafia Chat', icon: Skull, color: 'text-mafia' };
      case 'detective':
        return { title: 'Detective Chat', icon: Eye, color: 'text-detective' };
      case 'doctor':
        return { title: 'Doctor Chat', icon: Stethoscope, color: 'text-doctor' };
      default:
        return { title: 'Chat Disabled', icon: MessageCircle, color: 'text-muted-foreground' };
    }
  };

  const chatInfo = getChatInfo();
  const ChatIcon = chatInfo.icon;

  // Get message styling based on role_type
  const getMessageStyle = (roleType: string | null, isMafiaOnly: boolean) => {
    if (roleType === 'mafia' || isMafiaOnly) return 'bg-mafia/20 border border-mafia/30';
    if (roleType === 'detective') return 'bg-detective/20 border border-detective/30';
    if (roleType === 'doctor') return 'bg-doctor/20 border border-doctor/30';
    return 'bg-secondary/50';
  };

  const getRoleBadge = (roleType: string | null, isMafiaOnly: boolean) => {
    if (roleType === 'mafia' || isMafiaOnly) return { label: 'Mafia', color: 'text-mafia' };
    if (roleType === 'detective') return { label: 'Detective', color: 'text-detective' };
    if (roleType === 'doctor') return { label: 'Doctor', color: 'text-doctor' };
    return null;
  };

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className={cn("font-display text-lg flex items-center gap-2", chatInfo.color)}>
          <ChatIcon className="w-5 h-5" />
          {chatInfo.title}
        </CardTitle>
        {isNight && !canChat && (
          <p className="text-xs text-muted-foreground">Civilians must stay silent at night</p>
        )}
        {isNight && canChat && currentRole && ['mafia', 'detective', 'doctor'].includes(currentRole) && (
          <p className="text-xs text-muted-foreground">Only your team can see these messages</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
          <div className="space-y-2">
            {messages.map((msg) => {
              const roleBadge = getRoleBadge(msg.role_type, msg.is_mafia_only);
              
              // Use enhanced SystemMessage component for system messages
              if (msg.is_system) {
                return (
                  <SystemMessage 
                    key={msg.id} 
                    content={msg.content} 
                    roleType={msg.role_type} 
                  />
                );
              }
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'p-2 rounded-lg text-sm',
                    getMessageStyle(msg.role_type, msg.is_mafia_only),
                    msg.player_id === currentRoomPlayerId && 'ml-4'
                  )}
                >
                  {msg.room_player && (
                    <p className={cn(
                      'font-semibold text-xs mb-1',
                      roleBadge?.color
                    )}>
                      {msg.room_player.player?.nickname || 'Unknown'}
                      {roleBadge && ` (${roleBadge.label})`}
                    </p>
                  )}
                  <p className="break-words">{msg.content}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {canChat ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isNight ? `${currentRole} whisper...` : 'Send a message...'}
              className="bg-input border-border"
              maxLength={200}
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded-lg text-muted-foreground text-sm">
            <Skull className="w-4 h-4" />
            {!isAlive ? 'Dead players cannot chat' : 'Chat disabled at night'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
