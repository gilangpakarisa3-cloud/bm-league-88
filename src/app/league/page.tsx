
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { leagueTable } from '@/lib/data';
import { Trophy } from 'lucide-react';
import Link from 'next/link';

export default function LeaguePage() {
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight">
            League Standings
            </h1>
            <Button asChild>
                <Link href="/league/winner">
                    <Trophy className="mr-2 h-4 w-4" />
                    View Champion
                </Link>
            </Button>
        </div>
        <LeagueTable tableData={leagueTable} />
      </div>
    </div>
  );
}
