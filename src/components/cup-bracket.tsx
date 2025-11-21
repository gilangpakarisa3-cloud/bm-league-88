
'use client';

import type { Match, Player, WithId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';

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

const MatchCard = ({ match }: { match: MatchWithPlayers }) => {
    const isByeMatch = match.player2Id === 'BYE';
    return (
        <div className="bg-card border rounded-md w-48 sm:w-64 shadow-sm">
            <MatchTeam player={match.player1} score={match.player1Score ?? null} isWinner={match.winner?.id === match.player1?.id} />
            <div className="border-t">
                <MatchTeam player={match.player2} score={match.player2Score ?? null} isWinner={match.winner?.id === match.player2?.id} isBye={isByeMatch} />
            </div>
        </div>
    );
};


export function CupBracket({ matches, players, isLoading }: { matches: WithId<Match>[], players: WithId<Player>[], isLoading: boolean }) {

  const playersById = useMemo(() => {
    return players.reduce((acc, player) => {
      acc[player.id] = player;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [players]);

  const rounds = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    const matchesWithPlayers: MatchWithPlayers[] = matches.map(match => {
        const player1 = match.player1Id !== 'TBD' ? playersById[match.player1Id] || null : null;
        const player2 = match.player2Id !== 'TBD' && match.player2Id !== 'BYE' ? playersById[match.player2Id] || null : null;
        let winner: WithId<Player> | null = null;
        if (match.isCompleted && typeof match.player1Score === 'number' && typeof match.player2Score === 'number') {
            if (match.player1Score > match.player2Score) winner = player1;
            else if (match.player2Score > match.player1Score) winner = player2;
        }
        if (match.player2Id === 'BYE') winner = player1;

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

    // Sort rounds logically (e.g., Round of 16, Quarter-finals, Semi-finals, Final)
    const roundOrder = ['Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32'];
    return Object.entries(roundsMap)
      .map(([name, matches]) => ({ name, matches: matches.sort((a,b) => (a.matchNumber || 0) - (b.matchNumber || 0)) }))
      .sort((a, b) => {
          const aTotalPlayers = a.matches.reduce((acc, m) => acc + (m.player2Id === 'BYE' ? 1 : 2), 0);
          const bTotalPlayers = b.matches.reduce((acc, m) => acc + (m.player2Id === 'BYE' ? 1 : 2), 0);
          const aName = a.name.split(' ')[0] === 'Round' ? `Round of ${aTotalPlayers}` : a.name;
          const bName = b.name.split(' ')[0] === 'Round' ? `Round of ${bTotalPlayers}` : b.name;
          
          const aIndex = roundOrder.indexOf(aName);
          const bIndex = roundOrder.indexOf(bName);

          if (aIndex !== -1 && bIndex !== -1) {
            return bIndex - aIndex;
          }
          return b.matches.length - a.matches.length;
      });

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

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card/50">
      <div className="flex p-4 sm:p-8 gap-4 sm:gap-8">
        {rounds.map((round, roundIndex) => (
          <div key={round.name} className="flex flex-col justify-center">
            <h3 className="text-lg sm:text-xl font-bold text-center mb-6 text-primary">{round.name}</h3>
            <div
              className="flex flex-col"
              style={{
                gap: `${roundIndex > 0 ? (2 ** roundIndex -1) * 5.5 + 2 : 4}rem`
              }}
            >
              {round.matches.map((match, matchIndex) => {
                const isFinalMatch = round.name === 'Final';
                return (
                  <div key={match.id} className="relative flex items-center">
                    <MatchCard match={match} />
                    {!isFinalMatch && (
                       <>
                        {/* Horizontal line from match to connector */}
                        <div className="absolute left-full top-1/2 h-px w-4 sm:w-8 bg-border"></div>
                        {/* Vertical connector line */}
                        <div
                            className="absolute h-full w-px bg-border"
                            style={{
                                left: `calc(100% + ${roundIndex === 0 ? '1rem' : '2rem'})`,
                                top: matchIndex % 2 === 0 ? '50%' : `-${(100 * (2**(roundIndex+1)-1) - 100) / 2}%`,
                                height: matchIndex % 2 === 0 ? `${(100 * (2**(roundIndex+1)-1))}%`: '0%',
                            }}
                        ></div>
                        {/* Horizontal line from connector to next match */}
                        {matchIndex % 2 === 0 &&
                          <div
                              className="absolute top-1/2 h-px w-4 sm:w-8 bg-border"
                              style={{ left: `calc(100% + ${roundIndex === 0 ? '1rem' : '2rem'})` }}
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
