'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock, Users, Award, User, Shuffle, RefreshCw, Group, Swords, Wallet, Receipt, LayoutGrid, Scan, Activity, Zap, Undo2, KeyRound, Dices, Binary, Plus, Check, Search, X, AlertTriangle, Palette, Sparkles } from 'lucide-react';
import { getSeasonTheme, AVAILABLE_SEASON_THEMES } from '@/lib/season-theme';
import Link from 'next/link';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, getDocs, query, Timestamp, where, orderBy, limit, getDoc, runTransaction, increment } from 'firebase/firestore';
import type { Season, LeagueEntry, Player, WithId, Match, Team, SeasonRecord, CoOpLeagueEntry, PlayerWithTeam } from '@/lib/types';
import { RegisterPlayersForm } from '@/components/register-players-form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShareDialog } from '@/components/share-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import { useSharedPassword } from '@/context/password-context';
import { LeagueStats } from '@/components/league-stats';
import { LiveClock } from '@/components/live-clock';
import { PlayerPerformanceDialog } from '@/components/player-performance-dialog';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CoopDrawDialog } from '@/components/coop-draw-dialog';
import { CoopManualPairingDialog } from '@/components/coop-manual-pairing-dialog';
import { GroupDrawDialog } from '@/components/group-draw-dialog';
import { TeamDraftDialog } from '@/components/team-draft-dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PLAYOFF_SUCCESSOR_MAP } from '@/lib/constants';
import { resolveLogo } from '@/lib/logo-utils';
import { LiveScoreTicker } from '@/components/live-score-ticker';


const LEAGUE_ID = 'main-league';

