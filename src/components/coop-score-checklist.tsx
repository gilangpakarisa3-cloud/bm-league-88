
'use client';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CoopScoreChecklistProps {
  player1Name: string;
  player2Name: string;
  winners: (string | null)[];
  onWinnerChange: (index: number, winner: string) => void;
}

export function CoopScoreChecklist({ player1Name, player2Name, winners, onWinnerChange }: CoopScoreChecklistProps) {
  // Game 3 is disabled if someone already won 2 games in G1 & G2
  const p1Wins_G12 = winners.slice(0, 2).filter(w => w === 'player1').length;
  const p2Wins_G12 = winners.slice(0, 2).filter(w => w === 'player2').length;
  const isGame3Disabled = p1Wins_G12 === 2 || p2Wins_G12 === 2;

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-2 italic">
        Klik nama pemain untuk menentukan pemenang setiap game.
      </div>
      {[0, 1, 2].map(i => {
        const isDisabled = i === 2 && isGame3Disabled;
        const currentWinner = winners[i];
        
        return (
          <Card key={i} className={cn(
            "transition-all duration-200 border-2", 
            isDisabled ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100',
            currentWinner ? 'border-primary/50 bg-primary/5' : 'border-border'
          )}>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
                Game {i + 1}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <RadioGroup
                value={currentWinner || ''}
                onValueChange={(val) => onWinnerChange(i, val)}
                className="flex justify-around items-center"
                disabled={isDisabled}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="player1" id={`p1-game-${i}`} className="h-5 w-5" />
                  <Label 
                    htmlFor={`p1-game-${i}`} 
                    className={cn(
                        "cursor-pointer text-sm transition-all", 
                        currentWinner === 'player1' ? "text-primary font-extrabold scale-110" : "text-foreground/70"
                    )}
                  >
                    {player1Name}
                  </Label>
                </div>
                
                <div className="h-4 w-px bg-border" />

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="player2" id={`p2-game-${i}`} className="h-5 w-5" />
                  <Label 
                    htmlFor={`p2-game-${i}`} 
                    className={cn(
                        "cursor-pointer text-sm transition-all", 
                        currentWinner === 'player2' ? "text-primary font-extrabold scale-110" : "text-foreground/70"
                    )}
                  >
                    {player2Name}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
