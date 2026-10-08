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
import { LeagueCockpitDeck } from '@/components/league/league-cockpit-deck';
import { SeasonFinancialHub } from '@/components/league/season-financial-hub';
import { AdminAuthDialog } from '@/components/league/admin-auth-dialog';
import { CreateSeasonDialog } from '@/components/league/create-season-dialog';
import { GenerateFixturesDialog } from '@/components/league/generate-fixtures-dialog';
import { StartSeasonDialog } from '@/components/league/start-season-dialog';


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
      <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-3 sm:gap-4 max-w-6xl mx-auto">
          <div 
            className="flex flex-col justify-center flex-1 w-full min-w-0 max-w-3xl px-4 py-3 sm:px-6 sm:py-4 gap-2.5 sm:gap-3 relative overflow-hidden bg-[#0a0d14] backdrop-blur-3xl rounded-2xl sm:rounded-3xl border border-white/10 shadow-[0_15px_45px_rgba(0,0,0,0.7)]"
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
                              Live Match Centre
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
                              {t('league_standings_page_title').split(' ')[0]}
                          </span>
                          <span 
                            className="inline-block pr-2"
                            style={{ 
                              color: theme.primaryHex,
                              textShadow: `0 0 25px ${theme.glowRgba}`
                            }}
                          >
                              {t('league_standings_page_title').split(' ').slice(1).join(' ')}
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
                            boxShadow: `0 0 15px ${theme.glowRgba}`
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
                        <p className="text-xs sm:text-sm lg:text-base font-black text-white tracking-tight uppercase italic break-words min-w-0">
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
                                  [{seasonProgress.toFixed(0)}%]
                                </span>
                            </div>
                            <div className="relative h-1 w-full bg-white/5 overflow-hidden rounded-full border border-white/5">
                                <div 
                                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out" 
                                  style={{ 
                                    width: `${seasonProgress}%`,
                                    background: `linear-gradient(to right, ${theme.secondaryHex}, ${theme.primaryHex})`,
                                    boxShadow: `0 0 10px ${theme.glowRgba}`
                                  }} 
                                />
                            </div>
                            <p className="text-[7px] font-black tracking-[0.15em] uppercase text-white/30 italic text-right">
                                {completedMatchesCount}/{matches.length} MATCHES
                            </p>
                        </div>
                    )}
                </div>
            )}
          </div>
          
          <div className="w-full lg:w-[300px] xl:w-[320px] flex items-stretch shrink-0">
            <LiveClock className="h-full" theme={theme} />
          </div>
        </div>

        <LiveScoreTicker activeSeasonId={activeSeasonId} teamsById={teamsById} playersById={playersById} isAdmin={isAdmin} theme={theme} />

        {/* ============================================================ */}
        {/* ULTRA SPORT & ULTRA FUTURISTIC COCKPIT COMMAND DECK          */}
        {/* ============================================================ */}
        <LeagueCockpitDeck
          theme={theme}
          activeSeasonId={activeSeasonId}
          setActiveSeasonId={setActiveSeasonId}
          activeSeason={activeSeason}
          seasons={seasons}
          isLoadingSeasons={isLoadingSeasons}
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
          withAdminCheck={withAdminCheck}
          handleOpenCreateDialog={handleOpenCreateDialog}
          handleOpenEditDialog={handleOpenEditDialog}
          setDeletingSeason={setDeletingSeason}
          setPasswordPrompt={setPasswordPrompt}
          handleShareParticipants={handleShareParticipants}
          sortedTable={sortedTable}
          participantEntries={participantEntries || []}
          hasFixtures={hasFixtures}
          individualPool={individualPool || []}
          isSeasonCoop={isSeasonCoop}
          isHybrid={isHybrid}
          groupStageMatches={groupStageMatches}
          hasPlayoffs={hasPlayoffs}
          areGroupStageMatchesComplete={areGroupStageMatchesComplete}
          handleGeneratePlayoffs={handleGeneratePlayoffs}
          setShowRegisterPlayers={setShowRegisterPlayers}
          setShowTeamDraftDialog={setShowTeamDraftDialog}
          setShowGenerateConfirm={setShowGenerateConfirm}
          setShowStartSeasonConfirm={setShowStartSeasonConfirm}
          setShowDrawDialog={setShowDrawDialog}
          setShowManualPairingDialog={setShowManualPairingDialog}
          setShowGroupDrawDialog={setShowGroupDrawDialog}
          setShowFinishGroupStageConfirm={setShowFinishGroupStageConfirm}
          setShowFinishSeasonConfirm={setShowFinishSeasonConfirm}
        />
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
              : "w-full max-w-5xl xl:max-w-6xl"
          )}>
            <div className="space-y-6 sm:space-y-10">
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
                            <SeasonFinancialHub
                                activeSeason={activeSeason}
                                participantEntries={participantEntries}
                                teamsById={teamsById}
                                isAdmin={isAdmin}
                                onPaymentToggle={handlePaymentToggle}
                            />
                    </div>
                </div>
            </div>
        </div>
      </div>
      );
    })()}

      <AdminAuthDialog
        open={passwordPrompt.open}
        onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        onAuthorize={handlePasswordCheck}
      />

      <CreateSeasonDialog
        open={showCreateSeason}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowCreateSeason(false);
            setEditingSeason(null);
          }
        }}
        editingSeason={editingSeason}
        newSeasonType={newSeasonType}
        setNewSeasonType={setNewSeasonType}
        newHybridMeetings={newHybridMeetings}
        setNewHybridMeetings={setNewHybridMeetings}
        newHasDivisions={newHasDivisions}
        setNewHasDivisions={setNewHasDivisions}
        newDivision1Name={newDivision1Name}
        setNewDivision1Name={setNewDivision1Name}
        newDivision2Name={newDivision2Name}
        setNewDivision2Name={setNewDivision2Name}
        newDivision2HasPlayoff={newDivision2HasPlayoff}
        setNewDivision2HasPlayoff={setNewDivision2HasPlayoff}
        newRelegationSpots={newRelegationSpots}
        setNewRelegationSpots={setNewRelegationSpots}
        newPromotionSpots={newPromotionSpots}
        setNewPromotionSpots={setNewPromotionSpots}
        newSeasonName={newSeasonName}
        setNewSeasonName={setNewSeasonName}
        newSeasonThemeKey={newSeasonThemeKey}
        setNewSeasonThemeKey={setNewSeasonThemeKey}
        newSeasonFee={newSeasonFee}
        setNewSeasonFee={setNewSeasonFee}
        newSponsorshipAmount={newSponsorshipAmount}
        setNewSponsorshipAmount={setNewSponsorshipAmount}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onSubmit={handleSeasonDialogSubmit}
      />

      <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSeason} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('remove_player_from_season_title')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('remove')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showFinishSeasonConfirm} onOpenChange={(open) => setShowFinishSeasonConfirm(open)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Tindakan ini akan selesaikan musim <strong>{activeSeason?.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Ya, Selesaikan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">Selesaikan Fase Grup?</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan format Playoff akan dibuat.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleGeneratePlayoffs} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Lanjutkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <GenerateFixturesDialog
        open={showGenerateConfirm}
        onOpenChange={setShowGenerateConfirm}
        activeSeason={activeSeason}
        participantCount={participantEntries?.length || 0}
        hasFixtures={hasFixtures}
        onGenerate={handleGenerateFixtures}
      />

      <StartSeasonDialog
        open={showStartSeasonConfirm}
        onOpenChange={setShowStartSeasonConfirm}
        activeSeason={activeSeason}
        participantCount={participantEntries?.length || 0}
        matchesCount={matches?.length || 0}
        onStartSeason={() => {
          handleUpdateSeasonStatus('In Progress');
          setShowStartSeasonConfirm(false);
        }}
      />

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