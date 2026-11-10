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

  const setActiveSeasonId = (id: string | null) => {
    setActiveSeasonIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('bm_active_season_id', id);
      else localStorage.removeItem('bm_active_season_id');
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

  useEffect(() => {
    if (!seasons || seasons.length === 0) return;
    if (!activeSeasonId) {
      setActiveSeasonId(seasons[0].id);
    } else {
      const exists = seasons.some((s) => s.id === activeSeasonId);
      if (!exists) setActiveSeasonId(seasons[0].id);
    }
  }, [seasons, activeSeasonId]);

  const activeSeason = useMemo(
    () => seasons?.find((s) => s.id === activeSeasonId) || (seasons && seasons.length > 0 ? seasons[0] : null),
    [seasons, activeSeasonId]
  );

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

