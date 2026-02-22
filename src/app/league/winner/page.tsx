'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { WinnerDisplay } from '@/components/winner-display';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { LeagueEntry, Season, WithId, Team, Match, CoOpLeagueEntry } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';

// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';

function LeagueWinnerPageContents() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const { t } = useTranslation();

    const seasonId = searchParams.get('seasonId');
    const [winner, setWinner] = useState<WithId<LeagueEntry> | null>(null);
    const [aggregatedStats, setAggregatedStats] = useState<{ win: number, loss: number, points: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const seasonRef = useMemoFirebase(
      () => (firestore && seasonId ? doc(firestore, `leagues/${LEAGUE_ID}/seasons`, seasonId) : null),
      [firestore, seasonId]
    );
    const { data: season } = useDoc<Season>(seasonRef);

    const teamsCollection = useMemoFirebase(
      () => (firestore ? collection(firestore, 'teams') : null),
      [firestore]
    );
    const { data: allTeams } = useCollection<Team>(teamsCollection);

    const teamsById = useMemo(() => {
        if (!allTeams) return {};
        return allTeams.reduce((acc, t) => {
            acc[t.id] = t;
            return acc;
        }, {} as Record<string, WithId<Team>>);
    }, [allTeams]);
    
    useEffect(() => {
        if (!firestore || !seasonId || !season) {
            if (!seasonId && !isLoading) router.push('/league');
            return;
        }

        const findWinnerAndStats = async () => {
            setIsLoading(true);
            
            try {
                let winnerPlayerId = '';
                const matchesRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${seasonId}/matches`);
                const allMatchesSnap = await getDocs(matchesRef);
                const allMatches = allMatchesSnap.docs.map(d => d.data() as Match);
                
                // 1. Identify Winner
                if (season.type === 'Hybrid') {
                    const finalMatch = allMatches.find(m => m.round === 'Grand-Final' && m.isCompleted);
                    if (finalMatch) {
                        const s1 = finalMatch.player1Wins !== null ? finalMatch.player1Wins : (finalMatch.player1Score ?? 0);
                        const s2 = finalMatch.player2Wins !== null ? finalMatch.player2Wins : (finalMatch.player2Score ?? 0);
                        winnerPlayerId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
                    }
                }
                
                const isCoop = season.type === 'Co-Op';
                const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';
                const tableRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${seasonId}/${tableName}`);
                
                let winnerData: any = null;

                if (winnerPlayerId) {
                    const qWinner = query(tableRef, where(isCoop ? '__name__' : 'playerId', '==', winnerPlayerId));
                    const winnerSnapshot = await getDocs(qWinner);
                    if (!winnerSnapshot.empty) {
                        const doc = winnerSnapshot.docs[0];
                        if (isCoop) {
                            const data = doc.data() as CoOpLeagueEntry;
                            winnerData = { 
                                id: doc.id, 
                                playerName: data.teamName, 
                                teamName: data.player1TeamName,
                                teamId: data.player1TeamId,
                                points: data.points,
                                win: data.win,
                                loss: data.loss
                            };
                        } else {
                            winnerData = { id: doc.id, ...doc.data() };
                        }
                    }
                } else {
                    // Fallback to table leader
                    const q = query(tableRef, orderBy('points', 'desc'), limit(1));
                    const winnerSnapshot = await getDocs(q);
                    if (!winnerSnapshot.empty) {
                        const doc = winnerSnapshot.docs[0];
                        winnerPlayerId = isCoop ? doc.id : (doc.data() as LeagueEntry).playerId;
                        if (isCoop) {
                            const data = doc.data() as CoOpLeagueEntry;
                            winnerData = { 
                                id: doc.id, 
                                playerName: data.teamName, 
                                teamName: data.player1TeamName,
                                teamId: data.player1TeamId,
                                points: data.points,
                                win: data.win,
                                loss: data.loss
                            };
                        } else {
                            winnerData = { id: doc.id, ...doc.data() };
                        }
                    }
                }

                if (winnerData && winnerPlayerId) {
                    setWinner(winnerData);
                    
                    // 2. Base stats from the table (already aggregated for group/single/coop)
                    let totalWin = Number(winnerData.win) || 0;
                    let totalLoss = Number(winnerData.loss) || 0;
                    let totalPoints = Number(winnerData.points) || 0;

                    // 3. For Hybrid seasons, we must add stats from knockout matches manually
                    if (season.type === 'Hybrid') {
                        const knockoutMatches = allMatches.filter(m => 
                            !!m.isCompleted && 
                            m.round !== 'Group' && 
                            (m.player1Id === winnerPlayerId || m.player2Id === winnerPlayerId)
                        );
                        
                        knockoutMatches.forEach(m => {
                            const isP1 = m.player1Id === winnerPlayerId;
                            const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
                            const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
                            const pResult = isP1 ? s1 : s2;
                            const oResult = isP1 ? s2 : s1;
                            if (pResult > oResult) totalWin++;
                            else if (pResult < oResult) totalLoss++;
                        });
                    }

                    setAggregatedStats({
                        win: totalWin,
                        loss: totalLoss,
                        points: totalPoints 
                    });
                }

            } catch (err) {
                console.error("Error finding winner and stats:", err);
            }
            setIsLoading(false);
        };
        
        findWinnerAndStats();

    }, [firestore, seasonId, router, season]);

    if (isLoading) {
        return <WinnerSkeleton title={t('league_champion')} />;
    }

    if (!seasonId) {
        return (
             <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold">{t('no_season_selected_title')}</h1>
                <p className="text-muted-foreground mt-2">{t('no_season_selected_desc')}</p>
                <Button onClick={() => router.push('/league')} className="mt-4">{t('back_to_league')}</Button>
            </div>
        )
    }

    if (!winner || !aggregatedStats) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold">{t('league_not_started')}</h1>
                <p className="text-muted-foreground mt-2">{t('no_players_in_season')}</p>
                <Button onClick={() => router.push('/league')} className="mt-4">{t('back_to_league')}</Button>
            </div>
        );
    }
    
    const winnerTeam = teamsById[winner.teamId];
    const winnerImage = winnerTeam?.logoUrl || PlaceHolderImages.find(img => img.id === 'winner-profile')?.imageUrl || '';

    const isSeasonCompleted = season?.status === 'Completed';

    const stats = [
        { label: t('pts'), value: aggregatedStats.points },
        { label: t('win_long'), value: aggregatedStats.win },
        { label: t('loss_long'), value: aggregatedStats.loss },
    ];

    const winnerTitle = isSeasonCompleted && season ? t('winner_of_season', { seasonName: season.name }) : t('current_league_leader');
    const subtitle = isSeasonCompleted ? t('congrats_to_victor') : '';


    return (
        <div className="relative min-h-screen bg-[#0A192F]">
            {/* Background decorative glows to match other pages */}
            <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

            <WinnerDisplay
                title={winnerTitle}
                subtitle={subtitle}
                winnerName={winner.playerName}
                teamName={winner.teamName}
                imageUrl={winnerImage}
                stats={stats}
                imageHint="team logo"
            />
        </div>
    );
}

const WinnerSkeleton = ({title}: {title: string}) => (
     <div className="container mx-auto px-4 py-8 flex flex-col items-center text-center gap-8">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-80 mx-auto" />
        </div>
        <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
                <Skeleton className="h-40 w-40 rounded-full mx-auto" />
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-6 w-32 mx-auto" />
                 <div className="space-y-2 pt-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        </Card>
     </div>
);

export default function LeagueWinnerPage() {
    const { t } = useTranslation();
    return (
        <Suspense fallback={<WinnerSkeleton title={t('league_champion')}/>}>
            <LeagueWinnerPageContents />
        </Suspense>
    )
}