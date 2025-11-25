'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team } from '@/lib/types';
import { User, Swords, Shield } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface PlayerPerformanceDialogProps {
  player: WithId<LeagueEntry> | null;
  matches: WithId<Match>[];
  allPlayers: WithId<Player>[];
  allTeams: WithId<Team>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerPerformanceDialog({ player, matches, allPlayers, allTeams, open, onOpenChange }: PlayerPerformanceDialogProps) {
  const { t } = useTranslation();
  
  const playersById = useMemo(() => {
    return allPlayers.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const teamsById = useMemo(() => {
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const last5Matches = useMemo(() => {
    if (!player) return [];
    return matches
      .filter(m => (m.player1Id === player.playerId || m.player2Id === player.playerId) && m.isCompleted)
      .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
      .slice(0, 5)
      .map(m => {
        const isPlayer1 = m.player1Id === player.playerId;
        const playerScore = isPlayer1 ? m.player1Score! : m.player2Score!;
        const opponentScore = isPlayer1 ? m.player2Score! : m.player1Score!;
        const opponentId = isPlayer1 ? m.player2Id : m.player1Id;
        const opponent = playersById[opponentId];
        const opponentTeam = opponent ? teamsById[opponent.teamId] : null;
        
        let result: 'W' | 'D' | 'L';
        if (playerScore > opponentScore) result = 'W';
        else if (playerScore < opponentScore) result = 'L';
        else result = 'D';
        
        return {
          ...m,
          opponent,
          opponentTeam,
          playerScore,
          opponentScore,
          result,
        };
      });
  }, [player, matches, playersById, teamsById]);

  if (!player) return null;

  const playerDetails = playersById[player.playerId];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={playerDetails?.photoUrl} alt={player.playerName} />
              <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl font-bold">{player.playerName}</DialogTitle>
              <DialogDescription>{player.teamName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <h3 className="mb-4 text-lg font-semibold">{t('last_5_matches', {defaultValue: '5 Pertandingan Terakhir'})}</h3>
          {last5Matches.length > 0 ? (
            <div className="space-y-3">
              {last5Matches.map(match => (
                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                     <ResultBadge result={match.result} />
                     <div className='flex items-center gap-2'>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={match.opponentTeam?.logoUrl} alt={match.opponentTeam?.name} />
                            <AvatarFallback><Shield /></AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-semibold">vs {match.opponent?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{format(match.matchDate.toDate(), "d MMM yyyy, HH:mm", { locale: localeId })}</p>
                        </div>
                     </div>
                  </div>
                  <p className="text-lg font-bold">
                    <span className={cn(match.result === 'W' && 'text-green-400', match.result === 'L' && 'text-red-400')}>{match.playerScore}</span>
                    <span className="mx-2 text-muted-foreground">-</span>
                    <span className={cn(match.result === 'L' && 'text-green-400', match.result === 'W' && 'text-red-400')}>{match.opponentScore}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">{t('no_completed_matches', {defaultValue: 'Belum ada pertandingan yang selesai.'})}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


const ResultBadge = ({ result }: { result: 'W' | 'D' | 'L' }) => {
    const resultConfig = {
        W: { text: 'W', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
        D: { text: 'D', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
        L: { text: 'L', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
    };
    const { text, className } = resultConfig[result];
    
    return <Badge variant="outline" className={cn("w-8 h-8 flex items-center justify-center text-sm font-bold border-2", className)}>{text}</Badge>
};
