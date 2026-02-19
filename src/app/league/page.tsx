'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock, Users, DollarSign, Award, User, Shuffle, RefreshCw, Calculator, Group, Swords } from 'lucide-react';
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
import { collection, doc, serverTimestamp, writeBatch, getDocs, query, deleteDoc, Timestamp, where, orderBy } from 'firebase/firestore';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CoopDrawDialog } from '@/components/coop-draw-dialog';
import { GroupDrawDialog } from '@/components/group-draw-dialog';
import { Separator } from '@/components/ui/separator';


// For simplicity, we'll work with a single, hardcoded league.
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
  
  // Create/Edit Season State
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


  // --- Firestore Data Hooks ---
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
  
  const previousCompletedSeason = useMemo(() => {
    if (!seasons) return null;
    return seasons
      .filter(s => s.status === 'Completed' && s.id !== activeSeasonId)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
  }, [seasons, activeSeasonId]);

  const previousWinnerDocRef = useMemoFirebase(
    () => (firestore && previousCompletedSeason ? doc(firestore, 'hallOfFame', previousCompletedSeason.id) : null),
    [firestore, previousCompletedSeason]
  );
  const { data: previousWinnerRecord } = useDoc<SeasonRecord>(previousWinnerDocRef);
  const previousWinnerId = previousWinnerRecord?.winnerPlayerId;


  // --- Memoized Derived State ---
  const isLoadingTable = activeSeason?.type === 'Co-Op' ? isLoadingCoopTable : isLoadingSingleTable;
  
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
                // Adapt CoOpLeagueEntry to look like LeagueEntry for the table component
                playerName: entry.teamName, // e.g. "Ade Urip & Bagas"
                teamId: entry.player1TeamId, // Pass team ID for logo
                teamName: teamForPair ? teamForPair.name : entry.player1TeamName, // The Club name e.g. "Arsenal"
                playerId: entry.id, // Use coop team ID as the main ID
                team: teamForPair, // The full team object for the logo
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

    // if season is not started yet, sort by name
    if (activeSeason?.status === 'Not Started') {
        return [...enrichedTable].sort((a, b) => a.playerName.localeCompare(b.playerName)).map((entry, index) => ({...entry, rank: index + 1}));
    }
    
    // Sort logic
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
  
  const { paidPlayersCount, prizePool, registrationPool, sponsorshipPool } = useMemo(() => {
    if (!activeSeason) {
      return { paidPlayersCount: 0, prizePool: 0, registrationPool: 0, sponsorshipPool: 0 };
    }
    const registrationFee = activeSeason.registrationFee || 0;
    const sponsorship = activeSeason.sponsorshipAmount || 0;

    const paidCount = (registeredPlayers || []).filter(p => p.hasPaid).length;
    const regPool = paidCount * registrationFee;
    const totalPool = regPool + sponsorship;

    return { 
      paidPlayersCount: paidCount, 
      prizePool: totalPool,
      registrationPool: regPool,
      sponsorshipPool: sponsorship
    };
  }, [registeredPlayers, activeSeason]);

  const allSeasonMatches = useMemo(() => (matches || []), [matches]);
  const knockoutMatches = useMemo(() => allSeasonMatches.filter(m => m.round && m.round !== 'Group'), [allSeasonMatches]);
  const hasQuarterFinals = useMemo(() => knockoutMatches.some(m => m.round === 'Quarter-Final'), [knockoutMatches]);
  const hasSemiFinals = useMemo(() => knockoutMatches.some(m => m.round === 'Semi-Final'), [knockoutMatches]);
  const hasFinal = useMemo(() => knockoutMatches.some(m => m.round === 'Final'), [knockoutMatches]);

  const groupStageMatches = useMemo(() => allSeasonMatches.filter(m => !m.round || m.round === 'Group'), [allSeasonMatches]);
  const areGroupStageMatchesComplete = useMemo(() => {
    if (groupStageMatches.length === 0) return false;
    return groupStageMatches.every(m => m.isCompleted);
  }, [groupStageMatches]);
  
  const areQuarterFinalsComplete = useMemo(() => {
    if (!hasQuarterFinals) return false;
    const qfMatches = knockoutMatches.filter(m => m.round === 'Quarter-Final');
    return qfMatches.length > 0 && qfMatches.every(m => m.isCompleted);
  }, [knockoutMatches, hasQuarterFinals]);

  const areSemiFinalsComplete = useMemo(() => {
    if (!hasSemiFinals) return false;
    const sfMatches = knockoutMatches.filter(m => m.round === 'Semi-Final');
    return sfMatches.length > 0 && sfMatches.every(m => m.isCompleted);
  }, [knockoutMatches, hasSemiFinals]);


  // --- Effects ---
  useEffect(() => {
    if (seasons && !activeSeasonId && seasons.length > 0) {
      setActiveSeasonId(seasons[0].id);
    }
    if (seasons && activeSeasonId && !seasons.find(s => s.id === activeSeasonId)) {
        setActiveSeasonId(seasons.length > 0 ? seasons[0].id : null);
    }
  }, [seasons, activeSeasonId]);

  // --- Password & Admin Logic ---
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

    // 1. Delete existing fixtures
    const existingMatchesSnap = await getDocs(matchesCollectionRef);
    existingMatchesSnap.forEach(doc => batch.delete(doc.ref));

    // 2. Generate new fixtures
    const seasonType = activeSeason.type || 'Single';

    if (seasonType === 'Hybrid' && singleLeagueTable) {
        const groupA = singleLeagueTable.filter(p => p.group === 'A');
        const groupB = singleLeagueTable.filter(p => p.group === 'B');

        const generateGroupMatches = (group: WithId<LeagueEntry>[]) => {
            const now = Date.now();
            let matchCounter = 0;
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const player1Id = group[i].playerId;
                    const player2Id = group[j].playerId;

                    const meetings = activeSeason.hybridGroupMeetings || 1;

                    if (meetings === 2) {
                        // Home & Away
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
                        // Single match, random home/away
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
        generateGroupMatches(groupA);
        generateGroupMatches(groupB);
        
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
                let player1Id = k === 0 ? id1 : id2;
                let player2Id = k === 0 ? id2 : id1;

                // For single-meeting rounds (Co-op or Hybrid group), randomize home/away
                if (meetings === 1 && Math.random() > 0.5) {
                    [player1Id, player2Id] = [player2Id, player1Id];
                }

                const matchData: Omit<Match, 'id'> = {
                    seasonId: activeSeasonId,
                    player1Id: player1Id,
                    player2Id: player2Id,
                    player1Score: null,
                    player2Score: null,
                    player1Wins: null,
                    player2Wins: null,
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

  const handleGenerateKnockoutFixtures = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason || activeSeason.type !== 'Hybrid') return;

    if (groupA.length < 4 || groupB.length < 4) {
      toast({
        variant: 'destructive',
        title: 'Grup Tidak Lengkap',
        description: 'Masing-masing grup harus memiliki setidaknya 4 tim untuk membuat babak gugur.',
      });
      return;
    }
    
    const matchesCollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);

    const existingKnockoutSnap = await getDocs(query(matchesCollectionRef, where('round', '!=', 'Group')));
    if (!existingKnockoutSnap.empty) {
        toast({
            variant: 'destructive',
            title: 'Babak Gugur Sudah Ada',
            description: 'Jadwal untuk babak gugur sudah dibuat sebelumnya.',
        });
        return;
    }

    const batch = writeBatch(firestore);
    const now = Date.now();

    const pairings = [
      { p1: groupA[0], p2: groupB[3] }, // 1A vs 4B
      { p1: groupB[0], p2: groupA[3] }, // 1B vs 4A
      { p1: groupA[1], p2: groupB[2] }, // 2A vs 3B
      { p1: groupB[1], p2: groupA[2] }, // 2B vs 3A
    ];

    pairings.forEach((pairing, index) => {
      const matchData: Omit<Match, 'id'> = {
        seasonId: activeSeasonId,
        player1Id: pairing.p1.playerId,
        player2Id: pairing.p2.playerId,
        player1Score: null, player2Score: null,
        player1Wins: null, player2Wins: null,
        isCompleted: false,
        matchDate: Timestamp.fromMillis(now + (index + 1) * 1000), // Ensure sequential timestamps for stable bracket
        round: 'Quarter-Final',
      };
      batch.set(doc(matchesCollectionRef), matchData);
    });

    try {
      await batch.commit();
      toast({
        title: 'Babak Gugur Dibuat!',
        description: 'Jadwal perempat final telah berhasil dibuat.',
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Jadwal',
        description: 'Terjadi kesalahan saat membuat jadwal babak gugur.',
      });
    }
  }, [firestore, activeSeasonId, activeSeason, groupA, groupB, toast]);

  const handleGenerateSemiFinals = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason || activeSeason.type !== 'Hybrid') return;

    const matchesCollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
    
    // Fetch all matches to ensure we have current data without needing complex index
    const allMatchesSnap = await getDocs(matchesCollectionRef);
    const allMatches = allMatchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Match>));

    const quarterFinalsMatches = allMatches
        .filter(m => m.round === 'Quarter-Final')
        .sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());

    if (quarterFinalsMatches.length !== 4 || quarterFinalsMatches.some(m => !m.isCompleted)) {
        toast({
            variant: 'destructive',
            title: 'Perempat Final Belum Selesai',
            description: 'Semua pertandingan perempat final harus diselesaikan sebelum membuat semi final.',
        });
        return;
    }

    // Check if semi-finals already exist
    const existingSemiFinals = allMatches.filter(m => m.round === 'Semi-Final');
    if (existingSemiFinals.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Babak Semi Final Sudah Ada',
            description: 'Jadwal untuk babak semi final sudah sebelumnya dibuat.',
        });
        return;
    }

    const getWinnerId = (match: Match) => {
        // Robust winner identification: check win fields first, then scores
        const s1 = match.player1Wins !== null ? match.player1Wins : (match.player1Score ?? 0);
        const s2 = match.player2Wins !== null ? match.player2Wins : (match.player2Score ?? 0);
        return s1 > s2 ? match.player1Id : match.player2Id;
    };
    
    const winners = quarterFinalsMatches.map(getWinnerId);

    // Standard bracket pairings based on our sequential QF creation
    const semiFinalPairings = [
        { p1: winners[0], p2: winners[2] }, // Winner(1A vs 4B) vs Winner(2A vs 3B)
        { p1: winners[1], p2: winners[3] }, // Winner(1B vs 4A) vs Winner(2B vs 3A)
    ];

    const batch = writeBatch(firestore);
    const now = Date.now();
    semiFinalPairings.forEach((pairing, index) => {
        const matchData: Omit<Match, 'id'> = {
            seasonId: activeSeasonId, player1Id: pairing.p1, player2Id: pairing.p2,
            player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
            isCompleted: false, matchDate: Timestamp.fromMillis(now + (index + 10) * 1000), round: 'Semi-Final',
        };
        batch.set(doc(matchesCollectionRef), matchData);
    });

    try {
        await batch.commit();
        toast({ title: 'Babak Semi Final Dibuat!', description: 'Jadwal semi final telah berhasil dibuat.' });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Gagal Membuat Jadwal', description: 'Terjadi kesalahan saat membuat jadwal semi final.' });
    }
  }, [firestore, activeSeasonId, activeSeason, toast]);

  const handleGenerateFinal = useCallback(async () => {
    if (!firestore || !activeSeasonId || !activeSeason || activeSeason.type !== 'Hybrid') return;
    
    const matchesCollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);

    // Fetch all matches to ensure we have current data
    const allMatchesSnap = await getDocs(matchesCollectionRef);
    const allMatches = allMatchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Match>));

    // Get semi-final matches
    const semiFinalsMatches = allMatches
        .filter(m => m.round === 'Semi-Final')
        .sort((a, b) => a.matchDate.toMillis() - b.matchDate.toMillis());

    if (semiFinalsMatches.length !== 2 || semiFinalsMatches.some(m => !m.isCompleted)) {
        toast({ variant: 'destructive', title: 'Semi Final Belum Selesai', description: 'Semua pertandingan semi final harus diselesaikan sebelum membuat final.'});
        return;
    }

    // Check if final already exists
    const existingFinal = allMatches.find(m => m.round === 'Final');
    if (existingFinal) {
        toast({ variant: 'destructive', title: 'Babak Final Sudah Ada', description: 'Jadwal untuk babak final sudah dibuat sebelumnya.'});
        return;
    }

    const getWinnerId = (match: Match) => {
        const s1 = match.player1Wins !== null ? match.player1Wins : (match.player1Score ?? 0);
        const s2 = match.player2Wins !== null ? match.player2Wins : (match.player2Score ?? 0);
        return s1 > s2 ? match.player1Id : match.player2Id;
    };
    const winners = semiFinalsMatches.map(getWinnerId);

    const batch = writeBatch(firestore);
    const matchData: Omit<Match, 'id'> = {
        seasonId: activeSeasonId, player1Id: winners[0], player2Id: winners[1],
        player1Score: null, player2Score: null, player1Wins: null, player2Wins: null,
        isCompleted: false, matchDate: Timestamp.fromMillis(Date.now() + 20000), round: 'Final',
    };
    batch.set(doc(matchesCollectionRef), matchData);

    try {
        await batch.commit();
        toast({ title: 'Babak Final Dibuat!', description: 'Jadwal grand final telah berhasil dibuat.'});
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Gagal Membuat Jadwal', description: 'Terjadi kesalahan saat membuat jadwal final.'});
    }
}, [firestore, activeSeasonId, activeSeason, toast]);


  // --- Event Handlers ---
  const handleSeasonDialogSubmit = () => {
    if (!firestore || !newSeasonName.trim()) {
      toast({ variant: 'destructive', title: t('error'), description: t('season_name_empty') });
      return;
    }

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

        // Delete subcollections' documents
        const subcollections = ['leagueTable', 'matches', 'coopLeagueTable'];
        for (const sub of subcollections) {
            const subcollectionRef = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${deletingSeason.id}/${sub}`);
            const snapshot = await getDocs(subcollectionRef);
            if (!snapshot.empty) {
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
            }
        }
        
        // Delete the Hall of Fame record
        const hallOfFameRef = doc(firestore, 'hallOfFame', deletingSeason.id);
        batch.delete(hallOfFameRef);

        // Delete the main season document itself
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

    const collectionName = (activeSeason?.type || 'Single') === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${collectionName}`, deletingEntry.id);
    deleteDocumentNonBlocking(entryRef);

    toast({
        title: t('player_removed_title'),
        description: t('player_removed_desc', { playerName: deletingEntry.playerName }),
    });
    setDeletingEntry(null);
  };

  const handleRegisterPlayers = async (selectedPlayerIds: string[]) => {
    if (!firestore || !activeSeasonId || !allPlayers) return;

    const playersToRegister = allPlayers.filter(p => selectedPlayerIds.includes(p.id));
    if (playersToRegister.length === 0) return;

    const batch = writeBatch(firestore);
    
    playersToRegister.forEach(player => {
        const leagueEntryRef = doc(collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`));
        const newEntry: Omit<LeagueEntry, 'id' | 'rank'> = {
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
        };
        batch.set(leagueEntryRef, newEntry);
    });

    try {
        await batch.commit();
        toast({ title: t('success'), description: t('players_registered_desc', { count: playersToRegister.length }) });
    } catch (error) {
        console.error("Error registering players: ", error);
        toast({ variant: 'destructive', title: t('error'), description: t('register_players_error') });
    }
    
    setShowRegisterPlayers(false);
  };

  const handleSavePairs = async (pairs: { player1: PlayerWithTeam; player2: PlayerWithTeam; teamId: string; teamName: string }[]) => {
    if (!firestore || !activeSeasonId) return;

    const batch = writeBatch(firestore);
    const targetCollection = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/coopLeagueTable`);

    // 1. Delete all existing documents in the collection first.
    try {
        const existingDocsSnap = await getDocs(targetCollection);
        existingDocsSnap.forEach(doc => {
            batch.delete(doc.ref);
        });
    } catch (error) {
        console.error("Error fetching existing co-op pairs for deletion:", error);
        toast({ variant: 'destructive', title: 'Gagal Menghapus Data Lama', description: 'Tidak dapat membersihkan data pasangan Co-Op sebelumnya.'});
        return; // Stop if we can't delete old data
    }

    // 2. Add the new pairs.
    pairs.forEach(pair => {
        const teamId = [pair.player1.id, pair.player2.id].sort().join('-');
        const teamRef = doc(targetCollection, teamId);
        const teamData: CoOpLeagueEntry = {
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
        batch.set(teamRef, teamData);
    });
    
    try {
        await batch.commit();
        toast({ title: 'Pasangan Disimpan!', description: `${pairs.length} tim Co-Op telah dibuat untuk musim ini.` });
        setShowDrawDialog(false);
    } catch (error) {
        console.error("Error saving co-op pairs:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan pasangan Co-Op.'});
    }
  };

  const handleSaveGroups = useCallback(async (groups: { groupA: WithId<LeagueEntry>[], groupB: WithId<LeagueEntry>[] }) => {
    if (!firestore || !activeSeasonId) return;

    const batch = writeBatch(firestore);
    const targetCollection = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`);

    groups.groupA.forEach(player => {
        batch.update(doc(targetCollection, player.id), { group: 'A' });
    });
    groups.groupB.forEach(player => {
        batch.update(doc(targetCollection, player.id), { group: 'B' });
    });

    try {
        await batch.commit();
        toast({ title: 'Grup Disimpan!', description: 'Pembagian grup telah disimpan untuk musim ini.' });
        setShowGroupDrawDialog(false);
    } catch (error) {
        console.error("Error saving groups:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan Grup', description: 'Terjadi kesalahan saat menyimpan pembagian grup.'});
    }
  }, [firestore, activeSeasonId, toast]);

  const handleRemovePlayerFromRegistration = useCallback((leagueEntryId: string, playerName: string) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;

    // The registration list is always in 'leagueTable', even for a 'Co-Op' season type before pairs are drawn.
    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId);
    deleteDocumentNonBlocking(entryRef);

    toast({
        title: t('player_removed_title'),
        description: t('player_removed_desc', { playerName: playerName }),
    });
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

    let winner = sortedTable[0]; // Default to table leader

    // --- FOR HYBRID: Winner is the one who won the Final match ---
    if (activeSeason.type === 'Hybrid') {
        const finalMatch = matches?.find(m => m.round === 'Final' && m.isCompleted);
        if (finalMatch) {
            const s1 = finalMatch.player1Wins !== null ? finalMatch.player1Wins : (finalMatch.player1Score ?? 0);
            const s2 = finalMatch.player2Wins !== null ? finalMatch.player2Wins : (finalMatch.player2Score ?? 0);
            const winnerId = s1 > s2 ? finalMatch.player1Id : finalMatch.player2Id;
            const winnerEntry = sortedTable.find(p => p.playerId === winnerId);
            if (winnerEntry) {
                winner = winnerEntry;
            }
        }
    }

    // --- AGGREGATE STATS: Loop through ALL matches to get total stats (League + Knockout) ---
    const winnerIdToFilter = (activeSeason.type === 'Co-Op') ? winner.id : winner.playerId;
    const playerMatches = matches?.filter(m => m.isCompleted && (m.player1Id === winnerIdToFilter || m.player2Id === winnerIdToFilter)) || [];
    
    let totalPlayed = 0, totalWin = 0, totalDraw = 0, totalLoss = 0, totalGF = 0, totalGA = 0;

    playerMatches.forEach(m => {
        totalPlayed++;
        const isP1 = m.player1Id === winnerIdToFilter;
        
        // Use Wins for Bo3 rounds, Score for Bo1 rounds
        const s1 = m.player1Wins !== null ? m.player1Wins : (m.player1Score ?? 0);
        const s2 = m.player2Wins !== null ? m.player2Wins : (m.player2Score ?? 0);
        
        const pResult = isP1 ? s1 : s2;
        const oResult = isP1 ? s2 : s1;

        if (pResult > oResult) totalWin++;
        else if (pResult < oResult) totalLoss++;
        else totalDraw++;

        // Only add up actual goal counts for standard score matches (if available)
        if (m.player1Score !== null && m.player2Score !== null) {
            totalGF += isP1 ? m.player1Score : m.player2Score;
            totalGA += isP1 ? m.player2Score : m.player1Score;
        }
    });

    const playersWhoPlayed = sortedTable.filter(p => p.played > 0);
    
    let bestAttacker = null;
    let worstDefender = null;

    if ((activeSeason.type || 'Single') !== 'Co-Op') {
      const maxGoalsFor = Math.max(...playersWhoPlayed.map(p => p.goalsFor || 0));
      const bestAttackerPlayer = playersWhoPlayed.find(p => p.goalsFor === maxGoalsFor && maxGoalsFor > 0);
      if (bestAttackerPlayer) {
          bestAttacker = { playerName: bestAttackerPlayer.playerName, value: bestAttackerPlayer.goalsFor };
      }

      const maxGoalsAgainst = Math.max(...playersWhoPlayed.map(p => p.goalsAgainst || 0));
      const worstDefenderPlayer = playersWhoPlayed.find(p => p.goalsAgainst === maxGoalsAgainst && maxGoalsAgainst > 0);
      if (worstDefenderPlayer) {
          worstDefender = { playerName: worstDefenderPlayer.playerName, value: worstDefenderPlayer.goalsAgainst };
      }
    }

    const maxWins = Math.max(...playersWhoPlayed.map(p => p.win));
    const mostWinsPlayer = playersWhoPlayed.find(p => p.win === maxWins && maxWins > 0);

    const seasonRecord: SeasonRecord = {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        completedAt: Timestamp.now(),
        winnerPlayerId: winner.playerId || winner.id,
        winnerPlayerName: winner.playerName,
        winnerTeamName: winner.teamName,
        winnerPhotoUrl: (winner as any).team?.logoUrl, 
        winnerStats: {
            points: winner.points, // Points remain from league table phase
            win: totalWin,
            draw: totalDraw,
            loss: totalLoss,
            goalsFor: totalGF,
            goalsAgainst: totalGA,
            goalDifference: totalGF - totalGA,
        },
        funStats: {
            mostWins: mostWinsPlayer ? { playerName: mostWinsPlayer.playerName, value: mostWinsPlayer.win } : null,
            bestAttacker: bestAttacker,
            worstDefender: worstDefender,
        }
    };

    const hallOfFameRef = doc(firestore, `hallOfFame`, activeSeason.id);
    setDocumentNonBlocking(hallOfFameRef, seasonRecord, {});

    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons`, activeSeason.id);
    updateDocumentNonBlocking(seasonRef, { status: 'Completed' });

    toast({ title: "Season Completed!", description: `${activeSeason.name} is finished. A record has been saved in the Hall of Fame.` });
  };

  const handleShareParticipants = () => {
    if (!activeSeason || !sortedTable || sortedTable.length === 0) {
      toast({
        variant: 'destructive',
        title: t('no_participants_to_share_title'),
        description: t('no_participants_to_share_desc'),
      });
      return;
    }

    const seasonName = activeSeason.name;
    const header = `*${t('share_participants_header', { seasonName })}*\n\n`;
    
    const participantsList = sortedTable
      .map((p, index) => `${index + 1}. ${p.playerName} (${p.teamName || 'Tanpa Tim'})`)
      .join('\n');
      
    setShareText(header + participantsList);
    setShareDialogOpen(true);
  };
  
  const handlePaymentToggle = useCallback((leagueEntryId: string, currentStatus: boolean) => {
    if (!firestore || !activeSeasonId || !isAdmin) return;

    const entryRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`, leagueEntryId);
    updateDocumentNonBlocking(entryRef, { hasPaid: !currentStatus });

  }, [firestore, activeSeasonId, isAdmin]);


  const formattedDateRange = useMemo(() => {
    if (!activeSeason || !activeSeason.startDate || !activeSeason.endDate) return null;
    const start = format(activeSeason.startDate.toDate(), 'd LLL');
    const end = format(activeSeason.endDate.toDate(), 'd LLL yyyy');
    return `${start} - ${end}`;
  }, [activeSeason]);

  const { seasonProgress, completedMatchesCount } = useMemo(() => {
    if (!matches || matches.length === 0) return { seasonProgress: 0, completedMatchesCount: 0 };
    const completed = matches.filter(m => m.isCompleted).length;
    const progress = (completed / matches.length) * 100;
    return { seasonProgress: progress, completedMatchesCount: completed };
  }, [matches]);


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
          <div className="space-y-2 flex-1">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">{t('league_standings_page_title')}</h1>
            {activeSeason && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-xl font-bold">{activeSeason.name}</p>
                <Badge className="bg-primary/20 text-primary border-primary/30">{activeSeason.status}</Badge>
                {formattedDateRange && <p className="text-sm font-medium opacity-70 italic">{formattedDateRange}</p>}
              </div>
            )}
            {matches && matches.length > 0 && (
              <div className="max-w-xs pt-2">
                <Progress value={seasonProgress} className="h-1.5" />
                <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-70">
                  {completedMatchesCount} / {matches.length} Pertandingan Selesai ({seasonProgress.toFixed(0)}%)
                </p>
              </div>
            )}
          </div>
          <div className="w-full md:w-auto flex justify-end">
            <LiveClock />
          </div>
        </div>

        {/* Unified Control Bar */}
        <div className="bg-card/40 border border-primary/20 rounded-xl p-3 mb-8 flex flex-wrap items-center gap-3 shadow-md backdrop-blur-sm">
          
          {/* Season Selection Group */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/30 h-10 px-3 bg-card/50 hidden sm:flex">Musim</Badge>
            <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background/50 border-primary/30">
                    <SelectValue placeholder={t('select_a_season')} />
                </SelectTrigger>
                <SelectContent>
                    {seasons?.map(season => (
                        <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {isAdmin && (
              <div className="flex gap-1.5 ml-1">
                <Button onClick={() => withAdminCheck(handleOpenCreateDialog)} size="sm" className="h-10 px-3">
                    <PlusCircle className="h-4 w-4" />
                </Button>
                <Button onClick={() => withAdminCheck(handleOpenEditDialog)} variant="outline" size="sm" className="h-10 px-3" disabled={!activeSeason || activeSeason.status !== 'Not Started'}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))} variant="destructive" size="sm" className="h-10 px-3" disabled={!activeSeason}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-8 mx-1 hidden lg:block opacity-30" />

          {/* Admin Action Group */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {isAdmin && activeSeason && (
                <>
                    {activeSeason.status === 'Not Started' && (
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} variant="outline" size="sm" className="h-10 px-4 font-bold border-primary/30">
                                <UserPlus className="mr-2 h-4 w-4" />
                                {t('register_players')}
                            </Button>
                            {activeSeason?.type === 'Co-Op' && (
                                <Button onClick={() => withAdminCheck(() => setShowDrawDialog(true))} disabled={(registeredPlayers?.length ?? 0) < 2} variant="outline" size="sm" className="h-10 px-4 font-bold border-primary/30">
                                    <Shuffle className="mr-2 h-4 w-4" />
                                    Undi Pasangan
                                </Button>
                            )}
                            {activeSeason?.type === 'Hybrid' && (
                                <Button onClick={() => withAdminCheck(() => setShowGroupDrawDialog(true))} disabled={(registeredPlayers?.length ?? 0) < 2} variant="outline" size="sm" className="h-10 px-4 font-bold border-primary/30">
                                    <Group className="mr-2 h-4 w-4" />
                                    Undi Grup
                                </Button>
                            )}
                            <Button onClick={() => withAdminCheck(() => setShowGenerateConfirm(true))} disabled={((activeSeason.type === 'Co-Op' ? coopLeagueTable?.length : singleLeagueTable?.length) ?? 0) < 2} variant="outline" size="sm" className="h-10 px-4 font-bold border-primary/30">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}
                            </Button>
                            <Button 
                                onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('In Progress'))} 
                                variant={(!hasFixtures || (sortedTable || []).length < 2) ? "outline" : "default"}
                                size="sm"
                                className="h-10 px-4 font-bold"
                                disabled={!hasFixtures || (sortedTable || []).length < 2}>
                                <Play className="mr-2 h-4 w-4" />
                                {t('start_season')}
                            </Button>
                        </div>
                    )}
                    
                    {activeSeason.status === 'In Progress' && (
                        <div className="flex flex-wrap gap-2">
                            {activeSeason?.type === 'Hybrid' && groupStageMatches.length > 0 && (
                                <>
                                    {!hasQuarterFinals && (
                                        <Button 
                                            onClick={() => areGroupStageMatchesComplete ? withAdminCheck(handleGenerateKnockoutFixtures) : withAdminCheck(() => setShowFinishGroupStageConfirm(true))}
                                            variant={areGroupStageMatchesComplete ? "default" : "outline"}
                                            size="sm"
                                            className="h-10 px-4 font-bold"
                                        >
                                            <Swords className="mr-2 h-4 w-4" />
                                            Playoff
                                        </Button>
                                    )}
                                    {areQuarterFinalsComplete && !hasSemiFinals && (
                                        <Button 
                                            onClick={() => withAdminCheck(handleGenerateSemiFinals)} 
                                            variant={areQuarterFinalsComplete ? "default" : "outline"}
                                            size="sm" 
                                            className="h-10 px-4 font-bold">
                                            <Swords className="mr-2 h-4 w-4" />
                                            Semi Final
                                        </Button>
                                    )}
                                    {areSemiFinalsComplete && !hasFinal && (
                                        <Button 
                                            onClick={() => withAdminCheck(handleGenerateFinal)} 
                                            variant={areSemiFinalsComplete ? "default" : "outline"}
                                            size="sm" 
                                            className="h-10 px-4 font-bold">
                                            <Trophy className="mr-2 h-4 w-4" />
                                            Final
                                        </Button>
                                    )}
                                </>
                            )}
                            <Button onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))} variant="destructive" size="sm" className="h-10 px-4 font-bold">
                                <Flag className="mr-2 h-4 w-4" />
                                {t('finish_season')}
                            </Button>
                        </div>
                    )}
                </>
            )}
          </div>

          {/* Global Actions Group */}
          <div className="flex items-center gap-2 ml-auto">
            <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} variant="outline" size="sm" className={cn("h-10 px-4 font-bold border-primary/30", isAdmin && "bg-primary/10 text-primary border-primary/50")}>
                {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {isAdmin ? t('lock_admin') : t('unlock_admin')}
            </Button>
            <Button onClick={handleShareParticipants} variant="ghost" size="sm" className="h-10 w-10 p-0" disabled={!sortedTable || sortedTable.length === 0} title={t('share_participants')}>
                <Share2 className="h-4 w-4" />
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10 w-10 p-0" title={t('view_champion')}>
                <Link href={`/league/winner?seasonId=${activeSeasonId}`}>
                    <Trophy className="h-4 w-4 text-yellow-400" />
                </Link>
            </Button>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="lg:col-span-3">
                <LeagueTable 
                    tableData={sortedTable} 
                    isLoading={isLoadingTable || isLoadingMatches || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded}
                    onRemovePlayer={(entry) => withAdminCheck(() => setDeletingEntry(entry))}
                    onSelectPlayer={setSelectedPlayerForStats}
                    seasonStatus={activeSeason?.status}
                    seasonType={activeSeason?.type}
                    isAdmin={isAdmin}
                    defendingChampionId={previousWinnerId}
                    matches={matches || []}
                    playersById={playersById}
                    teamsById={teamsById}
                    activeSeason={activeSeason}
                />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <div className="flex flex-col gap-1 items-center justify-center">
                    <h2 className="font-black text-2xl tracking-tighter text-primary">Statistik Musim</h2>
                    <div className="h-1 w-12 bg-primary rounded-full" />
                </div>
                
                <LeagueStats 
                  tableData={sortedTable} 
                  isLoading={isLoadingTable || isLoadingPlayers}
                  seasonType={activeSeason?.type}
                />

                {activeSeason?.registrationFee && (registeredPlayers || []).length > 0 && (
                    <Card className="group relative overflow-hidden transition-all duration-300 border-2 border-primary/20 hover:border-primary bg-card hover:shadow-lg hover:shadow-primary/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                        <CardHeader className="relative z-10">
                            <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-tight">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                Keuangan Musim
                            </CardTitle>
                            <CardDescription className="text-[10px] font-medium opacity-80">Lacak pembayaran registrasi dan total hadiah.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                             <div className="border-2 border-primary/10 bg-muted/20 p-4 rounded-xl text-center space-y-1 group-hover:border-primary/30 transition-colors">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Hadiah Terkumpul</p>
                                <p className="text-3xl font-black text-primary italic drop-shadow-sm">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prizePool)}
                                </p>
                                {sponsorshipPool > 0 && (
                                     <p className="text-[9px] text-foreground font-bold uppercase tracking-tighter mt-1 opacity-80">
                                        (<span className='text-primary'>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(registrationPool)}</span> pendaftaran + <span className='text-primary'>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sponsorshipPool)}</span> sponsor)
                                    </p>
                                )}
                                <p className="text-[10px] font-bold text-foreground mt-2 border-t border-primary/10 pt-2">
                                    <span className="text-primary">{paidPlayersCount}</span> dari <span className="text-primary">{registeredPlayers?.length}</span> pemain lunas
                                </p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <Users className="w-3 h-3" /> Status Pembayaran
                                </h4>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                                    {(registeredPlayers || []).map(player => (
                                        <div key={player.id} className="flex items-center justify-between bg-muted/10 p-2 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                                            <div className='flex items-center gap-2 overflow-hidden'>
                                                <Avatar className="h-6 w-6 border">
                                                    <AvatarImage src={teamsById[player.teamId]?.logoUrl} alt={player.playerName} />
                                                    <AvatarFallback><User className="w-3 h-3 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                                <Label htmlFor={`paid-${player.id}`} className="text-xs font-bold truncate cursor-pointer">
                                                    {player.playerName}
                                                </Label>
                                            </div>
                                            <Checkbox
                                                id={`paid-${player.id}`}
                                                checked={!!player.hasPaid}
                                                onCheckedChange={() => handlePaymentToggle(player.id, !!player.hasPaid)}
                                                disabled={!isAdmin}
                                                className="border-primary/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </div>
      
      {/* Password Dialog */}
      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('admin_auth')}</DialogTitle>
                <DialogDescription>{t('admin_auth_desc')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-input" className="text-right">
                  {t('password')}
                </Label>
                <Input
                  id="password-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="col-span-3"
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePasswordCheck}>{t('unlock')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Create/Edit Season Dialog */}
      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeason ? t('edit_season') : t('create_new_season')}</DialogTitle>
            <DialogDescription>{editingSeason ? t('edit_season_desc') : t('create_season_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Format Liga</Label>
                 <RadioGroup defaultValue={newSeasonType} onValueChange={(value: Season['type']) => setNewSeasonType(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Single" id="single"/>
                        <Label htmlFor="single">Single (1v1)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Co-Op" id="co-op"/>
                        <Label htmlFor="co-op">Co-Op (2v2)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Hybrid" id="hybrid"/>
                        <Label htmlFor="hybrid">Hybrid (Liga+Piala)</Label>
                    </div>
                </RadioGroup>
            </div>
             {newSeasonType === 'Hybrid' && (
                <div className="space-y-2 pt-2">
                    <Label>Pertemuan Fase Grup</Label>
                     <RadioGroup defaultValue={newHybridMeetings.toString()} onValueChange={(value) => setNewHybridMeetings(parseInt(value) as 1 | 2)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1" id="meetings-1"/>
                            <Label htmlFor="meetings-1">1x Main</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="2" id="meetings-2"/>
                            <Label htmlFor="meetings-2">Home &amp; Away (2x)</Label>
                        </div>
                    </RadioGroup>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="season-name">{t('season_name')}</Label>
                <Input 
                    id="season-name"
                    placeholder="e.g., 2024/25 Season"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="season-fee">Biaya Pendaftaran (IDR)</Label>
                    <Input 
                        id="season-fee"
                        type="number"
                        placeholder="e.g., 15000"
                        value={newSeasonFee}
                        onChange={(e) => setNewSeasonFee(e.target.value)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="sponsorship-amount">Jumlah Sponsor (IDR)</Label>
                    <Input 
                        id="sponsorship-amount"
                        type="number"
                        placeholder="e.g., 500000"
                        value={newSponsorshipAmount}
                        onChange={(e) => setNewSponsorshipAmount(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>{t('date_range')}</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>{t('pick_a_date_range')}</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <Button onClick={handleSeasonDialogSubmit} className="w-full">
                {editingSeason ? t('save_changes') : t('create_season')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
       {/* Delete Season Confirmation Dialog */}
        <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSeason} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Delete Player Entry Confirmation Dialog */}
        <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('remove_player_from_season_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive hover:bg-destructive/90">{t('remove')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Finish Season Confirmation Dialog */}
        <AlertDialog open={showFinishSeasonConfirm} onOpenChange={setShowFinishSeasonConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                       Tindakan ini akan menyelesaikan musim <strong>{activeSeason?.name}</strong>. Setelah selesai, status tidak dapat diubah kembali dan catatan akan dibuat di Daftar Juara.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }}>Ya, Selesaikan</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Finish Group Stage Confirmation Dialog */}
        <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('finish_group_early_title', { defaultValue: 'Selesaikan Fase Grup Lebih Awal?' })}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('finish_group_early_desc', { defaultValue: 'Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan 4 tim teratas dari masing-masing grup saat ini akan melaju ke babak playoff.' })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateKnockoutFixtures}>{t('unlock', { defaultValue: 'Lanjutkan' })}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Generate Fixtures Confirmation Dialog */}
        <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('are_you_sure', { defaultValue: 'Anda yakin?'})}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan {hasFixtures ? 'menghapus semua jadwal yang ada dan membuat yang baru' : 'membuat jadwal pertandingan baru'}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel', { defaultValue: 'Batal' })}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateFixtures}>Ya, Lanjutkan</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {/* Register Players Dialog */}
      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('register_players')}</DialogTitle>
            <DialogDescription>{t('register_players_desc', { seasonName: activeSeason?.name })}</DialogDescription>
          </DialogHeader>
          <RegisterPlayersForm
            allPlayers={allPlayers || []}
            registeredPlayers={registeredPlayers || []}
            onRegister={handleRegisterPlayers}
            isLoading={isLoadingPlayers}
          />
        </DialogContent>
      </Dialog>
      
      {/* Co-Op Draw Dialog */}
      <CoopDrawDialog 
        open={showDrawDialog}
        onOpenChange={setShowDrawDialog}
        season={activeSeason}
        registeredPlayers={registeredPlayers || []}
        allPlayers={allPlayers || []}
        allTeams={allTeams || []}
        onSavePairs={handleSavePairs}
        isAdmin={isAdmin}
        onRemovePlayer={handleRemovePlayerFromRegistration}
      />

       {/* Group Draw Dialog */}
      <GroupDrawDialog
        open={showGroupDrawDialog}
        onOpenChange={setShowGroupDrawDialog}
        season={activeSeason}
        registeredPlayers={registeredPlayers || []}
        onSaveGroups={handleSaveGroups}
      />
      
       {/* Share Dialog */}
       <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          title={t('share_league_participants')}
          shareText={shareText}
        />
      
      {/* Player Performance Dialog */}
      <PlayerPerformanceDialog
        player={selectedPlayerForStats}
        matches={matches || []}
        allPlayers={allPlayers || []}
        allTeams={allTeams || []}
        coopLeagueTable={coopLeagueTable || []}
        singleLeagueTable={singleLeagueTable || []}
        activeSeason={activeSeason}
        totalPlayersInSeason={(activeSeason?.type === 'Co-Op' ? coopLeagueTable?.length : singleLeagueTable?.length) || 0}
        open={!!selectedPlayerForStats}
        onOpenChange={() => setSelectedPlayerForStats(null)}
        defendingChampionId={previousWinnerId}
        previousSeasonName={previousCompletedSeason?.name}
        isAdmin={isAdmin}
      />

    </div>
  );
}
