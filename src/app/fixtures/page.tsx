
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Undo2, Lock, Calendar, Swords, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, getDocs, where, runTransaction, Timestamp, orderBy } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry, MatchRound } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { useSharedPassword } from '@/context/password-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


// For simplicity, we'll work with a single, hardcoded league.
const LEAGUE_ID = 'main-league';

/**
 * UPDATED 12-Team Double Elimination Logic:
 * M1-M4: UB Quarter-Finals (Ranks 1-4)
 * M5-M8: LB Round 1 (Ranks 5-6 vs Losers UB QF)
 * M9-M10: UB Semis
 * M11-M12: LB Round 2 (Winners M5-M8 play each other)
 * M13-M14: LB Round 3 (Winners M11-M12 vs Losers UB Semi)
 * M15: UB Final
 * M16: LB Semifinal (Winners M13-M14)
 * M17: LB Final (Winner M16 vs Loser UB Final M15)
 * M18: Grand Final
 */
const PLAYOFF_SUCCESSOR_MAP: Record<string, { winner: { bid: string, slot: 1 | 2 }, loser?: { bid: string, slot: 1 | 2 } }> = {
    // Upper Bracket
    'playoff-m1': { winner: { bid: 'playoff-m9', slot: 1 }, loser: { bid: 'playoff-m5', slot: 2 } },
    'playoff-m2': { winner: { bid: 'playoff-m9', slot: 2 }, loser: { bid: 'playoff-m6', slot: 2 } },
    'playoff-m3': { winner: { bid: 'playoff-m10', slot: 1 }, loser: { bid: 'playoff-m7', slot: 2 } },
    'playoff-m4': { winner: { bid: 'playoff-m10', slot: 2 }, loser: { bid: 'playoff-m8', slot: 2 } },
    'playoff-m9': { winner: { bid: 'playoff-m15', slot: 1 }, loser: { bid: 'playoff-m13', slot: 2 } },
    'playoff-m10': { winner: { bid: 'playoff-m15', slot: 2 }, loser: { bid: 'playoff-m14', slot: 2 } },
    'playoff-m15': { winner: { bid: 'playoff-m18', slot: 1 }, loser: { bid: 'playoff-m17', slot: 1 } },

    // Lower Bracket
    'playoff-m5': { winner: { bid: 'playoff-m11', slot: 1 } },
    'playoff-m6': { winner: { bid: 'playoff-m11', slot: 2 } },
    'playoff-m7': { winner: { bid: 'playoff-m12', slot: 1 } },
    'playoff-m8': { winner: { bid: 'playoff-m12', slot: 2 } },
    'playoff-m11': { winner: { bid: 'playoff-m13', slot: 1 } },
    'playoff-m12': { winner: { bid: 'playoff-m14', slot: 1 } },
    'playoff-m13': { winner: { bid: 'playoff-m16', slot: 1 } },
    'playoff-m14': { winner: { bid: 'playoff-m16', slot: 2 } },
    'playoff-m16': { winner: { bid: 'playoff-m17', slot: 2 } },
    'playoff-m17': { winner: { bid: 'playoff-m18', slot: 2 } },
};

