'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toBlob, toPng } from 'html-to-image';
import { Copy, Check, Download, Share2, Swords, Calendar, Clock, Trophy, Zap, Shield, Flame } from 'lucide-react';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { WithId, Season, Team, Player } from '@/lib/types';

const LEAGUE_ID = 'main-league';

interface MatchShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: any | null;
  activeSeason: WithId<Season> | null;
}

// Convert any image URL (remote or local) into a self-contained base64 data URL
async function convertUrlToDataUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;

  try {
    const proxyUrl =
      url.startsWith('/') || url.includes('localhost') || url.includes('127.0.0.1')
        ? url
        : `/api/proxy-image?url=${encodeURIComponent(url)}`;

    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy status ${res.status}`);
    const blob = await res.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve(url);
        }
      };
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('convertUrlToDataUrl fallback for:', url, err);
    return url;
  }
}

// Robust lookup to find team document by id or exact/fuzzy name
function findTeamMatch(
  teamId?: string | null,
  teamName?: string | null,
  allTeams?: WithId<Team>[] | null
): WithId<Team> | null {
  if (!allTeams || allTeams.length === 0) return null;

  // 1. By exact teamId
  if (teamId) {
    const byId = allTeams.find(
      t => t.id === teamId || t.id.toLowerCase().trim() === teamId.toLowerCase().trim()
    );
    if (byId) return byId;
  }

  // 2. By teamName
  if (teamName) {
    const clean = teamName.toLowerCase().trim();
    const byExact = allTeams.find(t => t.name.toLowerCase().trim() === clean);
    if (byExact) return byExact;

    // Fuzzy: strip common football prefixes/suffixes
    const stripped = clean.replace(/\bfc\b|\bcf\b|\bsc\b|\bafc\b/g, '').replace(/[^a-z0-9]/g, '');
    if (stripped.length >= 3) {
      const byFuzzy = allTeams.find(t => {
        const tClean = t.name.toLowerCase().replace(/\bfc\b|\bcf\b|\bsc\b|\bafc\b/g, '').replace(/[^a-z0-9]/g, '');
        return tClean.length >= 3 && (stripped.includes(tClean) || tClean.includes(stripped));
      });
      if (byFuzzy) return byFuzzy;
    }
  }

  return null;
}

export function MatchShareDialog({
  open,
  onOpenChange,
  match,
  activeSeason,
}: MatchShareDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);

  // Dedicated base64 data URLs for both logos to prevent any html-to-image cache collisions
  const [logo1Src, setLogo1Src] = useState<string>('');
  const [logo2Src, setLogo2Src] = useState<string>('');

  // Fetch league table to resolve accurate ranks
  const isCoop = activeSeason?.type === 'Co-Op' || activeSeason?.type === 'Co-Op Hybrid';
  const tableName = isCoop ? 'coopLeagueTable' : 'leagueTable';

  const tableCol = useMemoFirebase(
    () => (firestore && activeSeason?.id ? collection(firestore, `leagues/${LEAGUE_ID}/seasons/${activeSeason.id}/${tableName}`) : null),
    [firestore, activeSeason?.id, tableName]
  );
  const { data: rawTableData } = useCollection<any>(tableCol);

  // Fetch teams and players to guarantee exact logo and name resolution
  const teamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams } = useCollection<WithId<Team>>(teamsCol);

  const playersCol = useMemoFirebase(() => (firestore ? collection(firestore, 'players') : null), [firestore]);
  const { data: allPlayers } = useCollection<WithId<Player>>(playersCol);

  const playersMap = useMemo(() => {
    const map: Record<string, WithId<Player>> = {};
    (allPlayers || []).forEach(p => {
      map[p.id] = p;
      map[p.name.toLowerCase().trim()] = p;
    });
    return map;
  }, [allPlayers]);

  const tableByPlayerId = useMemo(() => {
    const map: Record<string, any> = {};
    (rawTableData || []).forEach(entry => {
      if (entry.playerId) map[entry.playerId] = entry;
      if (entry.id) map[entry.id] = entry;
      if (entry.playerName) map[entry.playerName.toLowerCase().trim()] = entry;
      if (entry.teamName) map[entry.teamName.toLowerCase().trim()] = entry;
    });
    return map;
  }, [rawTableData]);

  // Compute standings rank map (id -> rank number)
  const ranksMap = useMemo(() => {
    if (!rawTableData || rawTableData.length === 0) return {} as Record<string, number>;

    const sortFn = (a: any, b: any) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
      if ((b.goalDifference ?? 0) !== (a.goalDifference ?? 0)) return (b.goalDifference ?? 0) - (a.goalDifference ?? 0);
      if ((b.goalsFor ?? 0) !== (a.goalsFor ?? 0)) return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
      if ((b.win ?? 0) !== (a.win ?? 0)) return (b.win ?? 0) - (a.win ?? 0);
      const nameA = a.playerName || a.teamName || '';
      const nameB = b.playerName || b.teamName || '';
      return nameA.localeCompare(nameB);
    };

    const sorted = [...rawTableData].sort(sortFn);
    const map: Record<string, number> = {};
    sorted.forEach((entry, idx) => {
      const rank = idx + 1;
      if (entry.id) map[entry.id] = rank;
      if (entry.playerId) map[entry.playerId] = rank;
      if (entry.playerName) map[entry.playerName.toLowerCase().trim()] = rank;
      if (entry.teamName) map[entry.teamName.toLowerCase().trim()] = rank;
    });
    return map;
  }, [rawTableData]);

  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
  const primaryHex = theme.primaryHex || '#CCFD01';

  // Comprehensive fallback resolution for Player 1 & Player 2
  const p1Id = match?.player1Id || match?.player1?.id;
  const p2Id = match?.player2Id || match?.player2?.id;

  const e1 = p1Id ? tableByPlayerId[p1Id] : null;
  const e2 = p2Id ? tableByPlayerId[p2Id] : null;

  const pl1 = p1Id ? playersMap[p1Id] : null;
  const pl2 = p2Id ? playersMap[p2Id] : null;

  const p1Name = match?.player1?.name || match?.player1Name || (isCoop ? e1?.teamName : e1?.playerName) || pl1?.name || 'Pemain 1';
  const p2Name = match?.player2?.name || match?.player2Name || (isCoop ? e2?.teamName : e2?.playerName) || pl2?.name || 'Pemain 2';

  const tid1 = match?.teamId1 || match?.team1?.id || (isCoop ? e1?.player1TeamId : e1?.teamId) || pl1?.teamId;
  const tid2 = match?.teamId2 || match?.team2?.id || (isCoop ? e2?.player1TeamId : e2?.teamId) || pl2?.teamId;

  // Resolve team object strictly and independently for side 1 and side 2
  const t1Candidate = match?.team1 || findTeamMatch(tid1, null, allTeams) || findTeamMatch(null, match?.teamName1, allTeams) || findTeamMatch(null, e1?.teamName, allTeams) || findTeamMatch(null, pl1?.teamName, allTeams);
  const t2Candidate = match?.team2 || findTeamMatch(tid2, null, allTeams) || findTeamMatch(null, match?.teamName2, allTeams) || findTeamMatch(null, e2?.teamName, allTeams) || findTeamMatch(null, pl2?.teamName, allTeams);

  const t1Name = t1Candidate?.name || match?.teamName1 || (isCoop ? e1?.player1TeamName : e1?.teamName) || pl1?.teamName || 'Tim 1';
  const t2Name = t2Candidate?.name || match?.teamName2 || (isCoop ? e2?.player1TeamName : e2?.teamName) || pl2?.teamName || 'Tim 2';

  // Double check team logo if candidate had no logoUrl
  const t1Final = t1Candidate?.logoUrl ? t1Candidate : findTeamMatch(null, t1Name, allTeams);
  const t2Final = t2Candidate?.logoUrl ? t2Candidate : findTeamMatch(null, t2Name, allTeams);

  const rawLogo1 = useMemo(() => {
    return resolveLogo(t1Final?.logoUrl || match?.team1?.logoUrl, tid1 || p1Id, p1Name);
  }, [t1Final?.logoUrl, match?.team1?.logoUrl, tid1, p1Id, p1Name]);

  const rawLogo2 = useMemo(() => {
    return resolveLogo(t2Final?.logoUrl || match?.team2?.logoUrl, tid2 || p2Id, p2Name);
  }, [t2Final?.logoUrl, match?.team2?.logoUrl, tid2, p2Id, p2Name]);

  // Pre-convert logos to base64 data URLs as soon as dialog opens or match changes
  useEffect(() => {
    let isMounted = true;
    if (!open || !match) return;

    // Immediately show direct/proxied url while async base64 finishes
    const pUrl1 = rawLogo1.startsWith('data:') || rawLogo1.startsWith('/') ? rawLogo1 : `/api/proxy-image?url=${encodeURIComponent(rawLogo1)}`;
    const pUrl2 = rawLogo2.startsWith('data:') || rawLogo2.startsWith('/') ? rawLogo2 : `/api/proxy-image?url=${encodeURIComponent(rawLogo2)}`;
    setLogo1Src(pUrl1);
    setLogo2Src(pUrl2);

    // Convert both strictly to data URLs
    Promise.all([
      convertUrlToDataUrl(rawLogo1),
      convertUrlToDataUrl(rawLogo2),
    ]).then(([d1, d2]) => {
      if (isMounted) {
        if (d1) setLogo1Src(d1);
        if (d2) setLogo2Src(d2);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, match?.id, rawLogo1, rawLogo2]);

  if (!match) return null;

  const matchDate = match.matchDate?.toDate ? match.matchDate.toDate() : new Date(match.matchDate || Date.now());
  const formattedDate = format(matchDate, 'EEEE, d MMMM yyyy', { locale: localeId });
  const formattedTime = format(matchDate, 'HH:mm', { locale: localeId }) + ' WIB';

  const isMatchBo3 = isCoop ? (match.round && match.round !== 'Group') : (match.round && match.round !== 'Group');
  const roundLabel = match.round === 'Group' || !match.round ? 'FASE GRUP' : match.round.toUpperCase();

  const getShareText = () => {
    const rank1 = (p1Id && ranksMap[p1Id]) || ranksMap[p1Name.toLowerCase().trim()] || '-';
    const rank2 = (p2Id && ranksMap[p2Id]) || ranksMap[p2Name.toLowerCase().trim()] || '-';

    return `⚽ *BM LEAGUE 88* ⚽
🏆 *${activeSeason?.name || 'BM LEAGUE'}* [${roundLabel}]
⚔️ *${p1Name}* (${t1Name}, Rank : ${rank1})  *VS*  *${p2Name}* (${t2Name}, Rank: ${rank2})
📅 *Hari/Tgl:* ${formattedDate}

_Pantau statistik & live update di BM League 88 Web App!_`;
  };

  // Helper to ensure DOM image elements have distinct base64 data URLs before html-to-image runs
  const prepareCardImages = async () => {
    const [final1, final2] = await Promise.all([
      logo1Src.startsWith('data:') ? logo1Src : convertUrlToDataUrl(rawLogo1),
      logo2Src.startsWith('data:') ? logo2Src : convertUrlToDataUrl(rawLogo2),
    ]);

    if (cardRef.current) {
      const imgs = cardRef.current.querySelectorAll('img');
      if (imgs.length >= 2) {
        if (final1) imgs[0].src = final1;
        if (final2) imgs[1].src = final2;
      }
    }

    return { final1, final2 };
  };

  const captureOptions = {
    includeQueryParams: true,
    cacheBust: false,
    pixelRatio: 2,
    backgroundColor: '#05070B',
    skipFonts: false,
  };

  const handleCopyBoth = async () => {
    if (!cardRef.current) return;
    try {
      setIsCopyingImage(true);

      // 1. Ensure DOM contains distinct Base64 data URLs
      await prepareCardImages();

      // 2. Render image blob via html-to-image
      const blob = await toBlob(cardRef.current, captureOptions);
      if (!blob) throw new Error('Gagal merender poster kartu.');

      let imageCopied = false;

      // 3. Copy image to system clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        try {
          const item = new window.ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          imageCopied = true;
        } catch (imgErr) {
          console.warn('Clipboard write image failed:', imgErr);
        }
      }

      if (imageCopied) {
        setIsCopiedImage(true);
        toast({
          title: 'Gambar Kartu Berhasil Disalin! 📋',
          description: 'Tekan Ctrl+V di WhatsApp untuk paste gambar. Gunakan tombol "Kirim ke WA" atau "Salin Teks" untuk teksnya.',
        });
        setTimeout(() => setIsCopiedImage(false), 3500);
      } else {
        // Fallback: auto download PNG
        const dataUrl = await toPng(cardRef.current, captureOptions);
        const link = document.createElement('a');
        link.download = `BM88-${p1Name}-vs-${p2Name}.png`;
        link.href = dataUrl;
        link.click();
        setIsCopiedImage(true);
        toast({
          title: 'Gambar Terunduh! 📥',
          description: 'Gambar otomatis diunduh untuk dikirim ke WA.',
        });
        setTimeout(() => setIsCopiedImage(false), 3500);
      }
    } catch (err: any) {
      console.error('Copy image error:', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Memproses Kartu',
        description: err.message || 'Terjadi kesalahan saat merender kartu.',
      });
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handleSendToWhatsApp = async () => {
    // 1. Copy image first so user can simply Ctrl+V after WhatsApp opens
    if (cardRef.current) {
      try {
        await prepareCardImages();
        const blob = await toBlob(cardRef.current, captureOptions);
        if (blob && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        }
      } catch (e) {
        console.warn('Silent copy image for WA link failed:', e);
      }
    }

    // 2. Open WhatsApp with prefilled message
    const shareText = getShareText();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');

    toast({
      title: 'WhatsApp Dibuka & Gambar Disalin! 🚀',
      description: 'Pilih chat di WA, teks sudah terisi otomatis. Tinggal tekan Ctrl+V untuk lampirkan gambarnya!',
    });
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsCopyingImage(true);
      await prepareCardImages();
      const dataUrl = await toPng(cardRef.current, captureOptions);
      const link = document.createElement('a');
      link.download = `BM88-MATCH-${p1Name}-vs-${p2Name}.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: 'Gambar Berhasil Diunduh!',
        description: 'File resolusi tinggi siap dibagikan ke WhatsApp.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengunduh Gambar',
        description: err.message,
      });
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handleCopyText = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text);
    setIsCopiedText(true);
    toast({
      title: 'Teks WA Disalin! 💬',
      description: 'Format pesan teks rapi siap dipaste ke caption gambar di WhatsApp.',
    });
    setTimeout(() => setIsCopiedText(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl w-[95vw] sm:w-[92vw] max-h-[92vh] flex flex-col bg-[#05070b]/98 border border-white/20 p-0 overflow-hidden rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] z-50 text-white"
      >
        {/* Header Modal Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl border flex items-center justify-center shadow-lg"
              style={{ 
                backgroundColor: `${primaryHex}18`, 
                borderColor: `${primaryHex}40`,
                boxShadow: `0 0 15px ${primaryHex}20` 
              }}
            >
              <Share2 className="w-4 h-4" style={{ color: primaryHex }} />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-black uppercase italic tracking-wider font-headline text-white flex items-center gap-2">
                Share Kartu Pertandingan
                <span className="text-[10px] not-italic font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  ULTRA SPORT HD
                </span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/50 font-medium">
                Bagikan poster jadwal / duel pertandingan langsung ke WhatsApp
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* The Capture Canvas Container - Scrollable if viewport is small, perfectly centered */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 flex items-center justify-center bg-black/40">
          <div 
            ref={cardRef}
            className="w-full max-w-[500px] rounded-[1.5rem] p-5 sm:p-6 relative overflow-hidden font-sans select-none flex flex-col justify-between"
            style={{
              backgroundColor: '#05070B',
              boxShadow: `0 20px 50px -10px rgba(0,0,0,0.95), 0 0 35px ${primaryHex}20`,
              border: `1.5px solid ${primaryHex}50`,
            }}
          >
            {/* Ambient High-Tech Cyber Grid & Neon Flare Background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
              }}
            />
            {/* Center Neon Radial Glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full pointer-events-none blur-[100px] opacity-20"
              style={{ backgroundColor: primaryHex }}
            />
            {/* Corner Tech Accent Flairs */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl pointer-events-none" style={{ borderColor: primaryHex }} />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl pointer-events-none" style={{ borderColor: primaryHex }} />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl pointer-events-none" style={{ borderColor: primaryHex }} />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-xl pointer-events-none" style={{ borderColor: primaryHex }} />

            {/* TOP HEADER: Completely Symmetrical Broadcast Bar */}
            <div className="relative z-10 flex items-center justify-between pb-4 mb-4 border-b border-white/15">
              {/* Left: League Badge */}
              <div className="flex items-center gap-2">
                <div 
                  className="px-3 py-1 rounded-md font-black text-[11px] uppercase italic tracking-wider flex items-center gap-1.5 shadow-md"
                  style={{
                    backgroundColor: primaryHex,
                    color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
                  }}
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  BM LEAGUE 88
                </div>
                <div className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/80 border border-white/10">
                  {roundLabel}
                </div>
              </div>

              {/* Right: Season Title Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 shadow-inner">
                <Zap className="w-3.5 h-3.5 fill-current" style={{ color: primaryHex }} />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 truncate max-w-[180px]">
                  {activeSeason?.name || 'CHAMPIONSHIP'}
                </span>
              </div>
            </div>

            {/* MAIN BATTLE ARENA: Symmetrical 3-Column Grid */}
            <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4">
              {/* Player 1 (Home) */}
              <div className="flex flex-col items-center text-center justify-center space-y-2.5 px-2">
                {/* Logo Frame */}
                <div className="relative group">
                  <div 
                    className="absolute -inset-2 rounded-2xl blur-lg opacity-40 transition-all"
                    style={{ backgroundColor: primaryHex }}
                  />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-[#151c28] to-[#0a0f16] border-2 border-white/20 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                    {/* Inner Cyber Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    {logo1Src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={logo1Src} 
                        alt={p1Name} 
                        className="w-full h-full object-contain relative z-10 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <Shield className="w-10 h-10 text-white/30 relative z-10" />
                    )}
                  </div>
                </div>

                {/* Name & Club */}
                <div className="w-full flex flex-col items-center">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight font-headline truncate w-full text-center drop-shadow">
                    {p1Name}
                  </h3>
                  <div className="mt-0.5 px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/10 max-w-full">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/70 truncate text-center" style={{ color: primaryHex }}>
                      {t1Name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Center VS / Score Broadcast Core */}
              <div className="flex flex-col items-center justify-center px-2">
                {match.isCompleted ? (
                  <div className="flex flex-col items-center">
                    {/* Futuristic Score Box */}
                    <div 
                      className="px-5 py-2 rounded-2xl border-2 flex items-center gap-3.5 shadow-2xl backdrop-blur-md"
                      style={{
                        backgroundColor: 'rgba(5, 7, 11, 0.85)',
                        borderColor: `${primaryHex}80`,
                        boxShadow: `0 0 25px ${primaryHex}35`,
                      }}
                    >
                      <span className="text-3xl sm:text-4xl font-black italic font-headline text-white tracking-tighter">
                        {match.player1Score ?? 0}
                      </span>
                      <span className="text-white/30 text-sm font-black">:</span>
                      <span className="text-3xl sm:text-4xl font-black italic font-headline text-white tracking-tighter">
                        {match.player2Score ?? 0}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                      <Trophy className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        HASIL AKHIR
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    {/* Modern VS Emblem */}
                    <div className="relative">
                      <div 
                        className="w-13 h-13 rounded-2xl border-2 flex items-center justify-center shadow-2xl relative z-10"
                        style={{
                          backgroundColor: '#0c111c',
                          borderColor: `${primaryHex}70`,
                          boxShadow: `0 0 20px ${primaryHex}30`
                        }}
                      >
                        <Swords className="w-6 h-6" style={{ color: primaryHex }} />
                      </div>
                    </div>

                    <div 
                      className="mt-2 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest italic"
                      style={{
                        backgroundColor: `${primaryHex}15`,
                        borderColor: `${primaryHex}40`,
                        color: primaryHex,
                      }}
                    >
                      {isMatchBo3 ? 'BEST OF 3' : 'MATCH DUEL'}
                    </div>
                  </div>
                )}
              </div>

              {/* Player 2 (Away) */}
              <div className="flex flex-col items-center text-center justify-center space-y-2.5 px-2">
                {/* Logo Frame */}
                <div className="relative group">
                  <div 
                    className="absolute -inset-2 rounded-2xl blur-lg opacity-40 transition-all"
                    style={{ backgroundColor: primaryHex }}
                  />
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-[#151c28] to-[#0a0f16] border-2 border-white/20 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                    {/* Inner Cyber Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    {logo2Src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={logo2Src} 
                        alt={p2Name} 
                        className="w-full h-full object-contain relative z-10 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" 
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <Shield className="w-10 h-10 text-white/30 relative z-10" />
                    )}
                  </div>
                </div>

                {/* Name & Club */}
                <div className="w-full flex flex-col items-center">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight font-headline truncate w-full text-center drop-shadow">
                    {p2Name}
                  </h3>
                  <div className="mt-0.5 px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/10 max-w-full">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/70 truncate text-center" style={{ color: primaryHex }}>
                      {t2Name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM FOOTER: Symmetrical Match Schedule & Branding */}
            <div className="relative z-10 mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between text-[10px] font-mono font-bold">
              <div className="flex items-center gap-1.5 text-white/80">
                <Calendar className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/90">
                <Clock className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                <span className="font-mono text-white tracking-wider">{formattedTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Kirim WA Langsung, Salin Gambar, Salin Teks, Unduh */}
        <div className="p-4 sm:p-5 pt-3 flex flex-wrap gap-2.5 bg-[#05070b] border-t border-white/10 shrink-0 z-20">
          <Button
            type="button"
            onClick={handleSendToWhatsApp}
            className="flex-1 min-w-[200px] h-11 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all duration-300 shadow-lg bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400/40"
          >
            <Share2 className="w-4 h-4 mr-2" />
            KIRIM LANGSUNG KE WA
          </Button>

          <Button
            type="button"
            onClick={handleCopyBoth}
            disabled={isCopyingImage}
            className="flex-1 min-w-[170px] h-11 rounded-xl font-black text-xs uppercase italic tracking-wider transition-all duration-300 shadow-lg"
            style={{
              backgroundColor: primaryHex,
              color: theme.themeKey === 'crimson' ? '#ffffff' : '#000000',
              boxShadow: `0 0 20px ${primaryHex}60`
            }}
          >
            {isCopiedImage ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Gambar Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {isCopyingImage ? 'Menyiapkan Gambar...' : 'SALIN GAMBAR'}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCopyText}
            className="h-11 px-4 rounded-xl border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase italic"
          >
            {isCopiedText ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                Teks Disalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5" />
                SALIN TEKS CAPTION
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadImage}
            disabled={isCopyingImage}
            className="h-11 px-3.5 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold uppercase"
          >
            <Download className="w-4 h-4 mr-1" />
            PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
