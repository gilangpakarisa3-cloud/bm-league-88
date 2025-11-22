
'use client';

import { Suspense, useEffect, useState } from 'react';
import { WinnerDisplay } from '@/components/winner-display';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import type { LeagueEntry, Season, WithId, Player } from '@/lib/types';
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
    const [winnerPlayer, setWinnerPlayer] = useState<WithId<Player> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const seasonRef = useMemoFirebase(
      () => (firestore && seasonId ? doc(firestore, `leagues/${LEAGUE_ID}/seasons`, seasonId) : null),
      [firestore, seasonId]
    );
    const { data: season } = useDoc<Season>(seasonRef);
    
    useEffect(() => {
        if (!firestore || !seasonId) {
            if (!seasonId) router.push('/league');
            return;
        }

        const findWinner = async () => {
            setIsLoading(true);
            const leagueTableRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${seasonId}/leagueTable`);
            const q = query(
                leagueTableRef, 
                orderBy('points', 'desc'), 
                orderBy('goalDifference', 'desc'), 
                orderBy('goalsFor', 'desc'), 
                limit(1)
            );
            const winnerSnapshot = await getDocs(q);
            
            if (!winnerSnapshot.empty) {
                const winnerDoc = winnerSnapshot.docs[0];
                const winnerData = { id: winnerDoc.id, ...winnerDoc.data() } as WithId<LeagueEntry>;
                setWinner(winnerData);

                // Now, fetch the full player document to get the most up-to-date photoUrl
                const playerRef = doc(firestore, 'players', winnerData.playerId);
                const playerSnap = await getDocs(query(collection(firestore, 'players'), where('__name__', '==', winnerData.playerId)));
                
                if (!playerSnap.empty) {
                  const winnerPlayerDoc = playerSnap.docs[0];
                  setWinnerPlayer({ id: winnerPlayerDoc.id, ...winnerPlayerDoc.data() } as WithId<Player>);
                }

            }
            setIsLoading(false);
        };
        
        // Always try to find the leader, regardless of season status
        findWinner();

    }, [firestore, seasonId, router]);

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
    
    const winnerImage = winnerPlayer?.photoUrl || winner.photoUrl || PlaceHolderImages.find(img => img.id === 'winner-profile')?.imageUrl || '';

    const isSeasonCompleted = season?.status === 'Completed';

    const stats = [
        { label: t('pts'), value: winner.points },
        { label: t('win_long', {defaultValue: 'Wins'}), value: winner.win },
        { label: t('gd'), value: `+${winner.goalDifference}` },
        { label: t('gf'), value: winner.goalsFor },
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
            imageHint="profile portrait"
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
