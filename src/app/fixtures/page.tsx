
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function FixturesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight">
                Fixtures
            </h1>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Match
            </Button>
        </div>
        <div className="border rounded-lg p-8 text-center bg-card">
            <h2 className="text-xl font-medium text-muted-foreground">No matches yet</h2>
            <p className="text-sm text-muted-foreground mt-2">Get started by adding a new match.</p>
        </div>
      </div>
    </div>
  );
}
