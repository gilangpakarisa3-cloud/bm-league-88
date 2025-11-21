
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leagueTable } from '@/lib/data';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Shield, ArrowRight } from 'lucide-react';

export default function Home() {
  const topPlayers = leagueTable.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="text-center mb-12">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            Engineering EightyEight
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Welcome to the official hub for the Liga Tarkam. Track league standings, cup progress, and celebrate the champions.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link href="/league" className="block group">
            <Card className="h-full hover:border-primary transition-colors duration-300">
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-2xl">League Standings</CardTitle>
                    <Trophy className="w-8 h-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>View the official player rankings, track points, and see who's dominating the season.</CardDescription>
                <div className="flex items-center mt-4 font-semibold text-primary">
                  Go to League
                  <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/cup" className="block group">
            <Card className="h-full hover:border-primary transition-colors duration-300">
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-2xl">Cup Tournament</CardTitle>
                    <Shield className="w-8 h-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>Follow the knockout stages, check match results, and see the path to the final.</CardDescription>
                <div className="flex items-center mt-4 font-semibold text-primary">
                  Go to Cup
                  <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-4 text-center">Top Players</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                  <TableHead className="hidden sm:table-cell text-right pr-4">GD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPlayers.map((entry) => (
                  <TableRow key={entry.rank}>
                    <TableCell className="font-bold text-lg pl-4">{entry.rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{entry.player.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{entry.player.team.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{entry.points}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right pr-4">{entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>
    </div>
  );
}
