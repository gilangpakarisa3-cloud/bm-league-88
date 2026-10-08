'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import { AVAILABLE_SEASON_THEMES } from '@/lib/season-theme';
import type { Season, WithId } from '@/lib/types';

interface CreateSeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSeason: WithId<Season> | null;
  newSeasonType: Season['type'];
  setNewSeasonType: (val: Season['type']) => void;
  newHybridMeetings: 1 | 2;
  setNewHybridMeetings: (val: 1 | 2) => void;
  newHasDivisions: boolean;
  setNewHasDivisions: (val: boolean) => void;
  newDivision1Name: string;
  setNewDivision1Name: (val: string) => void;
  newDivision2Name: string;
  setNewDivision2Name: (val: string) => void;
  newDivision2HasPlayoff: boolean;
  setNewDivision2HasPlayoff: (val: boolean) => void;
  newRelegationSpots: number;
  setNewRelegationSpots: (val: number) => void;
  newPromotionSpots: number;
  setNewPromotionSpots: (val: number) => void;
  newSeasonName: string;
  setNewSeasonName: (val: string) => void;
  newSeasonThemeKey?: string;
  setNewSeasonThemeKey?: any;
  newSeasonFee: string | number;
  setNewSeasonFee: (val: string | number) => void;
  newSponsorshipAmount: string | number;
  setNewSponsorshipAmount: (val: string | number) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onSubmit: () => void;
}

export const CreateSeasonDialog = ({
  open,
  onOpenChange,
  editingSeason,
  newSeasonType,
  setNewSeasonType,
  newHybridMeetings,
  setNewHybridMeetings,
  newHasDivisions,
  setNewHasDivisions,
  newDivision1Name,
  setNewDivision1Name,
  newDivision2Name,
  setNewDivision2Name,
  newDivision2HasPlayoff,
  setNewDivision2HasPlayoff,
  newRelegationSpots,
  setNewRelegationSpots,
  newPromotionSpots,
  setNewPromotionSpots,
  newSeasonName,
  setNewSeasonName,
  newSeasonThemeKey,
  setNewSeasonThemeKey,
  newSeasonFee,
  setNewSeasonFee,
  newSponsorshipAmount,
  setNewSponsorshipAmount,
  dateRange,
  setDateRange,
  onSubmit
}: CreateSeasonDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg border-primary border-2 bg-card/95 backdrop-blur-xl rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic pr-4">
            {editingSeason ? t('edit_season') : t('create_new_season')}
          </DialogTitle>
          <div className="font-bold text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[10px]">
            {editingSeason ? t('edit_season_desc') : t('create_season_desc')}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2 max-h-[calc(85vh-160px)]">
          <div className="space-y-4 sm:space-y-5 pb-2">
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
          <Button onClick={onSubmit} className="w-full h-12 sm:h-14 text-sm sm:text-lg font-black tracking-tighter uppercase italic shadow-[0_10px_20px_rgba(204,253,1,0.2)]">
            {editingSeason ? t('save_changes') : t('create_season')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
