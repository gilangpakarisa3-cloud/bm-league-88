'use client';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface CoopScoreChecklistProps {
  player1Name: string;
  player2Name: string;
  initialScore: { player1Wins: number; player2Wins: number };
  onScoreChange: (score: { player1Wins: number; player2Wins: number }) => void;
}

export function CoopScoreChecklist({ player1Name, player2Name, initialScore, onScoreChange }: CoopScoreChecklistProps) {
  const [gameWinners, setGameWinners] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    const winners: (string | null)[] = [null, null, null];
    if (initialScore.player1Wins > 0 || initialScore.player2Wins > 0) {
        let p1w = initialScore.player1Wins;
        let p2w = initialScore.player2Wins;
        for (let i = 0; i < 3; i++) {
          if (p1w > 0) {
            winners[i] = 'player1';
            p1w--;
          } else if (p2w > 0) {
            winners[i] = 'player2';
            p2w--;
          } else {
            winners[i] = null;
          }
        }
    }
    setGameWinners(winners);
  }, [initialScore]);

  const handleWinnerChange = (gameIndex: number, winner: string) => {
    let newWinners = [...gameWinners];
    
    newWinners[gameIndex] = newWinners[gameIndex] === winner ? null : winner;

    const p1Wins = newWinners.filter(w => w === 'player1').length;
    const p2Wins = newWinners.filter(w => w === 'player2').length;
    
    // If a player has won 2 games, ensure game 3 is not selected
    if ((p1Wins >= 2 || p2Wins >= 2) && gameIndex < 2) {
      newWinners[2] = null;
    }
    
    setGameWinners(newWinners);

    const finalP1Wins = newWinners.filter(w => w === 'player1').length;
    const finalP2Wins = newWinners.filter(w => w === 'player2').length;
    onScoreChange({ player1Wins: finalP1Wins, player2Wins: finalP2Wins });
  };
  
  const p1TotalWins = gameWinners.filter(w => w === 'player1').length;
  const p2TotalWins = gameWinners.filter(w => w === 'player2').length;
  const isGame3Disabled = p1TotalWins >= 2 || p2TotalWins >= 2;

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground">Pilih pemenang untuk setiap game.</div>
      {[0, 1, 2].map(i => (
        <Card key={i} className={ (i === 2 && isGame3Disabled) ? 'opacity-50' : ''}>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold text-center">Game {i + 1}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <RadioGroup
              value={gameWinners[i] || ''}
              onValueChange={(winner) => handleWinnerChange(i, winner)}
              className="flex justify-around"
              disabled={i === 2 && isGame3Disabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="player1" id={`p1-game-${i}`} />
                <Label htmlFor={`p1-game-${i}`} className="cursor-pointer">{player1Name}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="player2" id={`p2-game-${i}`} />
                <Label htmlFor={`p2-game-${i}`} className="cursor-pointer">{player2Name}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
