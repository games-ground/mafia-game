import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RoleType, ROLE_INFO } from '@/types/game';

interface ActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  role: RoleType;
  targetName: string;
}

export function ActionConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  role,
  targetName,
}: ActionConfirmDialogProps) {
  const actionLabels: Record<string, { verb: string; description: string }> = {
    mafia: { verb: 'Kill', description: 'eliminate' },
    doctor: { verb: 'Save', description: 'protect' },
    detective: { verb: 'Investigate', description: 'investigate' },
  };

  const action = actionLabels[role] || { verb: 'Target', description: 'target' };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            Confirm {action.verb}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {action.description}{' '}
            <span className="font-semibold text-foreground">{targetName}</span>?
            This action cannot be undone for this night.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`bg-${ROLE_INFO[role].color} hover:bg-${ROLE_INFO[role].color}/90`}
          >
            {action.verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
