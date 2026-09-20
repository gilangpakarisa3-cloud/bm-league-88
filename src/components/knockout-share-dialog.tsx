'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toBlob, toPng } from 'html-to-image';
import { Copy, Check, Download, Share2, Swords, Calendar, Clock, Trophy, Zap, Shield, Flame, Crown } from 'lucide-react';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';
import { useToast } from '@/hooks/use-toast';
import type { WithId, Season, Team, Player, Match, LeagueEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface KnockoutShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: WithId<Match>[];
  playersById?: Record<string, WithId<Player>>;
  teamsById?: Record<string, WithId<Team>>;
  leagueTable?: (WithId<LeagueEntry> & { player?: WithId<Player>; team?: WithId<Team> })[];
  season: WithId<Season> | null;
}

// Convert any image URL into a self-contained base64 data URL
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

export function KnockoutShareDialog({
  open,
  onOpenChange,
  matches,
  playersById = {},
  teamsById = {},
  leagueTable = [],
  season,
}: KnockoutShareDialogProps) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);

  // Map of logo identifiers to Base64 Data URLs
  const [logosBase64Map, setLogosBase64Map] = useState<Record<string, string>>({});

  const theme = useMemo(() => getSeasonTheme(season), [season]);
  const primaryHex = theme.primaryHex || '#CCFD01';

  const isSingleHybrid = season?.type === 'Single Hybrid';
  const isCoopHybrid = season?.type === 'Co-Op Hybrid';

  // Sort league table for projections
  const rankedTable = useMemo(() => {
    if (!leagueTable) return [];
    return [...leagueTable].sort((a, b) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
      if ((b.goalDifference ?? 0) !== (a.goalDifference ?? 0)) return (b.goalDifference ?? 0) - (a.goalDifference ?? 0);
      if ((b.goalsFor ?? 0) !== (a.goalsFor ?? 0)) return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
      if ((b.win ?? 0) !== (a.win ?? 0)) return (b.win ?? 0) - (a.win ?? 0);
      const nameA = a.playerName || a.teamName || '';
      const nameB = b.playerName || b.teamName || '';
      return nameA.localeCompare(nameB);
    });
  }, [leagueTable]);

  // Dynamic bracket projection when playoff matches are not generated yet
  const projections = useMemo(() => {
    const proj: Record<string, any> = {};
    if (rankedTable.length >= 8) {
      proj['playoff-m1'] = { p1: rankedTable[0], p2: rankedTable[7] };
      proj['playoff-m2'] = { p1: rankedTable[3], p2: rankedTable[4] };
      proj['playoff-m3'] = { p1: rankedTable[1], p2: rankedTable[6] };
      proj['playoff-m4'] = { p1: rankedTable[2], p2: rankedTable[5] };

      proj['playoff-sf1'] = {
        p1: { playerName: 'Pemenang QF 1', teamName: 'Seed #1/#8', id: 'TBD-W1' },
        p2: { playerName: 'Pemenang QF 2', teamName: 'Seed #4/#5', id: 'TBD-W2' },
      };
      proj['playoff-sf2'] = {
        p1: { playerName: 'Pemenang QF 3', teamName: 'Seed #2/#7', id: 'TBD-W3' },
        p2: { playerName: 'Pemenang QF 4', teamName: 'Seed #3/#6', id: 'TBD-W4' },
      };
      proj['playoff-final'] = {
        p1: { playerName: 'Finalis 1', teamName: 'Pemenang SF 1', id: 'TBD-F1' },
        p2: { playerName: 'Finalis 2', teamName: 'Pemenang SF 2', id: 'TBD-F2' },
      };
    }
    return proj;
  }, [rankedTable]);

  // Actual match data mapped by bracketId
  const bracketData = useMemo(() => {
    const d: Record<string, any> = {};
    (matches || []).forEach(m => {
      if (m.bracketId) {
        const isBo3 = m.round && m.round !== 'Group';
        const e1 = rankedTable.find(e => (e.playerId || e.id) === m.player1Id) as any;
        const e2 = rankedTable.find(e => (e.playerId || e.id) === m.player2Id) as any;
        const t1Id = e1?.teamId || e1?.player1TeamId || playersById[m.player1Id]?.teamId || '';
        const t2Id = e2?.teamId || e2?.player1TeamId || playersById[m.player2Id]?.teamId || '';
        const t1 = t1Id ? teamsById[t1Id] : null;
        const t2 = t2Id ? teamsById[t2Id] : null;
        const s1 = isBo3 ? (m.player1Wins ?? 0) : (m.player1Score ?? 0);
        const s2 = isBo3 ? (m.player2Wins ?? 0) : (m.player2Score ?? 0);

        d[m.bracketId] = {
          ...m,
          p1: e1 ? { name: e1.playerName || e1.teamName, id: e1.playerId || e1.id } : (playersById[m.player1Id] || { name: m.player1Id, id: m.player1Id }),
          p2: e2 ? { name: e2.playerName || e2.teamName, id: e2.playerId || e2.id } : (playersById[m.player2Id] || { name: m.player2Id, id: m.player2Id }),
          t1,
          t2,
          s1,
          s2,
          isW1: m.isCompleted && s1 > s2,
          isW2: m.isCompleted && s2 > s1,
        };
      }
    });
    return d;
  }, [matches, playersById, teamsById, rankedTable]);

  const hasGeneratedPlayoffs = useMemo(() => {
    return Object.keys(bracketData).length > 0;
  }, [bracketData]);

  // Pre-load all team logos as Base64 Data URLs
  useEffect(() => {
    let isMounted = true;
    if (!open) return;

    const urlsToFetch: Record<string, string> = {};

    // From rankedTable
    rankedTable.forEach(entry => {
      const tid = entry.teamId || (entry as any).player1TeamId;
      const t = (tid && teamsById[tid]) || entry.team;
      const rawLogo = resolveLogo((entry as any).logoUrl || t?.logoUrl, tid || entry.playerId || entry.id, entry.playerName || entry.teamName);
      if (rawLogo) urlsToFetch[entry.playerId || entry.id] = rawLogo;
    });

    // From teamsById
    Object.values(teamsById).forEach(t => {
      if (t?.logoUrl) urlsToFetch[t.id] = t.logoUrl;
    });

    const entries = Object.entries(urlsToFetch);
    Promise.all(
      entries.map(async ([key, url]) => {
        const dataUrl = await convertUrlToDataUrl(url);
        return [key, dataUrl] as [string, string];
      })
    ).then(results => {
      if (isMounted) {
        const map: Record<string, string> = {};
        results.forEach(([k, du]) => {
          map[k] = du;
        });
        setLogosBase64Map(map);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, rankedTable, teamsById]);

  const now = new Date();
  const formattedDate = format(now, 'EEEE, d MMMM yyyy', { locale: localeId });
  const formattedTime = format(now, 'HH:mm', { locale: localeId }) + ' WIB';

  // Helper to extract match or projection details
  const getMatchDisplay = (bid: string, fallbackLabel: string, seedA?: string, seedB?: string) => {
    const m = bracketData[bid];
    const proj = projections[bid];

    if (m) {
      const p1Name = m.p1?.name || 'TBD';
      const p2Name = m.p2?.name || 'TBD';
      const t1Name = m.t1?.name || (m.p1?.id && rankedTable.find(e => (e.playerId || e.id) === m.p1.id)?.teamName) || '';
      const t2Name = m.t2?.name || (m.p2?.id && rankedTable.find(e => (e.playerId || e.id) === m.p2.id)?.teamName) || '';
      const t1Logo = logosBase64Map[m.p1?.id] || logosBase64Map[m.t1?.id] || resolveLogo(m.t1?.logoUrl, m.p1?.id, p1Name);
      const t2Logo = logosBase64Map[m.p2?.id] || logosBase64Map[m.t2?.id] || resolveLogo(m.t2?.logoUrl, m.p2?.id, p2Name);

      return {
        label: fallbackLabel,
        p1Name,
        p2Name,
        t1Name,
        t2Name,
        t1Logo,
        t2Logo,
        s1: m.s1 ?? 0,
        s2: m.s2 ?? 0,
        isCompleted: m.isCompleted,
        isLive: m.status === 'Live',
        isW1: m.isW1,
        isW2: m.isW2,
        isProjection: false,
      };
    }

    if (proj) {
      const p1Name = proj.p1?.playerName || proj.p1?.teamName || 'TBD';
      const p2Name = proj.p2?.playerName || proj.p2?.teamName || 'TBD';
      const t1Name = proj.p1?.teamName || '';
      const t2Name = proj.p2?.teamName || '';
      const t1Logo = logosBase64Map[proj.p1?.playerId || proj.p1?.id] || '';
      const t2Logo = logosBase64Map[proj.p2?.playerId || proj.p2?.id] || '';

      return {
        label: fallbackLabel,
        p1Name: `${seedA ? `[${seedA}] ` : ''}${p1Name}`,
        p2Name: `${seedB ? `[${seedB}] ` : ''}${p2Name}`,
        t1Name,
        t2Name,
        t1Logo,
        t2Logo,
        s1: 0,
        s2: 0,
        isCompleted: false,
        isLive: false,
        isW1: false,
        isW2: false,
        isProjection: true,
      };
    }

    return {
      label: fallbackLabel,
      p1Name: seedA ? `[${seedA}] TBD` : 'TBD',
      p2Name: seedB ? `[${seedB}] TBD` : 'TBD',
      t1Name: '',
      t2Name: '',
      t1Logo: '',
      t2Logo: '',
      s1: 0,
      s2: 0,
      isCompleted: false,
      isLive: false,
      isW1: false,
      isW2: false,
      isProjection: true,
    };
  };

  const qf1 = getMatchDisplay('playoff-m1', 'QF 1', '#1', '#8');
  const qf2 = getMatchDisplay('playoff-m2', 'QF 2', '#4', '#5');
  const qf3 = getMatchDisplay('playoff-m3', 'QF 3', '#2', '#7');
  const qf4 = getMatchDisplay('playoff-m4', 'QF 4', '#3', '#6');

  const sf1 = getMatchDisplay('playoff-sf1', 'SEMIFINAL 1', 'QF1', 'QF2');
  const sf2 = getMatchDisplay('playoff-sf2', 'SEMIFINAL 2', 'QF3', 'QF4');

  const finalMatch = getMatchDisplay(
    bracketData['playoff-final'] ? 'playoff-final' : (bracketData['playoff-m18'] ? 'playoff-m18' : 'playoff-final'),
    'GRAND FINAL',
    'SF1',
    'SF2'
  );

  const getShareText = () => {
    const seasonTitle = season?.name || 'BM LEAGUE 88';
    const statusNotice = hasGeneratedPlayoffs ? 'STATUS RESMI (LIVE)' : 'PROYEKSI KLASEMEN (LIVE)';

    let text = `⚔️ *BAGAN PLAYOFF KNOCKOUT - BM LEAGUE 88* ⚔️\n🏆 *${seasonTitle}* [${statusNotice}]\n📅 *Per:* ${formattedDate}\n\n`;

    text += `🥊 *8 BESAR (QUARTERFINALS - BO3):*\n`;
    text += `• *QF 1:* ${qf1.p1Name} vs ${qf1.p2Name} ${qf1.isCompleted || qf1.isLive ? `[${qf1.s1} - ${qf1.s2}]` : ''}\n`;
    text += `• *QF 2:* ${qf2.p1Name} vs ${qf2.p2Name} ${qf2.isCompleted || qf2.isLive ? `[${qf2.s1} - ${qf2.s2}]` : ''}\n`;
    text += `• *QF 3:* ${qf3.p1Name} vs ${qf3.p2Name} ${qf3.isCompleted || qf3.isLive ? `[${qf3.s1} - ${qf3.s2}]` : ''}\n`;
    text += `• *QF 4:* ${qf4.p1Name} vs ${qf4.p2Name} ${qf4.isCompleted || qf4.isLive ? `[${qf4.s1} - ${qf4.s2}]` : ''}\n\n`;

    text += `⚡ *SEMIFINALS (BO3):*\n`;
    text += `• *SF 1:* ${sf1.p1Name} vs ${sf1.p2Name} ${sf1.isCompleted || sf1.isLive ? `[${sf1.s1} - ${sf1.s2}]` : ''}\n`;
    text += `• *SF 2:* ${sf2.p1Name} vs ${sf2.p2Name} ${sf2.isCompleted || sf2.isLive ? `[${sf2.s1} - ${sf2.s2}]` : ''}\n\n`;

    text += `👑 *GRAND FINAL (CHAMPIONSHIP):*\n`;
    text += `• *FINAL:* ${finalMatch.p1Name} vs ${finalMatch.p2Name} ${finalMatch.isCompleted || finalMatch.isLive ? `[${finalMatch.s1} - ${finalMatch.s2}]` : ''}\n`;

    if (finalMatch.isCompleted) {
      const champ = finalMatch.isW1 ? finalMatch.p1Name : finalMatch.p2Name;
      text += `\n🏆 *CHAMPION:* 🥇 *${champ}* 🥇\n`;
    }

    text += `\n_Pantau live bracket & statistik di BM League 88 Web App!_`;
    return text;
  };

  const prepareCardImages = async () => {
    if (!cardRef.current) return;
    const imgs = cardRef.current.querySelectorAll('img');
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src = img.src;
      if (src && !src.startsWith('data:')) {
        const dataUrl = await convertUrlToDataUrl(src);
        if (dataUrl) img.src = dataUrl;
      }
    }
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
      await prepareCardImages();

      const blob = await toBlob(cardRef.current, captureOptions);
      if (!blob) throw new Error('Gagal merender poster bagan.');

      let imageCopied = false;
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
          title: 'Bagan Playoff Berhasil Disalin! 📋',
          description: 'Tekan Ctrl+V di WhatsApp untuk paste poster bagan knockout.',
        });
        setTimeout(() => setIsCopiedImage(false), 3500);
      } else {
        const dataUrl = await toPng(cardRef.current, captureOptions);
        const link = document.createElement('a');
        link.download = `BM88-PLAYOFF-${format(now, 'yyyyMMdd-HHmm')}.png`;
        link.href = dataUrl;
        link.click();
        setIsCopiedImage(true);
        toast({
          title: 'Gambar Terunduh! 📥',
          description: 'Poster bagan knockout otomatis diunduh.',
        });
        setTimeout(() => setIsCopiedImage(false), 3500);
      }
    } catch (err: any) {
      console.error('Copy knockout image error:', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Memproses Poster Bagan',
        description: err.message || 'Terjadi kesalahan saat merender bagan.',
      });
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handleSendToWhatsApp = async () => {
    if (cardRef.current) {
      try {
        await prepareCardImages();
        const blob = await toBlob(cardRef.current, captureOptions);
        if (blob && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        }
      } catch (e) {
        console.warn('Silent copy for WA failed:', e);
      }
    }

    const shareText = getShareText();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');

    toast({
      title: 'WhatsApp Dibuka & Gambar Disalin! 🚀',
      description: 'Pilih chat di WA, ringkasan bagan sudah terisi otomatis. Tinggal tekan Ctrl+V untuk lampirkan gambarnya!',
    });
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsCopyingImage(true);
      await prepareCardImages();
      const dataUrl = await toPng(cardRef.current, captureOptions);
      const link = document.createElement('a');
      link.download = `BM88-PLAYOFF-${format(now, 'yyyyMMdd-HHmm')}.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: 'Gambar Bagan Diunduh!',
        description: 'File resolusi tinggi siap dibagikan ke WhatsApp / Media Sosial.',
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
      title: 'Teks Bagan Disalin! 💬',
      description: 'Format ringkasan babak knockout rapi siap dipaste ke WhatsApp.',
    });
    setTimeout(() => setIsCopiedText(false), 2500);
  };

  // Mini Match Pod for Bracket Card
  const MatchPod = ({ m, isFinal = false }: { m: ReturnType<typeof getMatchDisplay>; isFinal?: boolean }) => {
    return (
      <div className={cn(
        "rounded-xl border p-2 relative overflow-hidden bg-black/70 backdrop-blur-md transition-all",
        isFinal 
          ? "border-amber-400/60 bg-gradient-to-b from-[#1c1304] to-black shadow-[0_0_25px_rgba(251,191,36,0.2)]" 
          : "border-white/15 hover:border-white/30"
      )}>
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-[8px] font-mono font-bold text-white/50 uppercase">
          <span>{m.label}</span>
          {m.isLive ? (
            <span className="text-red-400 animate-pulse font-black">LIVE BO3</span>
          ) : m.isCompleted ? (
            <span className="text-emerald-400 font-black">SELESAI</span>
          ) : m.isProjection ? (
            <span className="text-amber-400 font-black">PROYEKSI</span>
          ) : (
            <span className="text-white/40">BO3</span>
          )}
        </div>

        {/* Player 1 Row */}
        <div className={cn(
          "flex items-center justify-between py-1 px-1.5 rounded-lg text-[10px]",
          m.isW1 ? "bg-emerald-500/15 text-emerald-300 font-black" : "text-white"
        )}>
          <div className="flex items-center gap-1.5 truncate pr-2">
            <div className="w-4 h-4 rounded-md bg-black/60 border border-white/15 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
              {m.t1Logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.t1Logo} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
              ) : (
                <Shield className="w-2.5 h-2.5 text-white/40" />
              )}
            </div>
            <span className="truncate font-headline italic uppercase tracking-tight">{m.p1Name}</span>
          </div>
          <span className="font-mono font-black text-[11px] shrink-0">{m.isCompleted || m.isLive ? m.s1 : '-'}</span>
        </div>

        {/* Player 2 Row */}
        <div className={cn(
          "flex items-center justify-between py-1 px-1.5 rounded-lg text-[10px]",
          m.isW2 ? "bg-emerald-500/15 text-emerald-300 font-black" : "text-white"
        )}>
          <div className="flex items-center gap-1.5 truncate pr-2">
            <div className="w-4 h-4 rounded-md bg-black/60 border border-white/15 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
              {m.t2Logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.t2Logo} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
              ) : (
                <Shield className="w-2.5 h-2.5 text-white/40" />
              )}
            </div>
            <span className="truncate font-headline italic uppercase tracking-tight">{m.p2Name}</span>
          </div>
          <span className="font-mono font-black text-[11px] shrink-0">{m.isCompleted || m.isLive ? m.s2 : '-'}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl w-[96vw] sm:w-[92vw] max-h-[92vh] flex flex-col bg-[#05070b]/98 border border-white/20 p-0 overflow-hidden rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.95)] z-50 text-white"
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
              <Swords className="w-4 h-4" style={{ color: primaryHex }} />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-black uppercase italic tracking-wider font-headline text-white flex items-center gap-2">
                Share Poster Bagan Playoff
                <span className="text-[10px] not-italic font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  KNOCKOUT HUD
                </span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/50 font-medium">
                Bagikan bagan babak gugur (Knockout BO3) langsung ke WhatsApp
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Capture Canvas Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 flex items-center justify-center bg-black/40">
          <div 
            ref={cardRef}
            className="w-full max-w-[560px] rounded-[1.5rem] p-4 sm:p-6 relative overflow-hidden font-sans select-none flex flex-col justify-between"
            style={{
              backgroundColor: '#05070B',
              boxShadow: `0 20px 50px -10px rgba(0,0,0,0.95), 0 0 35px ${primaryHex}20`,
              border: `1.5px solid ${primaryHex}50`,
            }}
          >
            {/* Ambient High-Tech Cyber Grid & Neon Flare Background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
              }}
            />
            {/* Corner Tech Accent Flairs */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl pointer-events-none" style={{ borderColor: primaryHex }} />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl pointer-events-none" style={{ borderColor: primaryHex }} />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl pointer-events-none" style={{ borderColor: primaryHex }} />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-xl pointer-events-none" style={{ borderColor: primaryHex }} />

            {/* TOP HEADER: Broadcast Banner */}
            <div className="relative z-10 flex items-center justify-between pb-3 mb-3 border-b border-white/15">
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
                  PLAYOFF BRACKET
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 shadow-inner">
                <Zap className="w-3.5 h-3.5 fill-current" style={{ color: primaryHex }} />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 truncate max-w-[180px]">
                  {season?.name || 'CHAMPIONSHIP'}
                </span>
              </div>
            </div>

            {/* Sub-notice (Official vs Projections) */}
            <div className="relative z-10 mb-3 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-1.5" style={{ color: primaryHex }}>
                <span className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(204,253,1,0.8)]" style={{ backgroundColor: primaryHex }} />
                <span>
                  {hasGeneratedPlayoffs ? 'FASE KNOCKOUT • BEST OF 3 • KALAH = GUGUR' : 'PROYEKSI BAGAN 8 BESAR (LIVE TELEMETRY)'}
                </span>
              </div>
              <span className="text-white/40 font-mono">ROAD TO APEX GLORY</span>
            </div>

            {/* BRACKET OVERVIEW: 3 Distinct Stages */}
            <div className="relative z-10 space-y-3">
              {/* Stage 1: 8 Besar (Quarterfinals) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-white/60 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryHex }} />
                    <span>STAGE 01 // 8 BESAR (QUARTERFINALS)</span>
                  </div>
                  <span className="text-[8px] text-white/30">BO3 SERIES</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MatchPod m={qf1} />
                  <MatchPod m={qf2} />
                  <MatchPod m={qf3} />
                  <MatchPod m={qf4} />
                </div>
              </div>

              {/* Stage 2: Semifinals */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>STAGE 02 // SEMIFINALS</span>
                  </div>
                  <span className="text-[8px] text-cyan-400/60">TIER-02 BATTLE</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MatchPod m={sf1} />
                  <MatchPod m={sf2} />
                </div>
              </div>

              {/* Stage 3: Grand Final Championship Podium */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>STAGE 03 // GRAND FINAL CHAMPIONSHIP</span>
                  </div>
                  <span className="text-[8px] text-amber-400/80">APEX CLASH 🏆</span>
                </div>
                <MatchPod m={finalMatch} isFinal={true} />
              </div>
            </div>

            {/* BOTTOM FOOTER: Symmetrical Match Schedule & Branding */}
            <div className="relative z-10 mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[10px] font-mono font-bold">
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
                SALIN TEKS BAGAN
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
