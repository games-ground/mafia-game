import { cn } from '@/lib/utils';
import { Eye, Skull, Stethoscope, Moon, Sun, Vote, AlertCircle, Trophy, Shield, Search } from 'lucide-react';

interface SystemMessageProps {
  content: string;
  roleType?: string | null;
}

export function SystemMessage({ content, roleType }: SystemMessageProps) {
  // Determine message type and styling based on content
  const getMessageConfig = () => {
    const lowerContent = content.toLowerCase();
    
    // Detective investigation results
    if (lowerContent.includes('investigation result') || lowerContent.includes('investigated')) {
      const isMafia = lowerContent.includes('is mafia') || lowerContent.includes('is a member of the mafia');
      return {
        icon: Search,
        bgClass: 'bg-detective/20 border-detective/40',
        iconClass: 'text-detective',
        textClass: 'text-detective-foreground',
        accentClass: isMafia ? 'text-mafia font-bold' : 'text-success font-bold',
      };
    }
    
    // Night phase / kill messages
    if (lowerContent.includes('was killed') || lowerContent.includes('eliminated by mafia')) {
      return {
        icon: Skull,
        bgClass: 'bg-mafia/20 border-mafia/40',
        iconClass: 'text-mafia',
        textClass: 'text-foreground',
      };
    }
    
    // Doctor save messages
    if (lowerContent.includes('saved') || lowerContent.includes('protected')) {
      return {
        icon: Shield,
        bgClass: 'bg-doctor/20 border-doctor/40',
        iconClass: 'text-doctor',
        textClass: 'text-foreground',
      };
    }
    
    // Vote/elimination messages
    if (lowerContent.includes('voted out') || lowerContent.includes('eliminated by vote') || lowerContent.includes('has been eliminated')) {
      return {
        icon: Vote,
        bgClass: 'bg-orange-500/20 border-orange-500/40',
        iconClass: 'text-orange-400',
        textClass: 'text-foreground',
      };
    }
    
    // Night start
    if (lowerContent.includes('night falls') || lowerContent.includes('night has begun')) {
      return {
        icon: Moon,
        bgClass: 'bg-indigo-500/20 border-indigo-500/40',
        iconClass: 'text-indigo-400',
        textClass: 'text-foreground',
      };
    }
    
    // Day start
    if (lowerContent.includes('day begins') || lowerContent.includes('sun rises') || lowerContent.includes('morning')) {
      return {
        icon: Sun,
        bgClass: 'bg-amber-500/20 border-amber-500/40',
        iconClass: 'text-amber-400',
        textClass: 'text-foreground',
      };
    }
    
    // Game over / winner
    if (lowerContent.includes('wins') || lowerContent.includes('victory') || lowerContent.includes('game over')) {
      return {
        icon: Trophy,
        bgClass: 'bg-accent/20 border-accent/40',
        iconClass: 'text-accent',
        textClass: 'text-foreground',
      };
    }
    
    // Default system message
    return {
      icon: AlertCircle,
      bgClass: 'bg-muted/50 border-border',
      iconClass: 'text-muted-foreground',
      textClass: 'text-muted-foreground',
    };
  };

  const config = getMessageConfig();
  const Icon = config.icon;

  // Format content for better display
  const formatContent = () => {
    // Handle detective results specially
    if (content.toLowerCase().includes('investigation result')) {
      return content;
    }
    return content;
  };

  return (
    <div className={cn(
      'p-3 rounded-lg border flex items-start gap-3 transition-all',
      config.bgClass
    )}>
      <div className={cn('p-1.5 rounded-full bg-background/50 flex-shrink-0', config.iconClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={cn('text-sm leading-relaxed', config.textClass)}>
        {formatContent()}
      </p>
    </div>
  );
}
