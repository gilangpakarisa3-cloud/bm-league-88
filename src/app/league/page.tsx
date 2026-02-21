'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock, Users, DollarSign, Award, User, Shuffle, RefreshCw, Group, Swords, Wallet, Receipt } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, getDocs, query, Timestamp, where, orderBy, limit } from 'firebase/firestore';
import type { League, Season, LeagueEntry, Player, WithId, Match, Team, SeasonRecord, CoOpLeagueEntry, PlayerWithTeam } from '@/lib/types';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CoopDrawDialog } from '@/components/coop-draw-dialog';
import { GroupDrawDialog } from '@/components/group-draw-dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
  const [showGroupDrawDialog, setShowGroupDrawDialog] = useState(false);
  
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

  const seasonsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: seasons, isLoading: isLoadingSeasons } = useCollection<Season>(seasonsCollection);

  const activeSeason = useMemo(() => seasons?.find((s) => s.id === activeSeasonId) || null, [seasons, activeSeasonId]);

  const leagueTableCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId && (activeSeason?.type || 'Single') !== 'Co-Op'
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`))
        : null,
    [firestore, activeSeasonId, activeSeason]
  );
  const { data: singleLeagueTable, isLoading: isLoadingSingleTable } = useCollection<LeagueEntry>(leagueTableCollection);

  const coopLeagueTableCollection = useMemoFirebase(
    () =>
      firestore && activeSeasonId && activeSeason?.type === 'Co-Op'
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`))
        : null,
    [firestore, activeSeasonId, activeSeason]
  );
  const { data: coopLeagueTable, isLoading: isLoadingCoopTable } = useCollection<CoOpLeagueEntry>(coopLeagueTableCollection);

  const isLoadingTable = isLoadingSingleTable || isLoadingCoopTable;

  const playerRegistrationCollection = useMemoFirebase(
      () =>
        firestore && activeSeasonId
          ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`)
          : null,
      [firestore, activeSeasonId]
  );
  const { data: registeredPlayers } = useCollection<LeagueEntry>(playerRegistrationCollection);

  const playersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'players') : null),
    [firestore]
  );
  const { data: allPlayers, isLoading: isLoadingPlayers } = useCollection<Player>(playersCollection);
  
  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: allTeams, isLoading: isLoadingTeams } = useCollection<Team>(teamsCollection);

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
  const previousSeasonName = latestHallOfFame?.[0]?.seasonName;
  
  const playersById = useMemo(() => {
    if (!allPlayers) return {};
    return allPlayers.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {} as Record<string, WithId<Player>>);
  }, [allPlayers]);

  const teamsById = useMemo(() => {
    if (!allTeams) return {};
    return allTeams.reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
    }, {} as Record<string, WithId<Team>>);
  }, [allTeams]);

  const sortedTable = useMemo(() => {
    const tableData = (activeSeason?.type || 'Single') !== 'Co-Op' ? singleLeagueTable : coopLeagueTable;
    if (!tableData) return [];
    
    let enrichedTable: any[];

    if (activeSeason?.type === 'Co-Op' && coopLeagueTable) {
        enrichedTable = coopLeagueTable.map(entry => {
            const teamForPair = teamsById[entry.player1TeamId];
            return {
                ...entry,
                playerName: entry.teamName,
                teamId: entry.player1TeamId,
                teamName: teamForPair ? teamForPair.name : entry.player1TeamName,
                playerId: entry.id,
                team: teamForPair,
            };
        });
    } else if (singleLeagueTable) {
        enrichedTable = singleLeagueTable.map(entry => ({
            ...entry,
            player: playersById[entry.playerId],
            team: teamsById[entry.teamId],
        }));
    } else {
        enrichedTable = [];
    }

    if (activeSeason?.status === 'Not Started') {
        return [...enrichedTable].sort((a, b) => a.playerName.localeCompare(b.playerName)).map((entry, index) => ({...entry, rank: index + 1}));
    }
    
    if (activeSeason?.type === 'Co-Op') {
      return [...enrichedTable].sort((a, b) => b.points - a.points).map((entry, index) => ({...entry, rank: index + 1}));
    }
    
    return [...enrichedTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.playerName.localeCompare(b.playerName);
    }).map((entry, index) => ({...entry, rank: index + 1}));

  }, [singleLeagueTable, coopLeagueTable, activeSeason, playersById, teamsById]);

  const { groupA, groupB } = useMemo(() => {
    if (activeSeason?.type !== 'Hybrid') return { groupA: [], groupB: [] };
    
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
  }, [sortedTable, activeSeason]);

  const hasFixtures = useMemo(() => (matches || []).length > 0, [matches]);
  
  const { prizePool, registrationPool, sponsorshipPool } = useMemo(() => {
    if (!activeSeason) {
      return { prizePool: 0, registrationPool: 0, sponsorshipPool: 0 };
    }
    const registrationFee = activeSeason.registrationFee || 0;
    const sponsorship = activeSeason.sponsorshipAmount || 0;

    const paidCount = (registeredPlayers || []).filter(p => p.hasPaid).length;
    const regPool = paidCount * registrationFee;
    const totalPool = regPool + sponsorship;

    return { 
      prizePool: totalPool,
      registrationPool: regPool,
      sponsorshipPool: sponsorship
    };
  }, [registeredPlayers, activeSeason]);

  const allSeasonMatches = useMemo(() => (matches || []), [matches]);
  const groupStageMatches = useMemo(() => allSeasonMatches.filter(m => !m.round || m.round === 'Group'), [allSeasonMatches]);
  const areGroupStageMatchesComplete = useMemo(() => {
    if (groupStageMatches.length === 0) return false;
    return groupStageMatches.every(m => m.isCompleted);
  }, [groupStageMatches]);

  const hasPlayoffs = useMemo(() => allSeasonMatches.some(m => m.round && m.round !== 'Group'), [allSeasonMatches]);

  useEffect(() => {
    if (seasons && !activeSeasonId && seasons.length > 0) {
      setActiveSeasonId(seasons[0].id);
    }
    if (seasons && activeSeasonId && !seasons.find(s => s.id === activeSeasonId)) {
        setActiveSeasonId(seasons.length > 0 ? seasons[0].id : null);
    }
  }, [seasons, activeSeasonId]);

  const handlePasswordCheck = () => {
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAdmin(true);
        if (passwordPrompt.action) {
            passwordPrompt.action();
        }
        toast({ title: t('admin_mode_unlocked_title'), description: t('admin_mode_unlocked_desc') });
    } else {
        toast({ variant: 'destructive', title: t('incorrect_password') });
    }
    setPasswordPrompt({ open: false });
    setPasswordInput('');
  };

  const withAdminCheck = (action: () => void) => {
    if (isAdmin) {
        action();
    } else {
        setPasswordPrompt({ open: true, action });
    }
  };

  const handleGenerateFixtures = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason) return;

    if (activeSeason.status !== 'Not Started') {
       toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error_not_started') });
       return;
    }

    const tableToUse = (activeSeason.type || 'Single') !== 'Co-Op' ? singleLeagueTable : coopLeagueTable;

    if (!tableToUse || tableToUse.length < 2) {
      toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error_min_players') });
      return;
    }

    const batch = writeBatch(firestore);
    const matchesCollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);

    const existingMatchesSnap = await getDocs(matchesCollectionRef);
    existingMatchesSnap.forEach(doc => batch.delete(doc.ref));

    const seasonType = activeSeason.type || 'Single';

    if (seasonType === 'Hybrid' && singleLeagueTable) {
        const gA = singleLeagueTable.filter(p => p.group === 'A');
        const gB = singleLeagueTable.filter(p => p.group === 'B');

        const generateGroupMatches = (group: WithId<LeagueEntry>[]) => {
            const now = Date.now();
            let matchCounter = 0;
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const player1Id = group[i].playerId;
                    const player2Id = group[j].playerId;

                    const meetings = activeSeason.hybridGroupMeetings || 1;

                    if (meetings === 2) {
                        const matchData1: Omit<Match, 'id'> = {
                            seasonId: activeSeasonId, player1Id, player2Id,
                            player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
                            isCompleted: false, matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group',
                        };
                        batch.set(doc(matchesCollectionRef), matchData1);

                        const matchData2: Omit<Match, 'id'> = {
                            seasonId: activeSeasonId, player1Id: player2Id, player2Id: player1Id,
                            player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
                            isCompleted: false, matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group',
                        };
                        batch.set(doc(matchesCollectionRef), matchData2);
                    } else {
                        let p1 = player1Id;
                        let p2 = player2Id;
                        if (Math.random() > 0.5) {
                            [p1, p2] = [p2, p1];
                        }
                        const matchData: Omit<Match, 'id'> = {
                            seasonId: activeSeasonId, player1Id: p1, player2Id: p2,
                            player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
                            isCompleted: false, matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000), round: 'Group',
                        };
                        batch.set(doc(matchesCollectionRef), matchData);
                    }
                }
            }
        }
        generateGroupMatches(gA);
        generateGroupMatches(gB);
        
    } else {
        const meetings = seasonType === 'Co-Op' ? 1 : ((activeSeason?.type || 'Single') === 'Single' ? 2 : 1);
        const now = Date.now();
        let matchCounter = 0;
        for (let i = 0; i < tableToUse.length; i++) {
          for (let j = i + 1; j < tableToUse.length; j++) {
            const entry1 = tableToUse[i];
            const entry2 = tableToUse[j];
            
            const id1 = seasonType === 'Co-Op' ? entry1.id : (entry1 as WithId<LeagueEntry>).playerId;
            const id2 = seasonType === 'Co-Op' ? entry2.id : (entry2 as WithId<LeagueEntry>).playerId;
            
            for (let k = 0; k < meetings; k++) {
                let p1Id = k === 0 ? id1 : id2;
                let p2Id = k === 0 ? id2 : id1;

                if (meetings === 1 && Math.random() > 0.5) {
                    [p1Id, p2Id] = [p2Id, p1Id];
                }

                const matchData: Omit<Match, 'id'> = {
                    seasonId: activeSeasonId,
                    player1Id: p1Id,
                    player2Id: p2Id,
                    player1Score: null, player2Score: null,
                    player1Wins: null, player2Wins: null,
                    isCompleted: false,
                    matchDate: Timestamp.fromMillis(now + (matchCounter++) * 1000),
                    round: seasonType === 'Hybrid' ? 'Group' : undefined
                };
                const matchRef = doc(matchesCollectionRef);
                batch.set(matchRef, matchData);
            }
          }
        }
    }
    
    try {
      await batch.commit();
      toast({ title: t('fixtures_generated_title'), description: `Jadwal pertandingan untuk ${activeSeason.name} telah dibuat.` });
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: t('error'), description: t('generate_fixtures_error') });
    }
  }, [firestore, activeSeason, activeSeasonId, singleLeagueTable, coopLeagueTable, t, toast]);

  const handleGenerateDoubleElimination = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason || activeSeason.type !== 'Hybrid') return;

    if (groupA.length < 6 || groupB.length < 6) {
      toast({ variant: 'destructive', title: 'Grup Tidak Lengkap', description: 'Masing-masing grup harus memiliki setidaknya 6 tim untuk format Double Elimination ini.' });
      return;
    }
    
    const matchesColRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
    const existingKnockoutSnap = await getDocs(query(matchesColRef, where('round', '!=', 'Group')));
    if (!existingKnockoutSnap.empty) {
        toast({ variant: 'destructive', title: 'Babak Gugur Sudah Ada', description: 'Jadwal playoff sudah ada.' });
        return;
    }

    const batch = writeBatch(firestore);
    const now = Date.now();

    // UB Quarter Finals (Matches 1-4)
    const ubQuarterPairings = [
      { p1: groupA[0], p2: groupB[3], bid: 'playoff-m1' }, // M1
      { p1: groupB[1], p2: groupA[2], bid: 'playoff-m2' }, // M2
      { p1: groupB[0], p2: groupA[3], bid: 'playoff-m3' }, // M3
      { p1: groupA[1], p2: groupB[2], bid: 'playoff-m4' }, // M4
    ];

    ubQuarterPairings.forEach((p, i) => {
      const matchData: Omit<Match, 'id'> = {
        seasonId: activeSeasonId, player1Id: p.p1.playerId, player2Id: p.p2.playerId,
        player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
        isCompleted: false, matchDate: Timestamp.fromMillis(now + (i + 1) * 1000), 
        round: 'UB-Quarter', bracketId: p.bid
      };
      batch.set(doc(matchesColRef), matchData);
    });

    // LB Round 1 (Matches 5-8): Waiting for UB losers
    const lbRound1Starters = [
        { p1: groupA[4], bid: 'playoff-m5' }, // Rank 5A vs Loser M1
        { p1: groupB[4], bid: 'playoff-m6' }, // Rank 5B vs Loser M2
        { p1: groupA[5], bid: 'playoff-m7' }, // Rank 6A vs Loser M3
        { p1: groupB[5], bid: 'playoff-m8' }  // Rank 6B vs Loser M4
    ];

    lbRound1Starters.forEach((p, i) => {
        const matchData: Omit<Match, 'id'> = {
            seasonId: activeSeasonId, player1Id: p.p1.playerId, player2Id: 'TBD',
            player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
            isCompleted: false, matchDate: Timestamp.fromMillis(now + (i + 5) * 1000),
            round: 'LB-Round 1', bracketId: p.bid
        };
        batch.set(doc(matchesColRef), matchData);
    });

    const placeholders = [
        { round: 'UB-Semi', bid: 'playoff-m9' }, { round: 'UB-Semi', bid: 'playoff-m10' },
        { round: 'LB-Round 2', bid: 'playoff-m11' }, { round: 'LB-Round 2', bid: 'playoff-m12' },
        { round: 'LB-Round 3', bid: 'playoff-m13' }, { round: 'LB-Round 3', bid: 'playoff-m14' },
        { round: 'UB-Final', bid: 'playoff-m15' },
        { round: 'LB-Semifinal', bid: 'playoff-m16' },
        { round: 'LB-Final', bid: 'playoff-m17' },
        { round: 'Grand-Final', bid: 'playoff-m18' }
    ];

    placeholders.forEach((p, i) => {
        const matchData: Omit<Match, 'id'> = {
            seasonId: activeSeasonId, player1Id: 'TBD', player2Id: 'TBD',
            player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
            isCompleted: false, matchDate: Timestamp.fromMillis(now + (i + 10) * 1000),
            round: p.round as any, bracketId: p.bid
        };
        batch.set(doc(matchesColRef), matchData);
    });

    try {
      await batch.commit();
      toast({ title: 'Double Elimination Playoff Dibuat!', description: 'Jadwal UB-Quarter dan LB-Round 1 telah berhasil dibuat.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Gagal Membuat Jadwal', description: 'Terjadi kesalahan saat membuat jadwal playoff.' });
    }
  }, [firestore, activeSeasonId, activeSeason, groupA, groupB, toast]);

  const handleSeasonDialogSubmit = () => {
    if (firestore && newSeasonName.trim()) {
      const fee = typeof newSeasonFee === 'string' ? parseFloat(newSeasonFee) : newSeasonFee;
      const sponsorship = typeof newSponsorshipAmount === 'string' ? parseFloat(newSponsorshipAmount) : newSponsorshipAmount;
      
      const seasonData: Partial<Omit<Season, 'createdAt' | 'status'>> = {
          name: newSeasonName.trim(),
          type: newSeasonType,
          ...(newSeasonType === 'Hybrid' && { hybridGroupMeetings: newHybridMeetings }),
          ...(dateRange.from && { startDate: Timestamp.fromDate(dateRange.from) }),
          ...(dateRange.to && { endDate: Timestamp.fromDate(dateRange.to) }),
          registrationFee: isNaN(fee) ? 0 : fee,
          sponsorshipAmount: isNaN(sponsorship) ? 0 : sponsorship,
      }

      if (editingSeason) {
        const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, editingSeason.id);
        updateDocumentNonBlocking(seasonRef, seasonData);
        toast({ title: t('success'), description: t('season_updated_desc', { seasonName: newSeasonName.trim() }) });
      } else {
        const seasonsRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons`);
        addDocumentNonBlocking(seasonsRef, {
          ...seasonData,
          status: 'Not Started',
          createdAt: serverTimestamp(),
        });
        toast({ title: t('success'), description: t('season_created_desc', { seasonName: newSeasonName.trim() }) });
      }
      setShowCreateSeason(false);
      setNewSeasonName('');
      setNewSeasonFee('');
      setNewSponsorshipAmount('');
      setNewSeasonType('Single');
      setNewHybridMeetings(1);
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
      setNewHybridMeetings(activeSeason.hybridGroupMeetings || 1);
      setDateRange({
        from: activeSeason.startDate?.toDate(),
        to: activeSeason.endDate?.toDate(),
      });
      setShowCreateSeason(true);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingSeason(null);
    setNewSeasonName('');
    setNewSeasonFee('');
    setNewSponsorshipAmount('');
    setNewSeasonType('Single');
    setNewHybridMeetings(1);
    setDateRange({ from: undefined, to: undefined });
    setShowCreateSeason(true);
  }

  const handleDeleteSeason = async () => {
    if (!firestore || !deletingSeason) return;

    try {
        const batch = writeBatch(firestore);
        const subcollections = ['leagueTable', 'matches', 'coopLeagueTable'];
        for (const sub of subcollections) {
            const subcollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${deletingSeason.id}/${sub}`);
            const snapshot = await getDocs(subcollectionRef);
            if (!snapshot.empty) {
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
            }
        }
        const hallOfFameRef = doc(firestore, 'hallOfFame', deletingSeason.id);
        batch.delete(hallOfFameRef);
        const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, deletingSeason.id);
        batch.delete(seasonRef);
        await batch.commit();
        toast({ title: t('season_deleted_title'), description: t('season_deleted_desc', { seasonName: deletingSeason.name }) });
    } catch (error) {
        console.error("Error deleting season: ", error);
        toast({ variant: 'destructive', title: t('deletion_failed_title'), description: t('season_deleted_error') });
    }
    setDeletingSeason(null);
  };
  
  const handleDeleteEntry = () => {
    if (!firestore || !activeSeasonId || !deletingEntry) return;
    const collName = (activeSeason?.type || 'Single') === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${collName}`, deletingEntry.id);
    deleteDocumentNonBlocking(entryRef);
    toast({ title: t('player_removed_title'), description: t('player_removed_desc', { playerName: deletingEntry.playerName }) });
    setDeletingEntry(null);
  };

  const handleRegisterPlayers = async (selectedPlayerIds: string[]) => {
    if (!firestore || !activeSeasonId || !allPlayers) return;
    const playersToReg = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    if (playersToReg.length === 0) return;
    const batch = writeBatch(firestore);
    playersToReg.forEach(player => {
        const entryRef = doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`));
        const newEntry: Omit<LeagueEntry, 'id' | 'rank'> = {
            playerId: player.id,
            teamId: player.teamId,
            playerName: player.name,
            teamName: player.teamName,
            played: 0, win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, hasPaid: false,
        };
        batch.set(entryRef, newEntry);
    });
    try {
        await batch.commit();
        toast({ title: t('success'), description: t('players_registered_desc', { count: playersToReg.length }) });
    } catch (error) {
        console.error("Error registering players: ", error);
        toast({ variant: 'destructive', title: t('error'), description: t('register_players_error') });
    }
    setShowRegisterPlayers(false);
  };

  const handleSavePairs = async (pairs: { player1: PlayerWithTeam; player2: PlayerWithTeam; teamId: string; teamName: string }[]) => {
    if (!firestore || !activeSeasonId) return;
    const batch = writeBatch(firestore);
    const targetCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`);
    try {
        const existingDocsSnap = await getDocs(targetCol);
        existingDocsSnap.forEach(doc => batch.delete(doc.ref));
    } catch (error) {
        console.error("Error fetching existing co-op pairs:", error);
        return;
    }
    pairs.forEach(pair => {
        const tId = [pair.player1.id, pair.player2.id].sort().join('-');
        const tRef = doc(targetCol, tId);
        const tData: CoOpLeagueEntry = {
            teamName: `${pair.player1.name} & ${pair.player2.name}`,
            player1Id: pair.player1.id,
            player1Name: pair.player1.name,
            player1TeamId: pair.teamId,
            player1TeamName: pair.teamName,
            player2Id: pair.player2.id,
            player2Name: pair.player2.name,
            player2TeamId: pair.teamId,
            player2TeamName: pair.teamName,
            played: 0, win: 0, loss: 0, points: 0,
        };
        batch.set(tRef, tData);
    });
    try {
        await batch.commit();
        toast({ title: 'Pasangan Disimpan!', description: `${pairs.length} tim Co-Op telah dibuat.` });
        setShowDrawDialog(false);
    } catch (error) {
        console.error("Error saving co-op pairs:", error);
    }
  };

  const handleSaveGroups = useCallback(async (groups: { groupA: WithId<LeagueEntry>[], groupB: WithId<LeagueEntry>[] }) => {
    if (!firestore || !activeSeasonId) return;
    const batch = writeBatch(firestore);
    const targetCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`);
    groups.groupA.forEach(player => batch.update(doc(targetCol, player.id), { group: 'A' }));
    groups.groupB.forEach(player => batch.update(doc(targetCol, player.id), { group: 'B' }));
    try {
        await batch.commit();
        toast({ title: 'Grup Disimpan!', description: 'Pembagian grup telah disimpan.' });
        setShowGroupDrawDialog(false);
    } catch (error) {
        console.error("Error saving groups:", error);
    }
  }, [firestore, activeSeasonId, toast]);

  const handleRemovePlayerFromRegistration = useCallback((leagueEntryId: string, playerName: string) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId);
    deleteDocumentNonBlocking(entryRef);
    toast({ title: t('player_removed_title'), description: t('player_removed_desc', { playerName }) });
  }, [firestore, activeSeasonId, isAdmin, toast, t]);

  const handleUpdateSeasonStatus = (status: 'In Progress' | 'Completed') => {
    if (!firestore || !activeSeason) return;
    if (status === 'Completed') {
        handleFinishSeason();
        return;
    }
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status });
    toast({ title: t('season_updated_title'), description: t('season_status_updated_desc', { status }) });
  };
  
   const handleFinishSeason = () => {
    if (!firestore || !activeSeason || sortedTable.length === 0) return;
    let winner = sortedTable[0];
    if (activeSeason.type === 'Hybrid') {
        const finalMatch = matches?.find(m => m.round === 'Grand-Final' && m.isCompleted);
        if (finalMatch) {
            const s1 = finalMatch.player1Wins !== null ? finalMatch.player1Wins : (finalMatch.player1Score ?? 0);
            const s2 = finalMatch.player2Wins !== null ? finalMatch.player2Wins : (finalMatch.player2Score ?? 0);
            const wId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
            const wEntry = sortedTable.find(p => p.playerId === wId);
            if (wEntry) winner = wEntry;
        }
    }
    const wIdToFilter = (activeSeason.type === 'Co-Op') ? winner.id : winner.playerId;
    const playerMatches = matches?.filter(m => m.isCompleted && (m.player1Id === wIdToFilter || m.player2Id === wIdToFilter)) || [];
    let totP = 0, totW = 0, totD = 0, totL = 0, totGF = 0, totGA = 0;
    playerMatches.forEach(m => {
        totP++;
        const isP1 = m.player1Id === wIdToFilter;
        const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
        const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
        const pRes = isP1 ? s1 : s2;
        const oRes = isP1 ? s2 : s1;
        if (pRes > oRes) totW++;
        else if (pRes < oRes) totL++;
        else totD++;
        if (m.player1Score !== null && m.player2Score !== null) {
            totGF += isP1 ? m.player1Score : m.player2Score;
            totGA += isP1 ? m.player2Score : m.player1Score;
        }
    });
    const playersPlayed = sortedTable.filter(p => p.played > 0);
    let bAtt = null;
    let wDef = null;
    if ((activeSeason.type || 'Single') !== 'Co-Op') {
      const maxGF = Math.max(...playersPlayed.map(p => p.goalsFor || 0));
      const bAttP = playersPlayed.find(p => p.goalsFor === maxGF && maxGF > 0);
      if (bAttP) bAtt = { playerName: bAttP.playerName, value: bAttP.goalsFor };
      const maxGA = Math.max(...playersPlayed.map(p => p.goalsAgainst || 0));
      const wDefP = playersPlayed.find(p => p.goalsAgainst === maxGA && maxGA > 0);
      if (wDefP) wDef = { playerName: wDefP.playerName, value: wDefP.goalsAgainst };
    }
    const maxW = Math.max(...playersPlayed.map(p => p.win));
    const mWinP = playersPlayed.find(p => p.win === maxW && maxW > 0);
    const seasonRec: SeasonRecord = {
        seasonId: activeSeason.id, seasonName: activeSeason.name, completedAt: Timestamp.now(),
        winnerPlayerId: winner.playerId || winner.id, winnerPlayerName: winner.playerName, winnerTeamName: winner.teamName,
        winnerPhotoUrl: (winner as any).team?.logoUrl, 
        winnerStats: { points: winner.points, win: totW, draw: totD, loss: totL, goalsFor: totGF, goalsAgainst: totGA, goalDifference: totGF - totGA },
        funStats: { mostWins: mWinP ? { playerName: mWinP.playerName, value: mWinP.win } : null, bestAttacker: bAtt, worstDefender: wDef }
    };
    const hallOfFameRef = doc(firestore, `hallOfFame`, activeSeason.id);
    setDocumentNonBlocking(hallOfFameRef, seasonRec, {});
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status: 'Completed' });
    toast({ title: "Season Completed!", description: `${activeSeason.name} is finished.` });
  };

  const handleShareParticipants = () => {
    if (!activeSeason || !sortedTable || sortedTable.length === 0) return;
    const hdr = `*${t('share_participants_header', { seasonName: activeSeason.name })}*\n\n`;
    const pList = sortedTable.map((p, index) => `${index + 1}. ${p.playerName} (${p.teamName || 'Tanpa Tim'})`).join('\n');
    setShareText(hdr + pList);
    setShareDialogOpen(true);
  };
  
  const handlePaymentToggle = useCallback((leagueEntryId: string, currentStatus: boolean) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;
    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId);
    updateDocumentNonBlocking(entryRef, { hasPaid: !currentStatus });
  }, [firestore, activeSeasonId, isAdmin]);

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
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
          <div className="space-y-2 flex-1">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary uppercase italic pr-4">{t('league_standings_page_title')}</h1>
            {activeSeason && (
              <div className="space-y-1">
                <p className="text-xl font-black text-white/90 tracking-tight uppercase italic">{activeSeason.name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-black tracking-widest text-[10px] uppercase">{activeSeason.status}</Badge>
                  {formattedDateRange && <p className="text-xs font-black opacity-70 text-white/60 uppercase tracking-widest">{formattedDateRange}</p>}
                </div>
              </div>
            )}
            {matches && matches.length > 0 && (
              <div className="max-w-xs pt-2">
                <Progress value={seasonProgress} className="h-1.5 bg-white/5" />
                <p className="text-[10px] font-black mt-1 tracking-widest uppercase opacity-70 text-primary">
                  {completedMatchesCount} / {matches.length} Laga tuntas ({seasonProgress.toFixed(0)}%)
                </p>
              </div>
            )}
          </div>
          <div className="w-full md:w-auto flex justify-end shrink-0">
            <LiveClock />
          </div>
        </div>

        <div className={cn(
            "bg-card/40 border border-primary/20 rounded-xl p-3 mb-8 flex flex-wrap items-center gap-4 shadow-md backdrop-blur-sm transition-all duration-500",
            isAdmin ? "w-full" : "w-fit mx-auto"
        )}>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] font-black tracking-widest bg-primary text-primary-foreground border-primary h-10 px-3 hidden sm:flex shadow-[0_0_10px_rgba(204,253,1,0.4)] uppercase">Musim</Badge>
            <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background/50 border-primary/30 font-bold uppercase text-xs">
                    <SelectValue placeholder={t('select_a_season')} />
                </SelectTrigger>
                <SelectContent>
                    {seasons?.map(season => <SelectItem key={season.id} value={season.id} className="uppercase font-bold text-xs">{season.name}</SelectItem>)}
                </SelectContent>
            </Select>
            {isAdmin && (
              <div className="flex gap-1.5 ml-1">
                <Button onClick={() => withAdminCheck(handleOpenCreateDialog)} size="sm" className="h-10 px-3"><PlusCircle className="h-4 w-4" /></Button>
                <Button onClick={() => withAdminCheck(handleOpenEditDialog)} variant="outline" size="sm" className="h-10 px-3" disabled={!activeSeason || activeSeason.status !== 'Not Started'}><Pencil className="h-4 w-4" /></Button>
                <Button onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))} variant="destructive" size="sm" className="h-10 px-3" disabled={!activeSeason}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          {isAdmin && <Separator orientation="vertical" className="h-8 mx-1 hidden lg:block opacity-30" />}

          {isAdmin && activeSeason && (
            <div className="flex flex-wrap items-center gap-2">
                {activeSeason.status === 'Not Started' && (
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} variant="outline" size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest border-primary/30"><UserPlus className="mr-2 h-4 w-4" />{t('register_players')}</Button>
                        {activeSeason?.type === 'Co-Op' && <Button onClick={() => withAdminCheck(() => setShowDrawDialog(true))} disabled={(registeredPlayers?.length ?? 0) < 2} variant="outline" size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest border-primary/30"><Shuffle className="mr-2 h-4 w-4" />Undi Pasangan</Button>}
                        {activeSeason?.type === 'Hybrid' && <Button onClick={() => withAdminCheck(() => setShowGroupDrawDialog(true))} disabled={(registeredPlayers?.length ?? 0) < 2} variant="outline" size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest border-primary/30"><Group className="mr-2 h-4 w-4" />Undi Grup</Button>}
                        <Button onClick={() => withAdminCheck(() => setShowGenerateConfirm(true))} disabled={((activeSeason.type === 'Co-Op' ? coopLeagueTable?.length : singleLeagueTable?.length) ?? 0) < 2} variant="outline" size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest border-primary/30"><RefreshCw className="mr-2 h-4 w-4" />{hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}</Button>
                        <Button onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('In Progress'))} variant={(!hasFixtures || (sortedTable || []).length < 2) ? "outline" : "default"} size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest" disabled={!hasFixtures || (sortedTable || []).length < 2}><Play className="mr-2 h-4 w-4" />{t('start_season')}</Button>
                    </div>
                )}
                {activeSeason.status === 'In Progress' && (
                    <div className="flex flex-wrap gap-2">
                        {activeSeason?.type === 'Hybrid' && groupStageMatches.length > 0 && !hasPlayoffs && (
                            <Button onClick={() => areGroupStageMatchesComplete ? withAdminCheck(handleGenerateDoubleElimination) : withAdminCheck(() => setShowFinishGroupStageConfirm(true))} variant={areGroupStageMatchesComplete ? "default" : "outline"} size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest"><Swords className="mr-2 h-4 w-4" />Start Playoff (Double Elim)</Button>
                        )}
                        <Button onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))} variant="destructive" size="sm" className="h-10 px-4 font-black text-[10px] uppercase tracking-widest"><Flag className="mr-2 h-4 w-4" />{t('finish_season')}</Button>
                    </div>
                )}
            </div>
          )}

          <div className={cn("flex items-center gap-2", isAdmin && "ml-auto")}>
            <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} variant="outline" size="sm" className={cn("h-10 px-4 font-black text-[10px] uppercase tracking-widest border-primary/30", isAdmin && "bg-primary/10 text-primary border-primary/50 shadow-[0_0_15px_rgba(204,253,1,0.1)]")}>{isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}{isAdmin ? t('lock_admin') : t('unlock_admin')}</Button>
            <Button onClick={handleShareParticipants} variant="ghost" size="sm" className="h-10 w-10 p-0" disabled={!sortedTable || sortedTable.length === 0} title={t('share_participants')}><Share2 className="h-4 w-4" /></Button>
            <Button asChild variant="ghost" size="sm" className="h-10 w-10 p-0" title={t('view_champion')}><Link href={`/league/winner?seasonId=${activeSeasonId}`}><Trophy className="h-4 w-4 text-yellow-400" /></Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-4">
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
                />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <div className="flex flex-col gap-1 items-center justify-center">
                    <h2 className="font-black text-xl uppercase tracking-[0.3em] text-primary italic pr-2">Statistik Musim</h2>
                    <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
                </div>
                
                <LeagueStats tableData={sortedTable} isLoading={isLoadingTable || isLoadingPlayers} seasonType={activeSeason?.type} />
                
                {activeSeason?.registrationFee && (registeredPlayers || []).length > 0 && (
                    <Card className="group relative overflow-hidden transition-all duration-500 border-2 border-primary/20 hover:border-primary/50 bg-card/60 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(204,253,1,0.15)]">
                        <span className="absolute -bottom-2 -right-2 text-6xl font-black text-white/[0.03] uppercase tracking-tighter italic pointer-events-none">FUNDS</span>
                        <CardHeader className="relative z-10 pb-4">
                            <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-widest italic pr-2">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-lg">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                Keuangan Musim
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 relative z-10">
                             <div className="bg-black/40 border-2 border-primary/10 p-5 rounded-2xl text-center space-y-1 group-hover:border-primary/30 transition-all shadow-inner">
                                <p className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase mb-1">Total Hadiah Terkumpul</p>
                                <p className="text-3xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(204,253,1,0.4)] tabular-nums">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prizePool)}
                                </p>
                                {sponsorshipPool > 0 && (
                                    <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-white/5">
                                        <Badge variant="outline" className="text-[8px] font-black border-primary/30 text-primary/80 uppercase">Reg: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(registrationPool)}</Badge>
                                        <Badge variant="outline" className="text-[8px] font-black border-yellow-500/30 text-yellow-500/80 uppercase">Spon: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sponsorshipPool)}</Badge>
                                    </div>
                                )}
                                <div className="mt-4 flex flex-col items-center gap-1">
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                        <span className="text-primary">{registeredPlayers?.filter(p => p.hasPaid).length}</span> / {registeredPlayers?.length} Atlet Lunas
                                    </p>
                                    <Progress value={((registeredPlayers?.filter(p => p.hasPaid).length || 0) / (registeredPlayers?.length || 1)) * 100} className="h-1 w-24 bg-white/5" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black tracking-[0.3em] text-muted-foreground flex items-center gap-2 uppercase">
                                    <Receipt className="w-3 h-3" /> Status Invoice
                                </h4>
                                <ScrollArea className="h-64 pr-2">
                                    <div className="space-y-2">
                                        {(registeredPlayers || []).map(player => (
                                            <div key={player.id} className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-all group/item">
                                                <div className='flex items-center gap-3 overflow-hidden'>
                                                    <Avatar className="h-8 w-8 border-2 border-background shadow-lg">
                                                        <AvatarImage src={teamsById[player.teamId]?.logoUrl} alt={player.playerName} />
                                                        <AvatarFallback><User className="w-4 h-4 text-white/20" /></AvatarFallback>
                                                    </Avatar>
                                                    <Label htmlFor={`paid-${player.id}`} className="text-xs font-black uppercase italic pr-1 truncate cursor-pointer group-hover/item:text-primary transition-colors">
                                                        {player.playerName}
                                                    </Label>
                                                </div>
                                                <Checkbox 
                                                    id={`paid-${player.id}`} 
                                                    checked={!!player.hasPaid} 
                                                    onCheckedChange={() => handlePaymentToggle(player.id, !!player.hasPaid)} 
                                                    disabled={!isAdmin} 
                                                    className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-black h-5 w-5 rounded-md" 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </div>
      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}><DialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl"><DialogHeader><DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{t('admin_auth')}</DialogTitle><DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{t('admin_auth_desc')}</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="password-input" className="text-right text-[10px] font-black uppercase tracking-widest">{t('password')}</Label><Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="col-span-3 h-12 bg-white/5 border-white/10" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} /></div></div><DialogFooter><Button onClick={handlePasswordCheck} className="w-full h-12 font-black tracking-tighter">{t('unlock')}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}><DialogContent className="max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl"><DialogHeader><DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{editingSeason ? t('edit_season') : t('create_new_season')}</DialogTitle><DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{editingSeason ? t('edit_season_desc') : t('create_season_desc')}</DialogDescription></DialogHeader><div className="space-y-6 py-4"><div className="space-y-3"><Label className="text-[10px] font-black uppercase tracking-widest">Format Liga</Label><RadioGroup defaultValue={newSeasonType} onValueChange={(value: Season['type']) => setNewSeasonType(value)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Single" id="single"/><Label htmlFor="single" className="text-xs font-bold uppercase cursor-pointer">Single (1v1)</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Co-Op" id="co-op"/><Label htmlFor="co-op" className="text-xs font-bold uppercase cursor-pointer">Co-Op (2v2)</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Hybrid" id="hybrid"/><Label htmlFor="hybrid" className="text-xs font-bold uppercase cursor-pointer">Hybrid (Liga+Piala)</Label></div></RadioGroup></div>{newSeasonType === 'Hybrid' && (<div className="space-y-3 pt-2"><Label className="text-[10px] font-black uppercase tracking-widest">Pertemuan Fase Grup</Label><RadioGroup defaultValue={newHybridMeetings.toString()} onValueChange={(value) => setNewHybridMeetings(parseInt(value) as 1 | 2)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="1" id="meetings-1"/><Label htmlFor="meetings-1" className="text-xs font-bold uppercase cursor-pointer">1x Main</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="2" id="meetings-2"/><Label htmlFor="meetings-2" className="text-xs font-bold uppercase cursor-pointer">Home &amp; Away (2x)</Label></div></RadioGroup></div>)}<div className="space-y-3"><Label htmlFor="season-name" className="text-[10px] font-black uppercase tracking-widest">{t('season_name')}</Label><Input id="season-name" placeholder="e.g., Season 4 Elite" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} className="h-12 uppercase font-bold"/></div><div className="grid grid-cols-2 gap-4"><div className="space-y-3"><Label htmlFor="season-fee" className="text-[10px] font-black uppercase tracking-widest">Biaya Pendaftaran (IDR)</Label><Input id="season-fee" type="number" placeholder="e.g., 15000" value={newSeasonFee} onChange={(e) => setNewSeasonFee(e.target.value)} className="h-12 font-bold tabular-nums"/></div><div className="space-y-3"><Label htmlFor="sponsorship-amount" className="text-[10px] font-black uppercase tracking-widest">Jumlah Sponsor (IDR)</Label><Input id="sponsorship-amount" type="number" placeholder="e.g., 500000" value={newSponsorshipAmount} onChange={(e) => setNewSponsorshipAmount(e.target.value)} className="h-12 font-bold tabular-nums"/></div></div><div className="space-y-3"><Label className="text-[10px] font-black uppercase tracking-widest">{t('date_range')}</Label><Popover><PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-bold h-12 uppercase text-xs", !dateRange.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} -{" "}{format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>{t('pick_a_date_range')}</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })} numberOfMonths={2}/></PopoverContent></Popover></div><Button onClick={handleSeasonDialogSubmit} className="w-full h-14 text-lg font-black tracking-tighter uppercase italic shadow-[0_10px_20px_rgba(204,253,1,0.2)]">{editingSeason ? t('save_changes') : t('create_season')}</Button></div></DialogContent></Dialog>
      <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}><AlertDialogContent className="border-red-500/50 bg-card/95 backdrop-blur-xl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-red-500">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3"><AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSeason} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[10px] uppercase h-12">{t('delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}><AlertDialogContent className="border-red-500/50 bg-card/95 backdrop-blur-xl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic text-red-500">{t('remove_player_from_season_title')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3"><AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[10px] uppercase h-12">{t('remove')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={showFinishSeasonConfirm} onOpenChange={setShowFinishSeasonConfirm}><AlertDialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Tindakan ini akan selesaikan musim <strong>{activeSeason?.name}</strong> secara permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3"><AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[10px] uppercase h-12">Ya, Selesaikan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}><AlertDialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic">Selesaikan Fase Grup Lebih Awal?</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan format Double Elimination Playoff akan dibuat.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3"><AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleGenerateDoubleElimination} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[10px] uppercase h-12">Lanjutkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}><AlertDialogContent className="border-primary border-2 bg-card/95 backdrop-blur-xl"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic">Konfirmasi Penjadwalan</AlertDialogTitle><AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Tindakan ini akan {hasFixtures ? 'menghapus semua jadwal yang ada dan membuat yang baru secara acak' : 'membuat jadwal pertandingan baru secara acak'}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3"><AlertDialogCancel className="font-black tracking-widest text-[10px] uppercase h-12">Batal</AlertDialogCancel><AlertDialogAction onClick={handleGenerateFixtures} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[10px] uppercase h-12">Ya, Lanjutkan</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}><DialogContent className="max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl"><DialogHeader><DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{t('register_players')}</DialogTitle><DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{t('register_players_desc', { seasonName: activeSeason?.name })}</DialogDescription></DialogHeader><RegisterPlayersForm allPlayers={allPlayers || []} registeredPlayers={registeredPlayers || []} onRegister={handleRegisterPlayers} isLoading={isLoadingPlayers} /></DialogContent></Dialog>
      <CoopDrawDialog open={showDrawDialog} onOpenChange={setShowDrawDialog} season={activeSeason} registeredPlayers={registeredPlayers || []} allPlayers={allPlayers || []} allTeams={allTeams || []} onSavePairs={handleSavePairs} isAdmin={isAdmin} onRemovePlayer={handleRemovePlayerFromRegistration} />
      <GroupDrawDialog open={showGroupDrawDialog} onOpenChange={setShowGroupDrawDialog} season={activeSeason} registeredPlayers={registeredPlayers || []} onSaveGroups={handleSaveGroups} />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} title={t('share_league_participants')} shareText={shareText} />
      <PlayerPerformanceDialog player={selectedPlayerForStats} matches={matches || []} allPlayers={allPlayers || []} allTeams={allTeams || []} coopLeagueTable={coopLeagueTable || []} singleLeagueTable={singleLeagueTable || []} activeSeason={activeSeason} totalPlayersInSeason={(activeSeason?.type === 'Co-Op' ? coopLeagueTable?.length : singleLeagueTable?.length) || 0} open={!!selectedPlayerForStats} onOpenChange={() => setSelectedPlayerForStats(null)} isAdmin={isAdmin} defendingChampionId={defendingChampionId} />
    </div>
  );
}
