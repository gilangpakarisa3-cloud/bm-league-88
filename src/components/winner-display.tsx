
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import Image from 'next/image';

type WinnerDisplayProps = {
    title: string;
    winnerName: string;
    teamName: string;
    imageUrl: string;
    imageHint: string;
    stats: { label: string; value: string | number }[];
}

export function WinnerDisplay({ title, winnerName, teamName, imageUrl, imageHint, stats }: WinnerDisplayProps) {
    return (
        <div className="container mx-auto px-4 py-8 flex flex-col items-center text-center gap-8 animate-in fade-in zoom-in-95 duration-500">
            <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-[0_4px_10px_rgba(250,204,21,0.4)]" />
            <div className="space-y-2">
                <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">{title}</h1>
                <p className="text-lg text-muted-foreground">Congratulations to the victor!</p>
            </div>
            
            <Card className="w-full max-w-md overflow-hidden shadow-lg shadow-primary/10 border-2 border-primary/50">
                <div className="bg-gradient-to-br from-card to-secondary p-8 pt-12 text-center relative">
                     <div className="relative w-40 h-40 mx-auto mb-4">
                        <Image
                            src={imageUrl}
                            alt={`Portrait of ${winnerName}`}
                            width={160}
                            height={160}
                            className="rounded-full object-cover border-4 border-primary/80 shadow-2xl"
                            data-ai-hint={imageHint}
                        />
                         <div className="absolute -bottom-2 -right-2 bg-card p-2 rounded-full shadow-lg">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <h2 className="text-3xl font-bold">{winnerName}</h2>
                        <p className="text-xl text-muted-foreground font-medium">{teamName}</p>
                    </div>
                </div>

                <CardContent className="p-6 bg-card">
                    <h3 className="text-lg font-semibold mb-4 text-left">Champion Stats</h3>
                    <div className="space-y-3">
                        {stats.map((stat, index) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-secondary p-3 rounded-md">
                                <span className="text-muted-foreground">{stat.label}</span>
                                <span className="font-semibold text-lg">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
