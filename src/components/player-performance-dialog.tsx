'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { WithId, LeagueEntry, Match, Player, Team } from '@/lib/types';
import { User, Shield, Percent, Trophy, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';

interface PlayerPerformanceDialogProps {
  player: WithId<LeagueEntry> | null;
  matches: WithId<Match>[];
  allPlayers: WithId<Player>[];
  allTeams: WithId<Team>[];
  totalPlayersInSeason: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerPerformanceDialog({ player, matches, allPlayers, allTeams, totalPlayersInSeason, open, onOpenChange }: PlayerPerformanceDialogProps) {
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

  const performanceStats = useMemo(() => {
    if (!player) return null;

    const completedMatches = matches
      .filter(m => (m.player1Id === player.playerId || m.player2Id === player.playerId) && m.isCompleted)
      .sort((a, b) => b.matchDate.toMillis() - a.matchDate.toMillis())
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
          isPlayer1,
          opponent,
          opponentTeam,
          playerScore,
          opponentScore,
          result,
        };
      });

    const winRate = player.played > 0 ? (player.win / player.played) * 100 : 0;
    const totalMatches = totalPlayersInSeason > 1 ? (totalPlayersInSeason - 1) * 2 : 0;
    const seasonProgress = totalMatches > 0 ? (player.played / totalMatches) * 100 : 0;

    return {
        completedMatches,
        winRate,
        seasonProgress,
        totalMatches
    }

  }, [player, matches, playersById, teamsById, totalPlayersInSeason]);

  if (!player || !performanceStats) return null;

  const playerDetails = playersById[player.playerId];
  const playerTeamDetails = teamsById[player.teamId];
  const { completedMatches, winRate, seasonProgress, totalMatches } = performanceStats;
  
  const StatDisplay = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-2 rounded-md bg-card">
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-primary">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-primary">
        <DialogHeader className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 border-4 border-primary">
              <AvatarImage src={playerDetails?.photoUrl} alt={player.playerName} />
              <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center space-y-1 pt-2">
              <DialogTitle className="text-2xl font-bold">{player.playerName}</DialogTitle>
              <DialogDescription className="flex items-center justify-center gap-2">
                <Avatar className="h-5 w-5">
                    <AvatarImage src={playerTeamDetails?.logoUrl} alt={player.teamName} />
                    <AvatarFallback><Shield className="w-3 h-3"/></AvatarFallback>
                </Avatar>
                {player.teamName}
              </DialogDescription>
            </div>
        </DialogHeader>

        <div className="py-2 space-y-6">
            <div className='space-y-4'>
                <div>
                    <h3 className="text-sm font-semibold mb-2">Progres Musim</h3>
                    <Progress value={seasonProgress} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-1.5">{player.played} dari {totalMatches} pertandingan dimainkan ({seasonProgress.toFixed(0)}%)</p>
                </div>
                 <div className="grid grid-cols-5 gap-2 text-center">
                   <StatDisplay label={t('played', { defaultValue: "P"})} value={player.played} />
                   <StatDisplay label={t('w', { defaultValue: "W"})} value={player.win} />
                   <StatDisplay label={t('d', { defaultValue: "D"})} value={player.draw} />
                   <StatDisplay label={t('l', { defaultValue: "L"})} value={player.loss} />
                   <StatDisplay label={t('pts', { defaultValue: "Pts"})} value={player.points} />
                </div>
                 <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 font-semibold">
                        <Percent className="w-4 h-4 text-primary"/>
                        <p>Win Rate</p>
                    </div>
                    <p className="text-lg font-bold text-primary">{winRate.toFixed(0)}%</p>
                </div>
            </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">{t('match_history', {defaultValue: 'Riwayat Pertandingan'})}</h3>
            {completedMatches.length > 0 ? (
                 <ScrollArea className="h-96 pr-4">
                    <div className="space-y-3">
                    {completedMatches.map(match => {
                      const scoreColorPlayer = cn({
                        'text-yellow-400': match.result === 'W',
                        'text-red-400': match.result === 'L',
                        'text-foreground': match.result === 'D',
                      });
                       const scoreColorOpponent = 'text-foreground';
                      
                      const homeScore = match.player1Score ?? 0;
                      const awayScore = match.player2Score ?? 0;
                      
                      return (
                        <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-card border-l-4 border-primary">
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
                              {match.isPlayer1 ? (
                                <>
                                  <span className={scoreColorPlayer}>{homeScore}</span>
                                  <span className="mx-2 text-muted-foreground">-</span>
                                  <span className={scoreColorOpponent}>{awayScore}</span>
                                </>
                              ) : (
                                <>
                                  <span className={scoreColorOpponent}>{homeScore}</span>
                                  <span className="mx-2 text-muted-foreground">-</span>
                                  <span className={scoreColorPlayer}>{awayScore}</span>
                                </>
                              )}
                          </p>
                        </div>
                      )
                    })}
                    </div>
                </ScrollArea>
            ) : (
                <p className="text-center text-muted-foreground py-4">{t('no_completed_matches', {defaultValue: 'Belum ada pertandingan yang selesai.'})}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


const ResultBadge = ({ result }: { result: 'W' | 'D' | 'L' }) => {
    const resultConfig = {
        W: { text: 'W', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
        D: { text: 'D', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-400' },
        L: { text: 'L', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
    };
    const { text, className } = resultConfig[result];
    
    return <Badge variant="outline" className={cn("w-8 h-8 flex items-center justify-center text-sm font-bold border-2", className)}>{text}</Badge>
};
