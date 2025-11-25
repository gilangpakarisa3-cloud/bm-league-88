
'use client';

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { SeasonRecord, WithId } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { SeasonRecordCard } from "@/components/season-record-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HallOfFamePage() {
    const firestore = useFirestore();
    const { t } = useTranslation();

    const hallOfFameCollection = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc')) : null),
        [firestore]
    );

    const { data: seasonRecords, isLoading } = useCollection<SeasonRecord>(hallOfFameCollection);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-12">
                        <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">Hall of Fame</h1>
                        <p className="mt-2 max-w-2xl mx-auto text-lg text-foreground">
                            A chronicle of champions and legends from past seasons.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[350px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-3/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-12">
                    <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">Hall of Fame</h1>
                    <p className="mt-2 max-w-2xl mx-auto text-lg text-foreground">
                        A chronicle of champions and legends from past seasons.
                    </p>
                </div>
                
                {seasonRecords && seasonRecords.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {seasonRecords.map(record => (
                           <SeasonRecordCard key={record.id} record={record} />
                        ))}
                    </div>
                ): (
                    <div className="text-center border-2 border-dashed border-muted rounded-lg p-12">
                        <h2 className="text-xl font-medium text-muted-foreground">The Hall is Empty</h2>
                        <p className="mt-2 text-muted-foreground">
                            No seasons have been completed yet. The first champion awaits their place in history.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
