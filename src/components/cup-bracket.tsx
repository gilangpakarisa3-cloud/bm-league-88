
import { cupData } from '@/lib/data';
import type { CupMatch, Team } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

const MatchTeam = ({ team, score, isWinner }: { team: Team | null, score: number | null, isWinner: boolean }) => {
    if (!team) {
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
                <Image
                    src={team.logoUrl}
                    alt={`${team.name} logo`}
                    width={24}
                    height={24}
                    className="rounded-full"
                    data-ai-hint="team logo"
                />
                <span className="text-sm">{team.name}</span>
            </div>
            {score !== null && <span className={cn("font-semibold text-sm", isWinner && 'text-primary')}>{score}</span>}
        </div>
    )
}

const MatchCard = ({ match }: { match: CupMatch }) => (
    <div className="bg-card border rounded-md w-64 shadow-sm">
        <MatchTeam team={match.team1} score={match.score1} isWinner={match.winner?.id === match.team1?.id} />
        <div className="border-t">
            <MatchTeam team={match.team2} score={match.score2} isWinner={match.winner?.id === match.team2?.id} />
        </div>
    </div>
);

export function CupBracket() {
  const finalRoundIndex = cupData.length - 1;
  const numRounds = cupData.length;

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card/50">
      <div className="flex p-8 gap-8">
        {cupData.map((round, roundIndex) => (
          <div key={round.name} className="flex flex-col justify-center">
            <h3 className="text-xl font-bold text-center mb-6 text-primary">{round.name}</h3>
            <div
              className="flex flex-col"
              style={{
                gap: `${roundIndex > 0 ? (2 ** roundIndex -1) * 6 + 2 : 4}rem`
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
                        <div className="absolute left-full top-1/2 h-px w-8 bg-border"></div>
                        {/* Vertical connector line */}
                        <div
                            className="absolute h-full w-px bg-border"
                            style={{
                                left: 'calc(100% + 2rem)',
                                top: matchIndex % 2 === 0 ? '50%' : `-${(100 * (2**(roundIndex+1)-1) - 100) / 2}%`,
                                height: matchIndex % 2 === 0 ? `${(100 * (2**(roundIndex+1)-1))}%`: '0%',
                            }}
                        ></div>
                        {/* Horizontal line from connector to next match */}
                        {matchIndex % 2 === 0 &&
                          <div
                              className="absolute top-1/2 h-px w-8 bg-border"
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
