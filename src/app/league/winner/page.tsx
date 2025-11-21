
import { WinnerDisplay } from '@/components/winner-display';
import { leagueWinner } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { redirect } from 'next/navigation';

export default function LeagueWinnerPage() {
    if (!leagueWinner) {
        redirect('/league');
    }

    const winnerImage = PlaceHolderImages.find(img => img.id === 'winner-profile')?.imageUrl || '';

    const stats = [
        { label: 'Points', value: leagueWinner.points },
        { label: 'Wins', value: leagueWinner.win },
        { label: 'Goal Difference', value: `+${leagueWinner.goalDifference}` },
        { label: 'Goals For', value: leagueWinner.goalsFor },
    ];

    return (
        <WinnerDisplay
            title="League Champion"
            winnerName={leagueWinner.player.name}
            teamName={leagueWinner.player.team.name}
            imageUrl={winnerImage}
            stats={stats}
            imageHint="profile portrait"
        />
    );
}
