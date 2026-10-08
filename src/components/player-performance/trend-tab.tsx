'use client';

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3 } from "lucide-react";

interface TrendTabProps {
  chartData: Array<{ match: string | number; points: number }>;
  isMounted: boolean;
  primaryHex: string;
  glowRgba: string;
  isCrimson?: boolean;
}

export const TrendTab = ({
  chartData,
  isMounted,
  primaryHex,
  glowRgba,
  isCrimson
}: TrendTabProps) => {
  return (
    <Card className="bg-black/80 backdrop-blur-3xl border border-white/10 overflow-hidden rounded-3xl shadow-2xl relative group/trend">
      <div 
        className="absolute top-0 left-0 w-full h-[2px]" 
        style={{
          background: `linear-gradient(to right, transparent, ${primaryHex}, transparent)`
        }}
      />
      <CardHeader className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/10">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase flex items-center gap-2 italic" style={{ color: primaryHex }}>
            <TrendingUp className="w-4 h-4" style={{ color: primaryHex }} /> MOMENTUM STABILITY
          </CardTitle>
          <Badge 
            className="text-[10px] font-black italic px-3 h-6 border-none" 
            style={{
              backgroundColor: primaryHex,
              color: isCrimson ? '#ffffff' : '#000000',
              boxShadow: `0 0 10px ${glowRgba}`
            }}
            suppressHydrationWarning
          >
            {chartData.length > 1 ? chartData[chartData.length - 1].points : 0} PTS TREND
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-6">
        {isMounted && chartData.length > 1 ? (
          <div className="w-full h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="match" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontStyle: 'italic', fontWeight: '900', fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" />
                <Line 
                  type="monotone" 
                  dataKey="points" 
                  stroke={primaryHex} 
                  strokeWidth={3} 
                  dot={{ fill: primaryHex, r: 4, strokeWidth: 2, stroke: "#000" }} 
                  activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16 opacity-30 flex flex-col items-center gap-3">
            <BarChart3 className="w-10 h-10 text-white/40"/>
            <p className="text-xs font-black uppercase tracking-[0.25em] italic text-center">Data Pertandingan Belum Cukup Untuk Grafik Tren</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
