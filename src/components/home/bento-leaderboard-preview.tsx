'use client';

import * as React from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Season, WithId, Player, Team, SeasonRecord, LeagueEntry } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Award, ArrowUpRight, Flame, User, Swords } from 'lucide-react';
import { resolveLogo } from '@/lib/logo-utils';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalSeasonTheme } from '@/context/season-theme-context';

const LEAGUE_ID = 'main-league';

export function BentoLeaderboardPreview({ activeSeasonId }: { activeSeasonId?: string | null }) {
  const firestore = useFirestore();
  const { theme } = useGlobalSeasonTheme();

  // If no season ID passed, fetch the latest active season
  const seasonsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `leagues/${LEAGUE_ID}/seasons`) : null),
    [firestore]
  );
  const { data: seasons } = useCollection<Season>(seasonsCollection);

  const targetSeason = useMemo(() => {
    if (!seasons || seasons.length === 0) return null;
    if (activeSeasonId) {
      return seasons.find(s => s.id === activeSeasonId) || null;
    }
    const inProgressOrCompleted = seasons.filter(s => s.status !== 'Not Started');
    if (inProgressOrCompleted.length > 0) {
      return [...inProgressOrCompleted].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
    }
    return [...seasons].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
  }, [seasons, activeSeasonId]);

  const seasonId = targetSeason?.id;
  const isCoop = targetSeason?.type === 'Co-Op' || targetSeason?.type === 'Co-Op Hybrid';

  // Fetch League Table for target season
  const tableQuery = useMemoFirebase(() => {
    if (!firestore || !seasonId) return null;
    const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';
    return query(
      collection(firestore, `leagues/${LEAGUE_ID}/seasons/${seasonId}/${tableName}`),
      orderBy('points', 'desc'),
      limit(8)
    );
  }, [firestore, seasonId, isCoop]);

  const { data: rawEntries, isLoading: isLoadingTable } = useCollection<any>(tableQuery);

  // Teams & Players for enrichment
  const teamsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams } = useCollection<Team>(teamsCollection);

  const playersCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers } = useCollection<Player>(playersCollection);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const topPlayers = useMemo(() => {
    if (!rawEntries) return [];
    return rawEntries.slice(0, 8).map((entry, idx) => {
      let teamId = entry.teamId;
      let pName = entry.playerName;

      if (isCoop) {
        teamId = entry.coopTeamId || entry.id;
        pName = entry.coopTeamName || entry.teamName;
      } else {
        const pId = entry.playerId || entry.id;
        const player = playersById[pId];
        if (!teamId && player) teamId = player.teamId;
      }

      const team = teamId ? teamsById[teamId] : undefined;
      const logoUrl = resolveLogo(team?.logoUrl, teamId, pName);

      return {
        ...entry,
        rank: idx + 1,
        playerName: pName,
        teamName: team?.name || entry.teamName || 'Independent',
        logoUrl
      };
    });
  }, [rawEntries, isCoop, playersById, teamsById]);

  if (isLoadingTable) {
    return (
      <div className="space-y-2 py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02]">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-6 w-10 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between w-full h-full bg-black/40 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-xl group/preview hover:border-white/20 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="p-1 rounded-lg border"
            style={{
              backgroundColor: `${theme.primaryHex}1a`,
              borderColor: `${theme.primaryHex}4d`,
              color: theme.primaryHex,
            }}
          >
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">
                TOP STANDINGS PREVIEW
              </span>
              <span 
                className="w-1.5 h-1.5 rounded-full animate-ping" 
                style={{ backgroundColor: theme.primaryHex }}
              />
            </div>
            <span className="text-[7.5px] font-black uppercase tracking-widest text-white/40 block -mt-0.5">
              {targetSeason?.name || 'Active Season Roster'}
            </span>
          </div>
        </div>

        <Link
          href="#leaderboard-anchor"
          style={{ color: theme.primaryHex }}
          className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider hover:underline group-hover/preview:translate-x-0.5 transition-transform"
        >
          <span>FULL TABLE</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Roster Rows (Top 8 Grid: 2 Columns, stretched to fill vertical space) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 items-stretch py-1">
        {topPlayers.length > 0 ? (
          topPlayers.map((entry) => {
            const isRank1 = entry.rank === 1;
            return (
              <div
                key={entry.id || entry.rank}
                style={
                  isRank1
                    ? {
                        backgroundColor: `${theme.primaryHex}14`,
                        borderColor: `${theme.primaryHex}66`,
                        boxShadow: `0 0 15px ${theme.primaryHex}1f`,
                      }
                    : undefined
                }
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 h-full",
                  isRank1
                    ? ""
                    : "bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]"
                )}
              >
                {/* Left: Rank & Avatar & Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    style={
                      isRank1
                        ? {
                            color: theme.primaryHex,
                            filter: `drop-shadow(0 0 8px ${theme.primaryHex}80)`,
                          }
                        : undefined
                    }
                    className={cn(
                      "font-black text-xs sm:text-sm font-headline w-4 text-center shrink-0",
                      isRank1 ? "" : "text-white/40"
                    )}
                  >
                    #{entry.rank}
                  </span>

                  <Avatar 
                    className="h-7 w-7 border rounded-lg shrink-0"
                    style={{ borderColor: isRank1 ? `${theme.primaryHex}80` : 'rgba(255,255,255,0.1)' }}
                  >
                    <AvatarImage src={entry.logoUrl} alt={entry.playerName} className="object-cover" referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-black/50 text-[9px] font-black">
                      <User className="w-3.5 h-3.5 text-white/30" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col min-w-0">
                    <span
                      style={isRank1 ? { color: theme.primaryHex } : undefined}
                      className={cn(
                        "text-[10px] sm:text-xs font-black uppercase truncate leading-tight",
                        isRank1 ? "" : "text-white"
                      )}
                    >
                      {entry.playerName}
                    </span>
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-white/40 truncate max-w-[90px] sm:max-w-[120px]">
                      {entry.teamName}
                    </span>
                  </div>
                </div>

                {/* Right: Points Pill */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-[6.5px] font-black uppercase tracking-widest text-white/30">PTS</span>
                    <span
                      style={isRank1 ? { color: theme.primaryHex } : undefined}
                      className={cn(
                        "text-xs sm:text-sm font-black tabular-nums",
                        isRank1 ? "font-headline" : "text-white/90"
                      )}
                    >
                      {entry.points}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-4 text-center text-white/30 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <Swords className="w-3.5 h-3.5 opacity-40" />
            <span>MENANTI HASIL PERTANDINGAN</span>
          </div>
        )}
      </div>
    </div>
  );
}

