'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Zap, Shield, Lock, CheckCircle2, Binary } from 'lucide-react';
import { Badge } from './ui/badge';
import type { TISeasonTheme } from '@/lib/season-theme';

interface CoopScoreChecklistProps {
  player1Name: string;
  player2Name: string;
  winners: (string | null)[];
  onWinnerChange: (index: number, winner: string) => void;
  theme?: TISeasonTheme;
}

export function CoopScoreChecklist({ player1Name, player2Name, winners, onWinnerChange, theme }: CoopScoreChecklistProps) {
  const primaryHex = theme?.primaryHex || '#CCFD01';
  // Game 3 is disabled if someone already won 2 games in G1 & G2
  const p1Wins_G12 = winners.slice(0, 2).filter(w => w === 'player1').length;
  const p2Wins_G12 = winners.slice(0, 2).filter(w => w === 'player2').length;
  const isGame3Disabled = p1Wins_G12 === 2 || p2Wins_G12 === 2;

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-center gap-2 mb-4 py-2 rounded-xl border"
        style={{
          backgroundColor: `${primaryHex}0D`,
          borderColor: `${primaryHex}26`
        }}
      >
        <Binary className="w-3.5 h-3.5 animate-pulse" style={{ color: primaryHex }} />
        <span 
          className="text-[9px] font-black uppercase tracking-[0.2em] italic pr-2"
          style={{ color: primaryHex }}
        >
          Tactical Win-Distribution Matrix
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[0, 1, 2].map(i => {
          const isDisabled = i === 2 && isGame3Disabled;
          const currentWinner = winners[i];
          
          return (
            <div key={i} className="relative group/game">
              {/* Dynamic Glow for Active/Next Game */}
              {!isDisabled && !currentWinner && (
                  <div 
                      className="absolute -inset-0.5 rounded-2xl blur opacity-20 animate-pulse" 
                      style={{
                          background: `linear-gradient(to right, ${primaryHex}33, transparent)`
                      }}
                  />
              )}

              <Card 
                  className={cn(
                      "relative overflow-hidden transition-all duration-500 border-2 bg-black/40 backdrop-blur-xl rounded-2xl",
                      isDisabled ? 'opacity-20 border-white/5 grayscale pointer-events-none' : 
                      currentWinner ? 'shadow-md' : 'border-white/10 hover:border-white/20'
                  )}
                  style={currentWinner ? {
                      borderColor: `${primaryHex}66`,
                      boxShadow: `0 0 25px ${primaryHex}1A`
                  } : undefined}
              >
                  {/* HUD Grid Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

                  <CardHeader className="p-3 border-b border-white/5 relative z-10 flex flex-row items-center justify-between bg-white/[0.02]">
                      <div className="flex items-center gap-2.5">
                          <div 
                              className="w-1.5 h-4 rounded-full transition-all duration-500"
                              style={currentWinner ? {
                                  backgroundColor: primaryHex,
                                  boxShadow: `0 0 10px ${primaryHex}`
                              } : { backgroundColor: 'rgba(255,255,255,0.1)' }}
                          />
                          <CardTitle 
                              className="text-[10px] font-black uppercase tracking-[0.3em] italic pr-2"
                              style={currentWinner ? { color: primaryHex } : { color: 'rgba(255,255,255,0.4)' }}
                          >
                              LOG {i + 1}
                          </CardTitle>
                      </div>
                      
                      {isDisabled ? (
                          <Badge variant="outline" className="h-5 text-[7px] border-white/10 text-white/20 uppercase font-black tracking-widest bg-black/20">
                              <Lock className="w-2.5 h-2.5 mr-1" /> Terminated
                          </Badge>
                      ) : currentWinner ? (
                          <Badge 
                              className="h-5 text-[7px] text-black uppercase font-black tracking-widest shadow-lg"
                              style={{
                                  backgroundColor: primaryHex,
                                  boxShadow: `0 0 10px ${primaryHex}4D`
                              }}
                          >
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Verified
                          </Badge>
                      ) : (
                          <div className="flex items-center gap-1.5 animate-pulse">
                              <Zap className="w-2.5 h-2.5" style={{ color: primaryHex, fill: primaryHex }} />
                              <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: `${primaryHex}99` }}>Awaiting Signal</span>
                          </div>
                      )}
                  </CardHeader>

                  <CardContent className="p-2.5 relative z-10">
                      <div className="grid grid-cols-2 gap-2.5">
                          {[
                              { id: 'player1', name: player1Name },
                              { id: 'player2', name: player2Name }
                          ].map((p) => {
                              const isSelected = currentWinner === p.id;
                              return (
                                  <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => onWinnerChange(i, p.id)}
                                      disabled={isDisabled}
                                      className={cn(
                                          "flex flex-col items-center gap-2.5 p-3.5 min-h-[72px] rounded-2xl border-2 transition-all duration-300 group/btn relative overflow-hidden active:scale-95",
                                          !isSelected && "bg-white/[0.03] border-white/5 hover:bg-white/10 hover:border-white/30"
                                      )}
                                      style={isSelected ? {
                                          backgroundColor: `${primaryHex}1A`,
                                          borderColor: primaryHex,
                                          boxShadow: `inset 0 0 20px ${primaryHex}1A`
                                      } : undefined}
                                  >
                                      {isSelected && (
                                          <div 
                                              className="absolute top-0 right-0 w-9 h-9 rounded-bl-2xl flex items-start justify-end p-1.5"
                                              style={{ backgroundColor: `${primaryHex}33` }}
                                          >
                                              <Zap className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                                          </div>
                                      )}
                                      
                                      <div 
                                          className="p-2 rounded-lg border-2 transition-all duration-500"
                                          style={isSelected ? {
                                              backgroundColor: primaryHex,
                                              borderColor: '#000000',
                                              boxShadow: `0 0 15px ${primaryHex}66`
                                          } : {
                                              backgroundColor: 'rgba(0,0,0,0.4)',
                                              borderColor: 'rgba(255,255,255,0.1)'
                                          }}
                                      >
                                          <Shield className={cn("w-4 h-4", isSelected ? "text-black" : "text-white/20")} />
                                      </div>

                                      <span 
                                          className={cn(
                                              "text-[11px] font-black uppercase italic tracking-tight truncate w-full px-1 transition-colors pr-2",
                                              !isSelected && "text-white/60 group-hover/btn:text-white"
                                          )}
                                          style={isSelected ? { color: primaryHex } : undefined}
                                      >
                                          {p.name}
                                      </span>
                                      
                                      {/* Selection Indicator Line */}
                                      <div 
                                          className={cn(
                                              "absolute bottom-0 left-1/2 -translate-x-1/2 h-1 transition-all duration-500 rounded-t-full",
                                              isSelected ? "w-1/2 opacity-100" : "w-0 opacity-0"
                                          )}
                                          style={isSelected ? { backgroundColor: primaryHex } : undefined}
                                      />
                                  </button>
                              );
                          })}
                      </div>
                  </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      
      <p className="text-center text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mt-4 italic">
        User Protocol: Select node to define outcome
      </p>
    </div>
  );
}
