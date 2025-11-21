'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import type { Team, WithId } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

export function TeamList() {
  const firestore = useFirestore();
  const teamsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'teams') : null),
    [firestore]
  );
  const { data: teams, isLoading } = useCollection<Team>(teamsCollection);

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Team Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (!teams || teams.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-muted-foreground">No teams found.</h2>
        <p className="text-sm text-muted-foreground mt-2">
          You can add teams in your Firestore 'teams' collection.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Team Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team: WithId<Team>) => (
              <TableRow key={team.id}>
                <TableCell>
                  <div className="font-medium text-sm sm:text-base">{team.name}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
