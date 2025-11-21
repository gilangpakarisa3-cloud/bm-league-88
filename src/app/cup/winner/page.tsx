
import { WinnerDisplay } from '@/components/winner-display';
import { cupData, cupWinner, teams } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { redirect } from 'next/navigation';

export default function CupWinnerPage() {
    if (!cupWinner) {
        redirect('/cup');
    }
    
    const finalMatch = cupData.find(r => r.name === 'Final')?.matches[0];
    const finalScore = finalMatch ? `${finalMatch.score1} - ${finalMatch.score2}` : 'N/A';
    
    const winnerImage = PlaceHolderImages.find(img => img.id === 'winner-profile')?.imageUrl || '';

    const stats = [
        { label: 'Final Score', value: finalScore },
        { label: 'Team', value: cupWinner.team.name },
    ];

    return (
        <WinnerDisplay
            title="Cup Champion"
            winnerName={cupWinner.name}
            teamName={cupWinner.team.name}
            imageUrl={winnerImage}
            stats={stats}
            imageHint="profile portrait"
        />
    );
}
