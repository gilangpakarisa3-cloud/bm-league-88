
'use client';

import type { Match, Player, WithId, Season } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Pencil } from 'lucide-react';

const MatchTeam = ({ player, score, isWinner, isBye }: { player: WithId<Player> | null, score: number | null, isWinner: boolean, isBye?: boolean }) => {
    if (isBye) {
        return <div className="flex items-center justify-between p-2 h-10">
            <span className="text-sm font-semibold text-muted-foreground">BYE</span>
        </div>
    }

    if (!player) {
        return <div className="flex items-center justify-between p-2 h-10">
            <span className="text-sm text-muted-foreground">TBD</span>
        </div>
    }

    return (
        <div className={cn(
            "flex items-center justify-between p-2 h-10",
            isWinner ? "font-bold text-foreground" : "text-muted-foreground"
        )}>
            <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm">{player.name}</span>
            </div>
            {score !== null && <span className={cn("font-semibold text-sm", isWinner && 'text-primary')}>{score}</span>}
        </div>
    )
}

interface MatchWithPlayers extends WithId<Match> {
  player1: WithId<Player> | null;
  player2: WithId<Player> | null;
  winner: WithId<Player> | null;
}

const MatchCard = ({ match, onUpdateMatch, canUpdate }: { match: MatchWithPlayers, onUpdateMatch: (match: WithId<Match>) => void, canUpdate: boolean }) => {
    const isByeMatch = match.player2Id === 'BYE';
    const canBeUpdated = canUpdate && !isByeMatch && match.player1Id !== 'TBD' && match.player2Id !== 'TBD';

    return (
        <div className="bg-card border rounded-md w-48 sm:w-64 shadow-sm relative group">
            <MatchTeam player={match.player1} score={match.player1Score ?? null} isWinner={match.winner?.id === match.player1?.id} />
            <div className="border-t">
                <MatchTeam player={match.player2} score={match.player2Score ?? null} isWinner={match.winner?.id === match.player2?.id} isBye={isByeMatch} />
            </div>
            {canBeUpdated && (
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute top-1/2 -right-4 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onUpdateMatch(match)}
                >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Update Score</span>
                </Button>
            )}
        </div>
    );
};


export function CupBracket({ matches, players, isLoading, onUpdateMatch, seasonStatus }: { matches: WithId<Match>[], players: WithId<Player>[], isLoading: boolean, onUpdateMatch: (match: WithId<Match>) => void, seasonStatus?: Season['status'] }) {

  const playersById = useMemo(() => {
    return players.reduce((acc, player) => {
      acc[player.id] = player;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [players]);

  const rounds = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    const sortedMatches = [...matches].sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

    const matchesWithPlayers: MatchWithPlayers[] = sortedMatches.map(match => {
        const player1 = match.player1Id !== 'TBD' ? playersById[match.player1Id] || null : null;
        const player2 = match.player2Id !== 'TBD' && match.player2Id !== 'BYE' ? playersById[match.player2Id] || null : null;
        let winner: WithId<Player> | null = null;
        if (match.isCompleted && typeof match.player1Score === 'number' && typeof match.player2Score === 'number') {
            if (match.player1Score > match.player2Score) winner = player1;
            else if (match.player2Score > match.player1Score) winner = player2;
        } else if (match.player2Id === 'BYE') {
            winner = player1;
        }

        return {
            ...match,
            player1,
            player2,
            winner
        }
    });

    const roundsMap: Record<string, MatchWithPlayers[]> = {};
    matchesWithPlayers.forEach(match => {
        if(match.round) {
            if (!roundsMap[match.round]) {
                roundsMap[match.round] = [];
            }
            roundsMap[match.round].push(match);
        }
    });

    const roundOrder = ['Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32'];
    
    return Object.entries(roundsMap)
      .map(([name, matchesInRound]) => ({ name, matches: matchesInRound }))
      .sort((a, b) => {
          const aIndex = roundOrder.indexOf(a.name);
          const bIndex = roundOrder.indexOf(b.name);
          // If both are named rounds, sort by the pre-defined order (reversed for display)
          if (aIndex !== -1 && bIndex !== -1) return bIndex - aIndex; 
          
           // If only one is a named round, it should come later (be on the left).
          if (aIndex !== -1) return 1;
          if (bIndex !== -1) return -1;
          
          // Fallback for numeric rounds (e.g., Round of 64), sort descending
          const aNum = parseInt(a.name.replace('Round of ', ''), 10);
          const bNum = parseInt(b.name.replace('Round of ', ''), 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;

          // Final fallback sort by match count (more matches = earlier round)
          return b.matches.length - a.matches.length; 
      }).reverse(); // Reverse to have final on the right

  }, [matches, playersById]);

  if (isLoading) {
    return (
        <div className="w-full overflow-hidden rounded-lg border bg-card/50 p-8">
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  if (rounds.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">The cup hasn't started yet.</h2>
        <p className="text-sm text-muted-foreground mt-2">Register players to generate the tournament bracket.</p>
      </div>
    );
  }

  const canUpdateMatches = seasonStatus === 'In Progress';

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card/50">
      <div className="flex p-4 sm:p-8 gap-8 sm:gap-16">
        {rounds.map((round, roundIndex) => (
          <div key={round.name} className="flex flex-col justify-around">
            <h3 className="text-lg sm:text-xl font-bold text-center mb-6 text-primary">{round.name}</h3>
            <div
              className="flex flex-col gap-8 relative"
            >
              {round.matches.map((match, matchIndex) => {
                const isFinalMatch = roundIndex === rounds.length - 1;

                const baseGap = 2; // in rem
                const multiplier = 2 ** roundIndex;
                const dynamicGap = (multiplier - 1) * 5.25 + baseGap; // 5.25rem is height of a match card

                return (
                  <div 
                    key={match.id} 
                    className="relative flex items-center"
                    style={{
                      marginTop: matchIndex > 0 ? `${dynamicGap}rem` : 0
                    }}
                  >
                    <MatchCard match={match} onUpdateMatch={onUpdateMatch} canUpdate={canUpdateMatches} />
                    {!isFinalMatch && (
                       <>
                        {/* Horizontal line from match to connector */}
                        <div className="absolute left-full top-1/2 h-px w-4 sm:w-8 bg-border"></div>
                        
                        {/* Vertical line connecting pairs */}
                        <div
                            className={cn("absolute w-px bg-border",
                                (match.matchNumber ?? 0) % 2 !== 0 ? 'top-1/2' : 'bottom-1/2'
                            )}
                            style={{ 
                                left: `calc(100% + 2rem)`,
                                height: `calc(50% + ${dynamicGap / 2}rem + 1px)`
                             }}
                         />
                        
                        {/* Horizontal line from connector to next match */}
                        {(match.matchNumber ?? 0) % 2 !== 0 &&
                          <div
                              className="absolute top-1/2 h-px w-4 sm:w-8 bg-border"
                              style={{ left: `calc(100% + 2rem)` }}
                          ></div>
                        }
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
       <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
