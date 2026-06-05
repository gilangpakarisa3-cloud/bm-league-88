'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock, Users, Award, User, Shuffle, RefreshCw, Group, Swords, Wallet, Receipt, LayoutGrid, Scan, Activity, Zap, Undo2, KeyRound, Dices, Binary, Plus } from 'lucide-react';
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
  
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonFee, setNewSeasonFee] = useState<number | string>('');
  const [newSponsorshipAmount, setNewSponsorshipAmount] = useState<number | string>('');
  const [newSeasonType, setNewSeasonType] = useState<Season['type']>('Single');
  const [newHybridMeetings, setNewHybridMeetings] = useState<1 | 2>(1);
  const [editingSeason, setEditingSeason] = useState<WithId<Season> | null>(null);
  
  const [deletingSeason, setDeletingSeason] = useState<WithId<Season> | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<WithId<LeagueEntry> | null>(null);
  const [showFinishSeasonConfirm, setShowFinishSeasonConfirm] = useState(false);
  const [showFinishGroupStageConfirm, setShowFinishGroupStageConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
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
        if (isSeasonCoop && b.win !== a.win) return b.win - a.win;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.playerName.localeCompare(b.playerName);
    };

    if (activeSeason?.status === 'Not Started') {
        return [...enrichedTable].sort((a, b) => a.playerName.localeCompare(b.playerName)).map((entry, index) => ({...entry, rank: index + 1}));
    }
    
    return [...enrichedTable].sort(sortFn).map((entry, index) => ({...entry, rank: index + 1}));

  }, [singleLeagueTable, coopLeagueTable, activeSeason, playersById, teamsById, isSeasonCoop]);

  const isHybrid = activeSeason?.type === 'Hybrid' || activeSeason?.type === 'Co-Op Hybrid';

  const { groupA, groupB } = useMemo(() => {
    if (!isHybrid || activeSeason?.type === 'Co-Op Hybrid') return { groupA: [], groupB: [] };
    
    const sortAndRank = (data: typeof sortedTable) => 
        data.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.playerName.localeCompare(b.playerName);
        }).map((entry, index) => ({...entry, rank: index + 1}));

    const a = sortAndRank(sortedTable.filter(p => p.group === 'A'));
    const b = sortAndRank(sortedTable.filter(p => p.group === 'B'));
    
    return { groupA: a, groupB: b };
  }, [sortedTable, isHybrid, activeSeason]);

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
    if (activeSeason?.type === 'Co-Op Hybrid') {
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
    const isHybridMode = seasonType === 'Hybrid' || seasonType === 'Co-Op Hybrid';
    
    if (seasonType === 'Co-Op Hybrid') {
        const group = tableToUse;
        const now = Date.now();
        let matchCounter = 0;
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const id1 = group[i].id; const id2 = group[j].id;
                batch.set(doc(matchesCollectionRef), { seasonId: activeSeasonId, player1Id: id1, player2Id: id2, player1Score: null, player2Score: null, player1Wins: null, player2Wins: null, isCompleted: false, status: 'Scheduled', matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group' });
            }
        }
    } else if (seasonType === 'Hybrid') {
        const gA = tableToUse.filter(p => p.group === 'A');
        const gB = tableToUse.filter(p => p.group === 'B');
        const generateGroupMatches = (group: any[]) => {
            const now = Date.now();
            let matchCounter = 0;
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
        }
        generateGroupMatches(gA); generateGroupMatches(gB);
    } else {
        const meetings = isSeasonCoop ? 1 : ((activeSeason?.type || 'Single') === 'Single' ? 2 : 1);
        const now = Date.now();
        let matchCounter = 0;
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
    
    if (groupA.length < 6 || groupB.length < 6) { toast({ variant: 'destructive', title: 'Grup Tidak Lengkap', description: 'Masing-masing grup harus memiliki setidaknya 6 tim.' }); return; }
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
          name: newSeasonName.trim(), type: newSeasonType, ...((newSeasonType === 'Hybrid' || newSeasonType === 'Co-Op Hybrid') && { hybridGroupMeetings: newHybridMeetings }),
          ...(dateRange.from && { startDate: Timestamp.fromDate(dateRange.from) }), ...(dateRange.to && { endDate: Timestamp.fromDate(dateRange.to) }),
          registrationFee: isNaN(fee) ? 0 : fee, sponsorshipAmount: isNaN(sponsorship) ? 0 : sponsorship,
      }
      if (editingSeason) {
        updateDocumentNonBlocking(doc(firestore, `leagues/${LEAGUE_ID}/seasons`, editingSeason.id), seasonData);
        toast({ title: t('success'), description: t('season_updated_desc', { seasonName: newSeasonName.trim() }) });
      } else {
        addDocumentNonBlocking(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), { ...seasonData, status: 'Not Started', createdAt: serverTimestamp() });
        toast({ title: t('success'), description: t('season_created_desc', { seasonName: newSeasonName.trim() }) });
      }
      setShowCreateSeason(false); setNewSeasonName(''); setNewSeasonFee(''); setNewSponsorshipAmount(''); setNewSeasonType('Single'); setNewHybridMeetings(1); setEditingSeason(null); setDateRange({ from: undefined, to: undefined });
    }
  };
  
  const handleOpenEditDialog = () => { if (activeSeason) { setEditingSeason(activeSeason); setNewSeasonName(activeSeason.name); setNewSeasonFee(activeSeason.registrationFee || ''); setNewSponsorshipAmount(activeSeason.sponsorshipAmount || ''); setNewSeasonType(activeSeason.type || 'Single'); setNewHybridMeetings(activeSeason.hybridGroupMeetings || 1); setDateRange({ from: activeSeason.startDate?.toDate(), to: activeSeason.endDate?.toDate() }); setShowCreateSeason(true); } };
  const handleOpenCreateDialog = () => { setEditingSeason(null); setNewSeasonName(''); setNewSeasonFee(''); setNewSponsorshipAmount(''); setNewSeasonType('Single'); setNewHybridMeetings(1); setDateRange({ from: undefined, to: undefined }); setShowCreateSeason(true); };

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

  const handleRegisterPlayers = async (selectedPlayerIds: string[]) => {
    if (!firestore || !activeSeasonId || !allPlayers) return;
    const playersToReg = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    const batch = writeBatch(firestore);
    playersToReg.forEach(player => {
        batch.set(doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`)), {
            playerId: player.id, teamId: player.teamId, playerName: player.name, teamName: player.teamName,
            played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, hasPaid: false,
        });
    });
    batch.commit().then(() => toast({ title: t('success'), description: t('players_registered_desc', { count: playersToReg.length }) }));
    setShowRegisterPlayers(false);
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
            played: 0, win: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, hasPaid: false 
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
    
    assignments.forEach(a => {
        const entryRef = doc(targetCol, a.entryId);
        if (isSeasonCoop) {
            batch.update(entryRef, {
                player1TeamId: a.teamId,
                player1TeamName: a.teamName,
                player2TeamId: a.teamId,
                player2TeamName: a.teamName
            });
        } else {
            batch.update(entryRef, { teamId: a.teamId, teamName: a.teamName });
        }
    });
    batch.commit().then(() => { toast({ title: 'Draft Tim Selesai!', description: 'Data tim pemain telah diperbarui.' }); setShowTeamDraftDialog(false); });
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
            const s1 = finalMatch.player1Wins !== null ? finalMatch.player1Wins : (finalMatch.player1Score ?? 0);
            const s2 = finalMatch.player2Wins !== null ? finalMatch.player2Wins : (finalMatch.player2Score ?? 0);
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
        const isBo3 = isSeasonCoop || (m.round && m.round !== 'Group');
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

  return (
    <div className="w-full">
      <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-6 sm:py-8 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 sm:gap-10 min-h-[140px] sm:min-h-[190px]">
          <div className="flex flex-col justify-center space-y-2 flex-1 w-full py-6 sm:py-8 px-8 sm:px-12 relative group/header overflow-hidden bg-black/40 backdrop-blur-3xl border-2 border-white/5 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:border-primary/20">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary shadow-[0_0_30px_rgba(204,253,1,0.8)]" />
            <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-white/5 rounded-tr-[2.5rem] pointer-events-none group-hover/header:border-primary/20 transition-colors duration-500" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white/5 rounded-br-[2.5rem] pointer-events-none opacity-20" />
            
            <div className="relative z-10 space-y-1">
                <div className="flex items-center gap-3">
                    <div className="h-px w-8 sm:w-12 bg-primary/40" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-primary/60 italic">Signal Transmission • Active</span>
                </div>
                <h1 className="font-headline text-3xl sm:text-7xl font-black tracking-tighter text-white uppercase italic drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none">
                    {t('league_standings_page_title').split(' ')[0]} <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">{t('league_standings_page_title').split(' ').slice(1).join(' ')}</span>
                </h1>
            </div>
            {activeSeason && (
              <div className="space-y-2 relative z-10 pt-2">
                <div className="flex items-center gap-3">
                    <p className="text-lg sm:text-3xl font-black text-white tracking-tight uppercase italic pr-4">{activeSeason.name}</p>
                    <Badge className="relative overflow-hidden bg-primary text-black border-none font-black tracking-widest text-[9px] sm:text-[10px] h-6 px-4 uppercase italic shadow-[0_0_20px_rgba(204,253,1,0.4)] flex items-center justify-center rounded-none -skew-x-[12deg] border-r-4 border-black/20">
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        <span className="relative z-10 skew-x-[12deg]">{activeSeason.status}</span>
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3 h-3 text-white/40" />
                    {formattedDateRange && <p className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.2em] italic">{formattedDateRange}</p>}
                </div>
              </div>
            )}
            {matches && matches.length > 0 && (
              <div className="max-w-md pt-4 space-y-2 relative z-10">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                        <Activity className="w-3 h-3 animate-pulse" /> Tournament Progress
                    </span>
                    <span className="text-xs font-black text-primary italic" suppressHydrationWarning>{seasonProgress.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 sm:h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div className="absolute left-0 top-0 h-full bg-primary shadow-[0_0_15px_rgba(204,253,1,0.6)] transition-all duration-1000 ease-out" style={{ width: `${seasonProgress}%` }} />
                </div>
                <p className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase text-white/20 italic">{completedMatchesCount} / {matches.length} Engagements Finalized</p>
              </div>
            )}
          </div>
          <div className="w-full md:w-auto flex items-center justify-center md:justify-end shrink-0">
            <LiveClock />
          </div>
        </div>

        <LiveScoreTicker activeSeasonId={activeSeasonId} teamsById={teamsById} playersById={playersById} isAdmin={isAdmin} />

        <div className={cn(
            "relative bg-black/60 border-b-4 border-white/10 p-2 sm:p-3 flex flex-wrap items-center gap-4 shadow-[0_10px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 overflow-hidden",
            isAdmin ? "w-full" : "w-fit mx-auto rounded-none sm:rounded-none"
        )}>
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/40 pointer-events-none" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/40 pointer-events-none" />

          <div className="flex items-center gap-2 w-full sm:w-auto relative group/select">
            <div className="p-3 bg-primary/10 text-primary hidden xs:block shadow-lg -skew-x-[12deg] border-r-2 border-primary/30">
                <Scan className="w-4 h-4 skew-x-[12deg]" />
            </div>
            <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                <SelectTrigger className="w-full sm:w-fit sm:min-w-[320px] h-12 bg-white/5 border-white/10 font-black uppercase italic tracking-tight text-xs rounded-none -skew-x-[12deg] focus:border-primary/50 transition-all px-8">
                    <div className="skew-x-[12deg] flex items-center justify-center w-full">
                        <SelectValue placeholder={t('select_a_season')} />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-[#0A192F] border-primary/30 rounded-none overflow-hidden">
                    {seasons?.map(season => <SelectItem key={season.id} value={season.id} className="font-black uppercase italic text-xs focus:bg-primary focus:text-black py-3">{season.name}</SelectItem>)}
                </SelectContent>
            </Select>
            {isAdmin && (
              <div className="flex gap-1 ml-1">
                <Button onClick={() => withAdminCheck(handleOpenCreateDialog)} size="icon" className="h-12 w-12 rounded-none -skew-x-[12deg] bg-primary/10 text-primary border-primary/30 border-r-2 hover:bg-primary hover:text-black transition-all shadow-lg"><PlusCircle className="h-5 w-5 skew-x-[12deg]" /></Button>
                <Button onClick={() => withAdminCheck(handleOpenEditDialog)} variant="outline" size="icon" className="h-12 w-12 rounded-none -skew-x-[12deg] border-white/10 border-r-2 hover:border-primary/50 transition-all" disabled={!activeSeason || activeSeason.status !== 'Not Started'}><Pencil className="h-5 w-5 skew-x-[12deg]" /></Button>
                <Button onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))} variant="destructive" size="icon" className="h-12 w-12 rounded-none -skew-x-[12deg] transition-all" disabled={!activeSeason}><Trash2 className="h-5 w-5 skew-x-[12deg]" /></Button>
              </div>
            )}
          </div>

          {isAdmin && activeSeason && (
            <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
                {activeSeason.status === 'Not Started' && (
                    <>
                        <Button onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 -skew-x-[12deg] border-r-2 hover:border-primary/50 rounded-none transition-all"><span className="skew-x-[12deg] flex items-center"><UserPlus className="mr-2 h-4 w-4" />{t('register_players')}</span></Button>
                        <Button onClick={() => withAdminCheck(() => setShowTeamDraftDialog(true))} disabled={(participantEntries?.length ?? 0) < 2} variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 -skew-x-[12deg] border-r-2 hover:border-primary/50 rounded-none transition-all bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"><span className="skew-x-[12deg] flex items-center"><Dices className="mr-2 h-4 w-4" />TEAM DRAFT</span></Button>
                        {isSeasonCoop && (
                            <>
                                <Button onClick={() => withAdminCheck(() => setShowDrawDialog(true))} disabled={(individualPool?.length ?? 0) < 2} variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 -skew-x-[12deg] border-r-2 hover:border-primary/50 rounded-none transition-all"><span className="skew-x-[12deg] flex items-center"><Shuffle className="mr-2 h-4 w-4" />UNDI PASANGAN</span></Button>
                                <Button onClick={() => withAdminCheck(() => setShowManualPairingDialog(true))} disabled={(individualPool?.length ?? 0) < 2} variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 -skew-x-[12deg] border-r-2 hover:border-primary/50 rounded-none transition-all bg-accent/10 text-accent hover:bg-accent/20"><span className="skew-x-[12deg] flex items-center"><Users className="mr-2 h-4 w-4" />PASANG MANUAL</span></Button>
                            </>
                        )}
                        {isHybrid && activeSeason.type !== 'Co-Op Hybrid' && <Button onClick={() => withAdminCheck(() => setShowGroupDrawDialog(true))} disabled={(participantEntries?.length ?? 0) < 2} variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 -skew-x-[12deg] border-r-2 hover:border-primary/50 rounded-none transition-all"><span className="skew-x-[12deg] flex items-center"><Group className="mr-2 h-4 w-4" />UNDI GRUP</span></Button>}
                        <Button onClick={() => withAdminCheck(() => setShowGenerateConfirm(true))} disabled={(participantEntries?.length ?? 0) < 2} variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 -skew-x-[12deg] border-r-2 hover:border-primary/50 rounded-none transition-all"><span className="skew-x-[12deg] flex items-center"><RefreshCw className="mr-2 h-4 w-4" />{hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}</span></Button>
                        <Button onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('In Progress'))} variant="default" className="flex-1 sm:flex-none h-12 px-8 font-black text-[10px] uppercase tracking-widest rounded-none -skew-x-[12deg] border-r-2 border-black/20 shadow-xl shadow-primary/20 transition-all" disabled={!hasFixtures || (sortedTable || []).length < 2}><span className="skew-x-[12deg] flex items-center"><Play className="mr-2 h-4 w-4" />{t('start_season')}</span></Button>
                    </>
                )}
                {activeSeason.status === 'In Progress' && (
                    <>
                        {isHybrid && groupStageMatches.length > 0 && !hasPlayoffs && (
                            <Button onClick={() => areGroupStageMatchesComplete ? withAdminCheck(handleGeneratePlayoffs) : withAdminCheck(() => setShowFinishGroupStageConfirm(true))} variant={areGroupStageMatchesComplete ? "default" : "outline"} className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-none -skew-x-[12deg] border-r-2 border-white/10 transition-all"><span className="skew-x-[12deg] flex items-center"><Swords className="mr-2 h-4 w-4" />START PLAYOFF</span></Button>
                        )}
                        <Button onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))} variant="destructive" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-none -skew-x-[12deg] transition-all"><span className="skew-x-[12deg] flex items-center"><Flag className="mr-2 h-4 w-4" />{t('finish_season')}</span></Button>
                    </>
                )}
            </div>
          )}

          <div className={cn("flex items-center gap-1", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
            <Button 
                onClick={() => isAdmin ? setIsAdmin(false) : setPasswordPrompt({ open: true, action: () => setIsAdmin(true) })} 
                className={cn(
                    "h-12 px-8 font-black text-[10px] uppercase tracking-widest italic rounded-none -skew-x-[12deg] border-r-4 transition-all duration-500 relative overflow-hidden group/admin", 
                    isAdmin ? "bg-primary text-black border-black shadow-[0_0_30px_rgba(204,253,1,0.4)]" : "bg-primary text-black border-primary/20 hover:bg-primary shadow-[0_0_20px_rgba(204,253,1,0.2)]"
                )}
            >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={cn("w-full h-[2px] bg-current absolute top-0 left-0 transition-opacity duration-500", isAdmin ? "animate-scanning opacity-20" : "opacity-0")} />
                </div>
                <div className="skew-x-[12deg] flex items-center relative z-10 text-black">
                    {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                    {isAdmin ? t('lock_admin') : t('unlock_admin')}
                </div>
            </Button>
            <Button onClick={handleShareParticipants} variant="ghost" size="icon" className="h-12 w-12 rounded-none -skew-x-[12deg] bg-white/5 border-r-2 border-white/10 hover:bg-primary/10 hover:text-primary transition-all" disabled={!sortedTable || sortedTable.length === 0} title={t('share_participants')}><Share2 className="h-5 w-5 skew-x-[12deg]" /></Button>
            <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-none -skew-x-[12deg] bg-white/5 border-r-2 border-white/10 hover:bg-yellow-500/10 hover:text-yellow-400 transition-all" title={t('view_champion')}><Link href={`/league/winner?seasonId=${activeSeasonId}`}><Trophy className="h-5 w-5 skew-x-[12deg]" /></Link></Button>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto px-2 sm:px-4 pb-8 transition-all duration-1000 ease-in-out mt-6", (isHybrid && activeLeagueTab === 'playoff') ? "max-w-[98vw] sm:max-w-[95vw]" : "max-w-[92rem]")}>
        <div className="space-y-8 sm:space-y-12">
            <div className="w-full">
                <LeagueTable 
                    tableData={sortedTable} 
                    isLoading={isLoadingTableFinal}
                    onRemovePlayer={(entry) => withAdminCheck(() => setDeletingEntry(entry))}
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
                />
            </div>
            
            <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col gap-1 items-center justify-center">
                    <h2 className="font-black text-lg sm:text-2xl uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary italic pr-4 text-center">Season Insights & Management</h2>
                    <div className="h-1 w-16 sm:w-20 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                    <div className="lg:col-span-8"><LeagueStats tableData={sortedTable} isLoading={isLoadingTable || isLoadingPlayers} seasonType={activeSeason?.type} /></div>
                    <div className="lg:col-span-4">
                        {activeSeason?.registrationFee && (participantEntries || []).length > 0 && (
                            <Card className="group relative overflow-hidden transition-all duration-700 border-0 bg-transparent rounded-[2.5rem] p-[2px] hover:scale-[1.01] hover:shadow-[0_0_60px_rgba(250,204,21,0.2)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent pointer-events-none" />
                                <div className="relative h-full bg-card/90 backdrop-blur-3xl rounded-[calc(2.5rem-2px)] overflow-hidden flex flex-col">
                                    <div className="relative py-5 px-8 flex items-center justify-between overflow-hidden shrink-0 bg-yellow-400 text-black">
                                        <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-[25deg] translate-x-1/4 pointer-events-none" />
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="bg-black/20 p-2 rounded-lg border border-black/10 shadow-lg">
                                                <Wallet className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-sm sm:text-base font-black tracking-[0.1em] uppercase italic leading-none pr-2">Financial Hub</h3>
                                        </div>
                                        <div className="flex items-center gap-2 relative z-10 opacity-60">
                                            <Scan className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-widest hidden xs:block">Cash Flow Intel</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-6 sm:p-8 space-y-6 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-400/20 opacity-40 pointer-events-none rounded-tl-2xl" />
                                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-yellow-400/20 opacity-20 pointer-events-none rounded-br-xl" />
                                        <span className="absolute bottom-4 left-8 text-8xl font-black text-yellow-400/[0.03] uppercase tracking-tighter italic pointer-events-none leading-none select-none pr-10">FUNDS</span>
                                        <div className="bg-black/60 border-2 border-yellow-400/20 p-6 rounded-3xl text-center space-y-2 relative overflow-hidden group/pool shadow-inner">
                                            <div className="absolute inset-0 bg-yellow-400/[0.02] pointer-events-none" />
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                                                <p className="text-[9px] font-black text-white/40 tracking-[0.2em] uppercase italic">Prize Matrix Accumulated</p>
                                            </div>
                                            <p className="text-3xl sm:text-4xl font-black text-yellow-400 italic drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] tabular-nums leading-none mb-4" suppressHydrationWarning>
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prizePool)}
                                            </p>
                                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-white/5">
                                                <Badge variant="outline" className="text-[8px] font-black border-yellow-400/30 text-yellow-400 bg-yellow-400/5 uppercase py-1 px-3">Reg: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(registrationPool)}</Badge>
                                                {sponsorshipPool > 0 && (
                                                    <Badge variant="outline" className="text-[8px] font-black border-amber-500/30 text-amber-500 bg-amber-500/5 uppercase py-1 px-3">Spon: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sponsorshipPool)}</Badge>
                                                )}
                                            </div>
                                            <div className="mt-6 space-y-2.5">
                                                <div className="flex justify-between items-end px-1">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-3 h-3 text-yellow-400 animate-pulse" />
                                                        <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Payment Quota</p>
                                                    </div>
                                                    <span className="text-[10px] font-black text-yellow-400 italic" suppressHydrationWarning>
                                                        {participantEntries?.filter(p => p.hasPaid).length} / {participantEntries?.length} UNITS
                                                    </span>
                                                </div>
                                                <Progress value={((participantEntries?.filter(p => p.hasPaid).length || 0) / (participantEntries?.length || 1)) * 100} className="h-1.5 bg-white/5" color="bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[10px] font-black tracking-[0.3em] text-yellow-400/60 flex items-center gap-2 uppercase italic">
                                                    <Receipt className="w-3.5 h-3.5" /> Unit Verification Log
                                                </h4>
                                                <div className="h-px flex-1 bg-gradient-to-r from-yellow-400/20 to-transparent ml-4" />
                                            </div>
                                            <ScrollArea className="h-[500px] sm:h-[650px] pr-4">
                                                <div className="space-y-2.5 pb-10">
                                                    {(participantEntries || []).map(player => {
                                                        const type = activeSeason?.type || 'Single';
                                                        const isPlayerCoop = type === 'Co-Op' || type === 'Co-Op Hybrid';
                                                        const teamId = isPlayerCoop ? player.player1TeamId : player.teamId;
                                                        const name = isPlayerCoop ? player.teamName : player.playerName;
                                                        const teamName = isPlayerCoop ? player.player1TeamName : player.teamName;
                                                        const team = teamsById[teamId];
                                                        const teamLogo = resolveLogo(team?.logoUrl, teamId, name);
                                                        return (
                                                            <div key={player.id} className={cn(
                                                                "flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-500 group/item relative overflow-hidden",
                                                                player.hasPaid 
                                                                    ? "bg-yellow-400/10 border-yellow-400/30 shadow-[inset_0_0_20px_rgba(250,204,21,0.05)]" 
                                                                    : "bg-black/20 border-white/5 hover:border-white/20"
                                                            )}>
                                                                <div className={cn(
                                                                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                                                                    player.hasPaid ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" : "bg-white/5"
                                                                )} />
                                                                <div className='flex items-center gap-4 overflow-hidden pl-2 relative z-10'>
                                                                    <div className="relative shrink-0">
                                                                        <div className={cn(
                                                                            "absolute -inset-1 rounded-full blur-md opacity-0 transition-opacity",
                                                                            player.hasPaid && "bg-yellow-400/20 opacity-100"
                                                                        )} />
                                                                        <Avatar className={cn(
                                                                            "h-11 w-11 border-2 transition-all duration-500",
                                                                            player.hasPaid ? "border-yellow-400 scale-105" : "border-white/10"
                                                                        )}>
                                                                            <AvatarImage key={teamLogo} src={teamLogo} alt={name} className="object-cover" referrerPolicy="no-referrer" />
                                                                            <AvatarFallback className="bg-black/40 font-black text-xs"><User className="w-5 h-5 text-white/20" /></AvatarFallback>
                                                                        </Avatar>
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden text-left">
                                                                        <Label htmlFor={`paid-${player.id}`} className={cn(
                                                                            "text-sm sm:text-base font-black uppercase italic truncate cursor-pointer transition-colors pr-2",
                                                                            player.hasPaid ? "text-yellow-400" : "text-white/80 group-hover/item:text-white"
                                                                        )} suppressHydrationWarning>{name}</Label>
                                                                        <span className={cn(
                                                                            "text-[9px] font-black uppercase tracking-[0.2em] truncate pr-4 transition-colors",
                                                                            player.hasPaid ? "text-yellow-400/40" : "text-white/20"
                                                                        )} suppressHydrationWarning>{teamName || 'Athlete Protocol'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4 relative z-10 shrink-0">
                                                                    <div className={cn(
                                                                        "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border shadow-sm transition-all",
                                                                        player.hasPaid 
                                                                            ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-400" 
                                                                            : "border-white/10 bg-black/40 text-white/20"
                                                                    )} suppressHydrationWarning>
                                                                        {player.hasPaid ? "VERIFIED" : "PENDING"}
                                                                    </div>
                                                                    <Checkbox 
                                                                        id={`paid-${player.id}`} 
                                                                        checked={!!player.hasPaid} 
                                                                        onCheckedChange={() => handlePaymentToggle(player.id, !!player.hasPaid)} 
                                                                        disabled={!isAdmin} 
                                                                        className={cn(
                                                                            "h-6 w-6 rounded-lg border-2 transition-all duration-300",
                                                                            player.hasPaid 
                                                                                ? "border-yellow-400 bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]" 
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
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-4 bg-[#0A192F]/95 backdrop-blur-2xl rounded-none shadow-[0_0_50px_rgba(204,253,1,0.2)]"><DialogHeader><div className="flex items-center gap-4 text-primary mb-2"><KeyRound className="w-8 h-8" /><DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('admin_auth')}</DialogTitle></div><DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[8px] sm:text-[10px]">{t('admin_auth_desc')}</DialogDescription></DialogHeader><div className="grid gap-4 py-4 grief-6"><div className="space-y-2"><Label htmlFor="password-input" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">{t('password')}</Label><Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-12 sm:h-14 bg-white/5 border-white/10 rounded-none focus:border-primary/50 text-lg font-black" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} /></div></div><DialogFooter><Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black tracking-widest text-sm sm:text-lg uppercase italic rounded-none shadow-xl shadow-primary/20 text-black">{t('unlock')}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl max-h-[90vh] flex flex-col"><DialogHeader className="shrink-0"><DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{editingSeason ? t('edit_season') : t('create_new_season')}</DialogTitle><DialogTitle className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{editingSeason ? t('edit_season_desc') : t('create_season_desc')}</DialogTitle></DialogHeader><ScrollArea className="flex-1 py-4 pr-2"><div className="space-y-4 sm:space-y-6"><div className="space-y-2 sm:space-y-3"><Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Format Liga</Label><RadioGroup defaultValue={newSeasonType} onValueChange={(value: Season['type']) => setNewSeasonType(value)} className="grid grid-cols-2 gap-2 sm:gap-4"><div className="flex items-center space-x-1.5 sm:space-x-2"><RadioGroupItem value="Single" id="single"/><Label htmlFor="single" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Single</Label></div><div className="flex items-center space-x-1.5 sm:space-x-2"><RadioGroupItem value="Co-Op" id="co-op"/><Label htmlFor="co-op" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Co-Op</Label></div><div className="flex items-center space-x-1.5 sm:space-x-2"><RadioGroupItem value="Hybrid" id="hybrid"/><Label htmlFor="hybrid" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Hybrid (Indiv)</Label></div><div className="flex items-center space-x-1.5 sm:space-x-2"><RadioGroupItem value="Co-Op Hybrid" id="co-op-hybrid"/><Label htmlFor="co-op-hybrid" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Hybrid (Co-Op)</Label></div></RadioGroup></div>{(newSeasonType === 'Hybrid' || newSeasonType === 'Co-Op Hybrid') && (<div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2"><Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Pertemuan Fase Grup</Label><RadioGroup defaultValue={newHybridMeetings.toString()} onValueChange={(value) => setNewHybridMeetings(parseInt(value) as 1 | 2)} className="flex gap-2 sm:gap-4"><div className="flex items-center space-x-1.5 sm:space-x-2"><RadioGroupItem value="1" id="meetings-1"/><Label htmlFor="meetings-1" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">1x Main</Label></div><div className="flex items-center space-x-1.5 sm:space-x-2"><RadioGroupItem value="2" id="meetings-2"/><Label htmlFor="meetings-2" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">2x (H&A)</Label></div></RadioGroup></div>)}<div className="space-y-2 sm:space-y-3"><Label htmlFor="season-name" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{t('season_name')}</Label><Input id="season-name" placeholder="e.g., Season 4 Elite" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} className="h-10 sm:h-12 uppercase font-bold text-sm sm:text-sm"/></div><div className="grid grid-cols-2 gap-3 sm:gap-4"><div className="space-y-2 sm:space-y-3"><Label htmlFor="season-fee" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Biaya (IDR)</Label><Input id="season-fee" type="number" placeholder="e.g., 15000" value={newSeasonFee} onChange={(e) => setNewSeasonFee(e.target.value)} className="h-10 sm:h-12 font-bold tabular-nums text-xs sm:text-sm"/></div><div className="space-y-2 sm:space-y-3"><Label htmlFor="sponsorship-amount" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Sponsor (IDR)</Label><Input id="sponsorship-amount" type="number" placeholder="e.g., 500000" value={newSponsorshipAmount} onChange={(e) => setNewSponsorshipAmount(e.target.value)} className="h-10 sm:h-12 font-bold tabular-nums text-xs sm:text-sm"/></div></div><div className="space-y-2 sm:space-y-3"><Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{t('date_range')}</Label><Popover><PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-bold h-10 sm:h-12 uppercase text-[10px] sm:text-xs", !dateRange.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />{dateRange.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} -{" "}{format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>{t('pick_a_date_range')}</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })} numberOfMonths={1} className="rounded-xl border-white/10"/></PopoverContent></Popover></div><Button onClick={handleSeasonDialogSubmit} className="w-full h-12 sm:h-14 text-sm sm:text-lg font-black tracking-tighter uppercase italic shadow-[0_10px_20px_rgba(204,253,1,0.2)] mt-2">{editingSeason ? t('save_changes') : t('create_season')}</Button></div></ScrollArea></DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSeason} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('remove_player_from_season_title')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('remove')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showFinishSeasonConfirm} onOpenChange={(open) => setShowFinishSeasonConfirm(open)}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Tindakan ini akan selesaikan musim <strong>{activeSeason?.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Ya, Selesaikan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">Selesaikan Fase Grup?</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan format Playoff akan dibuat.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleGeneratePlayoffs} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Lanjutkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}><AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><AlertDialogHeader><AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">Konfirmasi Penjadwalan</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Tindakan ini akan {hasFixtures ? 'menghapus semua jadwal yang ada dan membuat yang baru secara acak' : 'membuat jadwal pertandingan baru secara acak'}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-3"><AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Batal</AlertDialogCancel><AlertDialogAction onClick={handleGenerateFixtures} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Ya, Lanjutkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}><DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl"><DialogHeader><DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('register_players')}</DialogTitle><DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('register_players_desc', { seasonName: activeSeason?.name })}</DialogDescription></DialogHeader><RegisterPlayersForm allPlayers={allPlayers || []} registeredPlayers={individualPool || []} onRegister={handleRegisterPlayers} isLoading={isLoadingPlayers} /></DialogContent></Dialog>

      <CoopDrawDialog open={showDrawDialog} onOpenChange={setShowDrawDialog} season={activeSeason} registeredPlayers={individualPool || []} allPlayers={allPlayers || []} onSavePairs={handleSavePairs} isAdmin={isAdmin} onRemovePlayer={handleRemovePlayerFromRegistration} />
      <CoopManualPairingDialog open={showManualPairingDialog} onOpenChange={setShowManualPairingDialog} season={activeSeason} registeredPlayers={individualPool || []} allPlayersMap={playersById as Record<string, PlayerWithTeam>} onSavePairs={handleSavePairs} />
      <GroupDrawDialog open={showGroupDrawDialog} onOpenChange={setShowDrawDialog} season={activeSeason} registeredPlayers={(activeSeason?.type === 'Co-Op Hybrid' ? coopLeagueTable : individualPool) || []} onSaveGroups={handleSaveGroups} />
      <TeamDraftDialog open={showTeamDraftDialog} onOpenChange={setShowTeamDraftDialog} season={activeSeason} registeredPlayers={participantEntries || []} allTeams={allTeams || []} onSaveAssignments={handleSaveTeamDraftResults} isAdmin={isAdmin} />
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
