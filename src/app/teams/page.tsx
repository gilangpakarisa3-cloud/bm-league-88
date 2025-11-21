
import { TeamList } from '@/components/team-list';

export default function TeamsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight">
            Teams
            </h1>
        </div>
        <TeamList />
      </div>
    </div>
  );
}
