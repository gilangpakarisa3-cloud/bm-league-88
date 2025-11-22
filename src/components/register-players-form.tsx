'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Player, LeagueEntry, WithId } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface RegisterPlayersFormProps {
  allPlayers: WithId<Player>[];
  registeredPlayers: WithId<LeagueEntry>[];
  onRegister: (selectedPlayerIds: string[]) => void;
  isLoading?: boolean;
}

export function RegisterPlayersForm({
  allPlayers,
  registeredPlayers,
  onRegister,
  isLoading = false,
}: RegisterPlayersFormProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const registeredPlayerIds = React.useMemo(() => 
    new Set(registeredPlayers.map(p => p.playerId))
  , [registeredPlayers]);

  const availablePlayers = React.useMemo(() =>
    allPlayers.filter(p => !registeredPlayerIds.has(p.id))
  , [allPlayers, registeredPlayerIds]);
  
  const areAllSelected = React.useMemo(() => 
    availablePlayers.length > 0 && availablePlayers.every(p => !!selected[p.id])
  , [availablePlayers, selected]);

  const handleSelect = (playerId: string) => {
    setSelected(prev => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const newSelected = availablePlayers.reduce((acc, player) => {
        acc[player.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setSelected(newSelected);
    } else {
      setSelected({});
    }
  };


  const handleSubmit = () => {
    const selectedIds = Object.keys(selected).filter(id => selected[id]);
    onRegister(selectedIds);
  };
  
  if (isLoading) {
    return <RegisterPlayersSkeleton />;
  }

  if (availablePlayers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>{t('all_players_registered')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex items-center space-x-3 p-2 rounded-md border">
        <Checkbox
          id="select-all"
          checked={areAllSelected}
          onCheckedChange={handleSelectAll}
        />
        <label
          htmlFor="select-all"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t('select_all_players')}
        </label>
      </div>
      <ScrollArea className="h-64 border rounded-md">
        <div className="p-4 space-y-2">
          {availablePlayers.map(player => (
            <div
              key={player.id}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted cursor-pointer"
              onClick={() => handleSelect(player.id)}
            >
              <Checkbox
                id={`player-${player.id}`}
                checked={!!selected[player.id]}
                onCheckedChange={() => handleSelect(player.id)}
              />
              <Avatar className="h-8 w-8">
                <AvatarImage src={player.photoUrl} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <label htmlFor={`player-${player.id}`} className="flex-1 cursor-pointer">
                <div className="font-medium">{player.name}</div>
                <div className="text-sm text-muted-foreground">{player.teamName}</div>
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>
      <Button onClick={handleSubmit} className="w-full">
        {t('register_selected_players')}
      </Button>
    </div>
  );
}


function RegisterPlayersSkeleton() {
    return (
        <div className="space-y-4">
            <ScrollArea className="h-64 border rounded-md">
                <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-2">
                            <Skeleton className="h-5 w-5 rounded" />
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
             <Skeleton className="h-10 w-full" />
        </div>
    );
}
