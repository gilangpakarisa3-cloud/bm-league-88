
import { CupBracket } from '@/components/cup-bracket';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function CupPage() {
  return (
    <div className="container mx-auto px-4 py-8">
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight">
            Cup Tournament
            </h1>
            <Button asChild>
                <Link href="/cup/winner">
                    <Shield className="mr-2 h-4 w-4" />
                    View Champion
                </Link>
            </Button>
        </div>
        <CupBracket />
      </div>
    </div>
  );
}
