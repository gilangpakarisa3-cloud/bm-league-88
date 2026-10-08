'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

export function LeagueTableSkeleton({ isCoop }: { isCoop: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-white/10 bg-black/80 backdrop-blur-3xl shadow-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full bg-white/10" />
          <Skeleton className="h-5 w-48 bg-white/10" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
      </div>
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <Skeleton className="h-9 w-9 rounded-xl bg-white/10" />
            <Skeleton className="h-10 w-10 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32 bg-white/10" />
              <Skeleton className="h-3 w-20 bg-white/5" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

