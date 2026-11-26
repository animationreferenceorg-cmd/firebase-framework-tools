import { Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function IntroOfferAlert({ label, terms, onSelectMonthly, className }: {
  label: string;
  terms: string;
  onSelectMonthly?: () => void;
  className?: string;
}) {
  return (
    <Alert className={cn('rounded-xl border-amber-400/50 bg-amber-400/10 text-amber-50 sm:p-5 [&>svg]:text-amber-300 sm:[&>svg]:left-5 sm:[&>svg]:top-5', className)}>
      <Sparkles aria-hidden="true" className="h-5 w-5" />
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AlertTitle className="font-bold text-amber-300">{label}</AlertTitle>
          <AlertDescription>
            <p className="text-base font-bold text-white">{terms}</p>
            <p className="mt-1 text-amber-100/80">Available to new Pro monthly subscribers.</p>
          </AlertDescription>
        </div>
        {onSelectMonthly && (
          <Button onClick={onSelectMonthly} size="sm" className="shrink-0 bg-amber-300 font-bold text-zinc-950 hover:bg-amber-200">
            View monthly deal
          </Button>
        )}
      </div>
    </Alert>
  );
}
