'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Season, WithId } from '@/lib/types';
import { getSeasonTheme, type TISeasonTheme } from '@/lib/season-theme';

export const LEAGUE_ID = 'main-league';

interface SeasonThemeContextType {
  activeSeason: WithId<Season> | null;
  activeSeasonId: string | null;
  setActiveSeasonId: (id: string | null) => void;
  seasons: WithId<Season>[] | null;
  theme: TISeasonTheme;
  isLoading: boolean;
}

const SeasonThemeContext = createContext<SeasonThemeContextType | undefined>(undefined);

export function SeasonThemeProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const [activeSeasonId, setActiveSeasonIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bm_active_season_id') || null;
    }
    return null;
  });

  const [cachedSeason, setCachedSeason] = useState<WithId<Season> | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bm_cached_active_season');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached season', e);
      }
    }
    return null;
  });

  const setActiveSeasonId = (id: string | null) => {
    setActiveSeasonIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('bm_active_season_id', id);
      else {
        localStorage.removeItem('bm_active_season_id');
        localStorage.removeItem('bm_cached_active_season');
      }
    }
  };

  const seasonsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, `leagues/${LEAGUE_ID}/seasons`), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: seasons, isLoading } = useCollection<Season>(seasonsQuery);

  // Helper to determine the best active season: prioritize 'In Progress', then newest
  const resolveTargetSeason = (seasonList: WithId<Season>[]) => {
    const inProgress = seasonList.find((s) => s.status === 'In Progress');
    if (inProgress) return inProgress;
    return seasonList[0];
  };

  useEffect(() => {
    if (!seasons || seasons.length === 0) return;
    const defaultSeason = resolveTargetSeason(seasons);

    if (!activeSeasonId) {
      setActiveSeasonId(defaultSeason.id);
    } else {
      const exists = seasons.some((s) => s.id === activeSeasonId);
      if (!exists) setActiveSeasonId(defaultSeason.id);
    }
  }, [seasons, activeSeasonId]);

  const activeSeason = useMemo(() => {
    if (seasons && seasons.length > 0) {
      return (
        seasons.find((s) => s.id === activeSeasonId) ||
        resolveTargetSeason(seasons)
      );
    }
    return cachedSeason;
  }, [seasons, activeSeasonId, cachedSeason]);

  // Sync active season to localStorage cache so next reloads load the exact theme instantly
  useEffect(() => {
    if (activeSeason && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'bm_cached_active_season',
          JSON.stringify({
            id: activeSeason.id,
            name: activeSeason.name,
            themeKey: activeSeason.themeKey || 'auto',
            type: activeSeason.type,
            status: activeSeason.status,
          })
        );
      } catch (e) {
        console.error('Failed to cache active season', e);
      }
    }
  }, [activeSeason]);

  const theme = useMemo(() => getSeasonTheme(activeSeason), [activeSeason]);

  const value = useMemo(
    () => ({
      activeSeason,
      activeSeasonId,
      setActiveSeasonId,
      seasons: seasons || null,
      theme,
      isLoading,
    }),
    [activeSeason, activeSeasonId, seasons, theme, isLoading]
  );

  return <SeasonThemeContext.Provider value={value}>{children}</SeasonThemeContext.Provider>;
}

export function useGlobalSeasonTheme() {
  const context = useContext(SeasonThemeContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      activeSeason: null,
      activeSeasonId: null,
      setActiveSeasonId: () => { },
      seasons: null,
      theme: getSeasonTheme(null),
      isLoading: false,
    };
  }
  return context;
}

