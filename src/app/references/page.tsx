import Link from 'next/link';
import { ReferencesExplorer } from '@/components/reference/ReferencesExplorer';
import { CaptureClipDialog } from '@/components/reference/CaptureClipDialog';

export const metadata = {
  title: 'Community Reference Clips | Animation Reference',
  description: 'Frame-focused animation reference clips curated from the web by animators.',
};

export default function ReferencesPage() {
  return (
    <main className="mx-auto max-w-[1700px] px-4 pb-20 pt-12 md:px-8">
      <section className="mb-12 flex flex-col gap-7 rounded-[2rem] border border-white/10 bg-gradient-to-br from-purple-950/50 via-zinc-950 to-black p-8 md:flex-row md:items-end md:justify-between md:p-12 shadow-2xl">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[.22em] text-purple-300">Community-curated motion library</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Find the moment.<br />Study the motion.
          </h1>
          <p className="mt-5 max-w-2xl text-zinc-400">
            Precise timestamp clips for acting, mechanics, combat, creatures, and everything animators need between key poses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CaptureClipDialog />
        </div>
      </section>
      <ReferencesExplorer />
    </main>
  );
}