export default function LeaguePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { password: ADMIN_PASSWORD, isLoaded: isPasswordLoaded } = useSharedPassword();

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ open: boolean, action?: () => void }>({ open: false });
  const [passwordInput, setPasswordInput] = useState('');
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showRegisterPlayers, setShowRegisterPlayers] = useState(false);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [showManualPairingDialog, setShowManualPairingDialog] = useState(false);
  const [showGroupDrawDialog, setShowGroupDrawDialog] = useState(false);
  const [showTeamDraftDialog, setShowTeamDraftDialog] = useState(false);
  const [activeLeagueTab, setActiveLeagueTab] = useState("group_a");
  const [selectedDivision, setSelectedDivision] = useState<'div-1' | 'div-2'>('div-1');
  
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonFee, setNewSeasonFee] = useState<number | string>('');
  const [newSponsorshipAmount, setNewSponsorshipAmount] = useState<number | string>('');
  const [newSeasonType, setNewSeasonType] = useState<Season['type']>('Single');
  const [newSeasonThemeKey, setNewSeasonThemeKey] = useState<Season['themeKey']>('auto');
  const [newHybridMeetings, setNewHybridMeetings] = useState<1 | 2>(1);
  const [newHasDivisions, setNewHasDivisions] = useState(false);
  const [newDivision1Name, setNewDivision1Name] = useState('Divisi 1');
  const [newDivision2Name, setNewDivision2Name] = useState('Divisi 2');
  const [newDivision2Format, setNewDivision2Format] = useState<Season['division2Format']>('Single');
  const [newDivision2HasPlayoff, setNewDivision2HasPlayoff] = useState<boolean>(false);
  const [newPromotionSpots, setNewPromotionSpots] = useState<number>(2);
  const [newRelegationSpots, setNewRelegationSpots] = useState<number>(2);
  const [editingSeason, setEditingSeason] = useState<WithId<Season> | null>(null);
  
  const [deletingSeason, setDeletingSeason] = useState<WithId<Season> | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WithId<LeagueEntry> | null>(null);
  const [showFinishSeasonConfirm, setShowFinishSeasonConfirm] = useState(false);
  const [showFinishGroupStageConfirm, setShowFinishGroupStageConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showStartSeasonConfirm, setShowStartSeasonConfirm] = useState(false);
  const [financialFilter, setFinancialFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [financialSearch, setFinancialSearch] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({ from: undefined, to: undefined });
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<WithId<LeagueEntry> | null>(null);
  const [revertingMatch, setRevertingMatch] = useState<WithId<Match> | null>(null);

  const seasonsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);

  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);

  const isSeasonCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';

  const leagueTableCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId && activeSeason?.type !== 'Co-Op' && activeSeason?.type !== 'Co-Op Hybrid'
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`))
        : null,
    [firestore, activeSeasonId, activeSeason]
  );
  const { data: singleLeagueTable, isLoading: isLoadingSingleTable } = useCollection<LeagueEntry>(leagueTableCollection);

  const coopLeagueTableCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId && isSeasonCoop
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`))
        : null,
    [firestore, activeSeasonId, isSeasonCoop]
  );
  const { data: coopLeagueTable, isLoading: isLoadingCoopTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);

  const isLoadingTable = isLoadingSingleTable || isLoadingCoopTable;

  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const individualPoolCollection = useMemoFirebase(
      () => firestore && activeSeasonId ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`) : null,
      [firestore, activeSeasonId]
  );
  const { data: individualPool } = useCollection<LeagueEntry>(individualPoolCollection);

  const participantEntries = useMemo(() => {
    if (isSeasonCoop) return coopLeagueTable || [];
    return singleLeagueTable || [];
  }, [activeSeason, coopLeagueTable, singleLeagueTable, isSeasonCoop]);

  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);
  
  const matchesCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId
        ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`)
        : null,
    [firestore, activeSeasonId]
  );
  const { data: matches, isLoading: isLoadingMatches } = useCollection<Match>(matchesCollection);

  const hallOfFameCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'hallOfFame'), orderBy('completedAt', 'desc'), limit(1)) : null),
    [firestore]
  );
  const { data: latestHallOfFame } = useCollection<SeasonRecord>(hallOfFameCollection);
  const defendingChampionId = latestHallOfFame?.[0]?.winnerPlayerId;
  
  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p as PlayerWithTeam;
        return acc;
    }, {} as Record<string, PlayerWithTeam>);
  }, [allPlayers]);

  const sortedTable = useMemo(() => {
    const tableData = !isSeasonCoop ? singleLeagueTable : coopLeagueTable;
    if (!tableData) return [];
    
    let enrichedTable: any[];

    if (isSeasonCoop && coopLeagueTable) {
        enrichedTable = coopLeagueTable.map(entry => {
            const teamId = entry.player1TeamId;
            const team = teamsById[teamId];
            const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.teamName);
            
            return {
                ...entry,
                playerName: entry.teamName,
                teamId: teamId,
                teamName: team ? team.name : entry.player1TeamName,
                playerId: entry.id,
                team: team,
                logoUrl
            };
        });
    } else if (singleLeagueTable) {
        enrichedTable = singleLeagueTable.map(entry => {
            const player = playersById[entry.playerId];
            const teamId = entry.teamId || player?.teamId || '';
            const team = teamsById[teamId];
            const logoUrl = resolveLogo(team?.logoUrl, teamId, entry.playerName);

            return {
                ...entry,
                player: player,
                team: team,
                logoUrl
            };
        });
    } else {
        enrichedTable = [];
    }

    const sortFn = (a: any, b: any) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        if (b.win !== a.win) return b.win - a.win;
        const nameA = a.playerName || a.teamName || "";
        const nameB = b.playerName || b.teamName || "";
        return nameA.localeCompare(nameB);
    };

    if (activeSeason?.status === 'Not Started') {
        const sorted = [...enrichedTable].sort((a, b) => {
            const nameA = a.playerName || a.teamName || "";
            const nameB = b.playerName || b.teamName || "";
            return nameA.localeCompare(nameB);
        });
        return sorted.map((entry, index) => ({...entry, rank: index + 1}));
    }
    
    return [...enrichedTable].sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));

  }, [singleLeagueTable, coopLeagueTable, activeSeason, playersById, teamsById, isSeasonCoop]);

  const isHybrid = activeSeason?.type === 'Hybrid' || activeSeason?.type === 'Co-Op Hybrid' || activeSeason?.type === 'Single Hybrid';

  const { groupA, groupB } = useMemo(() => {
    if (!isHybrid || activeSeason?.type === 'Single Hybrid' || activeSeason?.type === 'Co-Op Hybrid') return { groupA: [], groupB: [] };
    
    const sortAndRank = (data: typeof sortedTable) => 
        data.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            if (b.win !== a.win) return b.win - a.win;
            const nameA = a.playerName || a.teamName || "";
            const nameB = b.playerName || b.teamName || "";
            return nameA.localeCompare(nameB);
        }).map((entry, index) => ({...entry, rank: index + 1}));

    const a = sortAndRank(sortedTable.filter(p => p.group === 'A'));
    const b = sortAndRank(sortedTable.filter(p => p.group === 'B'));
    
    return { groupA: a, groupB: b };
  }, [sortedTable, isHybrid]);

  const hasFixtures = useMemo(() => (matches || []).length > 0, [matches]);
  
  const { prizePool, registrationPool, sponsorshipPool } = useMemo(() => {
    if (!activeSeason) {
      return { prizePool: 0, registrationPool: 0, sponsorshipPool: 0 };
    }
    const registrationFee = activeSeason.registrationFee || 0;
    const sponsorship = activeSeason.sponsorshipAmount || 0;

    const paidCount = (participantEntries || []).filter(p => p.hasPaid).length;
    const regPool = paidCount * registrationFee;
    const totalPool = regPool + sponsorship;

    return { 
      prizePool: totalPool,
      registrationPool: regPool,
      sponsorshipPool: sponsorship
    };
  }, [participantEntries, activeSeason]);

  const allSeasonMatches = useMemo(() => (matches || []), [matches]);
  const groupStageMatches = useMemo(() => allSeasonMatches.filter(m => !m.round || m.round === 'Group'), [allSeasonMatches]);
  const areGroupStageMatchesComplete = useMemo(() => {
    if (groupStageMatches.length === 0) return false;
    return groupStageMatches.every(m => m.isCompleted);
  }, [groupStageMatches]);

  const hasPlayoffs = useMemo(() => allSeasonMatches.some(m => m.round && m.round !== 'Group'), [allSeasonMatches]);

  useEffect(() => {
    if (!seasons || seasons.length === 0) return;
    if (!activeSeasonId) {
      setActiveSeasonId(seasons[0].id);
    } else {
      const exists = seasons.some(s => s.id === activeSeasonId);
      if (!exists) setActiveSeasonId(seasons[0].id);
    }
  }, [seasons, activeSeasonId]);

  useEffect(() => {
    if (activeSeason?.type === 'Co-Op Hybrid' || activeSeason?.type === 'Single Hybrid') {
        if (activeLeagueTab !== 'standings' && activeLeagueTab !== 'playoff' && activeLeagueTab !== 'topskor') {
            setActiveLeagueTab('standings');
        }
    } else if (activeSeason?.type === 'Hybrid') {
        if (activeLeagueTab === 'standings' || activeLeagueTab === 'topskor') {
            setActiveLeagueTab('group_a');
        }
    }
  }, [activeSeason, activeLeagueTab]);

  const handlePasswordCheck = () => {
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdmin(true);
        if (passwordPrompt.action) passwordPrompt.action();
        toast({ title: t('admin_mode_unlocked_title'), description: t('admin_mode_unlocked_desc') });
    } else {
        toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordPrompt({ open: false });
    setPasswordInput('');
  };

  const withAdminCheck = (action: () => void) => {
    if (isAdmin) action();
    else setPasswordPrompt({ open: true, action });
  };

  const handleGenerateFixtures = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason) return;
    if (activeSeason.status !== 'Not Started') {
       toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error_not_started') });
       return;
    }
    const tableToUse = !isSeasonCoop ? singleLeagueTable : coopLeagueTable;
    if (!tableToUse || tableToUse.length < 2) {
      toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error_min_players') });
      return;
    }
    const batch = writeBatch(firestore);
    const matchesCollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
    const existingMatchesSnap = await getDocs(matchesCollectionRef);
    existingMatchesSnap.forEach(doc => batch.delete(doc.ref));
    
    const seasonType = activeSeason.type || 'Single';
    const isHybridMode = seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid' || seasonType === 'Single Hybrid';
    const now = Date.now();
    let matchCounter = 0;

    // ============================================================
    // MULTI-DIVISION SYSTEM (DIVISI 1 & DIVISI 2)
    // ============================================================
    if (activeSeason.hasDivisions && !isSeasonCoop && singleLeagueTable) {
        const div2Pool = singleLeagueTable.filter(e => e.division === 'div-2');
        const div1Pool = singleLeagueTable.filter(e => e.division !== 'div-2');

        // SPECIAL RULE:
        // "Jika divisi 2 hanya ada 1 atau 2 pemain saja, langsung merge ke divisi 1 saja. kecuali kalau ada 3 tetap gunakan format kompetisi."
        if (div2Pool.length > 0 && div2Pool.length <= 2) {
            // 1. Auto-merge: update Div 2 entries in Firestore to div-1
            div2Pool.forEach(entry => {
                batch.update(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, entry.id), {
                    division: 'div-1'
                });
            });
            batch.update(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeasonId), {
                isDiv2Merged: true
            });

            // 2. Generate unified single pool fixtures for everyone
            const mergedPool = singleLeagueTable;
            const meetings = seasonType === 'Single' ? 2 : (seasonType === 'Single Hybrid' || seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid' ? (activeSeason.hybridGroupMeetings || 1) : 1);
            for (let i = 0; i < mergedPool.length; i++) {
                for (let j = i + 1; j < mergedPool.length; j++) {
                    const id1 = mergedPool[i].playerId;
                    const id2 = mergedPool[j].playerId;
                    for (let k = 0; k < meetings; k++) {
                        let p1Id = k === 0 ? id1 : id2;
                        let p2Id = k === 0 ? id2 : id1;
                        if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                        batch.set(doc(matchesCollectionRef), {
                            seasonId: activeSeasonId,
                            player1Id: p1Id,
                            player2Id: p2Id,
                            player1Score: null,
                            player2Score: null,
                            player1Wins: null,
                            player2Wins: null,
                            isCompleted: false,
                            status: 'Scheduled',
                            matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                            round: 'Group',
                            division: 'div-1'
                        });
                    }
                }
            }
            await batch.commit();
            toast({
                title: 'Divisi 2 Di-Merge ke Divisi 1',
                description: `Pendaftar Divisi 2 hanya ${div2Pool.length} pemain (minimal 3 untuk kompetisi). Seluruh peserta otomatis digabung ke ${activeSeason.division1Name || 'Divisi 1'}.`
            });
            return;
        } else if (div2Pool.length >= 3) {
            // SEPARATE COMPETITIONS: Div 1 and Div 2 both have full competition!
            batch.update(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeasonId), {
                isDiv2Merged: false
            });

            // Division 1 Fixtures
            if (seasonType === 'Hybrid') {
                const gA = div1Pool.filter(p => p.group === 'A');
                const gB = div1Pool.filter(p => p.group === 'B');
                const meetings = activeSeason.hybridGroupMeetings || 1;
                const generateHybridDiv1GroupMatches = (group: any[]) => {
                    for (let i = 0; i < group.length; i++) {
                        for (let j = i + 1; j < group.length; j++) {
                            const p1Id = group[i].playerId;
                            const p2Id = group[j].playerId;
                            for (let k = 0; k < meetings; k++) {
                                let subP1 = k === 0 ? p1Id : p2Id;
                                let subP2 = k === 0 ? p2Id : p1Id;
                                if (meetings === 1 && Math.random() > 0.5) [subP1, subP2] = [subP2, subP1];
                                batch.set(doc(matchesCollectionRef), {
                                    seasonId: activeSeasonId,
                                    player1Id: subP1,
                                    player2Id: subP2,
                                    player1Score: null,
                                    player2Score: null,
                                    player1Wins: null,
                                    player2Wins: null,
                                    isCompleted: false,
                                    status: 'Scheduled',
                                    matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                                    round: 'Group',
                                    division: 'div-1'
                                });
                            }
                        }
                    }
                };
                generateHybridDiv1GroupMatches(gA);
                generateHybridDiv1GroupMatches(gB);
            } else {
                const div1Meetings = seasonType === 'Single' ? 2 : (seasonType === 'Single Hybrid' ? (activeSeason.hybridGroupMeetings || 1) : 1);
                for (let i = 0; i < div1Pool.length; i++) {
                    for (let j = i + 1; j < div1Pool.length; j++) {
                        const id1 = div1Pool[i].playerId;
                        const id2 = div1Pool[j].playerId;
                        for (let k = 0; k < div1Meetings; k++) {
                            let p1Id = k === 0 ? id1 : id2;
                            let p2Id = k === 0 ? id2 : id1;
                            if (div1Meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                            batch.set(doc(matchesCollectionRef), {
                                seasonId: activeSeasonId,
                                player1Id: p1Id,
                                player2Id: p2Id,
                                player1Score: null,
                                player2Score: null,
                                player1Wins: null,
                                player2Wins: null,
                                isCompleted: false,
                                status: 'Scheduled',
                                matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                                round: 'Group',
                                division: 'div-1'
                            });
                        }
                    }
                }
            }

            // Division 2 Fixtures:
            // Jika mode tanpa playoff: 2x main (Home & Away).
            // Jika menggunakan playoff: 1x main (Single Round-Robin).
            const div2Meetings = activeSeason.division2HasPlayoff ? 1 : 2;
            for (let i = 0; i < div2Pool.length; i++) {
                for (let j = i + 1; j < div2Pool.length; j++) {
                    const id1 = div2Pool[i].playerId;
                    const id2 = div2Pool[j].playerId;
                    for (let k = 0; k < div2Meetings; k++) {
                        let p1Id = k === 0 ? id1 : id2;
                        let p2Id = k === 0 ? id2 : id1;
                        if (div2Meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                        batch.set(doc(matchesCollectionRef), {
                            seasonId: activeSeasonId,
                            player1Id: p1Id,
                            player2Id: p2Id,
                            player1Score: null,
                            player2Score: null,
                            player1Wins: null,
                            player2Wins: null,
                            isCompleted: false,
                            status: 'Scheduled',
                            matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                            round: 'Group',
                            division: 'div-2'
                        });
                    }
                }
            }

            await batch.commit();
            toast({
                title: 'Jadwal 2 Divisi Berhasil Dibuat!',
                description: `${activeSeason.division1Name || 'Divisi 1'} (${div1Pool.length} atlet) & ${activeSeason.division2Name || 'Divisi 2'} (${div2Pool.length} atlet) siap bertanding!`
            });
            return;
        } else {
            // div2Pool is 0: all players are in Div 1
            const meetings = seasonType === 'Single' ? 2 : (seasonType === 'Single Hybrid' || seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid' ? (activeSeason.hybridGroupMeetings || 1) : 1);
            for (let i = 0; i < div1Pool.length; i++) {
                for (let j = i + 1; j < div1Pool.length; j++) {
                    const id1 = div1Pool[i].playerId;
                    const id2 = div1Pool[j].playerId;
                    for (let k = 0; k < meetings; k++) {
                        let p1Id = k === 0 ? id1 : id2;
                        let p2Id = k === 0 ? id2 : id1;
                        if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                        batch.set(doc(matchesCollectionRef), {
                            seasonId: activeSeasonId,
                            player1Id: p1Id,
                            player2Id: p2Id,
                            player1Score: null,
                            player2Score: null,
                            player1Wins: null,
                            player2Wins: null,
                            isCompleted: false,
                            status: 'Scheduled',
                            matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                            round: 'Group',
                            division: 'div-1'
                        });
                    }
                }
            }
            await batch.commit();
            toast({
                title: t('fixtures_generated_title'),
                description: `Jadwal pertandingan untuk ${activeSeason.name} telah dibuat.`
            });
            return;
        }
    }

    if (seasonType === 'Single Hybrid') {
        // Single Hybrid: 1 Klasemen tunggal, setiap peserta bertanding 1x atau 2x (H&A) sesuai hybridGroupMeetings
        const meetings = activeSeason.hybridGroupMeetings || 1;
        for (let i = 0; i < tableToUse.length; i++) {
            for (let j = i + 1; j < tableToUse.length; j++) {
                const id1 = (tableToUse[i] as WithId<LeagueEntry>).playerId;
                const id2 = (tableToUse[j] as WithId<LeagueEntry>).playerId;
                for (let k = 0; k < meetings; k++) {
                    let p1Id = k === 0 ? id1 : id2;
                    let p2Id = k === 0 ? id2 : id1;
                    if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                    batch.set(doc(matchesCollectionRef), {
                        seasonId: activeSeasonId,
                        player1Id: p1Id,
                        player2Id: p2Id,
                        player1Score: null,
                        player2Score: null,
                        player1Wins: null,
                        player2Wins: null,
                        isCompleted: false,
                        status: 'Scheduled',
                        matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                        round: 'Group'
                    });
                }
            }
        }
    } else if (seasonType === 'Co-Op Hybrid') {
        const group = tableToUse;
        const meetings = activeSeason.hybridGroupMeetings || 1;
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const id1 = group[i].id; const id2 = group[j].id;
                for (let k = 0; k < meetings; k++) {
                    let p1Id = k === 0 ? id1 : id2; let p2Id = k === 0 ? id2 : id1;
                    if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                    batch.set(doc(matchesCollectionRef), { seasonId: activeSeasonId, player1Id: p1Id, player2Id: p2Id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group' });
                }
            }
        }
    } else if (seasonType === 'Hybrid') {
        const gA = tableToUse.filter(p => p.group === 'A');
        const gB = tableToUse.filter(p => p.group === 'B');
        const generateGroupMatches = (group: any[]) => {
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const p1Id = isSeasonCoop ? group[i].id : (group[i] as WithId<LeagueEntry>).playerId;
                    const p2Id = isSeasonCoop ? group[j].id : (group[j] as WithId<LeagueEntry>).playerId;
                    const meetings = activeSeason.hybridGroupMeetings || 1;
                    if (meetings === 2) {
                        batch.set(doc(matchesCollectionRef), { seasonId: activeSeasonId, player1Id: p1Id, player2Id: p2Id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group' });
                        batch.set(doc(matchesCollectionRef), { seasonId: activeSeasonId, player1Id: p2Id, player2Id: p1Id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group' });
                    } else {
                        let subP1 = p1Id; let subP2 = p2Id; if (Math.random() > 0.5) [subP1, subP2] = [subP2, subP1];
                        batch.set(doc(matchesCollectionRef), { seasonId: activeSeasonId, player1Id: subP1, player2Id: subP2, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group' });
                    }
                }
            }
        };
        generateGroupMatches(gA); generateGroupMatches(gB);
    } else {
        const meetings = isSeasonCoop ? 1 : ((activeSeason?.type || 'Single') === 'Single' ? 2 : 1);
        for (let i = 0; i < tableToUse.length; i++) {
          for (let j = i + 1; j < tableToUse.length; j++) {
            const id1 = isSeasonCoop ? tableToUse[i].id : (tableToUse[i] as WithId<LeagueEntry>).playerId;
            const id2 = isSeasonCoop ? tableToUse[j].id : (tableToUse[j] as WithId<LeagueEntry>).playerId;
            for (let k = 0; k < meetings; k++) {
                let p1Id = k === 0 ? id1 : id2; let p2Id = k === 0 ? id2 : id1;
                if (meetings === 1 && Math.random() > 0.5) [p1Id, p2Id] = [p2Id, p1Id];
                batch.set(doc(matchesCollectionRef), { seasonId: activeSeasonId, player1Id: p1Id, player2Id: p2Id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: isHybridMode ? 'Group' : undefined });
            }
          }
        }
    }
    batch.commit().then(() => toast({ title: t('fixtures_generated_title'), description: `Jadwal pertandingan untuk ${activeSeason.name} telah dibuat.` }));
  }, [firestore, activeSeason, activeSeasonId, singleLeagueTable, coopLeagueTable, t, toast, isSeasonCoop]);

  const handleGeneratePlayoffs = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason || !isHybrid) return;
    const matchesColRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
    const existingKnockoutSnap = await getDocs(query(matchesColRef, where('round', '!=', 'Group')));
    if (!existingKnockoutSnap.empty) { toast({ variant: 'destructive', title: 'Babak Gugur Sudah Ada', description: 'Jadwal playoff sudah ada.' }); return; }
    const batch = writeBatch(firestore);
    const now = Date.now();

    if (activeSeason.type === 'Single Hybrid') {
        if (sortedTable.length < 8) {
            toast({ variant: 'destructive', title: 'Peserta Kurang', description: 'Format Single Hybrid memerlukan minimal 8 peserta untuk babak Playoff.' });
            return;
        }
        // 8 besar melaju ke Playoff Single Elimination (Kalah = Gugur, Best of 3):
        // Match 1: Rank 1 vs Rank 8
        // Match 2: Rank 4 vs Rank 5
        // Match 3: Rank 2 vs Rank 7
        // Match 4: Rank 3 vs Rank 6
        const qfPairings = [
            { p1: sortedTable[0], p2: sortedTable[7], bid: 'playoff-m1' },
            { p1: sortedTable[3], p2: sortedTable[4], bid: 'playoff-m2' },
            { p1: sortedTable[1], p2: sortedTable[6], bid: 'playoff-m3' },
            { p1: sortedTable[2], p2: sortedTable[5], bid: 'playoff-m4' }
        ];
        qfPairings.forEach((p, i) => {
            batch.set(doc(matchesColRef), {
                seasonId: activeSeasonId,
                player1Id: p.p1.playerId || p.p1.id,
                player2Id: p.p2.playerId || p.p2.id,
                player1Score: null,
                player2Score: null,
                player1Wins: null,
                player2Wins: null,
                isCompleted: false,
                status: 'Scheduled',
                matchDate: Timestamp.fromMillis(now + (i + 1) * 1000),
                round: 'Quarterfinal',
                bracketId: p.bid
            });
        });

        // Placeholders untuk Semifinal (2 laga) dan Grand Final (1 laga):
        // Semifinal 1 (pemenang QF 1 vs QF 2): playoff-sf1
        // Semifinal 2 (pemenang QF 3 vs QF 4): playoff-sf2
        // Grand Final (pemenang SF 1 vs SF 2): playoff-final
        const placeholders = [
            { round: 'Semifinal', bid: 'playoff-sf1' },
            { round: 'Semifinal', bid: 'playoff-sf2' },
            { round: 'Grand-Final', bid: 'playoff-final' }
        ];
        placeholders.forEach((p, i) => {
            batch.set(doc(matchesColRef), {
                seasonId: activeSeasonId,
                player1Id: 'TBD',
                player2Id: 'TBD',
                player1Score: null,
                player2Score: null,
                player1Wins: null,
                player2Wins: null,
                isCompleted: false,
                status: 'Scheduled',
                matchDate: Timestamp.fromMillis(now + (i + 5) * 1000),
                round: p.round as any,
                bracketId: p.bid
            });
        });

        batch.commit().then(() => toast({ title: 'Playoff 8 Besar Dibuat!', description: '8 peringkat teratas klasemen telah masuk ke bagan Knockout Single Elimination (Best of 3).' }));
        return;
    }

    if (activeSeason.type === 'Co-Op Hybrid') {
        if (sortedTable.length < 4) { toast({ variant: 'destructive', title: 'Grup Tidak Lengkap', description: 'Harus ada minimal 4 tim untuk memulai playoff.' }); return; }
        batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: sortedTable[0].id, player2Id: sortedTable[3].id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + 1000), round: 'UB-Semi', bracketId: 'playoff-m9' });
        batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: sortedTable[1].id, player2Id: sortedTable[2].id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + 2000), round: 'UB-Semi', bracketId: 'playoff-m10' });
        if (sortedTable.length >= 6) {
          batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: sortedTable[4].id, player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + 3000), round: 'LB-Round 3', bracketId: 'playoff-m13' });
          batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: sortedTable[5].id, player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + 4000), round: 'LB-Round 3', bracketId: 'playoff-m14' });
        } else {
          batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: 'TBD', player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + 3000), round: 'LB-Round 3', bracketId: 'playoff-m13' });
          batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: 'TBD', player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + 4000), round: 'LB-Round 3', bracketId: 'playoff-m14' });
        }
        const placeholders = [{ round: 'UB-Final', bid: 'playoff-m15' }, { round: 'LB-Semifinal', bid: 'playoff-m16' }, { round: 'LB-Final', bid: 'playoff-m17' }, { round: 'Grand-Final', bid: 'playoff-m18' }];
        placeholders.forEach((p, i) => batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: 'TBD', player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (i + 5) * 1000), round: p.round as any, bracketId: p.bid }));
        batch.commit().then(() => toast({ title: 'Playoff Co-Op Dibuat!', description: 'Bagan Double Elimination (6 Tim) telah berhasil dibuat.' }));
        return;
    }
    
    if (groupA.length < 4 || groupB.length < 4) {
      toast({ variant: 'destructive', title: 'Grup Tidak Lengkap', description: 'Masing-masing grup harus memiliki setidaknya 4 tim untuk memulai playoff.' });
      return;
    }

    // Opsi A: Jika salah satu grup kurang dari 6 peserta (misal 5 peserta per grup / total 10 peserta),
    // gunakan format 8 Besar Knockout Silang (Top 4 Grup A vs Top 4 Grup B) Single Elimination (Best of 3)
    if (groupA.length < 6 || groupB.length < 6) {
      const qfPairings = [
        { p1: groupA[0], p2: groupB[3], bid: 'playoff-m1' }, // A1 vs B4
        { p1: groupB[1], p2: groupA[2], bid: 'playoff-m2' }, // B2 vs A3
        { p1: groupB[0], p2: groupA[3], bid: 'playoff-m3' }, // B1 vs A4
        { p1: groupA[1], p2: groupB[2], bid: 'playoff-m4' }, // A2 vs B3
      ];

      qfPairings.forEach((p, i) => {
        batch.set(doc(matchesColRef), {
          seasonId: activeSeasonId,
          player1Id: p.p1.playerId || p.p1.id,
          player2Id: p.p2.playerId || p.p2.id,
          player1Score: null,
          player2Score: null,
          player1Wins: null,
          player2Wins: null,
          isCompleted: false,
          status: 'Scheduled',
          matchDate: Timestamp.fromMillis(now + (i + 1) * 1000),
          round: 'Quarterfinal',
          bracketId: p.bid
        });
      });

      const placeholders = [
        { round: 'Semifinal', bid: 'playoff-sf1' },
        { round: 'Semifinal', bid: 'playoff-sf2' },
        { round: 'Grand-Final', bid: 'playoff-final' }
      ];

      placeholders.forEach((p, i) => {
        batch.set(doc(matchesColRef), {
          seasonId: activeSeasonId,
          player1Id: 'TBD',
          player2Id: 'TBD',
          player1Score: null,
          player2Score: null,
          player1Wins: null,
          player2Wins: null,
          isCompleted: false,
          status: 'Scheduled',
          matchDate: Timestamp.fromMillis(now + (i + 5) * 1000),
          round: p.round as any,
          bracketId: p.bid
        });
      });

      batch.commit().then(() => toast({
        title: 'Playoff 8 Besar (Top 4 Silang) Dibuat!',
        description: 'Bagan Knockout Single Elimination (8 Besar) telah berhasil dibuat dari peringkat 1 s/d 4 masing-masing grup.'
      }));
      return;
    }

    // Format Asli 12 Tim (Double Elimination jika masing-masing grup >= 6 tim)
    const ubQuarterPairings = [{ p1: groupA[0], p2: groupB[3], bid: 'playoff-m1' }, { p1: groupB[1], p2: groupA[2], bid: 'playoff-m2' }, { p1: groupB[0], p2: groupA[3], bid: 'playoff-m3' }, { p1: groupA[1], p2: groupB[2], bid: 'playoff-m4' }];
    ubQuarterPairings.forEach((p, i) => batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: p.p1.playerId || p.p1.id, player2Id: p.p2.playerId || p.p2.id, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (i + 1) * 1000), round: 'UB-Quarter', bracketId: p.bid }));
    const lbRound1Starters = [ { p1: groupA[4], bid: 'playoff-m5' }, { p1: groupB[4], bid: 'playoff-m6' }, { p1: groupA[5], bid: 'playoff-m7' }, { p1: groupB[5], bid: 'playoff-m8' } ];
    lbRound1Starters.forEach((p, i) => batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: p.p1.playerId || p.p1.id, player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (i + 5) * 1000), round: 'LB-Round 1', bracketId: p.bid }));
    const placeholders = [ { round: 'UB-Semi', bid: 'playoff-m9' }, { round: 'UB-Semi', bid: 'playoff-m10' }, { round: 'LB-Round 2', bid: 'playoff-m11' }, { round: 'LB-Round 2', bid: 'playoff-m12' }, { round: 'LB-Round 3', bid: 'playoff-m13' }, { round: 'LB-Round 3', bid: 'playoff-m14' }, { round: 'UB-Final', bid: 'playoff-m15' }, { round: 'LB-Semifinal', bid: 'playoff-m16' }, { round: 'LB-Final', bid: 'playoff-m17' }, { round: 'Grand-Final', bid: 'playoff-m18' } ];
    placeholders.forEach((p, i) => batch.set(doc(matchesColRef), { seasonId: activeSeasonId, player1Id: 'TBD', player2Id: 'TBD', player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (i + 10) * 1000), round: p.round as any, bracketId: p.bid }));
    batch.commit().then(() => toast({ title: 'Double Elimination Playoff Dibuat!', description: 'Jadwal UB-Quarter dan LB-Round 1 telah berhasil dibuat.' }));
  }, [firestore, activeSeasonId, activeSeason, groupA, groupB, sortedTable, toast, isHybrid]);

  const handleSeasonDialogSubmit = () => {
    if (firestore && newSeasonName.trim()) {
      const fee = typeof newSeasonFee === 'string' ? parseFloat(newSeasonFee) : newSeasonFee;
      const sponsorship = typeof newSponsorshipAmount === 'string' ? parseFloat(newSponsorshipAmount) : newSponsorshipAmount;
      const seasonData: Partial<Omit<Season, 'createdAt' | 'status'>> = {
          name: newSeasonName.trim(), 
          type: newSeasonType, 
          themeKey: newSeasonThemeKey,
          ...((newSeasonType === 'Hybrid' || newSeasonType === 'Co-Op Hybrid' || newSeasonType === 'Single Hybrid') && { hybridGroupMeetings: newHybridMeetings }),
          ...(dateRange.from && { startDate: Timestamp.fromDate(dateRange.from) }), 
          ...(dateRange.to && { endDate: Timestamp.fromDate(dateRange.to) }),
          registrationFee: isNaN(fee) ? 0 : fee, 
          sponsorshipAmount: isNaN(sponsorship) ? 0 : sponsorship,
          hasDivisions: newHasDivisions,
          ...(newHasDivisions ? {
              division1Name: newDivision1Name.trim() || 'Divisi 1',
              division2Name: newDivision2Name.trim() || 'Divisi 2',
              division2Format: newDivision2Format || 'Single',
              division2HasPlayoff: newDivision2HasPlayoff,
              promotionSpots: Number(newPromotionSpots) || 2,
              relegationSpots: Number(newRelegationSpots) || 2,
          } : {
              isDiv2Merged: false
          })
      };
      if (editingSeason) {
        updateDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, editingSeason.id), seasonData);
        toast({ title: t('success'), description: t('season_updated_desc', { seasonName: newSeasonName.trim() }) });
      } else {
        addDocumentNonBlocking(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), { ...seasonData, status: 'Not Started', createdAt: serverTimestamp() });
        toast({ title: t('success'), description: t('season_created_desc', { seasonName: newSeasonName.trim() }) });
      }
      setShowCreateSeason(false); 
      setNewSeasonName(''); 
      setNewSeasonFee(''); 
      setNewSponsorshipAmount(''); 
      setNewSeasonType('Single'); 
      setNewSeasonThemeKey('auto');
      setNewHybridMeetings(1); 
      setNewHasDivisions(false);
      setNewDivision1Name('Divisi 1');
      setNewDivision2Name('Divisi 2');
      setNewDivision2Format('Single');
      setNewDivision2HasPlayoff(false);
      setNewPromotionSpots(2);
      setNewRelegationSpots(2);
      setEditingSeason(null); 
      setDateRange({ from: undefined, to: undefined });
    }
  };
  
  const handleOpenEditDialog = () => { 
    if (activeSeason) { 
      setEditingSeason(activeSeason); 
      setNewSeasonName(activeSeason.name); 
      setNewSeasonFee(activeSeason.registrationFee || ''); 
      setNewSponsorshipAmount(activeSeason.sponsorshipAmount || ''); 
      setNewSeasonType(activeSeason.type || 'Single'); 
      setNewSeasonThemeKey(activeSeason.themeKey || 'auto');
      setNewHybridMeetings(activeSeason.hybridGroupMeetings || 1); 
      setNewHasDivisions(activeSeason.hasDivisions || false);
      setNewDivision1Name(activeSeason.division1Name || 'Divisi 1');
      setNewDivision2Name(activeSeason.division2Name || 'Divisi 2');
      setNewDivision2Format(activeSeason.division2Format || 'Single');
      setNewDivision2HasPlayoff(activeSeason.division2HasPlayoff ?? false);
      setNewPromotionSpots(activeSeason.promotionSpots ?? 2);
      setNewRelegationSpots(activeSeason.relegationSpots ?? 2);
      setDateRange({ from: activeSeason.startDate?.toDate(), to: activeSeason.endDate?.toDate() }); 
      setShowCreateSeason(true); 
    } 
  };
  const handleOpenCreateDialog = () => { 
    setEditingSeason(null); 
    setNewSeasonName(''); 
    setNewSeasonFee(''); 
    setNewSponsorshipAmount(''); 
    setNewSeasonType('Single'); 
    setNewSeasonThemeKey('auto');
    setNewHybridMeetings(1); 
    setNewHasDivisions(false);
    setNewDivision1Name('Divisi 1');
    setNewDivision2Name('Divisi 2');
    setNewDivision2Format('Single');
    setNewDivision2HasPlayoff(false);
    setNewPromotionSpots(2);
    setNewRelegationSpots(2);
    setDateRange({ from: undefined, to: undefined }); 
    setShowCreateSeason(true); 
  };

  const handleDeleteSeason = async () => {
    if (!firestore || !deletingSeason) return;
    try {
        const batch = writeBatch(firestore);
        const subcollections = ['leagueTable', 'matches', 'coopLeagueTable'];
        for (const sub of subcollections) {
            const snapshot = await getDocs(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${deletingSeason.id}/${sub}`));
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        batch.delete(doc(firestore, 'hallOfFame', deletingSeason.id));
        batch.delete(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, deletingSeason.id));
        await batch.commit();
        toast({ title: t('season_deleted_title'), description: t('season_deleted_desc', { seasonName: deletingSeason.name }) });
    } catch (error) { toast({ variant: 'destructive', title: t('deletion_failed_title'), description: t('season_deleted_error') }); }
    setDeletingSeason(null);
  };
  
  const handleDeleteEntry = () => {
    if (!firestore || !activeSeasonId || !deletingEntry) return;
    const collName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
    deleteDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${collName}`, deletingEntry.id));
    toast({ title: t('player_removed_title'), description: t('player_removed_desc', { playerName: deletingEntry.playerName }) });
    setDeletingEntry(null);
  };

  const handleRegisterPlayers = async (selectedPlayerIds: string[], targetDivision: 'div-1' | 'div-2' = 'div-1') => {
    if (!firestore || !activeSeasonId || !allPlayers) return;
    const playersToReg = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    const batch = writeBatch(firestore);
    playersToReg.forEach(player => {
        batch.set(doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`)), {
            playerId: player.id, 
            teamId: player.teamId, 
            playerName: player.name, 
            teamName: player.teamName,
            played: 0, 
            win: 0, 
            draw: 0, 
            loss: 0, 
            goalsFor: 0, 
            goalsAgainst: 0, 
            goalDifference: 0, 
            points: 0, 
            hasPaid: false,
            division: targetDivision,
        });
    });
    await batch.commit();
    const divLabel = targetDivision === 'div-2' ? (activeSeason?.division2Name || 'Divisi 2') : (activeSeason?.division1Name || 'Divisi 1');
    toast({ 
      title: t('success'), 
      description: `${playersToReg.length} atlet berhasil didaftarkan${activeSeason?.hasDivisions ? ` ke ${divLabel}` : ''}.` 
    });
    setShowRegisterPlayers(false);
  };

  const handleTogglePlayerDivision = async (entry: WithId<LeagueEntry>) => {
    if (!firestore || !activeSeasonId || activeSeason?.status !== 'Not Started') return;
    const nextDivision: 'div-1' | 'div-2' = entry.division === 'div-2' ? 'div-1' : 'div-2';
    try {
        const updateData: any = {
            division: nextDivision
        };

        // If Hybrid format, ensure player moving back to Div 1 has a group assigned (or balances groups)
        if (activeSeason.type === 'Hybrid' && nextDivision === 'div-1') {
          if (!entry.group) {
            // Count current groups in div-1 to balance
            const div1Pool = (singleLeagueTable || []).filter(p => p.id !== entry.id && p.division !== 'div-2');
            const countA = div1Pool.filter(p => p.group === 'A').length;
            const countB = div1Pool.filter(p => p.group === 'B').length;
            updateData.group = countA <= countB ? 'A' : 'B';
          }
        }

        await updateDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, entry.id), updateData);
        const divName = nextDivision === 'div-2' ? (activeSeason?.division2Name || 'Divisi 2') : (activeSeason?.division1Name || 'Divisi 1');
        toast({
            title: 'Divisi Diperbarui',
            description: `${entry.playerName} dipindahkan ke ${divName}.`
        });
    } catch (e) {
        console.error(e);
    }
  };

  const handleSavePairs = async (pairs: { player1: PlayerWithTeam; player2: PlayerWithTeam; teamId: string; teamName: string }[]) => {
    if (!firestore || !activeSeasonId) return;
    const batch = writeBatch(firestore);
    const targetCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`);
    const existingDocsSnap = await getDocs(targetCol);
    existingDocsSnap.forEach(doc => batch.delete(doc.ref));
    pairs.forEach(pair => {
        const tId = [pair.player1.id, pair.player2.id].sort().join('-');
        batch.set(doc(targetCol, tId), { 
            teamName: `${pair.player1.name} & ${pair.player2.name}`, 
            player1Id: pair.player1.id, 
            player1Name: pair.player1.name, 
            player1TeamId: pair.teamId || '', 
            player1TeamName: pair.teamName || '', 
            player1Goals: 0,
            player2Id: pair.player2.id, 
            player2Name: pair.player2.name, 
            player2TeamId: pair.teamId || '', 
            player2TeamName: pair.teamName || '', 
            player2Goals: 0,
            played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, hasPaid: false 
        });
    });
    batch.commit().then(() => { 
        toast({ title: 'Pasangan Disimpan!', description: `${pairs.length} tim Co-Op telah dibuat.` }); 
        setShowDrawDialog(false); 
        setShowManualPairingDialog(false);
    });
  };

  const handleSaveGroups = useCallback(async (groups: { groupA: any[], groupB: any[] }) => {
    if (!firestore || !activeSeasonId || !activeSeason) return;
    const batch = writeBatch(firestore);
    const isCoopHybrid = activeSeason.type === 'Co-Op Hybrid';
    const targetColName = isCoopHybrid ? 'coopLeagueTable' : 'leagueTable';
    const targetCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${targetColName}`);
    groups.groupA.forEach(player => batch.update(doc(targetCol, player.id), { group: 'A' }));
    groups.groupB.forEach(player => batch.update(doc(targetCol, player.id), { group: 'B' }));
    batch.commit().then(() => { toast({ title: 'Grup Disimpan!', description: 'Pembagian grup telah disimpan.' }); setShowGroupDrawDialog(false); });
  }, [firestore, activeSeasonId, activeSeason, toast]);

  const handleSaveTeamDraftResults = async (assignments: { entryId: string, teamId: string, teamName: string }[]) => {
    if (!firestore || !activeSeasonId) return;
    const batch = writeBatch(firestore);
    const targetColName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
    const targetCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${targetColName}`);
    
    // Only update valid entries that currently exist in the season
    const validEntryIds = new Set((participantEntries || []).map(p => p.id));
    const validAssignments = assignments.filter(a => validEntryIds.has(a.entryId));

    if (validAssignments.length === 0) {
      setShowTeamDraftDialog(false);
      return;
    }

    validAssignments.forEach(a => {
        const entryRef = doc(targetCol, a.entryId);
        if (isSeasonCoop) {
            batch.set(entryRef, {
                player1TeamId: a.teamId,
                player1TeamName: a.teamName,
                player2TeamId: a.teamId,
                player2TeamName: a.teamName
            }, { merge: true });
        } else {
            batch.set(entryRef, { teamId: a.teamId, teamName: a.teamName }, { merge: true });
        }
    });

    try {
      await batch.commit();
      toast({ title: 'Draft Tim Selesai!', description: 'Data tim pemain telah diperbarui.' });
      setShowTeamDraftDialog(false);
    } catch (err: any) {
      console.error("Error saving team draft assignments:", err);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan Tim', description: err.message || 'Terjadi kesalahan saat menyimpan draft.' });
    }
  };

  const handleRemovePlayerFromRegistration = useCallback((leagueEntryId: string, playerName: string) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    deleteDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId));
    toast({ title: t('player_removed_title'), description: t('player_removed_desc', { playerName }) });
  }, [firestore, activeSeasonId, isAdmin, toast, t]);

  const handleUpdateSeasonStatus = (status: 'In Progress' | 'Completed') => {
    if (!firestore || !activeSeason) return;
    if (status === 'Completed') { handleFinishSeason(); return; }
    updateDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id), { status });
    toast({ title: t('season_updated_title'), description: t('season_status_updated_desc', { status }) });
  };
  
   const handleFinishSeason = () => {
    if (!firestore || !activeSeason || sortedTable.length === 0) return;
    let winner = sortedTable[0];
    if (isHybrid) {
        const finalMatch = matches?.find(m => m.round === 'Grand-Final' && m.isCompleted);
        if (finalMatch) {
            const isBo3 = activeSeason.type === 'Co-Op' || activeSeason.type === 'Co-Op Hybrid' || (finalMatch.round && finalMatch.round !== 'Group');
            const s1 = isBo3 ? (finalMatch.player1Wins ?? 0) : (finalMatch.player1Score ?? 0);
            const s2 = isBo3 ? (finalMatch.player2Wins ?? 0) : (finalMatch.player2Score ?? 0);
            const wId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
            const wEntry = sortedTable.find(p => (p.playerId || p.id) === wId);
            if (wEntry) winner = wEntry;
        }
    }
    const wIdToFilter = isSeasonCoop ? winner.id : winner.playerId;
    const playerMatches = matches?.filter(m => m.isCompleted && (m.player1Id === wIdToFilter || m.player2Id === wIdToFilter)) || [];
    let totP = 0, totW = 0, totD = 0, totL = 0, totGF = 0, totGA = 0;
    playerMatches.forEach(m => {
        totP++; const isP1 = m.player1Id === wIdToFilter;
        const isBo3 = isSeasonCoop ? (m.round && m.round !== 'Group') : (m.round && m.round !== 'Group');
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);
        const pRes = isP1 ? s1 : s2; const oRes = isP1 ? s2 : s1;
        if (pRes > oRes) totW++; else if (pRes < oRes) totL++; else totD++;
        if (m.player1Score !== null && m.player2Score !== null) { totGF += isP1 ? m.player1Score : m.player2Score; totGA += isP1 ? m.player2Score : m.player1Score; }
    });
    const playersPlayed = sortedTable.filter(p => p.played > 0);
    let bAtt = null; let wDef = null;
    if (!isSeasonCoop) {
      const maxGF = Math.max(...playersPlayed.map(p => p.goalsFor || 0)); const bAttP = playersPlayed.find(p => p.goalsFor === maxGF && maxGF > 0); if (bAttP) bAtt = { playerName: bAttP.playerName, value: bAttP.goalsFor };
      const maxGA = Math.max(...playersPlayed.map(p => p.goalsAgainst || 0)); const wDefP = playersPlayed.find(p => p.goalsAgainst === maxGA && maxGA > 0); if (wDefP) wDef = { playerName: wDefP.playerName, value: wDefP.goalsAgainst };
    }
    const maxW = Math.max(...playersPlayed.map(p => p.win)); const mWinP = playersPlayed.find(p => p.win === maxW && maxW > 0);
    const seasonRec: SeasonRecord = {
        seasonId: activeSeason.id, seasonName: activeSeason.name, completedAt: Timestamp.now(), winnerPlayerId: winner.playerId || winner.id, winnerPlayerName: winner.playerName, winnerTeamName: winner.teamName,
        winnerPhotoUrl: winner.logoUrl || (winner as any).team?.logoUrl, 
        winnerStats: { points: winner.points, win: totW, draw: totD, loss: totL, goalsFor: totGF, goalsAgainst: totGA, goalDifference: totGF - totGA },
        funStats: { mostWins: mWinP ? { playerName: mWinP.playerName, value: mWinP.win } : null, bestAttacker: bAtt, worstDefender: wDef }
    };
    setDocumentNonBlocking(doc(firestore, `hallOfFame`, activeSeason.id), seasonRec, {});
    updateDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id), { status: 'Completed' });
    toast({ title: "Season Completed!", description: `${activeSeason.name} is finished.` });
  };

  const handleShareParticipants = () => {
    if (!activeSeason || !sortedTable || sortedTable.length === 0) return;
    const hdr = `*${t('share_participants_header', { seasonName: activeSeason.name })}*\n\n`;
    const pList = sortedTable.map((p, index) => `${index + 1}. ${p.playerName} (${p.teamName || 'Tanpa Tim'})`).join('\n');
    setShareText(hdr + pList); setShareDialogOpen(true);
  };
  
  const handlePaymentToggle = useCallback((leagueEntryId: string, currentStatus: boolean) => {
    if (!firestore || !activeSeasonId || !isAdmin || !activeSeason) return;
    const collName = isSeasonCoop ? 'coopLeagueTable' : 'leagueTable';
    updateDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${collName}`, leagueEntryId), { hasPaid: !currentStatus });
  }, [firestore, activeSeasonId, isAdmin, activeSeason, isSeasonCoop]);

  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    return `${format(activeSeason.startDate.toDate(), 'd LLL')} - ${format(activeSeason.endDate.toDate(), 'd LLL yyyy')}`;
  }, [activeSeason]);

  const { seasonProgress, completedMatchesCount } = useMemo(() => {
    if (!matches || matches.length === 0) return { seasonProgress: 0, completedMatchesCount: 0 };
    const completed = matches.filter(m => m.isCompleted).length;
    return { seasonProgress: (completed / matches.length) * 100, completedMatchesCount: completed };
  }, [matches]);

  const isLoadingTableFinal = isLoadingTable || isLoadingMatches || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;
  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);

  return (
    <div className="w-full">
      <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-6 sm:py-8 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
          <div 
            className="flex flex-col justify-between flex-1 w-full min-w-0 py-6 sm:py-8 px-4 sm:px-8 xl:px-10 relative overflow-hidden bg-[#0a0d14] backdrop-blur-3xl rounded-2xl sm:rounded-[2rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 min-w-0">
                <div className="space-y-3 min-w-0 flex-1">
                    {/* Top Telemetry Strip */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div 
                          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full backdrop-blur-md border shrink-0"
                          style={{ backgroundColor: `${theme.primaryHex}15`, borderColor: `${theme.primaryHex}40` }}
                        >
                            <div 
                              className="w-2 h-2 rounded-full animate-pulse" 
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            <span 
                              className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] italic"
                              style={{ color: theme.primaryHex }}
                            >
                              Live Match Centre
                            </span>
                        </div>
                        
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm max-w-full">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] font-mono text-white/60 truncate">
                              {theme.sysTag} • {theme.editionName}
                            </span>
                        </div>
                    </div>
                    
                    {/* Ultra Futuristic & Ultra Sport Dual-Tone Headline */}
                    <div className="relative min-w-0">
                      <h1 className="font-headline text-2xl xs:text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight uppercase italic leading-[1] flex flex-wrap items-baseline gap-x-2 sm:gap-x-6">
                          <span className="inline-block pb-0.5 sm:pb-1 headline-white-gradient break-words">
                              {t('league_standings_page_title').split(' ')[0]}
                          </span>
                          <span 
                            className="inline-block pb-0.5 sm:pb-1 break-words"
                            style={{ 
                              color: theme.primaryHex,
                            }}
                          >
                              {t('league_standings_page_title').split(' ').slice(1).join(' ')}
                          </span>
                      </h1>
                      {/* Aerodynamic Speed Conduit Line */}
                      <div 
                        className="h-[2px] w-28 sm:w-56 mt-1.5 sm:mt-2 rounded-full" 
                        style={{ 
                          background: `linear-gradient(to right, ${theme.primaryHex}, ${theme.secondaryHex}, transparent)`, 
                          boxShadow: `0 0 14px ${theme.glowRgba}` 
                        }} 
                      />
                    </div>
                </div>

                {activeSeason && (
                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
                        <Badge 
                          className="font-black tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs h-7 sm:h-8 px-3.5 sm:px-5 uppercase italic rounded-full backdrop-blur-md flex items-center gap-2 border shadow-lg shrink-0"
                          style={{ 
                            backgroundColor: `${theme.primaryHex}20`, 
                            color: theme.primaryHex, 
                            borderColor: `${theme.primaryHex}50`,
                            boxShadow: `0 0 20px ${theme.glowRgba}`
                          }}
                        >
                            <span 
                              className="w-1.5 h-1.5 rounded-full animate-ping" 
                              style={{ backgroundColor: theme.primaryHex }}
                            />
                            {activeSeason.status}
                        </Badge>
                        <div className="flex items-center gap-2 bg-white/[0.04] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/10 backdrop-blur-sm shadow-inner shrink-0">
                            <CalendarIcon className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primaryHex }} />
                            {formattedDateRange && <p className="text-[10px] sm:text-xs font-black text-white/70 uppercase tracking-wider sm:tracking-widest italic">{formattedDateRange}</p>}
                        </div>
                    </div>
                )}
            </div>

            {activeSeason && (
                <div className="relative z-10 pt-4 mt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 min-w-0">
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-3.5 sm:px-4 py-2 rounded-2xl backdrop-blur-sm min-w-0 flex-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: theme.primaryHex, boxShadow: `0 0 10px ${theme.glowRgba}` }}
                        />
                        <p className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight uppercase italic break-words min-w-0">
                          {activeSeason.name}
                        </p>
                    </div>
                    
                    {matches && matches.length > 0 && (
                        <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 space-y-2 bg-white/[0.02] border border-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 animate-pulse shrink-0" style={{ color: theme.primaryHex }} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/50">Season Progress</span>
                                </div>
                                <span className="text-xs font-black italic" style={{ color: theme.primaryHex }} suppressHydrationWarning>
                                  [{seasonProgress.toFixed(0)}%]
                                </span>
                            </div>
                            <div className="relative h-2 w-full bg-white/5 overflow-hidden rounded-full border border-white/5">
                                <div 
                                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out" 
                                  style={{ 
                                    width: `${seasonProgress}%`,
                                    background: `linear-gradient(to right, ${theme.secondaryHex}, ${theme.primaryHex})`,
                                    boxShadow: `0 0 15px ${theme.glowRgba}`
                                  }} 
                                />
                            </div>
                            <p className="text-[8px] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-white/30 italic text-right">
                                {completedMatchesCount} / {matches.length} PERTANDINGAN SELESAI
                            </p>
                        </div>
                    )}
                </div>
            )}
          </div>
          
          <div className="w-full lg:w-[380px] xl:w-[420px] flex items-stretch shrink-0">
            <LiveClock className="h-full" theme={theme} />
          </div>
        </div>

        <LiveScoreTicker activeSeasonId={activeSeasonId} teamsById={teamsById} playersById={playersById} isAdmin={isAdmin} theme={theme} />

        {/* ============================================================ */}
        {/* ULTRA SPORT & ULTRA FUTURISTIC COCKPIT COMMAND DECK          */}
        {/* ============================================================ */}
        <div 
          className={cn(
            "relative w-full rounded-3xl p-3.5 sm:p-5 transition-all duration-500",
            "bg-gradient-to-b from-[#0C111D]/95 via-[#070A12]/98 to-[#030508]/95",
            "border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl",
            "group/command-deck",
            isAdmin ? "w-full" : "w-full max-w-5xl mx-auto"
          )}
          style={{
            borderColor: `${theme.primaryHex}25`
          }}
        >
          {/* Top Edge High-Voltage Laser Tracer */}
          <div 
            className="absolute top-0 left-8 right-8 h-[2px] opacity-80 pointer-events-none" 
            style={{ 
              background: `linear-gradient(to right, transparent, ${theme.primaryHex}, transparent)`, 
              boxShadow: `0 0 20px ${theme.glowRgba}` 
            }}
          />

          {/* Ambient Background Glow on Hover */}
          <div 
            className="absolute -inset-1 rounded-[2.2rem] blur-2xl opacity-0 group-hover/command-deck:opacity-100 transition-opacity pointer-events-none" 
            style={{ 
              background: `linear-gradient(to right, ${theme.primaryHex}0D, transparent, ${theme.secondaryHex}0D)` 
            }}
          />

          {/* ------------------------------------------------------------ */}
          {/* TIER 1: COCKPIT CORE NAV & SECURITY DECK                     */}
          {/* ------------------------------------------------------------ */}
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            
            {/* Zone A: Unified Season Telemetry Capsule (Fixed width & no overlap) */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0 max-w-full">
              <div 
                className="flex items-center gap-2 bg-black/60 border rounded-2xl p-1.5 transition-all w-full sm:w-auto shadow-inner min-w-0"
                style={{ borderColor: `${theme.primaryHex}33` }}
              >
                {/* Scanner Icon with Telemetry Pulse */}
                <div 
                  className="p-2 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${theme.primaryHex}20`, color: theme.primaryHex }}
                >
                  <Scan className="w-4 h-4 animate-pulse" />
                </div>

                {/* Season Dropdown with clean width and truncation */}
                <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                  <SelectTrigger className="w-full sm:w-auto sm:min-w-[260px] max-w-full sm:max-w-[580px] lg:max-w-[700px] h-10 bg-transparent border-0 font-black uppercase italic tracking-tight text-xs text-white focus:ring-0 px-2.5 pr-8 whitespace-nowrap min-w-0">
                    <SelectValue placeholder={t('select_a_season')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#070B14]/98 border border-white/20 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                    {seasons?.map(season => (
                      <SelectItem key={season.id} value={season.id} className="font-black uppercase italic text-xs text-white/90 focus:bg-white/10 focus:text-white py-2.5 px-3 rounded-xl cursor-pointer">
                        {season.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Indicator Chip inside capsule */}
                {activeSeason && (
                  <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/5 shrink-0 ml-auto">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      activeSeason.status === 'In Progress' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" :
                      activeSeason.status === 'Completed' ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    )} />
                    <span className="text-[9px] font-black uppercase tracking-wider font-mono text-white/70">
                      {activeSeason.status === 'In Progress' ? 'ACTIVE' :
                       activeSeason.status === 'Completed' ? 'DONE' : 'STANDBY'}
                    </span>
                  </div>
                )}
              </div>

              {/* Season Management Micro-Dock (Integrated right beside capsule) */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-2xl shadow-inner shrink-0">
                  <Button 
                    onClick={() => withAdminCheck(handleOpenCreateDialog)} 
                    size="icon" 
                    className="h-10 w-10 rounded-xl transition-all shadow-md" 
                    style={{ backgroundColor: `${theme.primaryHex}20`, color: theme.primaryHex, borderColor: `${theme.primaryHex}40` }}
                    title="Tambah Musim Baru"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => withAdminCheck(handleOpenEditDialog)} 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.08] transition-all text-white/80 disabled:opacity-30" 
                    disabled={!activeSeason || activeSeason.status !== 'Not Started'} 
                    title="Edit Musim"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))} 
                    variant="destructive" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30" 
                    disabled={!activeSeason} 
                    title="Hapus Musim"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Zone B: Security & System Utility Pod */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto">
              
              {/* Admin Key Switcher */}
              <Button 
                onClick={() => {
                  if (isAdmin) {
                    setIsAdmin(false);
                    toast({ title: "ADMIN MODE LOCKED", description: "Otorisasi administratif telah dikunci kembali." });
                  } else {
                    setPasswordPrompt({ open: true, action: () => setIsAdmin(true) });
                  }
                }} 
                className={cn(
                  "h-11 px-5 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg font-headline italic border", 
                  isAdmin 
                    ? "text-black shadow-lg hover:brightness-110" 
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
                  borderColor: `${theme.primaryHex}44`
                }}
              >
                {isAdmin ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span>{isAdmin ? t('lock_admin') : t('unlock_admin')}</span>
              </Button>

              {/* Utility Sub-Dock (Share & Trophy) */}
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-2xl shadow-inner shrink-0">
                <Button 
                  onClick={handleShareParticipants} 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-primary/15 hover:text-primary hover:border-primary/40 transition-all text-white/70 disabled:opacity-30" 
                  disabled={!sortedTable || sortedTable.length === 0} 
                  title={t('share_participants')}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button 
                  asChild 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-yellow-500/20 hover:text-yellow-400 hover:border-yellow-500/40 transition-all text-white/70" 
                  title={t('view_champion')}
                >
                  <Link href={`/league/winner?seasonId=${activeSeasonId}`}>
                    <Trophy className="h-4 w-4 text-yellow-400" />
                  </Link>
                </Button>
              </div>
            </div>

          </div>

          {/* ------------------------------------------------------------ */}
          {/* TIER 2: TACTICAL MISSION RUNWAY (When Admin is Active)       */}
          {/* ------------------------------------------------------------ */}
          {isAdmin && activeSeason && (
            <div className="mt-4 pt-3.5 border-t border-white/10 relative z-10">
              
              {/* Telemetry Runway Micro-Header */}
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 font-mono">
                    TACTICAL_MISSION_CONTROLS // STEP_SEQUENCER
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 font-mono text-[9px]">
                  {activeSeason.type ? activeSeason.type.toUpperCase() : 'STANDARD'} LEAGUE FORMAT
                </span>
              </div>

              {/* Tournament Action Pipeline */}
              {activeSeason.status === 'Not Started' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  
                  {/* Step 01: Daftarkan Pemain */}
                  <Button 
                    onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} 
                    variant="outline" 
                    className="h-13 py-2 px-3.5 rounded-2xl bg-[#09101C] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all flex items-center justify-between group/action text-left shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-wider text-cyan-400/70 font-mono">STEP 01 // ROSTER</div>
                        <div className="text-[11px] font-black uppercase tracking-tight text-white font-headline italic">{t('register_players')}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-white/30 group-hover/action:text-cyan-400 transition-colors font-mono">
                      [01]
                    </div>
                  </Button>

                  {/* Step 02: Team Draft */}
                  <Button 
                    onClick={() => withAdminCheck(() => setShowTeamDraftDialog(true))} 
                    disabled={(participantEntries?.length ?? 0) < 2} 
                    variant="outline" 
                    className="h-13 py-2 px-3.5 rounded-2xl bg-[#140E05] border border-amber-500/35 hover:border-amber-400 hover:bg-amber-500/15 transition-all flex items-center justify-between group/action text-left shadow-[0_0_20px_rgba(245,158,11,0.12)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                        <Dices className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-wider text-amber-400/80 font-mono">STEP 02 // DRAFT</div>
                        <div className="text-[11px] font-black uppercase tracking-tight text-amber-300 font-headline italic">TEAM DRAFT</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-amber-500/50 group-hover/action:text-amber-400 transition-colors font-mono">
                      [02]
                    </div>
                  </Button>

                  {/* Step 03: Buat Jadwal */}
                  <Button 
                    onClick={() => withAdminCheck(() => setShowGenerateConfirm(true))} 
                    disabled={(participantEntries?.length ?? 0) < 2} 
                    variant="outline" 
                    className="h-13 py-2 px-3.5 rounded-2xl bg-[#0F0C1C] border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center justify-between group/action text-left shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-wider text-indigo-400/70 font-mono">STEP 03 // MATCHES</div>
                        <div className="text-[11px] font-black uppercase tracking-tight text-white font-headline italic truncate max-w-[130px]">
                          {hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-white/30 group-hover/action:text-indigo-400 transition-colors font-mono">
                      [03]
                    </div>
                  </Button>

                  {/* Step 04: Mulai Musim (Apex Launch Button) */}
                  <Button 
                    onClick={() => withAdminCheck(() => setShowStartSeasonConfirm(true))} 
                    className="h-13 py-2 px-4 rounded-2xl bg-primary text-black hover:bg-primary/90 shadow-[0_0_35px_rgba(204,253,1,0.45)] hover:shadow-[0_0_45px_rgba(204,253,1,0.65)] transition-all flex items-center justify-between group/action text-left border border-primary/50 disabled:opacity-40 disabled:hover:shadow-none" 
                    disabled={!hasFixtures || (sortedTable || []).length < 2}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-black text-primary flex items-center justify-center shrink-0 group-hover/action:scale-110 transition-transform shadow-md">
                        <Play className="h-4 w-4 fill-primary" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-wider text-black/70 font-mono">APEX STEP // LAUNCH</div>
                        <div className="text-[11px] font-black uppercase tracking-tight text-black font-headline italic">{t('start_season')}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-black/60 group-hover/action:translate-x-0.5 transition-transform font-mono">
                      [GO ▶]
                    </div>
                  </Button>

                </div>
              )}

              {/* Special Controls: Co-op & Hybrid (if applicable) */}
              {activeSeason.status === 'Not Started' && (isSeasonCoop || activeSeason.type === 'Hybrid') && (
                <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-white/40 font-mono mr-1">
                    FORMAT_EXTENSIONS:
                  </span>
                  {isSeasonCoop && (
                    <>
                      <Button 
                        onClick={() => withAdminCheck(() => setShowDrawDialog(true))} 
                        disabled={(individualPool?.length ?? 0) < 2} 
                        variant="outline" 
                        className="h-9 px-3.5 font-black text-[10px] uppercase tracking-wider rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Shuffle className="h-3.5 w-3.5 text-blue-400" />
                        UNDI PASANGAN
                      </Button>
                      <Button 
                        onClick={() => withAdminCheck(() => setShowManualPairingDialog(true))} 
                        disabled={(individualPool?.length ?? 0) < 2} 
                        variant="outline" 
                        className="h-9 px-3.5 font-black text-[10px] uppercase tracking-wider rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                        PASANG MANUAL
                      </Button>
                    </>
                  )}
                  {activeSeason.type === 'Hybrid' && (
                    <Button 
                      onClick={() => withAdminCheck(() => setShowGroupDrawDialog(true))} 
                      disabled={(participantEntries?.length ?? 0) < 2} 
                      variant="outline" 
                      className="h-9 px-3.5 font-black text-[10px] uppercase tracking-wider rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 transition-all flex items-center gap-1.5 text-white/80"
                    >
                      <Group className="h-3.5 w-3.5 text-primary" />
                      UNDI GRUP
                    </Button>
                  )}
                </div>
              )}

              {/* Tournament Action Pipeline: In Progress */}
              {activeSeason.status === 'In Progress' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isHybrid && groupStageMatches.length > 0 && !hasPlayoffs && (
                    <Button 
                      onClick={() => areGroupStageMatchesComplete ? withAdminCheck(handleGeneratePlayoffs) : withAdminCheck(() => setShowFinishGroupStageConfirm(true))} 
                      className="h-13 px-5 font-black text-[11px] uppercase tracking-wider rounded-2xl bg-gradient-to-r from-amber-400 via-primary to-amber-300 text-black shadow-[0_0_35px_rgba(245,158,11,0.4)] hover:brightness-110 transition-all flex items-center justify-between group/playoff font-headline italic"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-black text-amber-400 flex items-center justify-center shrink-0">
                          <Swords className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-[8px] font-black uppercase tracking-wider text-black/70 font-mono">KNOCKOUT PHASE</div>
                          <div className="text-xs font-black uppercase tracking-tight">START PLAYOFF ROUND</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-black/70 font-mono">[PLAYOFF ▶]</div>
                    </Button>
                  )}
                  <Button 
                    onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))} 
                    variant="destructive" 
                    className="h-13 px-5 font-black text-[11px] uppercase tracking-wider rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all flex items-center justify-between group/finish font-headline italic shadow-sm hover:shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 group-hover/finish:bg-white group-hover/finish:text-red-500 flex items-center justify-center shrink-0 transition-colors">
                        <Flag className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-wider text-red-400/80 group-hover/finish:text-white/80 font-mono">SEASON FINALE</div>
                        <div className="text-xs font-black uppercase tracking-tight">{t('finish_season')}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-red-400/70 group-hover/finish:text-white font-mono">[FINISH 🏁]</div>
                  </Button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {(() => {
        const isDiv2Active = activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged && selectedDivision === 'div-2';
        const activeDivisionTable = activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged
          ? sortedTable.filter(e => selectedDivision === 'div-2' ? e.division === 'div-2' : e.division !== 'div-2')
          : sortedTable;
        const currentTableForWidth = (activeDivisionTable && activeDivisionTable.length > 0) ? activeDivisionTable : sortedTable;
        const activeDivisionFormat = isDiv2Active ? (activeSeason?.division2Format || 'Single') : (activeSeason?.type || 'Single');
        const formatHasPlayoff = isDiv2Active 
          ? (!!activeSeason?.division2HasPlayoff && (activeDivisionFormat === 'Single Hybrid' || activeDivisionFormat === 'Hybrid' || activeDivisionFormat === 'Co-Op Hybrid'))
          : (activeDivisionFormat === 'Single Hybrid' || activeDivisionFormat === 'Hybrid' || activeDivisionFormat === 'Co-Op Hybrid');
        const isPlayoffActive = activeLeagueTab === 'playoff' && formatHasPlayoff;

        return (
          <div className={cn(
            "w-full mx-auto px-2 sm:px-4 pb-8 transition-all duration-700 ease-in-out mt-6", 
            isPlayoffActive 
              ? "w-full max-w-[100vw] xl:max-w-[98vw] 2xl:max-w-[96vw] px-1 sm:px-3 xl:px-6" 
              : "w-full max-w-[92rem]"
          )}>
            <div className="space-y-8 sm:space-y-12">
                <div className="w-full">
                    <LeagueTable 
                        tableData={sortedTable} 
                        isLoading={isLoadingTableFinal}
                        onRemovePlayer={(entry) => withAdminCheck(() => setDeletingEntry(entry))}
                        onToggleDivision={(entry) => withAdminCheck(() => handleTogglePlayerDivision(entry))}
                        onSelectPlayer={setSelectedPlayerForStats}
                        seasonStatus={activeSeason?.status}
                        seasonType={activeSeason?.type}
                        isAdmin={isAdmin}
                        defendingChampionId={defendingChampionId}
                        matches={matches || []}
                        playersById={playersById}
                        teamsById={teamsById}
                        activeSeason={activeSeason}
                        activeTab={activeLeagueTab}
                        onTabChange={setActiveLeagueTab}
                        selectedDivision={selectedDivision}
                        onDivisionChange={(div) => {
                          setSelectedDivision(div);
                          if (div === 'div-2') {
                            setActiveLeagueTab('standings');
                          } else {
                            if (activeSeason?.type === 'Hybrid') {
                              setActiveLeagueTab('group_a');
                            } else {
                              setActiveLeagueTab('standings');
                            }
                          }
                        }}
                    />
                </div>
                
                <div className="space-y-6 sm:space-y-8">
                    <div className="flex flex-col gap-1 items-center justify-center">
                        <h2 className="font-black text-lg sm:text-2xl uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary italic pr-4 text-center">Season Insights & Management</h2>
                        <div className="h-1 w-16 sm:w-20 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                        <div className="lg:col-span-8"><LeagueStats tableData={currentTableForWidth} isLoading={isLoadingTable || isLoadingPlayers} seasonType={activeDivisionFormat} /></div>
                        <div className="lg:col-span-4">
                            {activeSeason?.registrationFee && (participantEntries || []).length > 0 && (
                                <Card className="group relative overflow-hidden transition-all duration-700 border-2 border-yellow-500/30 bg-gradient-to-b from-[#0D111A]/98 via-[#070A12]/98 to-[#030508]/98 backdrop-blur-3xl rounded-[2.5rem] p-0 hover:border-yellow-400/60 shadow-[0_20px_60px_rgba(0,0,0,0.8)] hover:shadow-[0_0_80px_rgba(250,204,21,0.2)]">
                                
                                {/* Top Edge Metallic Gold Tracer */}
                                <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80 shadow-[0_0_20px_rgba(250,204,21,0.9)] pointer-events-none" />

                                {/* Solid Cyber Header */}
                                <div className="py-3 px-6 sm:px-7 flex items-center justify-between overflow-hidden shrink-0 bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 text-black shadow-md">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="bg-black/20 p-1.5 rounded-xl border border-black/15 shadow-inner shrink-0">
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm sm:text-base font-black tracking-tight uppercase italic leading-none font-headline">Financial Hub</h3>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 sm:p-7 space-y-5 relative overflow-hidden">
                                    {/* Giant Accumulated Prize Matrix */}
                                    <div className="bg-black/60 border border-yellow-400/25 p-5 rounded-3xl text-center space-y-3 relative overflow-hidden shadow-inner group/pool">
                                        <div className="absolute -inset-1 bg-yellow-400/5 rounded-3xl blur-xl opacity-50 pointer-events-none" />
                                        
                                        <div className="flex items-center justify-center gap-1.5 text-yellow-400/80">
                                            <Zap className="w-3.5 h-3.5 fill-yellow-400 animate-pulse" />
                                            <p className="text-[9px] font-black tracking-[0.25em] uppercase font-mono">PRIZE_MATRIX_ACCUMULATED</p>
                                        </div>

                                        <p className="text-3xl sm:text-4xl font-black text-yellow-400 italic font-headline drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] tabular-nums leading-none" suppressHydrationWarning>
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prizePool)}
                                        </p>

                                        {/* Breakdown Chips */}
                                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-white/5 font-mono">
                                            <span className="text-[9px] font-black px-2.5 py-1 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-300">
                                                REG: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(registrationPool)}
                                            </span>
                                            {sponsorshipPool > 0 && (
                                                <span className="text-[9px] font-black px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                                    SPON: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sponsorshipPool)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Payment Quota Battery Progress */}
                                        <div className="pt-2 space-y-2">
                                          <div className="flex justify-between items-center text-[9px] font-black uppercase font-mono px-1">
                                            <span className="text-white/50 flex items-center gap-1">
                                              <Activity className="w-3 h-3 text-yellow-400" />
                                              PAYMENT QUOTA:
                                            </span>
                                            <span className="text-yellow-400 font-bold" suppressHydrationWarning>
                                              {participantEntries?.filter(p => p.hasPaid).length} / {participantEntries?.length} UNITS [{Math.round(((participantEntries?.filter(p => p.hasPaid).length || 0) / (participantEntries?.length || 1)) * 100)}%]
                                            </span>
                                          </div>
                                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                                            <div 
                                              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.8)] transition-all duration-500" 
                                              style={{ width: `${((participantEntries?.filter(p => p.hasPaid).length || 0) / (participantEntries?.length || 1)) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                    </div>

                                    {/* Verification Log Filter & Search */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                          <Receipt className="w-4 h-4 text-yellow-400" />
                                          <h4 className="text-[10px] font-black uppercase italic tracking-widest text-white font-headline">Unit Verification Log</h4>
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
                                          <button
                                            type="button"
                                            onClick={() => setFinancialFilter('all')}
                                            className={cn(
                                              "px-2 py-0.5 text-[8px] font-black uppercase font-mono rounded-lg transition-all",
                                              financialFilter === 'all' ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"
                                            )}
                                          >
                                            ALL ({participantEntries?.length || 0})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setFinancialFilter('paid')}
                                            className={cn(
                                              "px-2 py-0.5 text-[8px] font-black uppercase font-mono rounded-lg transition-all",
                                              financialFilter === 'paid' ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"
                                            )}
                                          >
                                            LUNAS ({participantEntries?.filter(p => p.hasPaid).length || 0})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setFinancialFilter('unpaid')}
                                            className={cn(
                                              "px-2 py-0.5 text-[8px] font-black uppercase font-mono rounded-lg transition-all",
                                              financialFilter === 'unpaid' ? "bg-yellow-400 text-black" : "text-white/40 hover:text-white"
                                            )}
                                          >
                                            BELUM ({participantEntries?.filter(p => !p.hasPaid).length || 0})
                                          </button>
                                        </div>
                                      </div>

                                      {/* Search Bar for Participants */}
                                      <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <Input 
                                          placeholder="Filter unit atlet..."
                                          value={financialSearch}
                                          onChange={(e) => setFinancialSearch(e.target.value)}
                                          className="h-8 pl-8 pr-8 bg-black/40 border-white/10 hover:border-yellow-400/40 focus:border-yellow-400 rounded-xl text-[10px] text-white uppercase placeholder:normal-case placeholder:text-white/30"
                                        />
                                        {financialSearch && (
                                          <button type="button" onClick={() => setFinancialSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* High-Density Banking Smartcard List */}
                                      <ScrollArea className="h-[380px] sm:h-[460px] pr-2">
                                        <div className="space-y-2">
                                          {(participantEntries || [])
                                            .filter(player => {
                                              if (financialFilter === 'paid' && !player.hasPaid) return false;
                                              if (financialFilter === 'unpaid' && player.hasPaid) return false;
                                              if (financialSearch.trim()) {
                                                const q = financialSearch.toLowerCase().trim();
                                                const type = activeSeason?.type || 'Single';
                                                const isPlayerCoop = type === 'Co-Op' || type === 'Co-Op Hybrid';
                                                const name = isPlayerCoop ? player.teamName : player.playerName;
                                                const teamName = isPlayerCoop ? player.player1TeamName : player.teamName;
                                                return (name && name.toLowerCase().includes(q)) || (teamName && teamName.toLowerCase().includes(q));
                                              }
                                              return true;
                                            })
                                            .map((player, idx) => {
                                              const type = activeSeason?.type || 'Single';
                                              const isPlayerCoop = type === 'Co-Op' || type === 'Co-Op Hybrid';
                                              const teamId = isPlayerCoop ? player.player1TeamId : player.teamId;
                                              const name = isPlayerCoop ? player.teamName : player.playerName;
                                              const teamName = isPlayerCoop ? player.player1TeamName : player.teamName;
                                              const team = teamsById[teamId];
                                              const teamLogo = resolveLogo(team?.logoUrl, teamId, name);

                                              return (
                                                <div 
                                                  key={player.id} 
                                                  className={cn(
                                                    "flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 group/item relative overflow-hidden",
                                                    player.hasPaid 
                                                      ? "bg-yellow-400/[0.08] border-yellow-400/35 shadow-[0_0_15px_rgba(250,204,21,0.08)]" 
                                                      : "bg-black/40 border-white/5 hover:border-white/20"
                                                  )}
                                                >
                                                  <div className={cn(
                                                    "absolute left-0 top-0 bottom-0 w-1 transition-all",
                                                    player.hasPaid ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" : "bg-transparent"
                                                  )} />

                                                  <div className="flex items-center gap-2.5 overflow-hidden pl-1.5 min-w-0">
                                                    <span className="text-[9px] font-mono font-bold text-white/30 w-4 shrink-0">
                                                      #{idx + 1}
                                                    </span>

                                                    <Avatar className={cn(
                                                      "h-9 w-9 rounded-xl border transition-all shrink-0",
                                                      player.hasPaid ? "border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]" : "border-white/10"
                                                    )}>
                                                      <AvatarImage key={teamLogo} src={teamLogo} alt={name} className="object-cover" referrerPolicy="no-referrer" />
                                                      <AvatarFallback className="bg-black/40 font-black text-xs text-white/40">
                                                        {name ? name.substring(0, 2).toUpperCase() : 'U'}
                                                      </AvatarFallback>
                                                    </Avatar>

                                                    <div className="min-w-0 text-left">
                                                      <div className={cn(
                                                        "text-xs font-black uppercase italic truncate font-headline transition-colors",
                                                        player.hasPaid ? "text-yellow-300" : "text-white"
                                                      )} suppressHydrationWarning>
                                                        {name}
                                                      </div>
                                                      <div className="text-[8px] font-mono text-white/40 truncate" suppressHydrationWarning>
                                                        {teamName || 'Independent'}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <Badge 
                                                      variant="outline" 
                                                      className={cn(
                                                        "text-[8px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-lg border transition-all",
                                                        player.hasPaid 
                                                          ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-300" 
                                                          : "border-white/10 bg-black/40 text-white/30"
                                                      )}
                                                      suppressHydrationWarning
                                                    >
                                                      {player.hasPaid ? "VERIFIED" : "PENDING"}
                                                    </Badge>

                                                    <Checkbox 
                                                      id={`paid-${player.id}`} 
                                                      checked={!!player.hasPaid} 
                                                      onCheckedChange={() => handlePaymentToggle(player.id, !!player.hasPaid)} 
                                                      disabled={!isAdmin} 
                                                      className={cn(
                                                        "h-5 w-5 rounded-md border transition-all",
                                                        player.hasPaid 
                                                          ? "border-yellow-400 bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                                                          : "border-white/20 bg-black/40 hover:border-yellow-400/40"
                                                      )} 
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
      );
    })()}

      {/* ============================================================ */}
      {/* 4. POPOUT: BUKA KUNCI ADMIN (BIOMETRIC / CYBER KEY MATRIX)    */}
      {/* ============================================================ */}
      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent className="max-w-[94vw] sm:max-w-md p-0 overflow-hidden border-2 border-primary/40 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.3)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.9)] pointer-events-none" />
          
          <div className="p-6 sm:p-7 space-y-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.3)] shrink-0">
                  <KeyRound className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                    {t('admin_auth')}
                  </DialogTitle>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80 font-mono">
                    SECURITY_PROTOCOL // LEVEL_4_ACCESS
                  </p>
                </div>
              </div>
              <DialogDescription className="text-xs text-white/50 font-mono leading-relaxed pt-1">
                {t('admin_auth_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="password-input" className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 font-mono">
                ENCRYPTED_SECURITY_KEY
              </Label>
              <div className="relative group/input">
                <Input 
                  id="password-input" 
                  type="password" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)} 
                  placeholder="••••••••"
                  className="h-13 bg-black/60 border border-white/10 group-hover/input:border-primary/40 focus:border-primary rounded-2xl text-xl font-mono font-black text-primary px-4 tracking-[0.3em] transition-all shadow-inner" 
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} 
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col pt-1">
              <Button 
                onClick={handlePasswordCheck} 
                className="w-full h-12 font-headline font-black tracking-wider text-xs uppercase italic rounded-2xl shadow-[0_0_30px_rgba(204,253,1,0.45)] text-black bg-primary hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>AUTHORIZE PROTOCOL // BUKA ADMIN</span>
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">
              {editingSeason ? t('edit_season') : t('create_new_season')}
            </DialogTitle>
            <DialogTitle className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">
              {editingSeason ? t('edit_season_desc') : t('create_season_desc')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2 max-h-[calc(85vh-160px)]">
            <div className="space-y-4 sm:space-y-5 pb-2">
              {/* Competition Format */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Format Liga</Label>
                <RadioGroup defaultValue={newSeasonType} onValueChange={(value) => setNewSeasonType(value as Season['type'])} className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Single" id="single"/>
                    <Label htmlFor="single" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Single (1v1)</Label>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Single Hybrid" id="single-hybrid"/>
                    <Label htmlFor="single-hybrid" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer text-primary">Single Hybrid (8 Besar)</Label>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Co-Op" id="co-op"/>
                    <Label htmlFor="co-op" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Co-Op (2v2)</Label>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Hybrid" id="hybrid"/>
                    <Label htmlFor="hybrid" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Hybrid Indiv (Grup)</Label>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <RadioGroupItem value="Co-Op Hybrid" id="co-op-hybrid"/>
                    <Label htmlFor="co-op-hybrid" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Hybrid Co-Op</Label>
                  </div>
                </RadioGroup>
              </div>

              {(newSeasonType === 'Hybrid' || newSeasonType === 'Co-Op Hybrid' || newSeasonType === 'Single Hybrid') && (
                <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary">Pertemuan Fase Grup</Label>
                    <span className="text-[9px] font-mono text-white/50">
                      {newHybridMeetings === 1 ? '1x Main (Single Round-Robin)' : '2x Main (Home & Away)'}
                    </span>
                  </div>
                  <RadioGroup value={newHybridMeetings.toString()} onValueChange={(value) => setNewHybridMeetings(parseInt(value) as 1 | 2)} className="flex gap-2 sm:gap-4">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="1" id="meetings-1"/>
                      <Label htmlFor="meetings-1" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">1x Main</Label>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="2" id="meetings-2"/>
                      <Label htmlFor="meetings-2" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">2x (H&A)</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Multi-Division Tiering Section */}
              {newSeasonType !== 'Co-Op' && newSeasonType !== 'Co-Op Hybrid' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-primary/25 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="division-toggle" className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-primary cursor-pointer">
                          Sistem 2 Divisi (Tiering)
                        </Label>
                        <Badge className="bg-primary/20 text-primary border-primary/40 text-[8px] font-mono font-bold px-1.5 py-0">
                          PROMOSI & DEGRADASI
                        </Badge>
                      </div>
                      <p className="text-[9px] text-white/50 font-mono mt-0.5">
                        Aktifkan untuk membagi musim kompetisi ke Divisi 1 dan Divisi 2
                      </p>
                    </div>
                    <Switch
                      id="division-toggle"
                      checked={newHasDivisions}
                      onCheckedChange={setNewHasDivisions}
                    />
                  </div>

                  {newHasDivisions && (
                    <div className="pt-2 border-t border-white/10 space-y-3 animate-in fade-in-50 duration-300">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-1">
                          <Label className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-white/70">
                            Nama Divisi 1
                          </Label>
                          <Input 
                            value={newDivision1Name} 
                            onChange={(e) => setNewDivision1Name(e.target.value)} 
                            placeholder="e.g. Divisi 1 / Liga Utama" 
                            className="h-9 font-bold text-xs uppercase"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-400">
                            Nama Divisi 2
                          </Label>
                          <Input 
                            value={newDivision2Name} 
                            onChange={(e) => setNewDivision2Name(e.target.value)} 
                            placeholder="e.g. Divisi 2 / Challenger" 
                            className="h-9 font-bold text-xs uppercase"
                          />
                        </div>
                      </div>

                      {/* Playoff Configuration for Divisi 2 */}
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="div2-playoff-toggle" className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 cursor-pointer">
                              Playoff Divisi 2
                            </Label>
                            <p className="text-[8px] sm:text-[9px] text-white/50 font-mono">
                              {newDivision2HasPlayoff ? 'Gunakan Playoff (Fase grup 1x main lalu lanjut babak gugur)' : 'Tanpa Playoff (Murni liga penuh 2x main Home & Away)'}
                            </p>
                          </div>
                          <Switch
                            id="div2-playoff-toggle"
                            checked={newDivision2HasPlayoff}
                            onCheckedChange={setNewDivision2HasPlayoff}
                          />
                        </div>
                        
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setNewDivision2HasPlayoff(false)}
                            className={cn(
                              "flex-1 py-1 px-2 rounded-lg text-[9px] font-mono font-bold uppercase transition-all border",
                              !newDivision2HasPlayoff 
                                ? "bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm" 
                                : "bg-black/30 text-white/40 border-white/5 hover:text-white/70"
                            )}
                          >
                            Tanpa Playoff (Murni Liga)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewDivision2HasPlayoff(true)}
                            className={cn(
                              "flex-1 py-1 px-2 rounded-lg text-[9px] font-mono font-bold uppercase transition-all border",
                              newDivision2HasPlayoff 
                                ? "bg-amber-400 text-black font-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)]" 
                                : "bg-black/30 text-white/40 border-white/5 hover:text-white/70"
                            )}
                          >
                            Gunakan Playoff
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-1">
                          <Label className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-rose-400">
                            Kuota Degradasi (Div 1)
                          </Label>
                          <Input 
                            type="number"
                            min={1}
                            max={16}
                            value={newRelegationSpots} 
                            onChange={(e) => setNewRelegationSpots(parseInt(e.target.value) || 2)} 
                            className="h-9 font-bold text-xs tabular-nums"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-400">
                            Kuota Promosi (Div 2)
                          </Label>
                          <Input 
                            type="number"
                            min={1}
                            max={16}
                            value={newPromotionSpots} 
                            onChange={(e) => setNewPromotionSpots(parseInt(e.target.value) || 2)} 
                            className="h-9 font-bold text-xs tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[9px] font-mono leading-relaxed flex items-start gap-2">
                        <span className="shrink-0 font-bold">💡 Note:</span>
                        <span>Jika pendaftar Divisi 2 hanya 1 atau 2 pemain, sistem saat membuat jadwal akan otomatis menggabungkannya ke Divisi 1. Jika minimal 3 pemain, kompetisi terpisah tetap dijalankan.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="season-name" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{t('season_name')}</Label>
                <Input id="season-name" placeholder="e.g., Season 4 Elite" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} className="h-10 sm:h-12 uppercase font-bold text-sm sm:text-sm"/>
              </div>

              {/* Theme Season Selector */}
              <div className="space-y-2.5 sm:space-y-3 p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white">
                      Tema Tampilan Season
                    </Label>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-mono uppercase border-white/20 text-white/60">
                    The International Style
                  </Badge>
                </div>
                
                <p className="text-[8.5px] sm:text-[9px] text-white/50 font-mono">
                  Pilih nuansa warna neon dan aura visual The International (TI) untuk liga ini, atau gunakan Auto untuk deteksi nama otomatis.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                  {/* Option: Auto / Nama Season */}
                  <button
                    type="button"
                    onClick={() => setNewSeasonThemeKey('auto')}
                    className={cn(
                      "relative p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between overflow-hidden",
                      newSeasonThemeKey === 'auto'
                        ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(204,253,1,0.25)] ring-1 ring-primary"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-white">
                        ⚡ Otomatis
                      </span>
                      {newSeasonThemeKey === 'auto' && (
                        <Check className="w-3 h-3 text-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-[7.5px] font-mono text-white/50">
                      Ikuti nama season
                    </span>
                    <div className="mt-2 h-1 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-60" />
                  </button>

                  {/* Curated TI Themes */}
                  {AVAILABLE_SEASON_THEMES.map((themeOpt) => {
                    const isSelected = newSeasonThemeKey === themeOpt.key;
                    return (
                      <button
                        key={themeOpt.key}
                        type="button"
                        onClick={() => setNewSeasonThemeKey(themeOpt.key)}
                        className={cn(
                          "relative p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between overflow-hidden group",
                          isSelected
                            ? "shadow-lg ring-1"
                            : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                        )}
                        style={{
                          borderColor: isSelected ? themeOpt.primaryHex : undefined,
                          backgroundColor: isSelected ? `${themeOpt.primaryHex}18` : undefined,
                          boxShadow: isSelected ? `0 0 16px ${themeOpt.primaryHex}44` : undefined
                        }}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span 
                              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: themeOpt.primaryHex }}
                            />
                            <span className="text-[9.5px] font-black uppercase tracking-wider truncate text-white">
                              {themeOpt.name}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3 h-3 shrink-0" style={{ color: themeOpt.primaryHex }} />
                          )}
                        </div>
                        <span className="text-[7.5px] font-mono text-white/50 truncate">
                          {themeOpt.colorName}
                        </span>
                        <div 
                          className={cn("mt-2 h-1 w-full rounded-full bg-gradient-to-r", themeOpt.previewGradient)}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="season-fee" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Biaya (IDR)</Label>
                  <Input id="season-fee" type="number" placeholder="e.g., 15000" value={newSeasonFee} onChange={(e) => setNewSeasonFee(e.target.value)} className="h-10 sm:h-12 font-bold tabular-nums text-xs sm:text-sm"/>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="sponsorship-amount" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Sponsor (IDR)</Label>
                  <Input id="sponsorship-amount" type="number" placeholder="e.g., 500000" value={newSponsorshipAmount} onChange={(e) => setNewSponsorshipAmount(e.target.value)} className="h-10 sm:h-12 font-bold tabular-nums text-xs sm:text-sm"/>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{t('date_range')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-bold h-10 sm:h-12 uppercase text-[10px] sm:text-xs", !dateRange.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {dateRange.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} -{" "}{format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>{t('pick_a_date_range')}</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} numberOfMonths={1} className="rounded-xl border-white/10"/>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 shrink-0">
            <Button onClick={handleSeasonDialogSubmit} className="w-full h-12 sm:h-14 text-sm sm:text-lg font-black tracking-tighter uppercase italic shadow-[0_10px_20px_rgba(204,253,1,0.2)]">
              {editingSeason ? t('save_changes') : t('create_season')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSeason} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('remove_player_from_season_title')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('remove')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showFinishSeasonConfirm} onOpenChange={(open) => setShowFinishSeasonConfirm(open)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Tindakan ini akan selesaikan musim <strong>{activeSeason?.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Ya, Selesaikan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">Selesaikan Fase Grup?</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan format Playoff akan dibuat.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleGeneratePlayoffs} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Lanjutkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      {/* ============================================================ */}
      {/* 2. POPOUT: BUAT JADWAL (FIXTURE MATRIX GENERATOR HUD)         */}
      {/* ============================================================ */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent className="max-w-[94vw] sm:max-w-md p-0 overflow-hidden border-2 border-indigo-500/40 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_90px_rgba(99,102,241,0.3)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.9)] pointer-events-none" />
          
          <div className="p-6 sm:p-7 space-y-5">
            <AlertDialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
                  <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                    Fixture Generator <span className="text-indigo-400">Matrix</span>
                  </AlertDialogTitle>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-400/80 font-mono">
                    RADAR_CALIBRATION // MISSION_DISPATCH
                  </p>
                </div>
              </div>
              <AlertDialogDescription className="text-xs text-white/50 font-mono leading-relaxed pt-1">
                Tindakan ini akan menggenerasikan seluruh jadwal pertandingan liga secara otomatis dan acak.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Telemetry Status Pod */}
            <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl space-y-2 font-mono text-[10px]">
              <div className="flex justify-between items-center text-white/50">
                <span>TARGET_EDITION:</span>
                <span className="text-white font-bold">{activeSeason?.name}</span>
              </div>
              <div className="flex justify-between items-center text-white/50">
                <span>COMPETITION_FORMAT:</span>
                <span className="text-indigo-400 font-bold uppercase">{activeSeason?.type || 'Single'}</span>
              </div>
              <div className="flex justify-between items-center text-white/50">
                <span>ROSTER_REGISTERED:</span>
                <span className="text-primary font-bold">{participantEntries?.length || 0} Atlet</span>
              </div>
              {hasFixtures && (
                <div className="pt-2 border-t border-red-500/20 text-red-400 flex items-center gap-1.5 text-[9px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>PERINGATAN: Jadwal lama akan di-reset dan ditimpa!</span>
                </div>
              )}
            </div>

            <AlertDialogFooter className="flex-row gap-2 pt-1">
              <AlertDialogCancel className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white transition-all">
                BATALKAN // STANDBY
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleGenerateFixtures} 
                className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>GENERATE FIXTURES</span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* 3. POPOUT: MULAI MUSIM (APEX LAUNCH CONFIRMATION)             */}
      {/* ============================================================ */}
      <AlertDialog open={showStartSeasonConfirm} onOpenChange={setShowStartSeasonConfirm}>
        <AlertDialogContent className="max-w-[94vw] sm:max-w-md p-0 overflow-hidden border-2 border-primary/50 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_100px_rgba(204,253,1,0.4)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.9)] pointer-events-none" />
          
          <div className="p-6 sm:p-7 space-y-5">
            <AlertDialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shadow-[0_0_25px_rgba(204,253,1,0.4)] shrink-0">
                  <Play className="w-5 h-5 fill-primary" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                    Apex Launch <span className="text-primary">Countdown</span>
                  </AlertDialogTitle>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80 font-mono">
                    LIGHTS_OUT_AND_AWAY_WE_GO // ACTIVATION
                  </p>
                </div>
              </div>
              <AlertDialogDescription className="text-xs text-white/50 font-mono leading-relaxed pt-1">
                Apakah Anda siap mengaktifkan musim <strong>{activeSeason?.name}</strong>? Status kompetisi akan beralih ke <strong>IN PROGRESS</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Launch Checklist */}
            <div className="p-3.5 bg-black/60 border border-white/10 rounded-2xl space-y-2 font-mono text-[10px]">
              <div className="flex items-center justify-between text-white/60">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> ROSTER_VERIFIED:</span>
                <span className="text-primary font-bold">{participantEntries?.length || 0} Atlet Terdaftar</span>
              </div>
              <div className="flex items-center justify-between text-white/60">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> FIXTURES_LOCKED:</span>
                <span className="text-primary font-bold">{matches?.length || 0} Pertandingan</span>
              </div>
              <div className="flex items-center justify-between text-white/60">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> LEAGUE_TABLE:</span>
                <span className="text-primary font-bold">Inisialisasi Standings 0 PTS</span>
              </div>
            </div>

            <AlertDialogFooter className="flex-row gap-2 pt-1">
              <AlertDialogCancel className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white transition-all">
                STANDBY // BATAL
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  handleUpdateSeasonStatus('In Progress');
                  setShowStartSeasonConfirm(false);
                }} 
                className="flex-1 h-12 font-headline font-black uppercase tracking-wider text-xs italic rounded-2xl bg-primary hover:bg-primary/90 text-black shadow-[0_0_35px_rgba(204,253,1,0.6)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>APEX LAUNCH // GO ▶</span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================ */}
      {/* 1. POPOUT: DAFTARKAN PEMAIN (ROSTER INTAKE COCKPIT)           */}
      {/* ============================================================ */}
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-[96vw] sm:max-w-xl p-0 overflow-hidden border-2 border-primary/40 bg-[#070B14]/98 backdrop-blur-3xl rounded-3xl shadow-[0_0_90px_rgba(204,253,1,0.25)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(204,253,1,0.9)] pointer-events-none" />
          
          <div className="p-5 sm:p-7 space-y-4">
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/40 text-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,253,1,0.3)] shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight font-headline text-white">
                    Registrasi Skuad <span className="text-primary">Pemain</span>
                  </DialogTitle>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80 font-mono">
                    ROSTER_REGISTRATION // {activeSeason?.name}
                  </p>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Daftarkan atlet ke dalam turnamen {activeSeason?.name}
              </DialogDescription>
            </DialogHeader>

            <RegisterPlayersForm 
              allPlayers={allPlayers || []} 
              registeredPlayers={individualPool || []} 
              onRegister={handleRegisterPlayers} 
              isLoading={isLoadingPlayers} 
              hasDivisions={activeSeason?.hasDivisions}
              division1Name={activeSeason?.division1Name}
              division2Name={activeSeason?.division2Name}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CoopDrawDialog open={showDrawDialog} onOpenChange={setShowDrawDialog} season={activeSeason} registeredPlayers={individualPool || []} allPlayers={allPlayers || []} onSavePairs={handleSavePairs} isAdmin={isAdmin} onRemovePlayer={handleRemovePlayerFromRegistration} />
      <CoopManualPairingDialog open={showManualPairingDialog} onOpenChange={setShowManualPairingDialog} season={activeSeason} registeredPlayers={individualPool || []} allPlayersMap={playersById as Record<string, PlayerWithTeam>} onSavePairs={handleSavePairs} />
      <GroupDrawDialog 
        open={showGroupDrawDialog} 
        onOpenChange={setShowGroupDrawDialog} 
        season={activeSeason} 
        registeredPlayers={(() => {
          const rawList = (activeSeason?.type === 'Co-Op Hybrid' ? coopLeagueTable : individualPool) || [];
          if (activeSeason?.hasDivisions && !activeSeason?.isDiv2Merged) {
            return rawList.filter(p => p.division !== 'div-2');
          }
          return rawList;
        })()} 
        onSaveGroups={handleSaveGroups} 
      />
      <TeamDraftDialog 
        open={showTeamDraftDialog} 
        onOpenChange={setShowTeamDraftDialog} 
        season={activeSeason} 
        registeredPlayers={(() => {
          if (isSeasonCoop) return coopLeagueTable || [];
          return (singleLeagueTable || []).map(entry => {
            const player = playersById[entry.playerId];
            const tid = entry.teamId || player?.teamId || '';
            const team = teamsById[tid];
            return {
              ...entry,
              teamId: tid,
              teamName: team ? team.name : entry.teamName,
              player,
              team
            };
          });
        })()} 
        allTeams={allTeams || []} 
        onSaveAssignments={handleSaveTeamDraftResults} 
        isAdmin={isAdmin} 
      />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} title={t('share_league_participants')} shareText={shareText} />
      <PlayerPerformanceDialog player={selectedPlayerForStats} matches={matches || []} allPlayers={allPlayers || []} allTeams={allTeams || []} coopLeagueTable={coopLeagueTable || []} singleLeagueTable={singleLeagueTable || []} activeSeason={activeSeason} totalPlayersInSeason={(isSeasonCoop ? coopLeagueTable?.length : singleLeagueTable?.length) || 0} open={!!selectedPlayerForStats} onOpenChange={() => setSelectedPlayerForStats(null)} isAdmin={isAdmin} defendingChampionId={defendingChampionId} />
      
      <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && setRevertingMatch(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-amber-500 border-4 bg-background/95 backdrop-blur-2xl rounded-none">
          <AlertDialogHeader>
            <div className="flex items-center gap-4 text-amber-500 mb-2">
              <Undo2 className="w-8 h-8" />
              <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('revert_match_confirm_title')}</AlertDialogTitle>
            </div>
            {revertingMatch && (
              <AlertDialogDescription className="text-sm font-bold text-white/40 uppercase tracking-widest">
                {t('revert_match_confirm_desc', { player1: revertingMatch.player1Id, player2: revertingMatch.player2Id })}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 mt-6">
            <AlertDialogCancel onClick={() => setRevertingMatch(null)} className="font-black uppercase tracking-widest italic rounded-none h-12">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => revertingMatch && console.error('revert logic need to be re-implemented')} className="bg-amber-500 text-black hover:bg-amber-600 font-black uppercase tracking-widest italic rounded-none h-12">{t('revert_match_action')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}