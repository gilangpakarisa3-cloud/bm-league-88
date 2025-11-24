
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, User } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';

type WinnerDisplayProps = {
    title: string;
    subtitle: string;
    winnerName: string;
    teamName: string;
    imageUrl?: string | null;
    imageHint: string;
    stats: { label: string; value: string | number }[];
}

export function WinnerDisplay({ title, subtitle, winnerName, teamName, imageUrl, imageHint, stats }: WinnerDisplayProps) {
    const { t } = useTranslation();
    return (
        <div className="container mx-auto px-4 py-8 flex flex-col items-center text-center gap-8 animate-in fade-in zoom-in-95 duration-500">
            <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-400 drop-shadow-[0_4px_10px_rgba(250,204,21,0.4)]" />
            <div className="space-y-2">
                <h1 className="font-headline text-3xl sm:text-5xl font-extrabold tracking-tight text-primary">{title}</h1>
                <p className="text-base sm:text-lg text-muted-foreground">{subtitle}</p>
            </div>
            
            <Card className="w-full max-w-sm overflow-hidden shadow-lg shadow-primary/10 border-2 border-primary">
                <div className="bg-primary/10 p-6 sm:p-8 text-center relative">
                     <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4">
                        <Avatar className="w-full h-full border-4 border-primary/80 shadow-2xl">
                            <AvatarImage src={imageUrl ?? undefined} alt={`Portrait of ${winnerName}`} />
                            <AvatarFallback>
                                <User className="w-16 h-16" />
                            </AvatarFallback>
                        </Avatar>
                         <div className="absolute -bottom-1 -right-1 bg-card p-1.5 sm:p-2 rounded-full shadow-lg">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-primary">{winnerName}</h2>
                        <p className="text-lg sm:text-xl text-muted-foreground font-medium">{teamName}</p>
                    </div>
                </div>

                <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-left">{t('champion_stats')}</h3>
                    <div className="space-y-2">
                        {stats.map((stat, index) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-secondary p-3 rounded-md">
                                <span className="text-muted-foreground">{stat.label}</span>
                                <span className="font-semibold text-base sm:text-lg text-primary">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
