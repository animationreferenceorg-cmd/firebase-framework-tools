import { Suspense } from 'react';
import BrowsePageClient from './BrowsePageClient';

// Force dynamic rendering to fix build failure on static export
export const dynamic = 'force-dynamic';

export default function BrowsePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030014] p-8 space-y-8 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
        }>
            <BrowsePageClient />
        </Suspense>
    );
}
