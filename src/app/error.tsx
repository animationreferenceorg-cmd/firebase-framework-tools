'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#030014] text-white px-4 text-center">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-zinc-400 max-w-md">
                This page hit an unexpected error. You can try again, or head back home.
            </p>
            <div className="flex items-center gap-3">
                <Button onClick={() => reset()} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try again
                </Button>
                <Button variant="outline" onClick={() => { window.location.href = '/home'; }}>
                    Go Home
                </Button>
            </div>
        </div>
    );
}
