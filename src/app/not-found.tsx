import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <h1 className="text-5xl font-bold mb-4">404 – Page Not Found</h1>
      <p className="text-lg mb-6">The page you’re looking for doesn’t exist or has been moved.</p>
      <Link href="/" className={buttonVariants({ variant: 'default' })}>
        Go Home
      </Link>
    </div>
  );
}
