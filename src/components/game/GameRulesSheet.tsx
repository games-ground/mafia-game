import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BookOpen, Skull, Stethoscope, Eye, Users, Moon, Sun, Vote } from 'lucide-react';

export function GameRulesSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Game Rules</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            How to Play
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6 text-sm">
          {/* Objective */}
          <section>
            <h3 className="font-display text-base font-semibold text-foreground mb-2">Objective</h3>
            <p className="text-muted-foreground">
              Mafia wants to eliminate all civilians. Town wants to identify and eliminate all Mafia members.
            </p>
          </section>

          {/* Roles */}
          <section>
            <h3 className="font-display text-base font-semibold text-foreground mb-3">Roles</h3>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-lg bg-mafia/10 border border-mafia/30">
                <Skull className="w-5 h-5 text-mafia flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-mafia">Mafia</p>
                  <p className="text-muted-foreground text-xs">Kills one player each night. Knows other Mafia members.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 rounded-lg bg-doctor/10 border border-doctor/30">
                <Stethoscope className="w-5 h-5 text-doctor flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-doctor">Doctor</p>
                  <p className="text-muted-foreground text-xs">Protects one player each night from being killed.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 rounded-lg bg-detective/10 border border-detective/30">
                <Eye className="w-5 h-5 text-detective flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-detective">Detective</p>
                  <p className="text-muted-foreground text-xs">Investigates one player each night to learn if they're Mafia.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 rounded-lg bg-civilian/10 border border-civilian/30">
                <Users className="w-5 h-5 text-civilian flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-civilian">Civilian</p>
                  <p className="text-muted-foreground text-xs">No special abilities. Vote wisely to find Mafia!</p>
                </div>
              </div>
            </div>
          </section>

          {/* Game Flow */}
          <section>
            <h3 className="font-display text-base font-semibold text-foreground mb-3">Game Flow</h3>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <Moon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-indigo-400">Night Phase</p>
                  <p className="text-muted-foreground text-xs">Special roles perform their actions in secret.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Sun className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-400">Day Phase</p>
                  <p className="text-muted-foreground text-xs">Discuss who you think the Mafia might be.</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <Vote className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-400">Voting Phase</p>
                  <p className="text-muted-foreground text-xs">Vote to eliminate a suspect. Majority wins.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Win Conditions */}
          <section>
            <h3 className="font-display text-base font-semibold text-foreground mb-2">Win Conditions</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-success">•</span>
                <span><strong className="text-foreground">Town wins</strong> when all Mafia are eliminated</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mafia">•</span>
                <span><strong className="text-foreground">Mafia wins</strong> when they equal or outnumber civilians</span>
              </li>
            </ul>
          </section>

          {/* Game Settings */}
          <section>
            <h3 className="font-display text-base font-semibold text-foreground mb-2">Game Settings</h3>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span>Night ends when all roles complete their action</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span>Eliminated player roles are always revealed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <span>Voting shows who voted, not vote counts</span>
              </li>
            </ul>
          </section>

          {/* Tips */}
          <section className="p-3 rounded-lg bg-secondary/30 border border-border/30">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">💡 Tips</h3>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Pay attention to voting patterns</li>
              <li>• Mafia knows each other, use that to coordinate</li>
              <li>• Detective results are private — share wisely!</li>
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
