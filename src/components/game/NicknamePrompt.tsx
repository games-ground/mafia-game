import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

interface NicknamePromptProps {
  currentNickname: string;
  onSubmit: (nickname: string) => void;
}

export function NicknamePrompt({ currentNickname, onSubmit }: NicknamePromptProps) {
  const [nickname, setNickname] = useState(currentNickname === 'Anonymous' ? '' : currentNickname);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNickname = nickname.trim() || 'Anonymous';
    onSubmit(finalNickname);
  };

  return (
    <div className="min-h-screen bg-gradient-dark relative flex items-center justify-center">
      <div className="fog-overlay" />
      
      <Card className="glass-card w-full max-w-md mx-4 relative z-10 animate-fade-in">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Enter Your Name</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Choose a nickname to join the game
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              autoFocus
              className="text-center text-lg"
            />
            <Button type="submit" className="w-full hover-glow" size="lg">
              Join Room
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}