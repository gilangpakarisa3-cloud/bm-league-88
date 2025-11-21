
'use client';

import { Suspense, useEffect, useState } from 'react';
import { WinnerDisplay } from '@/components/winner-display';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { LeagueEntry, Season, WithId } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';

function LeagueWinnerPageContents() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const seasonId = searchParams.get('seasonId');
    const [winner, setWinner] = useState<WithId<LeagueEntry> | null>(null);
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
                setWinner({ id: winnerDoc.id, ...winnerDoc.data() } as WithId<LeagueEntry>);
            }
            setIsLoading(false);
        };
        
        // Always try to find the leader, regardless of season status
        findWinner();

    }, [firestore, seasonId, router]);

    if (isLoading) {
        return <WinnerSkeleton title="League Champion" />;
    }

    if (!seasonId) {
        return (
             <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold">No Season Selected</h1>
                <p className="text-muted-foreground mt-2">Please select a season from the league page to view the champion.</p>
                <Button onClick={() => router.push('/league')} className="mt-4">Back to League</Button>
            </div>
        )
    }

    if (!winner) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold">League Not Started</h1>
                <p className="text-muted-foreground mt-2">There are no players registered for this season yet.</p>
                <Button onClick={() => router.push('/league')} className="mt-4">Back to League</Button>
            </div>
        );
    }
    
    const winnerImage = PlaceHolderImages.find(img => img.id === 'winner-profile')?.imageUrl || '';

    const isSeasonCompleted = season?.status === 'Completed';

    const stats = [
        { label: 'Points', value: winner.points },
        { label: 'Wins', value: winner.win },
        { label: 'Goal Difference', value: `+${winner.goalDifference}` },
        { label: 'Goals For', value: winner.goalsFor },
    ];

    return (
        <WinnerDisplay
            title={isSeasonCompleted ? "League Champion" : "Current League Leader"}
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
    return (
        <Suspense fallback={<WinnerSkeleton title="League Champion"/>}>
            <LeagueWinnerPageContents />
        </Suspense>
    )
}
