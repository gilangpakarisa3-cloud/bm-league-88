'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toBlob, toPng } from 'html-to-image';
import { Copy, Check, Download, Share2, Calendar, Clock, Trophy, Zap, Shield, Flame, Scan, Medal } from 'lucide-react';
import { resolveLogo } from '@/lib/logo-utils';
import { getSeasonTheme } from '@/lib/season-theme';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { WithId, Season, Team, Player, LeagueEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StandingsShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableData: (WithId<LeagueEntry> & { player?: WithId<Player>; team?: WithId<Team>; logoUrl?: string })[];
  activeSeason: WithId<Season> | null;
  seasonType?: Season['type'];
  divisionTitle?: string;
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

export function StandingsShareDialog({
  open,
  onOpenChange,
  tableData,
  activeSeason,
  seasonType,
  divisionTitle,
}: StandingsShareDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);

  // Map of team/player logo to base64 Data URL
  const [logosBase64Map, setLogosBase64Map] = useState<Record<string, string>>({});

  // Fetch teams to ensure team logo resolution
  const teamsCol = useMemoFirebase(() => (firestore ? collection(firestore, 'teams') : null), [firestore]);
  const { data: allTeams } = useCollection<WithId<Team>>(teamsCol);

  const teamsMap = useMemo(() => {
    const map: Record<string, WithId<Team>> = {};
    (allTeams || []).forEach(t => {
      map[t.id] = t;
      map[t.name.toLowerCase().trim()] = t;
    });
    return map;
  }, [allTeams]);

  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);
  const primaryHex = theme.primaryHex || '#CCFD01';

  const isCoop = seasonType === 'Co-Op' || seasonType === 'Co-Op Hybrid';
  const isSingleHybrid = seasonType === 'Single Hybrid';

  // Sorted and enriched table rows
  const sortedTable = useMemo(() => {
    if (!tableData) return [];
    return [...tableData].sort((a, b) => {
      if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
      if ((b.goalDifference ?? 0) !== (a.goalDifference ?? 0)) return (b.goalDifference ?? 0) - (a.goalDifference ?? 0);
      if ((b.goalsFor ?? 0) !== (a.goalsFor ?? 0)) return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
      if ((b.win ?? 0) !== (a.win ?? 0)) return (b.win ?? 0) - (a.win ?? 0);
      const nameA = a.playerName || a.teamName || '';
      const nameB = b.playerName || b.teamName || '';
      return nameA.localeCompare(nameB);
    });
  }, [tableData]);

  // Pre-load all team logos as Base64 Data URLs
  useEffect(() => {
    let isMounted = true;
    if (!open || sortedTable.length === 0) return;

    const urlsToFetch: Record<string, string> = {};

    sortedTable.forEach(entry => {
      const tid = entry.teamId || (entry as any).player1TeamId;
      const t = (tid && teamsMap[tid]) || (entry.teamName && teamsMap[entry.teamName.toLowerCase().trim()]) || entry.team;
      const rawLogo = resolveLogo((entry as any).logoUrl || t?.logoUrl, tid || entry.playerId || entry.id, entry.playerName || entry.teamName);
      if (rawLogo) {
        urlsToFetch[entry.id || entry.playerId] = rawLogo;
      }
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
  }, [open, sortedTable, teamsMap]);

  const now = new Date();
  const formattedDate = format(now, 'EEEE, d MMMM yyyy', { locale: localeId });
  const formattedTime = format(now, 'HH:mm', { locale: localeId }) + ' WIB';

  const getShareText = () => {
    const seasonTitle = activeSeason?.name || 'BM LEAGUE 88';
    const divHeader = divisionTitle ? ` [${divisionTitle}]` : '';
    let text = `📊 *KLASEMEN SEMENTARA - BM LEAGUE 88* 📊\n🏆 *${seasonTitle}*${divHeader}\n📅 *Per:* ${formattedDate} (${formattedTime})\n\n`;

    sortedTable.forEach((entry, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : `${rank}. `;
      const pName = entry.playerName || entry.teamName;
      const tName = entry.teamName || 'Tim';
      const pts = entry.points ?? 0;
      const p = entry.played ?? 0;
      const gd = (entry.goalDifference ?? 0) >= 0 ? `+${entry.goalDifference ?? 0}` : `${entry.goalDifference ?? 0}`;
      text += `${medal}*${pName}* (${tName}) - *${pts} Pts* (M:${entry.win ?? 0} S:${entry.draw ?? 0} K:${entry.loss ?? 0} | SG:${gd} | MN:${p})\n`;
    });

    text += `\n_Pantau statistik & live update di BM League 88 Web App!_`;
    return text;
  };

  const prepareCardImages = async () => {
    if (!cardRef.current) return;
    const imgs = cardRef.current.querySelectorAll('img');
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const entryId = img.getAttribute('data-entry-id');
      if (entryId && logosBase64Map[entryId]) {
        img.src = logosBase64Map[entryId];
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
      if (!blob) throw new Error('Gagal merender poster klasemen.');

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
          title: 'Gambar Klasemen Berhasil Disalin! 📋',
          description: 'Tekan Ctrl+V di WhatsApp untuk paste gambar poster klasemen.',
        });
        setTimeout(() => setIsCopiedImage(false), 3500);
      } else {
        const dataUrl = await toPng(cardRef.current, captureOptions);
        const link = document.createElement('a');
        link.download = `BM88-KLASEMEN-${format(now, 'yyyyMMdd-HHmm')}.png`;
        link.href = dataUrl;
        link.click();
        setIsCopiedImage(true);
        toast({
          title: 'Gambar Terunduh! 📥',
          description: 'Poster klasemen otomatis diunduh untuk dibagikan.',
        });
        setTimeout(() => setIsCopiedImage(false), 3500);
      }
    } catch (err: any) {
      console.error('Copy standings image error:', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Memproses Poster Klasemen',
        description: err.message || 'Terjadi kesalahan saat merender gambar.',
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
      description: 'Pilih chat di WA, ringkasan klasemen sudah terisi. Tinggal tekan Ctrl+V untuk lampirkan gambarnya!',
    });
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsCopyingImage(true);
      await prepareCardImages();
      const dataUrl = await toPng(cardRef.current, captureOptions);
      const link = document.createElement('a');
      link.download = `BM88-KLASEMEN-${format(now, 'yyyyMMdd-HHmm')}.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: 'Gambar Klasemen Diunduh!',
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
      title: 'Teks Klasemen Disalin! 💬',
      description: 'Format pesan teks klasemen lengkap siap dipaste ke WhatsApp.',
    });
    setTimeout(() => setIsCopiedText(false), 2500);
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
              <Scan className="w-4 h-4" style={{ color: primaryHex }} />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-black uppercase italic tracking-wider font-headline text-white flex items-center gap-2">
                Share Poster Klasemen
                <span className="text-[10px] not-italic font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  ESPORTS HUD HD
                </span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/50 font-medium">
                Bagikan poster tabel klasemen lengkap resmi langsung ke WhatsApp
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
                  {divisionTitle ? divisionTitle.toUpperCase() : 'KLASEMEN RESMI'}
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 shadow-inner">
                <Zap className="w-3.5 h-3.5 fill-current" style={{ color: primaryHex }} />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/90 truncate max-w-[180px]">
                  {activeSeason?.name || 'CHAMPIONSHIP'}
                </span>
              </div>
            </div>

            {/* Qualification Sub-bar (if Hybrid / Playoff 8 Besar exists) */}
            {isSingleHybrid && (
              <div className="relative z-10 mb-3 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span>Rank #1 - 8: Lolos Playoff (BO3)</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400/80">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Rank #9+: Gugur</span>
                </div>
              </div>
            )}

            {/* STANDINGS TABLE: High-Density Esports HUD Layout */}
            <div className="relative z-10 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-inner">
              {/* Table Header */}
              <div className="grid grid-cols-[32px_1fr_30px_26px_26px_26px_34px_38px] items-center px-2.5 py-2 bg-white/[0.05] border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-white/50 font-mono">
                <div className="text-center">#</div>
                <div>TIM / ATLET</div>
                <div className="text-center">MN</div>
                <div className="text-center">M</div>
                <div className="text-center">S</div>
                <div className="text-center">K</div>
                <div className="text-center">SG</div>
                <div className="text-center font-bold" style={{ color: primaryHex }}>PTS</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-white/5">
                {sortedTable.map((entry, idx) => {
                  const rank = idx + 1;
                  const isTop3 = rank <= 3;
                  const isPlayoffZone = isSingleHybrid ? rank <= 8 : rank <= 8;
                  const entryKey = entry.id || entry.playerId;
                  const logo = logosBase64Map[entryKey] || '';
                  const playerName = entry.playerName || entry.teamName;
                  const teamName = entry.teamName || 'Tim';
                  const gd = entry.goalDifference ?? 0;
                  const gdString = gd > 0 ? `+${gd}` : `${gd}`;

                  return (
                    <div 
                      key={entryKey || idx}
                      className={cn(
                        "grid grid-cols-[32px_1fr_30px_26px_26px_26px_34px_38px] items-center px-2.5 py-1.5 transition-colors font-sans text-xs",
                        rank === 1 
                          ? "bg-amber-400/[0.08]" 
                          : rank === 2 
                            ? "bg-slate-300/[0.05]" 
                            : rank === 3 
                              ? "bg-amber-600/[0.05]" 
                              : isPlayoffZone 
                                ? "bg-emerald-500/[0.02]" 
                                : "hover:bg-white/[0.02]"
                      )}
                    >
                      {/* Rank Indicator */}
                      <div className="flex items-center justify-center">
                        {rank === 1 ? (
                          <div className="w-5 h-5 rounded-md bg-amber-400 text-black font-black text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.8)] italic">
                            1
                          </div>
                        ) : rank === 2 ? (
                          <div className="w-5 h-5 rounded-md bg-slate-300 text-black font-black text-[10px] flex items-center justify-center italic">
                            2
                          </div>
                        ) : rank === 3 ? (
                          <div className="w-5 h-5 rounded-md bg-amber-700 text-white font-black text-[10px] flex items-center justify-center italic">
                            3
                          </div>
                        ) : (
                          <span className={cn(
                            "font-mono text-[10px] font-black",
                            isPlayoffZone ? "text-emerald-400/90" : "text-white/40"
                          )}>
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Crest & Athlete / Club */}
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div className="w-6 h-6 rounded-lg bg-black/60 border border-white/15 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                          {logo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img 
                              src={logo} 
                              alt={playerName} 
                              data-entry-id={entryKey}
                              className="w-full h-full object-contain filter drop-shadow" 
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <Shield className="w-3.5 h-3.5 text-white/30" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-headline font-black text-[11px] text-white uppercase italic truncate tracking-tight leading-tight">
                            {playerName}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-white/50 truncate leading-tight">
                            {teamName}
                          </span>
                        </div>
                      </div>

                      {/* Played */}
                      <div className="text-center font-mono text-[10px] text-white/70 font-bold">
                        {entry.played ?? 0}
                      </div>

                      {/* Win */}
                      <div className="text-center font-mono text-[10px] text-white/80 font-bold">
                        {entry.win ?? 0}
                      </div>

                      {/* Draw */}
                      <div className="text-center font-mono text-[10px] text-white/50 font-medium">
                        {entry.draw ?? 0}
                      </div>

                      {/* Loss */}
                      <div className="text-center font-mono text-[10px] text-rose-400/80 font-medium">
                        {entry.loss ?? 0}
                      </div>

                      {/* Goal Difference */}
                      <div className={cn(
                        "text-center font-mono text-[10px] font-bold",
                        gd > 0 ? "text-emerald-400" : gd < 0 ? "text-rose-400" : "text-white/50"
                      )}>
                        {gdString}
                      </div>

                      {/* Points */}
                      <div 
                        className="text-center font-headline font-black text-[12px] italic tracking-tight"
                        style={{ color: primaryHex }}
                      >
                        {entry.points ?? 0}
                      </div>
                    </div>
                  );
                })}
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
                SALIN TEKS KLASEMEN
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
