
'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Search, Unlock, Undo2, Lock, Calendar, Swords, Clock, Zap, Activity, Trophy, LayoutGrid, KeyRound, CalendarIcon, Shield, ChevronRight, Scan, CheckCircle2, Loader2, Binary, Radio, Plus, Minus, Crown, Share2 } from 'lucide-react';
import { MatchShareDialog } from '@/components/match-share-dialog';
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
import { collection, doc, query, getDocs, getDoc, where, runTransaction, Timestamp, orderBy, increment, updateDoc } from 'firebase/firestore';
import type { Season, Player, WithId, Match, Team, LeagueEntry, CoOpLeagueEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScoreForm } from '@/components/score-form';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useSharedPassword } from '@/context/password-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LiveClock } from '@/components/live-clock';
import { LiveScoreTicker } from '@/components/live-score-ticker';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PLAYOFF_SUCCESSOR_MAP, getPlayoffSuccessorMap } from '@/lib/constants';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';


const LEAGUE_ID = 'main-league';

import { MatchRow } from '@/components/fixtures/match-row';
import { FixtureContent } from '@/components/fixtures/fixture-content';

export default function FixturesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [sharingMatch, setSharingMatch] = useState<any | null>(null);
  const [revertingMatch, setRevertingMatch] = useState<WithId<Match> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const seasonsCol = useMemoFirebase(() => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCol);
  
  const playersCol = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCol);
  
  const allTeamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(allTeamsCol);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);
  
  const matchesCol = useMemoFirebase(() => firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`) : null, [firestore, activeSeasonId]);
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCol);
  
  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);
  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);

  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    return `${format(activeSeason.startDate.toDate(), 'd LLL')} - ${format(activeSeason.endDate.toDate(), 'd LLL yyyy')}`;
  }, [activeSeason]);
  
  const hasPlayoffs = useMemo(() => matches?.some(m => m.round && m.round !== 'Group') || false, [matches]);

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

  const handleQuickUpdate = async (matchId: string, field: string, delta: number) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    try {
        await updateDoc(matchRef, { [field]: increment(delta) });
    } catch (e) {
        console.error("Quick update failed:", e);
    }
  };

  const handleUpdateScore = async (matchId: string, values: any) => {
    if (!firestore || !activeSeasonId || isProcessing) return;
    setIsProcessing(true);
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchId);
    
    try {
        const mDoc = await getDoc(matchRef);
        if (!mDoc.exists()) throw new Error("Match data not found.");
        const orig = mDoc.data() as Match;
        
        const [h, m] = values.time.split(':').map(Number); 
        const matchTimestamp = Timestamp.fromDate(new Date(values.date.setHours(h, m)));
        
        const isCompleted = values.status === 'Completed';

        const matchUpdateData: any = {
            player1Score: values.player1Score,
            player2Score: values.player2Score,
            matchDate: matchTimestamp,
            status: values.status,
            isCompleted: isCompleted,
            player1Wins: values.player1Wins !== undefined ? values.player1Wins : null,
            player2Wins: values.player2Wins !== undefined ? values.player2Wins : null,
            player1p1Goals: values.player1p1Goals !== undefined ? values.player1p1Goals : null,
            player1p2Goals: values.player1p2Goals !== undefined ? values.player1p2Goals : null,
            player2p1Goals: values.player2p1Goals !== undefined ? values.player2p1Goals : null,
            player2p2Goals: values.player2p2Goals !== undefined ? values.player2p2Goals : null,
        };

        if (isCompleted) {
            await runTransaction(firestore, async (transaction) => {
                const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
                const sSnap = await transaction.get(seasonRef);
                const sData = sSnap.data() as Season;
                const isSeasonCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';
                const isGroupMatch = orig.round === 'Group' || !orig.round;
                const succMap = getPlayoffSuccessorMap(sData?.type, orig);

                let winMatchRef = null;
                let losMatchRef = null;
                if (orig.round && orig.round !== 'Group' && orig.bracketId) {
                    const succ = succMap[orig.bracketId];
                    if (succ) {
                        const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                        const winSnap = await getDocs(query(mCol, where('bracketId', '==', succ.winner.bid)));
                        if (!winSnap.empty) winMatchRef = winSnap.docs[0].ref;
                        if (succ.loser) {
                            const losSnap = await getDocs(query(mCol, where('bracketId', '==', succ.loser.bid)));
                            if (!losSnap.empty) losMatchRef = losSnap.docs[0].ref;
                        }
                    }
                }

                let p1EntryRef = null;
                let p2EntryRef = null;
                let e1Data: any = null;
                let e2Data: any = null;

                if (isGroupMatch) {
                    const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
                    const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                    if (isSeasonCoop) {
                        p1EntryRef = doc(tblCol, orig.player1Id);
                        p2EntryRef = doc(tblCol, orig.player2Id);
                    } else {
                        const snap1 = await getDocs(query(tblCol, where('playerId', '==', orig.player1Id)));
                        const snap2 = await getDocs(query(tblCol, where('playerId', '==', orig.player2Id)));
                        if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                        if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                    }
                    
                    if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data();
                    if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data();
                }

                const updateOverallStats = (pId: string, change: any) => {
                    if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                    transaction.update(doc(firestore, 'players', pId), {
                        overallPlayed: increment(change.played || 0),
                        overallWin: increment(change.win || 0),
                        overallDraw: increment(change.draw || 0),
                        overallLoss: increment(change.loss || 0),
                        overallGoalsFor: increment(change.gf || 0),
                        overallGoalsAgainst: increment(change.ga || 0),
                    });
                };

                if (orig.isCompleted) {
                    const oldBo3 = !isGroupMatch;
                    const oldS1 = oldBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                    const oldS2 = oldBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                    
                    if (isSeasonCoop && e1Data && e2Data) {
                        const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                        const res = oldS1 > oldS2 ? 'W' : (oldS1 < oldS2 ? 'L' : 'D');
                        [d1.player1Id, d1.player2Id].forEach(id => {
                            const playerGoals = id === d1.player1Id ? (orig.player1p1Goals || 0) : (orig.player1p2Goals || 0);
                            updateOverallStats(id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -playerGoals, ga: -(orig.player2Score || 0) });
                        });
                        [d2.player1Id, d2.player2Id].forEach(id => {
                            const playerGoals = id === d2.player1Id ? (orig.player2p1Goals || 0) : (orig.player2p2Goals || 0);
                            updateOverallStats(id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -playerGoals, ga: -(orig.player1Score || 0) });
                        });
                    } else {
                        const res = oldS1 > oldS2 ? 'W' : (oldS1 < oldS2 ? 'L' : 'D');
                        updateOverallStats(orig.player1Id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -(orig.player1Score || 0), ga: -(orig.player2Score || 0) });
                        updateOverallStats(orig.player2Id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -(orig.player2Score || 0), ga: -(orig.player1Score || 0) });
                    }
                }

                const newBo3 = !isGroupMatch;
                const newS1 = newBo3 ? (values.player1Wins ?? 0) : values.player1Score;
                const newS2 = newBo3 ? (values.player2Wins ?? 0) : values.player2Score;

                if (isSeasonCoop && e1Data && e2Data) {
                    const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                    const res = newS1 > newS2 ? 'W' : (newS1 < newS2 ? 'L' : 'D');
                    [d1.player1Id, d1.player2Id].forEach(id => {
                        const playerGoals = id === d1.player1Id ? (values.player1p1Goals || 0) : (values.player1p2Goals || 0);
                        updateOverallStats(id, { played: 1, win: res === 'W' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'L' ? 1 : 0, gf: playerGoals, ga: values.player2Score });
                    });
                    [d2.player1Id, d2.player2Id].forEach(id => {
                        const playerGoals = id === d2.player1Id ? (values.player2p1Goals || 0) : (values.player2p2Goals || 0);
                        updateOverallStats(id, { played: 1, win: res === 'L' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'W' ? 1 : 0, gf: playerGoals, ga: values.player1Score });
                    });
                } else {
                    const res = newS1 > newS2 ? 'W' : (newS1 < newS2 ? 'L' : 'D');
                    updateOverallStats(orig.player1Id, { played: 1, win: res === 'W' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'L' ? 1 : 0, gf: values.player1Score, ga: values.player2Score });
                    updateOverallStats(orig.player2Id, { played: 1, win: res === 'L' ? 1 : 0, draw: res === 'D' ? 1 : 0, loss: res === 'W' ? 1 : 0, gf: values.player2Score, ga: values.player1Score });
                }

                if (winMatchRef) {
                    const winnerId = newS1 > newS2 ? orig.player1Id : orig.player2Id;
                    const succ = succMap[orig.bracketId!];
                    transaction.update(winMatchRef, { [`player${succ.winner.slot}Id`]: winnerId });
                    if (losMatchRef && succ.loser) {
                        const loserId = winnerId === orig.player1Id ? orig.player2Id : orig.player1Id;
                        transaction.update(losMatchRef, { [`player${succ.loser.slot}Id`]: loserId });
                    }
                }

                if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                    const e1 = { ...e1Data }; const e2 = { ...e2Data };
                    if (orig.isCompleted) {
                        const oldBo3 = isSeasonCoop && !isGroupMatch;
                        const os1 = oldBo3 ? (orig.player1Wins ?? 0) : (orig.player1Score ?? 0);
                        const os2 = oldBo3 ? (orig.player2Wins ?? 0) : (orig.player2Score ?? 0);
                        e1.played--; e2.played--;
                        if (os1 > os2) { e1.win--; e1.points -= 3; e2.loss--; }
                        else if (os1 < os2) { e2.win--; e2.points -= 3; e1.loss--; }
                        else { e1.draw--; e1.points -= 1; e2.draw--; e2.points -= 1; }
                        e1.goalsFor -= (orig.player1Score || 0); e1.goalsAgainst -= (orig.player2Score || 0);
                        e2.goalsFor -= (orig.player2Score || 0); e2.goalsAgainst -= (orig.player1Score || 0);
                        if (isSeasonCoop) {
                            e1.player1Goals -= (orig.player1p1Goals || 0); e1.player2Goals -= (orig.player1p2Goals || 0);
                            e2.player1Goals -= (orig.player2p1Goals || 0); e2.player2Goals -= (orig.player2p2Goals || 0);
                        }
                    }
                    e1.played++; e2.played++;
                    if (newS1 > newS2) { e1.win++; e1.points += 3; e2.loss++; }
                    else if (newS1 < newS2) { e2.win++; e2.points += 3; e1.loss++; }
                    else { e1.draw++; e1.points += 1; e2.draw++; e2.points += 1; }
                    e1.goalsFor += values.player1Score; e1.goalsAgainst += values.player2Score;
                    e2.goalsFor += values.player2Score; e2.goalsAgainst += values.player1Score;
                    if (isSeasonCoop) {
                        e1.player1Goals += values.player1p1Goals; e1.player2Goals += values.player1p2Goals;
                        e2.player1Goals += values.player2p1Goals; e2.player2Goals += values.player2p2Goals;
                    }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                    transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
                }

                transaction.update(matchRef, matchUpdateData);
            });
        } else {
            await updateDoc(matchRef, matchUpdateData);
        }

        toast({ title: t('score_updated_title') });
        setEditingMatch(null);
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRevertMatch = useCallback(async (matchToRevert?: WithId<Match>) => {
    const matchToUse = matchToRevert || revertingMatch;
    if (!firestore || !activeSeasonId || !matchToUse || isProcessing) return;
    setIsProcessing(true);
    
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchToUse.id);
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
    
    try {
        const [mDoc, sDoc] = await Promise.all([getDoc(matchRef), getDoc(seasonRef)]);
        if (!mDoc.exists() || !sDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed or found.");
        
        const mToRev = mDoc.data() as Match;
        const sData = sDoc.data() as Season;
        const isSeasonCoop = sData.type === 'Co-Op' || sData.type === 'Co-Op Hybrid';
        const isGroupMatch = mToRev.round === 'Group' || !mToRev.round;

        await runTransaction(firestore, async (transaction) => {
            let winMatchRef = null;
            let losMatchRef = null;
            const succMap = getPlayoffSuccessorMap(sData?.type, mToRev);
            if (mToRev.round && mToRev.round !== 'Group' && mToRev.bracketId) {
                const succ = succMap[mToRev.bracketId];
                if (succ) {
                    const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                    const winSnap = await getDocs(query(mCol, where('bracketId', '==', succ.winner.bid)));
                    if (!winSnap.empty) {
                        winMatchRef = winSnap.docs[0].ref;
                        if (winSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                    }
                    if (succ.loser) {
                        const losSnap = await getDocs(query(mCol, where('bracketId', '==', succ.loser.bid)));
                        if (!losSnap.empty) {
                            losMatchRef = losSnap.docs[0].ref;
                            if (losSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                        }
                    }
                }
            }

            let p1EntryRef = null;
            let p2EntryRef = null;
            let e1Data: any = null;
            let e2Data: any = null;

            if (isGroupMatch) {
                const tblName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
                const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
                if (isSeasonCoop) {
                    p1EntryRef = doc(tblCol, mToRev.player1Id);
                    p2EntryRef = doc(tblCol, mToRev.player2Id);
                } else {
                    const snap1 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player1Id)));
                    const snap2 = await getDocs(query(tblCol, where('playerId', '==', mToRev.player2Id)));
                    if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                    if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
                }
                
                if (p1EntryRef) e1Data = (await transaction.get(p1EntryRef)).data();
                if (p2EntryRef) e2Data = (await transaction.get(p2EntryRef)).data();
            }

            const updateOverallStats = (pId: string, change: any) => {
                if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                transaction.update(doc(firestore, 'players', pId), {
                    overallPlayed: increment(change.played || 0),
                    overallWin: increment(change.win || 0),
                    overallDraw: increment(change.draw || 0),
                    overallLoss: increment(change.loss || 0),
                    overallGoalsFor: increment(change.gf || 0),
                    overallGoalsAgainst: increment(change.ga || 0),
                });
            };

            const oldBo3 = !isGroupMatch;
            const os1 = oldBo3 ? (mToRev.player1Wins ?? 0) : (mToRev.player1Score ?? 0);
            const os2 = oldBo3 ? (mToRev.player2Wins ?? 0) : (mToRev.player2Score ?? 0);

            if (isSeasonCoop && e1Data && e2Data) {
                const d1 = e1Data as CoOpLeagueEntry; const d2 = e2Data as CoOpLeagueEntry;
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                [d1.player1Id, d1.player2Id].forEach(id => {
                    const playerGoals = id === d1.player1Id ? (mToRev.player1p1Goals || 0) : (mToRev.player1p2Goals || 0);
                    updateOverallStats(id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -playerGoals, ga: -(mToRev.player2Score || 0) });
                });
                [d2.player1Id, d2.player2Id].forEach(id => {
                    const playerGoals = id === d2.player1Id ? (mToRev.player2p1Goals || 0) : (mToRev.player2p2Goals || 0);
                    updateOverallStats(id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -playerGoals, ga: -(mToRev.player1Score || 0) });
                });
            } else {
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                updateOverallStats(mToRev.player1Id, { played: -1, win: res === 'W' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updateOverallStats(mToRev.player2Id, { played: -1, win: res === 'L' ? -1 : 0, draw: res === 'D' ? -1 : 0, loss: res === 'W' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            }

            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                e1.played--; e2.played--;
                const res = os1 > os2 ? 'W' : (os1 < os2 ? 'L' : 'D');
                if (res === 'W') { e1.win--; e1.points -= 3; e2.loss--; }
                else if (res === 'L') { e2.win--; e2.points -= 3; e1.loss--; }
                else { e1.draw--; e1.points -= 1; e2.draw--; e2.points -= 1; }
                e1.goalsFor -= (mToRev.player1Score || 0); e1.goalsAgainst -= (mToRev.player2Score || 0);
                e2.goalsFor -= (mToRev.player2Score || 0); e2.goalsAgainst -= (mToRev.player1Score || 0);
                if (isSeasonCoop) {
                    e1.player1Goals -= (mToRev.player1p1Goals || 0); e1.player2Goals -= (mToRev.player1p2Goals || 0);
                    e2.player1Goals -= (mToRev.player2p1Goals || 0); e2.player2Goals -= (mToRev.player2p2Goals || 0);
                }
                e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            if (winMatchRef) transaction.update(winMatchRef, { [`player${succMap[mToRev.bracketId!].winner.slot}Id`]: 'TBD' });
            if (losMatchRef && succMap[mToRev.bracketId!].loser) transaction.update(losMatchRef, { [`player${succMap[mToRev.bracketId!].loser!.slot}Id`]: 'TBD' });

            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, player1p1Goals: null, player1p2Goals: null, player2p1Goals: null, player2p2Goals: null, isCompleted: false, status: 'Scheduled' });
        });

        toast({ title: t('match_reverted_title') });
        setRevertingMatch(null);
    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setIsProcessing(false);
    }
  }, [firestore, activeSeasonId, revertingMatch, isProcessing, t, toast]);

  const isLoading = isLoadingSeasons || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  
  return (
    <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-5 sm:py-8 relative">
       <div className="absolute top-0 right-0 -z-10 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-primary/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
       <div className="absolute bottom-0 left-0 -z-10 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-3 sm:gap-4 max-w-6xl mx-auto">
          <div 
            className="flex flex-col justify-center flex-1 w-full min-w-0 max-w-3xl px-4 py-3 sm:px-6 sm:py-4 gap-2.5 sm:gap-3 relative overflow-hidden bg-[#0a0d14] backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.7)]"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
                <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Top Telemetry Strip */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div 
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md border shrink-0"
                          style={{ backgroundColor: `${theme.primaryHex}15`, borderColor: `${theme.primaryHex}40` }}
                        >
                            <div 
                              className="w-2 h-2 rounded-full animate-pulse" 
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            <span 
                              className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic"
                              style={{ color: theme.primaryHex }}
                            >
                              Live Match Feed
                            </span>
                        </div>

                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm max-w-full">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] font-mono text-white/60 truncate">
                              {theme.sysTag} • {theme.editionName}
                            </span>
                        </div>
                    </div>
                    
                    {/* Ultra Futuristic & Ultra Sport Dual-Tone Headline */}
                    <div className="relative min-w-0">
                      <h1 className="font-headline text-3xl sm:text-6xl font-black tracking-tight text-white uppercase italic leading-none drop-shadow-[0_0_35px_rgba(255,255,255,0.12)] flex flex-wrap items-baseline gap-x-2.5 sm:gap-x-4 py-1 pr-4">
                          <span className="inline-block text-white pr-1">
                              {t('fixtures_page_title').split(' ')[0]}
                          </span>
                          <span 
                            className="inline-block pr-2"
                            style={{ 
                              color: theme.primaryHex,
                              textShadow: `0 0 25px ${theme.glowRgba}`
                            }}
                          >
                              {t('fixtures_page_title').split(' ').slice(1).join(' ')}
                          </span>
                      </h1>
                      {/* Aerodynamic Speed Conduit Line */}
                      <div 
                        className="h-[3px] w-28 sm:w-44 mt-1 rounded-full" 
                        style={{ 
                          background: `linear-gradient(to right, ${theme.primaryHex}, ${theme.secondaryHex}, transparent)`, 
                          boxShadow: `0 0 12px ${theme.glowRgba}` 
                        }} 
                      />
                    </div>
                </div>

                {activeSeason && (
                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-1.5 shrink-0">
                        <Badge 
                          className="font-black tracking-[0.15em] text-[9px] sm:text-[10px] h-6 sm:h-7 px-3 sm:px-4 uppercase italic rounded-full backdrop-blur-md flex items-center gap-1.5 border shadow-md shrink-0"
                          style={{ 
                            backgroundColor: `${theme.primaryHex}20`, 
                            color: theme.primaryHex, 
                            borderColor: `${theme.primaryHex}50`,
                          }}
                        >
                            <span 
                              className="w-1.5 h-1.5 rounded-full animate-ping" 
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            {activeSeason.status}
                        </Badge>
                        <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/10 backdrop-blur-sm shadow-inner shrink-0">
                            <CalendarIcon className="w-3 h-3 shrink-0" style={{ color: theme.primaryHex }} />
                            {formattedDateRange && <p className="text-[9px] sm:text-[10px] font-black text-white/70 uppercase tracking-wider italic">{formattedDateRange}</p>}
                        </div>
                    </div>
                )}
            </div>

            {activeSeason && (
                <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-xl backdrop-blur-sm min-w-0 flex-1">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 8px ${theme.glowRgba}` }}
                        />
                        <p className="text-xs sm:text-sm lg:text-base font-black text-white/90 tracking-tight uppercase italic truncate min-w-0 flex-1">
                          {activeSeason.name}
                        </p>
                    </div>
                    
                    {matches && matches.length > 0 && (
                        <div className="w-full sm:w-[200px] md:w-[220px] shrink-0 space-y-1 bg-white/[0.02] border border-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <Activity className="w-2.5 h-2.5 animate-pulse shrink-0" style={{ color: theme.primaryHex }} />
                                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/50">Progress</span>
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-black italic" style={{ color: theme.primaryHex }} suppressHydrationWarning>
                                  [{progressPercentage.toFixed(0)}%]
                                </span>
                            </div>
                            <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out" 
                                  style={{ 
                                    width: `${progressPercentage}%`,
                                    background: `linear-gradient(to right, ${theme.secondaryHex}, ${theme.primaryHex})`,
                                    boxShadow: `0 0 10px ${theme.glowRgba}`
                                  }} 
                                />
                            </div>
                            <p className="text-[7px] font-black tracking-[0.15em] uppercase text-white/40 italic text-right">
                                {completedMatchesForDisplay}/{totalMatchesForDisplay} UNITS
                            </p>
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="w-full lg:w-[300px] xl:w-[320px] flex items-stretch shrink-0"><LiveClock className="h-full" theme={theme} /></div>
        </div>

        <LiveScoreTicker activeSeasonId={activeSeasonId} teamsById={teamsById} playersById={playersById} isAdmin={isAdmin} theme={theme} />

        {/* AERODYNAMIC CONTROLS HUB */}
        <div 
          className={cn(
            "relative bg-black/70 border p-2.5 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-500 rounded-2xl sm:rounded-3xl",
            isAdmin ? "w-full" : "w-fit mx-auto"
          )}
          style={{
            borderColor: `${theme.primaryHex}25`
          }}
        >
            <div className="flex items-center gap-3 w-full sm:w-auto relative group/select min-w-0">
                <div 
                  className="p-3 hidden xs:flex rounded-2xl items-center justify-center border shrink-0"
                  style={{
                    backgroundColor: `${theme.primaryHex}15`,
                    color: theme.primaryHex,
                    borderColor: `${theme.primaryHex}35`
                  }}
                >
                    <Scan className="w-4 h-4" />
                </div>
                <Select value={activeSeasonId || ''} onValueChange={activeSeasonId => setActiveSeasonId(activeSeasonId)} disabled={isLoadingSeasons}>
                    <SelectTrigger className="w-full sm:w-auto min-w-0 max-w-full sm:max-w-[340px] md:max-w-[420px] lg:max-w-[500px] h-12 sm:h-14 bg-white/5 border border-white/10 font-black uppercase italic tracking-tight text-xs sm:text-sm rounded-2xl sm:rounded-full focus:border-white/30 transition-all px-4 sm:px-6 pr-9 sm:pr-11 overflow-hidden shadow-inner text-left justify-between [&>span]:line-clamp-1 [&>span]:truncate [&>span]:min-w-0 [&>span]:w-full [&>span]:block">
                        <SelectValue placeholder={t('select_a_season')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A192F]/98 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-3xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[350px]">
                        {seasons?.map(s => (
                            <SelectItem 
                                key={s.id} 
                                value={s.id} 
                                className="font-black uppercase italic text-xs text-white/90 focus:bg-white/10 focus:text-white py-3 px-6 rounded-xl border-b border-white/5 last:border-0 cursor-pointer"
                            >
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className={cn("flex items-center gap-2", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
                <Button 
                    onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPromptOpen(true)} 
                    className={cn(
                        "h-12 sm:h-14 px-8 font-black text-xs uppercase tracking-[0.2em] italic rounded-2xl sm:rounded-full transition-all duration-500 relative overflow-hidden group/admin border", 
                        isAdmin 
                            ? "hover:brightness-110" 
                            : "hover:brightness-125"
                    )}
                    style={isAdmin ? {
                      backgroundColor: theme.primaryHex,
                      color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                      borderColor: theme.primaryHex,
                      boxShadow: `0 0 25px ${theme.glowRgba}`
                    } : {
                      backgroundColor: `${theme.primaryHex}15`,
                      color: theme.primaryHex,
                      borderColor: `${theme.primaryHex}40`
                    }}
                    disabled={!isPasswordLoaded}
                >
                    <div className="flex items-center relative z-10">
                        {isAdmin ? <Unlock className="mr-2.5 h-4 w-4" /> : <Lock className="mr-2.5 h-4 w-4" />}
                        {isAdmin ? t('lock_admin_mode') : t('unlock_admin')}
                    </div>
                </Button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-8">
                <div className="relative">
                    <div className="absolute -inset-12 bg-primary/10 rounded-full border-4 border-primary/20 animate-ping" />
                    <div className="w-20 h-20 border-8 border-primary border-t-transparent rounded-full animate-spin relative z-10 shadow-[0_0_40px_rgba(204,253,1,0.3)]" />
                </div>
                <p className="font-black tracking-[0.6em] text-sm uppercase italic text-primary animate-pulse">UPLINKING_TACTICAL_HUB</p>
            </div>
        ) : (
            <FixtureContent activeSeasonId={activeSeasonId} onEditMatch={setEditingMatch} onRevertMatch={setRevertingMatch} onQuickUpdate={handleQuickUpdate} onShareMatch={setSharingMatch} isAdmin={isAdmin} allPlayers={allPlayers || []} allTeams={allTeams || []} matches={matches} isLoadingMatches={isLoadingMatches} activeSeason={activeSeason} hasPlayoffs={hasPlayoffs} />
        )}

        <MatchShareDialog 
            open={!!sharingMatch} 
            onOpenChange={(open) => !open && setSharingMatch(null)} 
            match={sharingMatch} 
            activeSeason={activeSeason} 
        />

        <Dialog open={!!editingMatch} onOpenChange={(open) => !open && !isProcessing && setEditingMatch(null)}>
            <DialogContent 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className={cn(
                    "!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-2xl max-h-[90vh] flex flex-col border p-0 overflow-hidden bg-black/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] focus:outline-none focus-visible:outline-none [&>button:last-child]:top-5 [&>button:last-child]:right-5 [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/10 [&>button:last-child]:border [&>button:last-child]:border-white/20 [&>button:last-child]:text-white [&>button:last-child]:hover:bg-white [&>button:last-child]:hover:text-black [&>button:last-child]:transition-all [&>button:last-child]:z-50 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:opacity-100", 
                    isProcessing && "opacity-80 scale-95 pointer-events-none"
                )}
                style={{
                    borderColor: `${theme.primaryHex}4D`,
                    boxShadow: `0 25px 80px rgba(0,0,0,0.95), 0 0 40px ${theme.primaryHex}26`
                }}
            >
                {/* Top Racing Accent Tracer */}
                <div 
                    className="absolute top-0 left-0 right-0 h-[2px] z-20" 
                    style={{
                        background: `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`,
                        boxShadow: `0 0 20px ${theme.primaryHex}`
                    }}
                />
                
                <DialogHeader className="p-6 sm:p-8 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border-b border-white/10 shrink-0 relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <div 
                            className="p-3 border rounded-2xl shadow-lg flex items-center justify-center"
                            style={{
                                backgroundColor: `${theme.primaryHex}1A`,
                                borderColor: `${theme.primaryHex}4D`,
                                color: theme.primaryHex,
                                boxShadow: `0 0 25px ${theme.primaryHex}4D`
                            }}
                        >
                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" style={{ fill: theme.primaryHex }} />}
                        </div>
                        <div>
                            <div 
                                className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.25em] italic mb-1.5 border shadow-sm"
                                style={{
                                    backgroundColor: `${theme.primaryHex}1A`,
                                    borderColor: `${theme.primaryHex}4D`,
                                    color: theme.primaryHex
                                }}
                            >
                                <span 
                                    className="w-1.5 h-1.5 rounded-full animate-pulse" 
                                    style={{ backgroundColor: theme.primaryHex }}
                                />
                                Engagement Uplink // {theme.seasonBadge || activeSeason?.name}
                            </div>
                            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic pr-6 leading-none text-white drop-shadow-md">
                                {isProcessing ? "Menyinkronkan..." : "Update Match Engagement"}
                            </DialogTitle>
                        </div>
                    </div>
                    {editingMatch && (
                        <DialogDescription className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mt-3 relative z-10 italic border-t border-white/5 pt-2.5">
                            {t('update_match_score_desc', { player1: editingMatch.player1?.name, player2: editingMatch.player2?.name })}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-180px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {editingMatch && activeSeason && (
                        <ScoreForm 
                            match={editingMatch} 
                            onSave={(v) => handleUpdateScore(editingMatch.id, v)} 
                            seasonType={activeSeason.type} 
                            theme={theme}
                            player1Info={{ 
                                name: editingMatch.player1.name, 
                                team: editingMatch.team1,
                                p1Name: editingMatch.p1n1,
                                p2Name: editingMatch.p1n2
                            }} 
                            player2Info={{ 
                                name: editingMatch.player2.name, 
                                team: editingMatch.team2,
                                p1Name: editingMatch.p2n1,
                                p2Name: editingMatch.p2n2
                            }} 
                        />
                    )}
                </div>
                <DialogFooter className="p-4 px-8 bg-black/60 border-t border-white/10 shrink-0 flex items-center justify-end">
                    <Button variant="ghost" onClick={() => setEditingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-[0.25em] italic text-[11px] text-white/50 hover:text-white transition-all h-10 px-6 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5">
                        <span>{t('cancel')}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && !isProcessing && setRevertingMatch(null)}>
            <AlertDialogContent className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-lg border border-amber-500/40 bg-[#0A192F]/95 backdrop-blur-3xl rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] p-6 sm:p-8">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 text-amber-500 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/40">
                            {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Undo2 className="w-8 h-8" />}
                        </div>
                        <div className="text-left">
                            <AlertDialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic pr-4 leading-none">{t('revert_match_confirm_title')}</AlertDialogTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/70 mt-1.5">Protocol: Reset_Node_State</p>
                        </div>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/60 uppercase tracking-wide border-l-2 border-amber-500/40 pl-4 py-1.5 leading-relaxed text-left">{t('revert_match_confirm_desc', { player1: revertingMatch.player1Id, player2: revertingMatch.player2Id })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-8">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} disabled={isProcessing} className="font-black uppercase tracking-[0.2em] italic rounded-xl h-12 border border-white/10 bg-white/5 text-white/50 hover:text-white transition-all">
                        {t('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => revertingMatch && handleRevertMatch(revertingMatch)} disabled={isProcessing} className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-[0.2em] italic rounded-xl h-12 shadow-lg shadow-amber-500/25">
                        {t('revert_match_action')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={passwordPromptOpen} onOpenChange={passwordPromptOpen => setPasswordPromptOpen(passwordPromptOpen)}>
            <DialogContent 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-md border bg-black/95 backdrop-blur-3xl rounded-3xl p-6 sm:p-8 focus:outline-none focus-visible:outline-none"
                style={{
                    borderColor: `${theme.primaryHex}4D`,
                    boxShadow: `0 0 100px ${theme.glowRgba}`
                }}
            >
                <DialogHeader className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div 
                            className="p-3 rounded-2xl border flex items-center justify-center"
                            style={{
                                backgroundColor: `${theme.primaryHex}1A`,
                                borderColor: `${theme.primaryHex}4D`,
                                color: theme.primaryHex
                            }}
                        >
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic pr-4 leading-none text-white">{t('admin_auth')}</DialogTitle>
                            <p 
                                className="text-[10px] font-black uppercase tracking-[0.25em] mt-1"
                                style={{ color: theme.primaryHex }}
                            >
                                Status: Restricted_Access
                            </p>
                        </div>
                    </div>
                    <DialogDescription className="font-bold text-white/50 uppercase tracking-wider text-[11px] leading-relaxed text-left border-l-2 border-white/10 pl-3.5">{t('admin_auth_desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                    <div className="space-y-2">
                        <Label 
                            htmlFor="password-input" 
                            className="text-[10px] font-black uppercase tracking-[0.3em] ml-1 italic"
                            style={{ color: theme.primaryHex }}
                        >
                            ENCRYPTED_KEY_TRANSMISSION
                        </Label>
                        <div className="relative group/input">
                            <Input 
                                id="password-input" 
                                type="password" 
                                value={passwordInput} 
                                onChange={(e) => setPasswordInput(e.target.value)} 
                                className="h-14 bg-black/60 border-white/10 rounded-2xl focus:border-white/40 text-xl font-black tracking-[0.25em] px-5" 
                                style={{ color: theme.primaryHex }}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} 
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        onClick={handlePasswordCheck} 
                        className="w-full h-14 font-black tracking-[0.25em] text-base uppercase italic rounded-2xl transition-all flex items-center justify-center gap-3"
                        style={{
                            backgroundColor: theme.primaryHex,
                            color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                            boxShadow: `0 0 30px ${theme.glowRgba}`
                        }}
                    >
                        <Scan className="w-5 h-5" />
                        {t('unlock')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
