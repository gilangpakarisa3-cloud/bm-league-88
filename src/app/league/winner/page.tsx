
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { WinnerDisplay } from '@/components/winner-display';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, orderBy, limit, getDocs, where, getDoc } from 'firebase/firestore';
import type { LeagueEntry, Season, WithId, Player, Team, Match } from '@/lib/types';
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
            if (!seasonId) router.push('/league');
            return;
        }

        const findWinner = async () => {
            setIsLoading(true);
            
            try {
                let winnerPlayerId = '';
                
                // --- REVISI: For Hybrid, look for the winner of the Grand Final first ---
                if (season.type === 'Hybrid') {
                    const matchesRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${seasonId}/matches`);
                    const qFinal = query(matchesRef, where('round', '==', 'Final'));
                    const finalSnap = await getDocs(qFinal);
                    
                    const finalMatchDoc = finalSnap.docs.find(d => d.data().isCompleted);
                    if (finalMatchDoc) {
                        const finalMatch = finalMatchDoc.data() as Match;
                        const s1 = finalMatch.player1Wins !== null ? finalMatch.player1Wins : (finalMatch.player1Score ?? 0);
                        const s2 = finalMatch.player2Wins !== null ? finalMatch.player2Wins : (finalMatch.player2Score ?? 0);
                        winnerPlayerId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
                    }
                }
                
                const leagueTableRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${seasonId}/leagueTable`);
                
                if (winnerPlayerId) {
                    const qWinner = query(leagueTableRef, where('playerId', '==', winnerPlayerId));
                    const winnerSnapshot = await getDocs(qWinner);
                    if (!winnerSnapshot.empty) {
                        setWinner({ id: winnerSnapshot.docs[0].id, ...winnerSnapshot.docs[0].data() } as WithId<LeagueEntry>);
                    }
                } else {
                    // Fallback to table leader (standard points behavior)
                    const q = query(
                        leagueTableRef, 
                        orderBy('points', 'desc'), 
                        limit(1)
                    );
                    const winnerSnapshot = await getDocs(q);
                    
                    if (!winnerSnapshot.empty) {
                        const winnerDoc = winnerSnapshot.docs[0];
                        const winnerData = { id: winnerDoc.id, ...winnerDoc.data() } as WithId<LeagueEntry>;
                        setWinner(winnerData);
                    }
                }
            } catch (err) {
                console.error("Error finding winner:", err);
            }
            setIsLoading(false);
        };
        
        findWinner();

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

    if (!winner) {
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
        { label: t('pts'), value: winner.points },
        { label: t('win_long', {defaultValue: 'Wins'}), value: winner.win },
        { label: t('l', { defaultValue: 'L'}), value: winner.loss },
    ];

    const winnerTitle = isSeasonCompleted && season ? t('winner_of_season', { seasonName: season.name }) : t('current_league_leader');
    const subtitle = isSeasonCompleted ? t('congrats_to_victor') : '';


    return (
        <WinnerDisplay
            title={winnerTitle}
            subtitle={subtitle}
            winnerName={winner.playerName}
            teamName={winner.teamName}
            imageUrl={winnerImage}
            stats={stats}
            imageHint="team logo"
        />
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
