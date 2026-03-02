'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { LeagueTable } from '@/components/league-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, UserPlus, Trophy, Play, Flag, Pencil, Trash2, Share2, CalendarIcon, Lock, Unlock, Users, Award, User, Shuffle, RefreshCw, Group, Swords, Wallet, Receipt, LayoutGrid, Scan, Activity, Zap, Undo2, KeyRound } from 'lucide-react';
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
import { GroupDrawDialog } from '@/components/group-draw-dialog';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PLAYOFF_SUCCESSOR_MAP } from '@/lib/constants';


const LEAGUE_ID = 'main-league';

export default function LeaguePage({ params, searchParams }: { params: Promise<any>, searchParams: Promise<any> }) {
  // Unwrap Next.js 15 dynamic APIs
  const resolvedParams = React.use(params);
  const resolvedSearchParams = React.use(searchParams);

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
    
    batch.commit()
      .then(() => {
        toast({ title: t('fixtures_generated_title'), description: `Jadwal pertandingan untuk ${activeSeason.name} telah dibuat.` });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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

    batch.commit()
      .then(() => {
        toast({ title: 'Double Elimination Playoff Dibuat!', description: 'Jadwal UB-Quarter dan LB-Round 1 telah berhasil dibuat.' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: matchesColRef.path,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
    
    batch.commit()
      .then(() => {
        toast({ title: t('success'), description: t('players_registered_desc', { count: playersToReg.length }) });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
    
    batch.commit()
      .then(() => {
        toast({ title: 'Pasangan Disimpan!', description: `${pairs.length} tim Co-Op telah dibuat.` });
        setShowDrawDialog(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: targetCol.path,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSaveGroups = useCallback(async (groups: { groupA: WithId<LeagueEntry>[], groupB: WithId<LeagueEntry>[] }) => {
    if (!firestore || !activeSeasonId) return;
    const batch = writeBatch(firestore);
    const targetCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/leagueTable`);
    groups.groupA.forEach(player => batch.update(doc(targetCol, player.id), { group: 'A' }));
    groups.groupB.forEach(player => batch.update(doc(targetCol, player.id), { group: 'B' }));
    
    batch.commit()
      .then(() => {
        toast({ title: 'Grup Disimpan!', description: 'Pembagian grup telah disimpan.' });
        setShowGroupDrawDialog(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: targetCol.path,
          operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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

  const handleRevertMatch = useCallback(async (matchToRevert: WithId<Match>) => {
    if (!firestore || !activeSeasonId) return;
    const matchRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`, matchToRevert.id);
    const seasonRef = doc(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}`);
    
    try {
        const [mDoc, sDoc] = await Promise.all([getDoc(matchRef), getDoc(seasonRef)]);
        if (!mDoc.exists() || !sDoc.exists() || !mDoc.data().isCompleted) throw new Error("Match not completed or found.");
        
        const mToRev = mDoc.data() as Match;
        const sData = sDoc.data() as Season;
        const isMatchBo3 = sData.type === 'Co-Op' || (mToRev.round && mToRev.round !== 'Group');

        // Identify successor matches to reset TBD
        let winMatchRef = null;
        let losMatchRef = null;
        if (mToRev.round && mToRev.round !== 'Group' && mToRev.bracketId) {
            const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId];
            if (succ) {
                const mCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/matches`);
                const [winSnap, losSnap] = await Promise.all([
                    getDocs(query(mCol, where('bracketId', '==', succ.winner.bid))),
                    succ.loser ? getDocs(query(mCol, where('bracketId', '==', succ.loser.bid))) : Promise.resolve(null)
                ]);
                if (winSnap && !winSnap.empty) {
                    winMatchRef = winSnap.docs[0].ref;
                    if (winSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                }
                if (losSnap && !losSnap.empty) {
                    losMatchRef = losSnap.docs[0].ref;
                    if (losSnap.docs[0].data().isCompleted) throw new Error("Tidak dapat membatalkan: Pertandingan babak selanjutnya sudah dimainkan.");
                }
            }
        }

        let p1EntryRef = null;
        let p2EntryRef = null;
        if (mToRev.round === 'Group' || !mToRev.round) {
            const tblName = sData.type === 'Co-Op' ? 'coopLeagueTable' : 'leagueTable';
            const tblCol = collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeasonId}/${tblName}`);
            if (sData.type === 'Co-Op') {
                p1EntryRef = doc(tblCol, mToRev.player1Id);
                p2EntryRef = doc(tblCol, mToRev.player2Id);
            } else {
                const [snap1, snap2] = await Promise.all([
                    getDocs(query(tblCol, where('playerId', '==', mToRev.player1Id))),
                    getDocs(query(tblCol, where('playerId', '==', mToRev.player2Id)))
                ]);
                if (!snap1.empty) p1EntryRef = snap1.docs[0].ref;
                if (!snap2.empty) p2EntryRef = snap2.docs[0].ref;
            }
        }

        await runTransaction(firestore, async (transaction) => {
            // A. READS
            let e1Data = null;
            let e2Data = null;
            if (p1EntryRef && p2EntryRef) {
                const [e1Snap, e2Snap] = await Promise.all([transaction.get(p1EntryRef), transaction.get(p2EntryRef)]);
                if (e1Snap.exists()) e1Data = e1Snap.data() as LeagueEntry;
                if (e2Snap.exists()) e2Data = e2Snap.data() as LeagueEntry;
            }

            // B. WRITES
            const updatePlayerStats = (pId: string, change: { played: number, win: number, draw: number, loss: number, gf: number, ga: number }) => {
                if (!pId || pId === 'TBD' || pId.includes('TBD')) return;
                const pRef = doc(firestore, 'players', pId);
                transaction.update(pRef, {
                    overallPlayed: increment(change.played || 0),
                    overallWin: increment(change.win || 0),
                    overallDraw: increment(change.draw || 0),
                    overallLoss: increment(change.loss || 0),
                    overallGoalsFor: increment(change.gf || 0),
                    overallGoalsAgainst: increment(change.ga || 0),
                });
            };

            const getOutcome = (s1: number, s2: number) => {
                if (s1 > s2) return { p1: 'W', p2: 'L' };
                if (s1 < s2) return { p1: 'L', p2: 'W' };
                return { p1: 'D', p2: 'D' };
            };

            const oldS1 = isMatchBo3 ? (mToRev.player1Wins ?? 0) : (mToRev.player1Score ?? 0);
            const oldS2 = isMatchBo3 ? (mToRev.player2Wins ?? 0) : (mToRev.player2Score ?? 0);
            const outcome = getOutcome(oldS1, oldS2);

            if (sData.type === 'Co-Op' && e1Data && e2Data) {
                const d1 = e1Data as unknown as CoOpLeagueEntry; const d2 = e2Data as unknown as CoOpLeagueEntry;
                updatePlayerStats(d1.player1Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updatePlayerStats(d1.player2Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updatePlayerStats(d2.player1Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
                updatePlayerStats(d2.player2Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            } else {
                updatePlayerStats(mToRev.player1Id, { played: -1, win: outcome.p1 === 'W' ? -1 : 0, draw: outcome.p1 === 'D' ? -1 : 0, loss: outcome.p1 === 'L' ? -1 : 0, gf: -(mToRev.player1Score || 0), ga: -(mToRev.player2Score || 0) });
                updatePlayerStats(mToRev.player2Id, { played: -1, win: outcome.p2 === 'W' ? -1 : 0, draw: outcome.p2 === 'D' ? -1 : 0, loss: outcome.p2 === 'L' ? -1 : 0, gf: -(mToRev.player2Score || 0), ga: -(mToRev.player1Score || 0) });
            }

            if (p1EntryRef && p2EntryRef && e1Data && e2Data) {
                const e1 = { ...e1Data }; const e2 = { ...e2Data };
                e1.played--; e2.played--;
                if (sData.type === 'Co-Op') {
                    if ((mToRev.player1Wins ?? 0) > (mToRev.player2Wins ?? 0)) { e1.win--; e1.points -= 3; e2.loss--; } else { e2.win--; e2.points -= 3; e1.loss--; }
                } else {
                    e1.goalsFor -= mToRev.player1Score!; e1.goalsAgainst -= mToRev.player2Score!; e2.goalsFor -= mToRev.player2Score!; e2.goalsAgainst -= mToRev.player1Score!;
                    if (mToRev.player1Score! > mToRev.player2Score!) { e1.win--; e1.points -= 3; e2.loss--; } else if (mToRev.player2Score! > mToRev.player1Score!) { e2.win--; e2.points -= 3; e1.loss--; } else { e1.draw--; e1.points--; e2.draw--; e2.points--; }
                    e1.goalDifference = e1.goalsFor - e1.goalsAgainst; e2.goalDifference = e2.goalsFor - e2.goalsAgainst;
                }
                transaction.set(p1EntryRef, e1); transaction.set(p2EntryRef, e2);
            }

            // Reset successor matches if they exist
            if (winMatchRef) {
                const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!];
                transaction.update(winMatchRef, { [`player${succ.winner.slot}Id`]: 'TBD' });
            }
            if (losMatchRef) {
                const succ = PLAYOFF_SUCCESSOR_MAP[mToRev.bracketId!];
                if (succ.loser) {
                    transaction.update(losMatchRef, { [`player${succ.loser.slot}Id`]: 'TBD' });
                }
            }

            transaction.update(matchRef, { player1Wins: null, player2Wins: null, player1Score: null, player2Score: null, isCompleted: false });
        });

        toast({ title: t('match_reverted_title') });
        setRevertingMatch(null);

    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
    }
  }, [firestore, activeSeasonId, t, toast]);

  const isLoadingTableFinal = isLoadingTable || isLoadingMatches || isLoadingPlayers || isLoadingTeams || !isPasswordLoaded;

  return (
    <div className="w-full">
      {/* Header section: Fixed narrow width - UPDATED BASE TO max-w-[92rem] */}
      <div className="max-w-[92rem] mx-auto px-2 sm:px-4 py-6 sm:py-8 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 sm:gap-10 min-h-[140px] sm:min-h-[190px]">
          <div className="flex flex-col justify-center space-y-2 flex-1 w-full py-5 pl-6 sm:pl-8 relative group/header overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_25px_rgba(204,253,1,0.8)]" />
            <div className="relative z-10 space-y-1">
                <div className="flex items-center gap-3">
                    <div className="h-px w-8 sm:w-12 bg-primary/40" />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-primary/60 italic">Signal Transmission • Active</span>
                </div>
                <h1 className="font-headline text-3xl sm:text-7xl font-black tracking-tighter text-white uppercase italic pr-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] leading-none">
                    {t('league_standings_page_title').split(' ')[0]} <span className="text-primary drop-shadow-[0_0_20px_rgba(204,253,1,0.4)]">{t('league_standings_page_title').split(' ').slice(1).join(' ')}</span>
                </h1>
            </div>
            {activeSeason && (
              <div className="space-y-2 relative z-10 pt-2">
                <div className="flex items-center gap-3">
                    <p className="text-lg sm:text-3xl font-black text-white tracking-tight uppercase italic pr-4">{activeSeason.name}</p>
                    <Badge className="bg-primary text-black border-none font-black tracking-widest text-[9px] sm:text-[10px] h-6 px-3 uppercase italic shadow-[0_0_15px_rgba(204,253,1,0.3)]">{activeSeason.status}</Badge>
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

        <div className={cn(
            "bg-black/40 border-2 border-white/5 rounded-2xl p-2 sm:p-4 flex flex-wrap items-center gap-4 shadow-2xl backdrop-blur-xl transition-all duration-500",
            isAdmin ? "w-full" : "w-fit mx-auto"
        )}>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary hidden xs:block shadow-[0_0_15px_rgba(204,253,1,0.2)]">
                <LayoutGrid className="w-4 h-4" />
            </div>
            <Select value={activeSeasonId || ''} onValueChange={setActiveSeasonId} disabled={isLoadingSeasons}>
                <SelectTrigger className="w-full sm:w-fit sm:min-w-[320px] max-w-full h-12 bg-black/40 border-white/10 font-black uppercase italic tracking-tight text-xs rounded-xl focus:border-primary/50 transition-all px-6">
                    <SelectValue placeholder={t('select_a_season')} />
                </SelectTrigger>
                <SelectContent className="bg-[#0A192F] border-primary/30 rounded-xl overflow-hidden">
                    {seasons?.map(season => <SelectItem key={season.id} value={season.id} className="font-black uppercase italic text-xs focus:bg-primary focus:text-black py-3">{season.name}</SelectItem>)}
                </SelectContent>
            </Select>
            {isAdmin && (
              <div className="flex gap-1.5 ml-1">
                <Button onClick={() => withAdminCheck(handleOpenCreateDialog)} size="sm" className="h-12 w-12 rounded-xl bg-primary/10 text-primary border-primary/30 border-2 hover:bg-primary hover:text-black transition-all shadow-lg"><PlusCircle className="h-5 w-5" /></Button>
                <Button onClick={() => withAdminCheck(handleOpenEditDialog)} variant="outline" size="sm" className="h-12 w-12 rounded-xl border-white/10 hover:border-primary/50 transition-all" disabled={!activeSeason || activeSeason.status !== 'Not Started'}><Pencil className="h-5 w-5" /></Button>
                <Button onClick={() => activeSeason && withAdminCheck(() => setDeletingSeason(activeSeason))} variant="destructive" size="sm" className="h-12 w-12 rounded-xl transition-all" disabled={!activeSeason}><Trash2 className="h-5 w-5" /></Button>
              </div>
            )}
          </div>
          {isAdmin && <Separator orientation="vertical" className="h-10 mx-2 hidden lg:block opacity-10" />}
          {isAdmin && activeSeason && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {activeSeason.status === 'Not Started' && (
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button onClick={() => withAdminCheck(() => setShowRegisterPlayers(true))} variant="outline" size="sm" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 hover:border-primary/50 rounded-xl transition-all"><UserPlus className="mr-2 h-4 w-4" />{t('register_players')}</Button>
                        {activeSeason?.type === 'Co-Op' && <Button onClick={() => withAdminCheck(() => setShowDrawDialog(true))} disabled={(registeredPlayers?.length ?? 0) < 2} variant="outline" size="sm" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 hover:border-primary/50 rounded-xl transition-all"><Shuffle className="mr-2 h-4 w-4" />UNDI PASANGAN</Button>}
                        {activeSeason?.type === 'Hybrid' && <Button onClick={() => withAdminCheck(() => setShowGroupDrawDialog(true))} disabled={(registeredPlayers?.length ?? 0) < 2} variant="outline" size="sm" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 hover:border-primary/50 rounded-xl transition-all"><Group className="mr-2 h-4 w-4" />UNDI GRUP</Button>}
                        <Button onClick={() => withAdminCheck(() => setShowGenerateConfirm(true))} disabled={((activeSeason.type === 'Co-Op' ? coopLeagueTable?.length : singleLeagueTable?.length) ?? 0) < 2} variant="outline" size="sm" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest border-white/10 hover:border-primary/50 rounded-xl transition-all"><RefreshCw className="mr-2 h-4 w-4" />{hasFixtures ? t('regenerate_fixtures') : t('generate_fixtures')}</Button>
                        <Button onClick={() => withAdminCheck(() => handleUpdateSeasonStatus('In Progress'))} variant="default" size="sm" className="flex-1 sm:flex-none h-12 px-8 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 transition-all" disabled={!hasFixtures || (sortedTable || []).length < 2}><Play className="mr-2 h-4 w-4" />{t('start_season')}</Button>
                    </div>
                )}
                {activeSeason.status === 'In Progress' && (
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {activeSeason?.type === 'Hybrid' && groupStageMatches.length > 0 && !hasPlayoffs && (
                            <Button onClick={() => areGroupStageMatchesComplete ? withAdminCheck(handleGenerateDoubleElimination) : withAdminCheck(() => setShowFinishGroupStageConfirm(true))} variant={areGroupStageMatchesComplete ? "default" : "outline"} size="sm" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"><Swords className="mr-2 h-4 w-4" />START PLAYOFF</Button>
                        )}
                        <Button onClick={() => withAdminCheck(() => setShowFinishSeasonConfirm(true))} variant="destructive" size="sm" className="flex-1 sm:flex-none h-12 px-6 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"><Flag className="mr-2 h-4 w-4" />{t('finish_season')}</Button>
                    </div>
                )}
            </div>
          )}
          <div className={cn("flex items-center gap-2", isAdmin ? "ml-auto" : "w-full justify-center sm:w-auto")}>
            <Button onClick={() => isAdmin ? setIsAdmin(false) : withAdminCheck(() => setIsAdmin(true))} variant="outline" size="sm" className={cn("h-12 px-6 font-black text-[10px] uppercase tracking-widest italic rounded-xl transition-all duration-500", isAdmin ? "bg-primary/10 text-primary border-primary/50 shadow-[0_0_20px_rgba(204,253,1,0.1)]" : "border-white/10 hover:border-primary/50")}>
                {isAdmin ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {isAdmin ? t('lock_admin') : t('unlock_admin')}
            </Button>
            <Button onClick={handleShareParticipants} variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/10 hover:text-primary transition-all" disabled={!sortedTable || sortedTable.length === 0} title={t('share_participants')}><Share2 className="h-5 w-5" /></Button>
            <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 hover:bg-yellow-500/10 hover:text-yellow-400 transition-all" title={t('view_champion')}><Link href={`/league/winner?seasonId=${activeSeasonId}`}><Trophy className="h-5 w-5" /></Link></Button>
          </div>
        </div>
      </div>

      {/* Standings and data section: Adaptive width - UPDATED BASE TO max-w-[92rem] */}
      <div className={cn(
          "mx-auto px-2 sm:px-4 pb-8 transition-all duration-1000 ease-in-out mt-6",
          (activeSeason?.type === 'Hybrid' && activeLeagueTab === 'playoff') ? "max-w-[98vw] sm:max-w-[95vw]" : "max-w-[92rem]"
      )}>
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
                    onRevertMatch={(m) => withAdminCheck(() => setRevertingMatch(m))}
                />
            </div>
            
            <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col gap-1 items-center justify-center">
                    <h2 className="font-black text-lg sm:text-2xl uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary italic pr-4 text-center">Season Insights & Management</h2>
                    <div className="h-1 w-16 sm:w-20 bg-primary rounded-full shadow-[0_0_15px_rgba(204,253,1,0.6)]" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                    <div className="lg:col-span-8">
                        <LeagueStats tableData={sortedTable} isLoading={isLoadingTable || isLoadingPlayers} seasonType={activeSeason?.type} />
                    </div>
                    
                    <div className="lg:col-span-4">
                        {activeSeason?.registrationFee && (registeredPlayers || []).length > 0 && (
                            <Card className="group relative overflow-hidden transition-all duration-500 border-2 border-primary/20 hover:border-primary/50 bg-card/60 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(204,253,1,0.15)] rounded-2xl">
                                <span className="absolute bottom-0 left-0 text-4xl sm:text-6xl font-black text-white/[0.03] uppercase tracking-tighter italic pointer-events-none pl-4 pb-2">FUNDS</span>
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl pointer-events-none group-hover:border-primary transition-colors duration-500" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-2xl pointer-events-none group-hover:border-primary transition-colors duration-500" />
                                <CardHeader className="relative z-10 pb-2 sm:pb-4">
                                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-black uppercase tracking-widest italic pr-4">
                                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500 shadow-lg relative">
                                            <div className="absolute inset-0 rounded-lg bg-primary/20 animate-ping opacity-20" />
                                            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                                        </div>
                                        Keuangan Musim
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 sm:space-y-6 relative z-10">
                                    <div className="bg-black/40 border-2 border-primary/10 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-center space-y-1 group-hover:border-primary/30 transition-all shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
                                        <p className="text-[8px] sm:text-[9px] font-black text-muted-foreground tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-1">Total Hadiah Terkumpul</p>
                                        <p className="text-2xl sm:text-3xl font-black text-primary italic drop-shadow-[0_0_15px_rgba(204,253,1,0.4)] tabular-nums">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prizePool)}
                                        </p>
                                        {sponsorshipPool > 0 && (
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-white/5">
                                                <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black border-primary/30 text-primary/80 uppercase">Reg: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(registrationPool)}</Badge>
                                                <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black border-yellow-500/30 text-yellow-500/80 uppercase">Spon: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sponsorshipPool)}</Badge>
                                            </div>
                                        )}
                                        <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Activity className="w-3 h-3 text-primary animate-pulse" />
                                                <p className="text-[8px] sm:text-[10px] font-black text-white/60 uppercase tracking-widest">
                                                    <span className="text-primary">{registeredPlayers?.filter(p => p.hasPaid).length}</span> / {registeredPlayers?.length} Atlet Lunas
                                                </p>
                                            </div>
                                            <Progress value={((registeredPlayers?.filter(p => p.hasPaid).length || 0) / (registeredPlayers?.length || 1)) * 100} className="h-1 w-20 sm:w-24 bg-white/5" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] sm:tracking-[0.3em] text-primary/60 flex items-center gap-2 uppercase italic">
                                            <Receipt className="w-3 h-3" /> Status Verifikasi Pembayaran
                                        </h4>
                                        <ScrollArea className="h-[500px] sm:h-[800px] pr-2">
                                            <div className="space-y-2.5">
                                                {(registeredPlayers || []).map(player => (
                                                    <div key={player.id} className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-500 group/item relative overflow-hidden",
                                                        player.hasPaid 
                                                            ? "bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(204,253,1,0.05)]" 
                                                            : "bg-black/20 border-white/5 hover:border-white/10"
                                                    )}>
                                                        <div className={cn(
                                                            "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                                                            player.hasPaid ? "bg-primary shadow-[0_0_10px_rgba(204,253,1,0.6)]" : "bg-white/5"
                                                        )} />
                                                        <div className='flex items-center gap-3 sm:gap-4 overflow-hidden pl-2 relative z-10'>
                                                            <div className="relative">
                                                                <Avatar className={cn(
                                                                    "h-9 w-9 sm:h-11 sm:w-11 border-2 transition-all duration-500 shadow-xl",
                                                                    player.hasPaid ? "border-primary" : "border-white/10"
                                                                )}>
                                                                    <AvatarImage src={teamsById[player.teamId]?.logoUrl} alt={player.playerName} />
                                                                    <AvatarFallback><User className="w-5 h-5 text-white/20" /></AvatarFallback>
                                                                </Avatar>
                                                            </div>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <Label htmlFor={`paid-${player.id}`} className={cn(
                                                                    "text-[12px] sm:text-[15px] font-black uppercase italic pr-4 truncate cursor-pointer transition-colors",
                                                                    player.hasPaid ? "text-primary" : "text-white/80 group-hover/item:text-white"
                                                                )}>
                                                                    {player.playerName}
                                                                </Label>
                                                                <span className={cn(
                                                                    "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] truncate transition-colors",
                                                                    player.hasPaid ? "text-primary/40" : "text-white/20"
                                                                )}>
                                                                    {player.teamName || 'Athlete Protocol'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 relative z-10 shrink-0">
                                                            <div className={cn(
                                                                "px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-tighter transition-all border",
                                                                player.hasPaid 
                                                                    ? "border-primary/30 bg-primary/10 text-primary" 
                                                                    : "border-white/10 bg-black/20 text-white/20"
                                                            )}>
                                                                {player.hasPaid ? "Verified" : "Pending"}
                                                            </div>
                                                            <Checkbox 
                                                                id={`paid-${player.id}`} 
                                                                checked={!!player.hasPaid} 
                                                                onCheckedChange={() => handlePaymentToggle(player.id, !!player.hasPaid)} 
                                                                disabled={!isAdmin} 
                                                                className={cn(
                                                                    "h-5 w-5 sm:h-6 sm:w-6 rounded-md transition-all shadow-lg border-2",
                                                                    player.hasPaid 
                                                                        ? "border-primary bg-primary data-[state=checked]:text-black" 
                                                                        : "border-white/20 bg-black/40"
                                                                )} 
                                                            />
                                                        </div>
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
        </div>
      </div>

      {/* Dialogs and Alerts */}
      <Dialog open={passwordPrompt.open} onOpenChange={(isOpen) => !isOpen && setPasswordPrompt({ open: false })}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-4 bg-[#0A192F]/95 backdrop-blur-2xl rounded-none shadow-[0_0_50px_rgba(204,253,1,0.2)]">
            <DialogHeader>
                <div className="flex items-center gap-4 text-primary mb-2">
                    <KeyRound className="w-8 h-8" />
                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('admin_auth')}</DialogTitle>
                </div>
                <DialogDescription className="font-bold text-white/40 uppercase tracking-widest text-[8px] sm:text-[10px]">{t('admin_auth_desc')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:py-6">
                <div className="space-y-2">
                    <Label htmlFor="password-input" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">{t('password')}</Label>
                    <Input id="password-input" type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="h-12 sm:h-14 bg-white/5 border-white/10 rounded-none focus:border-primary/50 text-lg font-black" onKeyDown={(e) => e.key === 'Enter' && handlePasswordCheck()} />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handlePasswordCheck} className="w-full h-12 sm:h-14 font-black tracking-widest text-sm sm:text-lg uppercase italic rounded-none shadow-xl shadow-primary/20">{t('unlock')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateSeason} onOpenChange={(isOpen) => { if (!isOpen) { setShowCreateSeason(false); setEditingSeason(null); }}}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{editingSeason ? t('edit_season') : t('create_new_season')}</DialogTitle>
                <DialogTitle className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{editingSeason ? t('edit_season_desc') : t('create_season_desc')}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 py-4 pr-2">
                <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-2 sm:space-y-3">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Format Liga</Label>
                        <RadioGroup defaultValue={newSeasonType} onValueChange={(value: Season['type']) => setNewSeasonType(value)} className="flex gap-2 sm:gap-4">
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                                <RadioGroupItem value="Single" id="single"/>
                                <Label htmlFor="single" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Single</Label>
                            </div>
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                                <RadioGroupItem value="Co-Op" id="co-op"/>
                                <Label htmlFor="co-op" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Co-Op</Label>
                            </div>
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                                <RadioGroupItem value="Hybrid" id="hybrid"/>
                                <Label htmlFor="hybrid" className="text-[10px] sm:text-xs font-bold uppercase cursor-pointer">Hybrid</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    {newSeasonType === 'Hybrid' && (
                        <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                            <Label className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Pertemuan Fase Grup</Label>
                            <RadioGroup defaultValue={newHybridMeetings.toString()} onValueChange={(value) => setNewHybridMeetings(parseInt(value) as 1 | 2)} className="flex gap-2 sm:gap-4">
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
                    <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="season-name" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{t('season_name')}</Label>
                        <Input id="season-name" placeholder="e.g., Season 4 Elite" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} className="h-10 sm:h-12 uppercase font-bold text-xs sm:text-sm"/>
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
                                <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })} numberOfMonths={1} className="rounded-xl border-white/10"/>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleSeasonDialogSubmit} className="w-full h-12 sm:h-14 text-sm sm:text-lg font-black tracking-tighter uppercase italic shadow-[0_10px_20px_rgba(204,253,1,0.2)] mt-2">{editingSeason ? t('save_changes') : t('create_season')}</Button>
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSeason} onOpenChange={(isOpen) => !isOpen && setDeletingSeason(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('delete_season_confirm_desc', { seasonName: deletingSeason?.name })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSeason} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('delete')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingEntry} onOpenChange={(isOpen) => !isOpen && setDeletingEntry(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-red-500/50 bg-card/95 backdrop-blur-xl rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-red-500 pr-4">{t('remove_player_from_season_title')}</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('remove_player_from_season_desc', { playerName: deletingEntry?.playerName })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteEntry} className="bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('remove')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinishSeasonConfirm} onOpenChange={(open) => setShowFinishSeasonConfirm(open)}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Tindakan ini akan selesaikan musim <strong>{activeSeason?.name}</strong> secara permanen.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => { handleUpdateSeasonStatus('Completed'); setShowFinishSeasonConfirm(false); }} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Ya, Selesaikan</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFinishGroupStageConfirm} onOpenChange={setShowFinishGroupStageConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">Selesaikan Fase Grup?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Masih ada pertandingan yang belum dimainkan. Jika dilanjutkan, sisa pertandingan akan diabaikan dan format Playoff akan dibuat.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerateDoubleElimination} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Lanjutkan</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">Konfirmasi Penjadwalan</AlertDialogTitle>
                <AlertDialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">Tindakan ini akan {hasFixtures ? 'menghapus semua jadwal yang ada dan membuat yang baru secara acak' : 'membuat jadwal pertandingan baru secara acak'}.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
                <AlertDialogCancel className="font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerateFixtures} className="bg-primary text-black hover:bg-primary/90 font-black tracking-widest text-[8px] sm:text-[10px] uppercase h-10 sm:h-12 flex-1 italic">Ya, Lanjutkan</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRegisterPlayers} onOpenChange={setShowRegisterPlayers}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">{t('register_players')}</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">{t('register_players_desc', { seasonName: activeSeason?.name })}</DialogDescription>
            </DialogHeader>
            <RegisterPlayersForm allPlayers={allPlayers || []} registeredPlayers={registeredPlayers || []} onRegister={handleRegisterPlayers} isLoading={isLoadingPlayers} />
        </DialogContent>
      </Dialog>

      <CoopDrawDialog open={showDrawDialog} onOpenChange={setShowDrawDialog} season={activeSeason} registeredPlayers={registeredPlayers || []} allPlayers={allPlayers || []} allTeams={allTeams || []} onSavePairs={handleSavePairs} isAdmin={isAdmin} onRemovePlayer={handleRemovePlayerFromRegistration} />
      <GroupDrawDialog open={showGroupDrawDialog} onOpenChange={setShowGroupDrawDialog} season={activeSeason} registeredPlayers={registeredPlayers || []} onSaveGroups={handleSaveGroups} />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} title={t('share_league_participants')} shareText={shareText} />
      <PlayerPerformanceDialog player={selectedPlayerForStats} matches={matches || []} allPlayers={allPlayers || []} allTeams={allTeams || []} coopLeagueTable={coopLeagueTable || []} singleLeagueTable={singleLeagueTable || []} activeSeason={activeSeason} totalPlayersInSeason={(activeSeason?.type === 'Co-Op' ? coopLeagueTable?.length : singleLeagueTable?.length) || 0} open={!!selectedPlayerForStats} onOpenChange={() => setSelectedPlayerForStats(null)} isAdmin={isAdmin} defendingChampionId={defendingChampionId} />
      
      <AlertDialog open={!!revertingMatch} onOpenChange={(open) => !open && setRevertingMatch(null)}>
            <AlertDialogContent className="border-amber-500 border-4 bg-background/95 backdrop-blur-2xl rounded-none">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 text-amber-500 mb-2">
                        <Undo2 className="w-8 h-8" />
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase italic pr-4">{t('revert_match_confirm_title')}</AlertDialogTitle>
                    </div>
                    {revertingMatch && (<AlertDialogDescription className="text-sm font-bold text-white/40 uppercase tracking-widest">{t('revert_match_confirm_desc', { player1: playersById[revertingMatch.player1Id]?.name, player2: playersById[revertingMatch.player2Id]?.name })}</AlertDialogDescription>)}
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-4 mt-6">
                    <AlertDialogCancel onClick={() => setRevertingMatch(null)} className="font-black uppercase tracking-widest italic rounded-none h-12">{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revertingMatch && handleRevertMatch(revertingMatch)} className="bg-amber-500 text-black hover:bg-amber-600 font-black uppercase tracking-widest italic rounded-none h-12">{t('revert_match_action')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
