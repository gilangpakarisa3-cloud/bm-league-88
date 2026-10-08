'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Wallet, Zap, Activity, Receipt, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveLogo } from '@/lib/logo-utils';
import type { Season, Team, WithId } from '@/lib/types';

interface SeasonFinancialHubProps {
  activeSeason: WithId<Season> | null;
  participantEntries: any[];
  teamsById: Record<string, Team>;
  isAdmin: boolean;
  onPaymentToggle: (id: string, currentPaid: boolean) => void;
}

export const SeasonFinancialHub = ({
  activeSeason,
  participantEntries,
  teamsById,
  isAdmin,
  onPaymentToggle,
}: SeasonFinancialHubProps) => {
  const [financialFilter, setFinancialFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [financialSearch, setFinancialSearch] = useState('');

  const { prizePool, registrationPool, sponsorshipPool } = useMemo(() => {
    if (!activeSeason) {
      return { prizePool: 0, registrationPool: 0, sponsorshipPool: 0 };
    }
    const registrationFee = activeSeason.registrationFee || 0;
    const sponsorship = activeSeason.sponsorshipAmount || 0;

    const paidCount = (participantEntries || []).filter((p) => p.hasPaid).length;
    const regPool = paidCount * registrationFee;
    const totalPool = regPool + sponsorship;

    return {
      prizePool: totalPool,
      registrationPool: regPool,
      sponsorshipPool: sponsorship,
    };
  }, [participantEntries, activeSeason]);

  if (!activeSeason?.registrationFee || (participantEntries || []).length === 0) {
    return null;
  }

  const paidParticipantsCount = participantEntries?.filter((p) => p.hasPaid).length || 0;
  const totalParticipantsCount = participantEntries?.length || 1;
  const paymentPercentage = Math.round((paidParticipantsCount / totalParticipantsCount) * 100);

  const filteredParticipants = (participantEntries || []).filter((player) => {
    if (financialFilter === 'paid' && !player.hasPaid) return false;
    if (financialFilter === 'unpaid' && player.hasPaid) return false;
    if (financialSearch.trim()) {
      const q = financialSearch.toLowerCase().trim();
      const type = activeSeason?.type || 'Single';
      const isPlayerCoop = type === 'Co-Op' || type === 'Co-Op Hybrid';
      const name = isPlayerCoop ? player.teamName : player.playerName;
      const teamName = isPlayerCoop ? player.player1TeamName : player.teamName;
      return (
        (name && name.toLowerCase().includes(q)) ||
        (teamName && teamName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
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
            <h3 className="text-sm sm:text-base font-black tracking-tight uppercase italic leading-none font-headline">
              Financial Hub
            </h3>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-5 relative overflow-hidden">
        {/* Giant Accumulated Prize Matrix */}
        <div className="bg-black/60 border border-yellow-400/25 p-5 rounded-3xl text-center space-y-3 relative overflow-hidden shadow-inner group/pool">
          <div className="absolute -inset-1 bg-yellow-400/5 rounded-3xl blur-xl opacity-50 pointer-events-none" />

          <div className="flex items-center justify-center gap-1.5 text-yellow-400/80">
            <Zap className="w-3.5 h-3.5 fill-yellow-400 animate-pulse" />
            <p className="text-[9px] font-black tracking-[0.25em] uppercase font-mono">
              PRIZE_MATRIX_ACCUMULATED
            </p>
          </div>

          <p
            className="text-3xl sm:text-4xl font-black text-yellow-400 italic font-headline drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] tabular-nums leading-none"
            suppressHydrationWarning
          >
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(prizePool)}
          </p>

          {/* Breakdown Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-white/5 font-mono">
            <span className="text-[9px] font-black px-2.5 py-1 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-300">
              REG:{' '}
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(registrationPool)}
            </span>
            {sponsorshipPool > 0 && (
              <span className="text-[9px] font-black px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                SPON:{' '}
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(sponsorshipPool)}
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
                {paidParticipantsCount} / {participantEntries?.length} UNITS [{paymentPercentage}%]
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.8)] transition-all duration-500"
                style={{ width: `${(paidParticipantsCount / totalParticipantsCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Verification Log Filter & Search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-yellow-400" />
              <h4 className="text-[10px] font-black uppercase italic tracking-widest text-white font-headline">
                Unit Verification Log
              </h4>
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setFinancialFilter('all')}
                className={cn(
                  'px-2 py-0.5 text-[8px] font-black uppercase font-mono rounded-lg transition-all',
                  financialFilter === 'all'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/40 hover:text-white'
                )}
              >
                ALL ({participantEntries?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setFinancialFilter('paid')}
                className={cn(
                  'px-2 py-0.5 text-[8px] font-black uppercase font-mono rounded-lg transition-all',
                  financialFilter === 'paid'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/40 hover:text-white'
                )}
              >
                LUNAS ({paidParticipantsCount})
              </button>
              <button
                type="button"
                onClick={() => setFinancialFilter('unpaid')}
                className={cn(
                  'px-2 py-0.5 text-[8px] font-black uppercase font-mono rounded-lg transition-all',
                  financialFilter === 'unpaid'
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/40 hover:text-white'
                )}
              >
                BELUM ({(participantEntries?.length || 0) - paidParticipantsCount})
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
              <button
                type="button"
                onClick={() => setFinancialSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* High-Density Banking Smartcard List */}
          <ScrollArea className="h-[380px] sm:h-[460px] pr-2">
            <div className="space-y-2">
              {filteredParticipants.map((player, idx) => {
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
                      'flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 group/item relative overflow-hidden',
                      player.hasPaid
                        ? 'bg-yellow-400/[0.08] border-yellow-400/35 shadow-[0_0_15px_rgba(250,204,21,0.08)]'
                        : 'bg-black/40 border-white/5 hover:border-white/20'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute left-0 top-0 bottom-0 w-1 transition-all',
                        player.hasPaid
                          ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]'
                          : 'bg-transparent'
                      )}
                    />

                    <div className="flex items-center gap-2.5 overflow-hidden pl-1.5 min-w-0">
                      <span className="text-[9px] font-mono font-bold text-white/30 w-4 shrink-0">
                        #{idx + 1}
                      </span>

                      <Avatar
                        className={cn(
                          'h-9 w-9 rounded-xl border transition-all shrink-0',
                          player.hasPaid
                            ? 'border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                            : 'border-white/10'
                        )}
                      >
                        <AvatarImage
                          key={teamLogo}
                          src={teamLogo}
                          alt={name}
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback className="bg-black/40 font-black text-xs text-white/40">
                          {name ? name.substring(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 text-left">
                        <div
                          className={cn(
                            'text-xs font-black uppercase italic truncate font-headline transition-colors',
                            player.hasPaid ? 'text-yellow-300' : 'text-white'
                          )}
                          suppressHydrationWarning
                        >
                          {name}
                        </div>
                        <div
                          className="text-[8px] font-mono text-white/40 truncate"
                          suppressHydrationWarning
                        >
                          {teamName || 'Independent'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-black uppercase tracking-wider font-mono px-2 py-0.5 rounded-lg border transition-all',
                          player.hasPaid
                            ? 'border-yellow-400/40 bg-yellow-400/15 text-yellow-300'
                            : 'border-white/10 bg-black/40 text-white/30'
                        )}
                        suppressHydrationWarning
                      >
                        {player.hasPaid ? 'VERIFIED' : 'PENDING'}
                      </Badge>

                      <Checkbox
                        id={`paid-${player.id}`}
                        checked={!!player.hasPaid}
                        onCheckedChange={() => onPaymentToggle(player.id, !!player.hasPaid)}
                        disabled={!isAdmin}
                        className={cn(
                          'h-5 w-5 rounded-md border transition-all',
                          player.hasPaid
                            ? 'border-yellow-400 bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                            : 'border-white/20 bg-black/40 hover:border-yellow-400/40'
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
  );
};
