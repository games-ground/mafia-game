import { useState, useRef, useEffect } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  roomId: string;
  currentRoomPlayerId: string;
  isMafia: boolean;
  isNight: boolean;
  isAlive: boolean;
}

export function ChatPanel({
  roomId,
  currentRoomPlayerId,
  isMafia,
  isNight,
  isAlive,
}: ChatPanelProps) {
  const { messages, sendMessage } = useMessages(roomId, isMafia);
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
    
    // During night, only mafia can send messages (mafia-only)
    const isMafiaOnly = isNight && isMafia;
    
    // During day, everyone can send public messages
    // During night, only mafia can chat (privately)
    if (isNight && !isMafia) return;

    sendMessage(input, currentRoomPlayerId, isMafiaOnly);
    setInput('');
  };

  const canChat = isAlive && (!isNight || isMafia);

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {isNight && isMafia ? 'Mafia Chat' : 'Town Chat'}
        </CardTitle>
        {isNight && !isMafia && (
          <p className="text-xs text-muted-foreground">Chat disabled at night</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'p-2 rounded-lg text-sm',
                  msg.is_system && 'bg-muted/50 text-muted-foreground italic text-center',
                  msg.is_mafia_only && 'bg-mafia/20 border border-mafia/30',
                  !msg.is_system && !msg.is_mafia_only && 'bg-secondary/50',
                  msg.player_id === currentRoomPlayerId && 'ml-4'
                )}
              >
                {!msg.is_system && msg.room_player && (
                  <p className={cn(
                    'font-semibold text-xs mb-1',
                    msg.is_mafia_only && 'text-mafia'
                  )}>
                    {msg.room_player.player?.nickname || 'Unknown'}
                    {msg.is_mafia_only && ' (Mafia)'}
                  </p>
                )}
                <p className="break-words">{msg.content}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        {canChat ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isNight ? 'Mafia whisper...' : 'Send a message...'}
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
            {!isAlive ? 'Dead players cannot chat' : 'Chat disabled'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
