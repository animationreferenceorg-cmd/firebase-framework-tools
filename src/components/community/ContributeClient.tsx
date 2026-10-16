'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clapperboard,
  Film,
  FolderHeart,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DirectUploadDialog } from '@/components/reference/DirectUploadDialog';
import { SubmitShortFilmDialog } from '@/components/shorts/SubmitShortFilmDialog';
import type { Challenge } from '@/lib/challenges';

type Props = { challenge: Challenge | null };

const contributorBenefits = [
  { icon: Users, title: 'Get seen by animators', body: 'Public submissions can be discovered in the community feed and saved into other artists’ study boards.' },
  { icon: Award, title: 'Build your body of work', body: 'Share a reel, WIP pass, or finished shot and connect it to your public animator portfolio.' },
  { icon: FolderHeart, title: 'Make the library better', body: 'Add original footage and references that help other artists study real movement and performance.' },
];

export function ContributeClient({ challenge }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08060d] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(circle_at_15%_8%,rgba(124,58,237,0.35),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(217,70,239,0.18),transparent_30%)]" />

      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-32 sm:px-8 md:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> Community contributions
          </div>
          <h1 className="mt-6 font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl md:text-7xl">
            Make someone’s next
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">great shot easier.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Share original reference, a work-in-progress, or a finished piece with animators who care about timing, weight, and performance.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#ways-to-contribute">
              <Button size="lg" className="h-13 w-full rounded-full bg-white px-7 font-black text-[#100d18] hover:bg-violet-100 sm:w-auto">
                Choose how to contribute <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <Link href="/feed">
              <Button size="lg" variant="outline" className="h-13 w-full rounded-full border-white/15 bg-white/[0.05] px-7 font-bold text-white hover:bg-white/10 sm:w-auto">
                Explore the community
              </Button>
            </Link>
          </div>
        </div>

        {challenge && (
          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-[28px] border border-fuchsia-300/25 bg-gradient-to-r from-violet-950/90 via-[#1a1128] to-[#0f0c16] p-1 shadow-[0_28px_100px_-38px_rgba(168,85,247,0.8)]">
            <div className="grid gap-6 rounded-[24px] bg-black/20 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-200"><Clapperboard className="h-4 w-4" /> This month’s challenge</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">{challenge.title}</h2>
                <p className="mt-1 text-sm font-semibold text-violet-200">{challenge.tagline}</p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">{challenge.brief}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <DirectUploadDialog challenge={challenge} triggerLabel="Enter the challenge" triggerClassName="h-11 border-0 bg-white px-5 font-black text-[#120d1c] hover:bg-violet-100" />
                <Link href={`/challenges/${challenge.slug}`}>
                  <Button variant="ghost" className="h-11 w-full text-violet-100 hover:bg-white/10 hover:text-white">View brief</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="ways-to-contribute" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 pb-24 sm:px-8">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Three ways to contribute</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Start with what you already make.</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-400">Every path gives your work a home, clear attribution, and a useful audience.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <ContributionCard
            number="01"
            icon={Upload}
            title="Add original reference"
            description="Upload footage, pose sheets, GIFs, or visual research you created. Tag it so someone can find it when they need it."
            details={['Video, image, and GIF uploads', 'Clear creator credit', 'Optional public board placement']}
            action={<DirectUploadDialog triggerLabel="Upload reference" triggerClassName="h-11 w-full border-violet-300/20 bg-violet-500/15 font-bold text-violet-100 hover:bg-violet-500/25" />}
          />
          <ContributionCard
            number="02"
            icon={Film}
            title="Share a shot or reel"
            description="Post a WIP pass, polished shot, or reel to your animator portfolio and put your process in front of the community."
            details={['Public community showcase', 'Portfolio credit and profile link', 'Likes, saves, and discussion']}
            action={<Link href="/profile?tab=studio&upload=true" className="block"><Button className="h-11 w-full bg-white font-black text-[#120d1c] hover:bg-violet-100">Publish a shot <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>}
          />
          <ContributionCard
            number="03"
            icon={Clapperboard}
            title="Submit a short film"
            description="Submit a finished animated short with behind-the-scenes material for the curated Short Films collection."
            details={['Curation queue', 'Creator and crew attribution', 'Built for finished animated films']}
            action={<SubmitShortFilmDialog><Button className="h-11 w-full bg-fuchsia-500 font-black text-white hover:bg-fuchsia-400">Submit a short film <ArrowRight className="ml-2 h-4 w-4" /></Button></SubmitShortFilmDialog>}
          />
        </div>
      </section>

      <section className="relative border-y border-white/[0.07] bg-white/[0.025]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3">
          {contributorBenefits.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200"><Icon className="h-5 w-5" /></span>
              <div><h3 className="font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <ShieldCheck className="mx-auto h-8 w-8 text-emerald-300" />
        <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">Keep the library useful and respectful.</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">Only submit work you made or have permission to share. Every contribution keeps its creator credit, and the community can report content that does not belong here.</p>
        <div className="mt-7 flex justify-center gap-2 text-xs font-semibold text-zinc-400"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Original work and attributed references only</div>
      </section>
    </div>
  );
}

function ContributionCard({ number, icon: Icon, title, description, details, action }: { number: string; icon: typeof Upload; title: string; description: string; details: string[]; action: React.ReactNode }) {
  return (
    <article className="group flex min-h-[390px] flex-col rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.075] to-white/[0.02] p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.9)] transition-colors hover:border-violet-300/35">
      <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/10"><Icon className="h-5 w-5" /></span><span className="font-mono text-xs font-bold tracking-widest text-white/25">{number}</span></div>
      <h3 className="mt-7 text-2xl font-black tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
      <ul className="mt-6 space-y-2 text-sm text-zinc-300">{details.map((detail) => <li key={detail} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />{detail}</li>)}</ul>
      <div className="mt-auto pt-7">{action}</div>
    </article>
  );
}
