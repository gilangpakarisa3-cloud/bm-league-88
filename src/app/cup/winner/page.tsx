
'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { WinnerDisplay } from '@/components/winner-display';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, getDoc, orderBy, limit } from 'firebase/firestore';
import type { Match, Player, Season, WithId } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// For simplicity, we'll work with a single, hardcoded cup.
const CUP_ID = 'main-cup';

function CupWinnerPageContents() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const seasonId = searchParams.get('seasonId');
    const [winner, setWinner] = useState<WithId<Player> | null>(null);
    const [finalMatch, setFinalMatch] = useState<WithId<Match> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const seasonRef = useMemoFirebase(
      () => (firestore && seasonId ? doc(firestore, `cups/${CUP_ID}/seasons`, seasonId) : null),
      [firestore, seasonId]
    );
    const { data: season } = useDoc<Season>(seasonRef);

    useEffect(() => {
        if (!firestore || !seasonId) {
             if (!seasonId) router.push('/cup');
            return;
        };

        const findWinner = async () => {
            setIsLoading(true);
            const matchesRef = collection(firestore, `cups/${CUP_ID}/seasons/${seasonId}/matches`);
            
            const finalQuery = query(matchesRef, where('round', '==', 'Final'), limit(1));
            const finalSnapshot = await getDocs(finalQuery);

            if (finalSnapshot.empty) {
                console.log('Final match not found.');
                setIsLoading(false);
                return;
            }

            const finalMatchDoc = finalSnapshot.docs[0];
            const finalMatchData = { id: finalMatchDoc.id, ...finalMatchDoc.data() } as WithId<Match>;
            setFinalMatch(finalMatchData);

            if (finalMatchData.isCompleted && finalMatchData.player1Score != null && finalMatchData.player2Score != null) {
                const winnerId = finalMatchData.player1Score > finalMatchData.player2Score ? finalMatchData.player1Id : finalMatchData.player2Id;
                
                if (winnerId && winnerId !== 'TBD') {
                    const playerRef = doc(firestore, 'players', winnerId);
                    const playerSnap = await getDoc(playerRef);
                    if (playerSnap.exists()) {
                        setWinner({ id: playerSnap.id, ...playerSnap.data() } as WithId<Player>);
                    }
                }
            }
             setIsLoading(false);
        };
        
        findWinner();

    }, [firestore, seasonId, router]);


    if (isLoading) {
        return <WinnerSkeleton title="Cup Champion" />;
    }

    const isSeasonCompleted = season?.status === 'Completed';

    if (!finalMatch) {
         return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold">Cup Not Yet Started</h1>
                <p className="text-muted-foreground mt-2">The bracket has not been generated for this season.</p>
                <Button onClick={() => router.push('/cup')} className="mt-4">Back to Cup</Button>
            </div>
        );
    }

    if (!winner || !isSeasonCompleted) {
         return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold">Cup Not Yet Decided</h1>
                <p className="text-muted-foreground mt-2">The final match has not been completed or the season is still in progress.</p>
                <Button onClick={() => router.push('/cup')} className="mt-4">Back to Cup</Button>
            </div>
        );
    }
    
    const p1Score = finalMatch.player1Id === winner.id ? finalMatch.player1Score : finalMatch.player2Score;
    const p2Score = finalMatch.player1Id === winner.id ? finalMatch.player2Score : finalMatch.player1Score;

    const finalScore = `${p1Score} - ${p2Score}`;
    const winnerImage = winner.photoUrl || PlaceHolderImages.find(img => img.id === 'winner-profile')?.imageUrl || '';

    const stats = [
        { label: 'Final Score', value: finalScore },
        { label: 'Team', value: winner.teamName },
        { label: 'Season', value: season?.name || 'N/A' },
    ];

    return (
        <WinnerDisplay
            title="Cup Champion"
            winnerName={winner.name}
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


export default function CupWinnerPage() {
    return (
        <Suspense fallback={<WinnerSkeleton title="Cup Champion"/>}>
            <CupWinnerPageContents />
        </Suspense>
    )
}
