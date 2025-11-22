
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leagueTable } from '@/lib/data';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Shield, ArrowRight, Info } from 'lucide-react';
import { EditableNotice } from '@/components/editable-notice';
import { useTranslation } from '@/hooks/use-translation';

export default function Home() {
  const topPlayers = leagueTable.slice(0, 5);
  const { t } = useTranslation();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="text-center mb-12">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-primary">
            BM League EightyEight
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground">
            {t('home_welcome')}
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold mb-4">{t('home_league_standings_title')}</h2>
            <Link href="/league" className="block group h-full">
              <Card className="h-full hover:border-primary transition-colors duration-300 flex flex-col">
                <CardHeader>
                  <div className="flex flex-row items-center justify-between">
                      <CardTitle className="text-2xl">{t('home_league_standings_title')}</CardTitle>
                      <Trophy className="w-8 h-8 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{t('home_league_standings_desc')}</CardDescription>
                </CardContent>
                <CardContent>
                  <div className="flex items-center font-semibold text-primary">
                    {t('go_to_league')}
                    <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          <div className="flex flex-col">
             <h2 className="text-3xl font-bold mb-4">{t('home_top_players')}</h2>
            <Card className="h-full">
              {topPlayers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] pl-4">#</TableHead>
                      <TableHead>{t('player')}</TableHead>
                      <TableHead className="text-right">{t('pts')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-right pr-4">{t('gd')}</TableHead>
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
              ) : (
                <div className="p-8 text-center text-muted-foreground h-full flex items-center justify-center">
                  {t('no_players_yet')}
                </div>
              )}
            </Card>
          </div>
        </section>

        <section className="mb-12">
            <EditableNotice />
        </section>
        
      </div>
    </div>
  );
}