const MatchRow = memo(function MatchRow({ match, onEditMatch, onRevertMatch, isAdmin, activeSeason }: {
    match: any;
    onEditMatch: (match: any) => void;
    onRevertMatch: (match: WithId<Match>) => void;
    isAdmin: boolean;
    activeSeason: WithId<Season> | null;
}) {
    const { t } = useTranslation();
    const displayDate = format(match.matchDate.toDate(), 'd MMM, HH:mm');
    const isBestOfThree = activeSeason?.type === 'Co-Op' || (match.round && match.round !== 'Group');
    const isEditDisabled = activeSeason?.status !== 'In Progress' || (match.isCompleted && !isAdmin) || (match.player1Id === 'TBD' && match.player2Id === 'TBD');

    const PlayerInfo = ({ name, team, alignment = 'left' }: { name: string, team: WithId<Team> | null, alignment?: 'left' | 'right' }) => (
        <div className={cn("flex items-center gap-3 text-sm font-black uppercase tracking-tight overflow-hidden", { 'justify-end': alignment === 'right', 'justify-start': alignment === 'left' })}>
             {alignment === 'right' && <span className="truncate flex-1 text-right">{name}</span>}
            <div className="relative shrink-0">
                <Avatar className="h-8 w-8 border-2 border-background shadow-md">
                    <AvatarImage src={team?.logoUrl} alt={team?.name} />
                    <AvatarFallback>{team?.name?.charAt(0) || (name === 'TBD' ? '?' : name.charAt(0))}</AvatarFallback>
                </Avatar>
            </div>
            {alignment === 'left' && <span className="truncate flex-1 text-left">{name}</span>}
        </div>
    );
    
    const scoreText = isBestOfThree ? `${match.player1Wins} - ${match.player2Wins}` : `${match.player1Score} - ${match.player2Score}`;
    const hasValidScore = match.isCompleted && (isBestOfThree ? match.player1Wins !== null : match.player1Score !== null);

    return (
        <div className="group relative grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 sm:gap-6 p-4 transition-all duration-300 border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <PlayerInfo name={match.player1?.name || 'TBD'} team={match.team1} alignment="right" />
            <div className="flex flex-col items-center justify-center min-w-[60px] sm:min-w-[80px]">
                 {hasValidScore ? (
                    <div className="bg-background/80 border border-primary/20 px-3 py-1 rounded shadow-inner"><span className="text-xl font-black tracking-tighter text-primary drop-shadow-[0_0_8px_rgba(204,253,1,0.3)]">{scoreText}</span></div>
                ) : (
                    <div className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded"><span className="text-[10px] font-black tracking-widest text-primary uppercase">VS</span></div>
                )}
            </div>
            <PlayerInfo name={match.player2?.name || 'TBD'} team={match.team2} alignment="left" />
            <div className="flex items-center gap-2 justify-end">
                 <Button variant="ghost" size="sm" className={cn("h-8 px-3 text-[10px] font-bold uppercase tracking-widest transition-all", hasValidScore ? "text-muted-foreground hover:text-primary" : "text-primary hover:bg-primary/10 border border-primary/20")} onClick={() => onEditMatch(match)} disabled={isEditDisabled}>
                    {hasValidScore ? (<div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{displayDate}</div>) : (<div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{t('unplayed_abbv', {defaultValue: 'TBD'})}</div>)}
                </Button>
                {isAdmin && hasValidScore && (<Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" onClick={() => onRevertMatch(match)} title={t('revert_match', { defaultValue: "Revert Match"})}><Undo2 className="h-4 w-4" /></Button>)}
            </div>
        </div>
    );
});

const FixtureContent = memo(function FixtureContent({ activeSeasonId, onEditMatch, onRevertMatch, isAdmin, allPlayers, allTeams, matches, isLoadingMatches, activeSeason }: { activeSeasonId: string | null; onEditMatch: (match: any) => void; onRevertMatch: (match: WithId<Match>) => void; isAdmin: boolean; allPlayers: WithId<Player>[]; allTeams: WithId<Team>[]; matches: WithId<Match>[] | null; isLoadingMatches: boolean; activeSeason: WithId<Season> | null; }) {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    
    const singleLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && (activeSeason?.type || 'Single') !== 'Co-Op' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null, [firestore, activeSeasonId, activeSeason]);
    const { data: singleLeagueTable } = useCollection<LeagueEntry>(singleLeagueTableCollection);
    const coopLeagueTableCollection = useMemoFirebase(() => firestore && activeSeasonId && activeSeason?.type === 'Co-Op' ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`) : null, [firestore, activeSeasonId, activeSeason]);
    const { data: coopLeagueTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);
    
    const playersById = useMemo(() => allPlayers.reduce((acc, player) => { acc[player.id] = player; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
    const teamsById = useMemo(() => allTeams.reduce((acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, WithId<Team>>), [allTeams]);
    const leagueTableByPlayerId = useMemo(() => (singleLeagueTable || []).reduce((acc, entry) => { acc[entry.playerId] = entry; return acc; }, {} as Record<string, LeagueEntry>), [singleLeagueTable]);
    const coopTableById = useMemo(() => (coopLeagueTable || []).reduce((acc, e) => { acc[e.id] = e; return acc; }, {} as Record<string, WithId<CoOpLeagueEntry>>), [coopLeagueTable]);
    
    const { groupedMatches, upcomingCount, completedCount } = useMemo(() => {
        if (!matches || !activeSeason) return { groupedMatches: { upcoming: {}, completed: {} }, upcomingCount: 0, completedCount: 0 };
        const isCoop = (activeSeason.type || 'Single') === 'Co-Op';
        const enrichedMatches = matches.map(match => {
            let p1, p2, t1, t2;
            if (isCoop) {
                const e1 = coopTableById[match.player1Id];
                const e2 = coopTableById[match.player2Id];
                p1 = e1 ? { name: e1.teamName, id: e1.id } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                p2 = e2 ? { name: e2.teamName, id: e2.id } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : null);
                t1 = e1 ? teamsById[e1.player1TeamId] : null;
                t2 = e2 ? teamsById[e2.player1TeamId] : null;
            } else {
                const e1 = leagueTableByPlayerId[match.player1Id];
                const e2 = leagueTableByPlayerId[match.player2Id];
                p1 = e1 ? { name: e1.playerName, id: e1.playerId } : (match.player1Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player1Id] || null));
                p2 = e2 ? { name: e2.playerName, id: e2.playerId } : (match.player2Id === 'TBD' ? { name: 'TBD', id: 'TBD' } : (playersById[match.player2Id] || null));
                t1 = teamsById[e1 ? e1.teamId : playersById[match.player1Id]?.teamId] || null;
                t2 = teamsById[e2 ? e2.teamId : playersById[match.player2Id]?.teamId] || null;
            }
            if (!p1 || !p2) return null;
            return { ...match, player1: p1, player2: p2, team1: t1, team2: t2 };
        }).filter(Boolean) as any[];

        const filtered = enrichedMatches.filter(m => {
            if (!searchTerm.trim()) return true;
            const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
            const pn1 = m.player1?.name.toLowerCase() || '';
            const pn2 = m.player2?.name.toLowerCase() || '';
            return terms.every(t => pn1.includes(t) || pn2.includes(t));
        });
        
        const sorted = [...filtered].sort((a,b) => a.matchDate.toMillis() - b.matchDate.toMillis());
        const grouped = sorted.reduce((acc, m) => {
            const rd = m.round || 'Group';
            const st = m.isCompleted ? 'completed' : 'upcoming';
            if (!acc[st][rd]) acc[st][rd] = [];
            acc[st][rd].push(m);
            return acc;
        }, { upcoming: {} as Record<string, any[]>, completed: {} as Record<string, any[]> });
        
        Object.keys(grouped.completed).forEach(r => grouped.completed[r].sort((a,b) => b.matchDate.toMillis() - a.matchDate.toMillis()));
        return { groupedMatches: grouped, upcomingCount: Object.values(grouped.upcoming).flat().length, completedCount: Object.values(grouped.completed).flat().length };
    }, [matches, playersById, teamsById, searchTerm, activeSeason, coopTableById, leagueTableByPlayerId]);

    const roundNames: Record<string, string> = { 
        'Group': 'Fase Grup', 
        'UB-Quarter': 'UB - Perempat Final', 
        'UB-Semi': 'UB - Semi Final', 
        'UB-Final': 'Upper Bracket Final', 
        'LB-Round 1': 'LB-R1 (vs Loser QF 1)', 
        'LB-Round 2': 'LB-R2 (Pemenang LB R1)', 
        'LB-Round 3': 'LB-R3 (vs Loser UB Semi)', 
        'LB-Semifinal': 'LB - Semifinal', 
        'LB-Final': 'LB - vs Loser UB Final', 
        'Grand-Final': 'Grand Final' 
    };

    if (isLoadingMatches) return <p className="text-center py-12 text-muted-foreground animate-pulse">{t('loading_fixtures')}</p>;
    if (!matches || matches.length === 0) return (<div className="border-2 border-dashed border-primary/20 rounded-2xl p-12 text-center bg-card/40 backdrop-blur-sm"><Swords className="w-12 h-12 text-primary/30 mx-auto mb-4" /><h2 className="text-xl font-bold text-foreground uppercase tracking-tight">{t('no_fixtures_generated_title')}</h2><p className="text-muted-foreground mt-2 max-w-sm mx-auto">{t('no_fixtures_generated_desc')}</p></div>);
    
    return (
        <div className="space-y-8">
            <div className="relative max-w-2xl mx-auto"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50" /><Input type="text" placeholder="Cari berdasarkan nama pemain/tim..." className="pl-12 h-12 bg-card/50 border-primary/20 focus:border-primary rounded-xl text-lg font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            {(upcomingCount === 0 && completedCount === 0 && searchTerm) ? (<div className="border-2 border-dashed border-primary/20 rounded-2xl p-12 text-center bg-card/40"><h2 className="text-xl font-bold text-muted-foreground uppercase">{t('no_matches_found')}</h2></div>) : (
                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-12 bg-card/50 p-1 border-primary/10 border-2 rounded-xl mb-8"><TabsTrigger value="upcoming" className="font-black uppercase tracking-tighter h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sisa Laga ({upcomingCount})</TabsTrigger><TabsTrigger value="completed" className="font-black uppercase tracking-tighter h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Selesai ({completedCount})</TabsTrigger></TabsList>
                    <TabsContent value="upcoming" className="mt-0 focus-visible:ring-0"><div className="space-y-10">{Object.entries(groupedMatches.upcoming).map(([rd, rms]) => (<section key={`upcoming-${rd}`} className="animate-in fade-in slide-in-from-bottom-2 duration-500"><div className="flex items-center gap-4 mb-4"><div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" /><h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">{roundNames[rd] || rd}</h3><div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" /></div><Card className="overflow-hidden border-2 border-primary/10 bg-card/40 backdrop-blur-md shadow-xl rounded-2xl"><CardContent className="p-0">{rms.map(m => (<MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} isAdmin={isAdmin} activeSeason={activeSeason} />))}</CardContent></Card></section>))}{upcomingCount === 0 && <div className="text-center py-16 opacity-50"><p className="text-sm font-black uppercase tracking-widest">{t('no_matches_in_category')}</p></div>}</div></TabsContent>
                    <TabsContent value="completed" className="mt-0 focus-visible:ring-0"><div className="space-y-10">{Object.entries(groupedMatches.completed).map(([rd, rms]) => (<section key={`completed-${rd}`} className="animate-in fade-in slide-in-from-bottom-2 duration-500"><div className="flex items-center gap-4 mb-4"><div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" /><h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">{roundNames[rd] || rd}</h3><div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" /></div><Card className="overflow-hidden border-2 border-primary/10 bg-card/40 backdrop-blur-md shadow-xl rounded-2xl"><CardContent className="p-0">{rms.map(m => (<MatchRow key={m.id} match={m} onEditMatch={onEditMatch} onRevertMatch={onRevertMatch} isAdmin={isAdmin} activeSeason={activeSeason} />))}</CardContent></Card></section>))}{completedCount === 0 && <div className="text-center py-16 opacity-50"><p className="text-sm font-black uppercase tracking-widest">{t('no_matches_in_category')}</p></div>}</div></TabsContent>
                </Tabs>
            )}
        </div>
    );
});

export default function FixturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [revertingMatch, setRevertingMatch] = useState<WithId<Match> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const seasonsCol = useMemoFirebase(() => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCol);
  const playersCol = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCol);
  const teamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCol);
  const matchesCol = useMemoFirebase(() => firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`) : null, [firestore, activeSeasonId]);
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCol);
  const playersById = useMemo(() => (allPlayers || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, WithId<Player>>), [allPlayers]);
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  const { progressPercentage, totalMatchesForDisplay, completedMatchesForDisplay } = useMemo(() => {
    if (!matches || matches.length === 0) return { progressPercentage: 0, totalMatchesForDisplay: 0, completedMatchesForDisplay: 0 };
    const comp = matches.filter(m => m.isCompleted).length;
    return { progressPercentage: (comp / matches.length) * 100, totalMatchesForDisplay: matches.length, completedMatchesForDisplay: comp };
  }, [matches]);
  useEffect(() => { if (seasons && !activeSeasonId && seasons.length > 0) setActiveSeasonId(seasons[0].id); }, [seasons, activeSeasonId]);
  const handlePasswordCheck = () => {
    if (!isPasswordLoaded) return;
    if (passwordInput === ADMIN_PASSWORD) { setIsAdmin(true); setPasswordPromptOpen(false); toast({ title: t('admin_mode_unlocked_title') }); } else { toast({ variant: 'destructive', title: t('incorrect_password') }); }
    setPasswordInput('');
  };

  const handleUpdateScore = async (matchId: string, values: any) => {
    if (!firestore || !activeSeasonId) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const mDoc = await transaction.get(matchRef);
            if (!mDoc.exists()) throw new Error("Match not found!");
            const orig = mDoc.data() as Match;
            const sDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
            const sData = sDoc.data() as Season;
            const isMatchBo3 = sData.type === 'Co-Op' || (orig.round && orig.round !== 'Group');

            if (orig.round && orig.round !== 'Group' && orig.bracketId) {
                const winnerId = isMatchBo3 ? (values.player1Wins > values.player2Wins ? orig.player1Id : orig.player2Id) : (values.player1Score > values.player2Score ? orig.player1Id : orig.player2Id);
                const loserId = winnerId === orig.player1Id ? orig.player2Id : orig.player1Id;
                const succ = PLAYOFF_SUCCESSOR_MAP[orig.bracketId];
                if (succ) {
                    const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                    const qWin = query(mCol, where('bracketId', '==', succ.winner.bid));
                    const winSnap = await getDocs(qWin);
                    if (!winSnap.empty) transaction.update(winSnap.docs[0].ref, { [`player${succ.winner.slot}Id`]: winnerId });
                    if (succ.loser) {
                        const qLos = query(mCol, where('bracketId', '==', succ.loser.bid));
                        const losSnap = await getDocs(qLos);
                        if (!losSnap.empty) transaction.update(losSnap.docs[0].ref, { [`player${succ.loser.slot}Id`]: loserId });
                    }
                }
            } else if (orig.round === 'Group') {
                const tblName = sData.type === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
                let p1S, p2S;
                if (sData.type === 'Co-Op') {
                    const [d1, d2] = await Promise.all([transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`, orig.player1Id)), transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`, orig.player2Id))]);
                    p1S = { docs: d1.exists() ? [d1] : [] }; p2S = { docs: d2.exists() ? [d2] : [] };
                } else {
                    const col = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                    const [snap1, snap2] = await Promise.all([getDocs(query(col, where('playerId', '==', orig.player1Id))), getDocs(query(col, where('playerId', '==', orig.player2Id)))]);
                    p1S = snap1; p2S = snap2;
                }
                if (p1S.docs.length && p2S.docs.length) {
                    const e1 = p1S.docs[0].data() as LeagueEntry; const e2 = p2S.docs[0].data() as LeagueEntry;
                    if (orig.isCompleted) {
                        e1.played--; e2.played--;
                        if (sData.type === 'Co-Op') {
                            if (orig.player1Wins! > orig.player2Wins!) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
                        } else {
                            e1.goalsFor -= orig.player1Score!; e1.goalsAgainst -= orig.player2Score!; e2.goalsFor -= orig.player2Score!; e2.goalsAgainst -= orig.player1Score!;
                            if (orig.player1Score! > orig.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (orig.player2Score! > orig.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                        }
                    }
                    e1.played++; e2.played++;
                    if (sData.type === 'Co-Op') {
                        if (values.player1Wins > values.player2Wins) { e1.win++; e1.points += 3; e2.loss++; } else { e2.win++; e2.points += 3; e1.loss++; }
                    } else {
                        e1.goalsFor += values.player1Score; e1.goalsAgainst += values.player2Score; e2.goalsFor += values.player2Score; e2.goalsAgainst += values.player1Score;
                        if (values.player1Score > values.player2Score) { e1.win++; e1.points += 3; e2.loss++; } else if (values.player2Score > values.player1Score) { e2.win++; e2.points += 3; e1.loss++; } else { e1.draw++; e1.points++; e2.draw++; e2.points++; }
                        e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                    }
                    transaction.set(p1S.docs[0].ref, e1); transaction.set(p2S.docs[0].ref, e2);
                }
            }
            const [h, m] = values.time.split(':').map(Number); const ts = Timestamp.fromDate(new Date(values.date.setHours(h, m)));
            transaction.update(matchRef, { ...values, matchDate: ts, isCompleted: true, ...(isMatchBo3 ? { player1Score: null, player2Score: null } : { player1Wins: null, player2Wins: null }) });
        });
        toast({ title: t('score_updated_title') });
    } catch (e) { toast({ variant: 'destructive', title: t('update_failed_title'), description: (e as Error).message }); }
    setEditingMatch(null);
  };

  const handleRevertMatch = useCallback(async () => {
    if (!firestore || !activeSeasonId || !revertingMatch) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, revertingMatch.id);
    try {
        await runTransaction(firestore, async (transaction) => {
            const mDoc = await transaction.get(matchRef); if (!mDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed.");
            const mToRev = mDoc.data() as Match;
            if (mToRev.round === 'Group') {
                const sDoc = await transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`));
                const isCo = sDoc.data()?.type === 'Co-Op'; const tbl = isCo ? 'coopLeagueTable' : 'leagueTable';
                let p1S, p2S;
                if (isCo) {
                    const [d1, d2] = await Promise.all([transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tbl}`, mToRev.player1Id)), transaction.get(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tbl}`, mToRev.player2Id))]);
                    p1S = { docs: [d1] }; p2S = { docs: [d2] };
                } else {
                    const qCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tbl}`);
                    const [sn1, sn2] = await Promise.all([getDocs(query(qCol, where('playerId', '==', mToRev.player1Id))), getDocs(query(qCol, where('playerId', '==', mToRev.player2Id)))]); p1S = sn1; p2S = sn2;
                }
                if (p1S.docs.length && p2S.docs.length) {
                    const e1 = p1S.docs[0].data() as LeagueEntry; const e2 = p2S.docs[0].data() as LeagueEntry;
                    e1.played--; e2.played--;
                    if (isCo) { if (mToRev.player1Wins! > mToRev.player2Wins!) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; } } else {
                        e1.goalsFor -= mToRev.player1Score!; e1.goalsAgainst -= mToRev.player2Score!; e2.goalsFor -= mToRev.player2Score!; e2.goalsAgainst -= mToRev.player1Score!;
                        if (mToRev.player1Score! > mToRev.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (mToRev.player2Score! > mToRev.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                        e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                    }
                    transaction.set(p1S.docs[0].ref, e1); transaction.set(p2S.docs[0].ref, e2);
                }
            }
            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, isCompleted: false });
        });
        toast({ title: t('match_reverted_title') });
    } catch(e) { toast({ variant: 'destructive', title: t('revert_failed_title'), description: (e as Error).message }); }
    setRevertingMatch(null);
  }, [firestore, activeSeasonId, revertingMatch, t, toast]);

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
             <div className="space-y-2 flex-1"><h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary uppercase">{t('fixtures_page_title')}</h1>{activeSeason && (<div className="flex flex-wrap items-center gap-x-4 gap-y-1"><p className="text-xl font-bold text-white/90 uppercase tracking-tight">{activeSeason.name}</p><Badge className="bg-primary/20 text-primary border-primary/30 font-black uppercase tracking-widest text-[10px]">{activeSeason.status}</Badge></div>)}{matches && matches.length > 0 && (<div className="max-w-xs pt-2"><Progress value={progressPercentage} className="h-1.5" /><p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-70 text-primary">{completedMatchesForDisplay} / {totalMatchesForDisplay} Laga Selesai ({progressPercentage.toFixed(0)}%)</p></div>)}</div>
            <div className="w-full md:w-auto flex justify-end shrink-0"><LiveClock /></div>
        </div>
        <div className={cn("bg-card/40 border border-primary/20 rounded-xl p-3 mb-8 flex flex-wrap items-center gap-4 shadow-md backdrop-blur-sm transition-all duration-500", isAdmin ? "w-full" : "w-fit mx-auto")}><div className="flex items-center gap-2"><Badge className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground border-primary h-10 px-3 hidden sm:flex shadow-[0_0_10px_rgba(204,253,1,0.4)]">Musim</Badge><Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}><SelectTrigger className="w-full sm:w-[200px] h-10 bg-background/50 border-primary/30"><SelectValue placeholder={t('select_a_season')} /></SelectTrigger><SelectContent>{seasons?.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div><div className={cn("flex items-center gap-2", isAdmin && "ml-auto")}><Button onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} variant="outline" size="sm" className={cn("h-10 px-4 font-bold border-primary/30", isAdmin && "bg-primary/10 text-primary border-primary/50")} disabled={!isPasswordLoaded}>{isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}{isAdmin ? t('lock_admin_mode') : t('unlock_admin')}</Button></div></div>
        {isLoading ? (<div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /><p className="font-black uppercase tracking-[0.2em] text-xs">{t('loading_fixtures')}</p></div>) : (<FixtureContent activeSeasonId={activeSeasonId} onEditMatch={setEditingMatch} onRevertMatch={setRevertingMatch} isAdmin={isAdmin} allPlayers={allPlayers || []} allTeams={allTeams || []} matches={matches} isLoadingMatches={isLoadingMatches} activeSeason={activeSeason} />)}
        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}><DialogContent><DialogHeader><DialogTitle>{t('update_match_score_title')}</DialogTitle>{editingMatch && (<DialogDescription>{t('update_match_score_desc', { player1: editingMatch.player1?.name, player2: editingMatch.player2?.name })}</DialogDescription>)}</DialogHeader>{editingMatch && activeSeason && (<ScoreForm match={editingMatch} onSave={(v) => handleUpdateScore(editingMatch.id, v)} seasonType={activeSeason.type} hybridGroupMeetings={activeSeason.hybridGroupMeetings} player1Info={{ name: editingMatch.player1.name, team: editingMatch.team1 }} player2Info={{ name: editingMatch.player2.name, team: editingMatch.team2 }} />)}<DialogFooter><Button variant="ghost" onClick={() => setEditingMatch(null)}>{t('cancel')}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && setRevertingMatch(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('revert_match_confirm_title')}</AlertDialogTitle>{revertingMatch && (<AlertDialogDescription>{t('revert_match_confirm_desc', { player1: playersById[revertingMatch.player1Id]?.name, player2: playersById[revertingMatch.player2Id]?.name })}</AlertDialogDescription>)}</AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setRevertingMatch(null)}>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleRevertMatch} className="bg-amber-500 hover:bg-amber-600">{t('revert_match_action')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <Dialog open={passwordPromptOpen} onOpenChange={setPasswordPromptOpen}><DialogContent><DialogHeader><DialogTitle>{t('admin_auth')}</DialogTitle><DialogDescription>{t('admin_auth_desc')}</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="password-input" className="text-right">{t('password')}</Label><Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="col-span-3" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} /></div></div><DialogFooter><Button onClick={handlePasswordCheck}>{t('unlock')}</Button></DialogFooter></DialogContent></Dialog>
      </div>
    </div>
  );
}
