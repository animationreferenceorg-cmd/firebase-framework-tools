import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Layers, Sliders, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Free Maya Animation Reference Plugin (60fps Viewport Planes) | AnimationReference.org',
  description:
    'Download the free Autodesk Maya animation reference plugin. Import 60fps MP4 image sequences straight to (0,0,0), sync Moodboards, control opacity & timing live, and record playblast drafts. Supports Maya 2020–2026.',
  keywords: [
    'maya animation reference plugin',
    'free maya reference plane plugin',
    'import video into maya viewport',
    'maya image plane sequence script',
    'maya animation workflow plugin',
    'animation reference maya 2025 2026',
  ],
  alternates: {
    canonical: 'https://animationreference.org/maya-animation-reference-plugin',
  },
};

const FAQS = [
  {
    q: 'Which versions of Autodesk Maya are supported?',
    a: 'AnimRef Studio supports Maya 2020, 2022, 2023, 2024, 2025, and 2026 (both PySide2 and PySide6) on Windows, macOS, and Linux.',
  },
  {
    q: 'How do I install the Maya animation reference plugin?',
    a: 'Download and unzip animref_maya_plugin.zip, then drag and drop drag_and_drop_install.mel (or drag_and_drop_install.py) straight into your Maya 3D viewport. AnimRef Studio docks automatically on the right side of Maya.',
  },
  {
    q: 'Is the Maya plugin free to use?',
    a: 'Yes! The plugin is 100% free to download and includes 15 free daily library imports plus unlimited imports of your own uploaded references. Pro ($1 first month) unlocks unlimited imports from all AnimRef Moodboards and the entire 8,000+ library.',
  },
  {
    q: 'Does it convert MP4 videos into fast VP2 image sequences automatically?',
    a: 'Yes. AnimRef Studio automatically extracts and caches high-speed Viewport 2.0 image sequences centered at (0, 0, 0) with live Size, Opacity, Flip X, Lock, and Magic Align timing controls.',
  },
];

export default function MayaPluginSeoPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AnimRef Studio for Autodesk Maya',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Windows, macOS, Linux',
    softwareVersion: '2.0',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://animationreference.org/maya-animation-reference-plugin',
    downloadUrl: 'https://animationreference.org/downloads/animref_maya_plugin.zip',
    description:
      'Native PySide plugin for Autodesk Maya that imports 60fps animation reference planes centered at (0,0,0), syncs AnimRef Moodboards, and provides live Scene Plane controls.',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-10 md:py-16 space-y-14 text-white">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-gradient-to-br from-[#101830] via-[#0e0c1a] to-[#08090f] p-6 md:p-10 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Maya 2020 – 2026 · Win, macOS &amp; Linux</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.06]">
              Free Maya Animation{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                Reference Plugin
              </span>
            </h1>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
              Stop alt-tabbing to YouTube or converting image sequences by hand.{' '}
              <strong className="text-white">AnimRef Studio for Maya</strong> docks natively on the right side of Maya,
              syncs your Saved References &amp; Moodboards, and drops 60fps reference planes straight to{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-cyan-200">(0, 0, 0)</code>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href="/downloads/animref_maya_plugin.zip" download>
                <Button className="h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-extrabold px-6 gap-2 shadow-lg cursor-pointer">
                  <Download className="h-4 w-4" />
                  <span>Download Free for Maya (.zip)</span>
                </Button>
              </a>
              <Link href="/tools">
                <Button variant="outline" className="h-12 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-5 gap-1.5 cursor-pointer">
                  <span>Also Available for Blender</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                SHA-256 auto-updates
              </span>
              <span>· 15 free daily imports</span>
              <span>· Unlimited own uploads</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-black aspect-video shadow-2xl">
              <img
                src="/images/plugins/maya-studio-preview.jpg"
                alt="AnimRef Studio docked inside Autodesk Maya viewport"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: Sliders,
            title: 'Live Scene Plane Controller',
            desc: 'Click any reference plane in your Maya viewport and tweak Size, Opacity, Flip X, Lock, Center (0,0,0), and ±1f/±5f timing offsets live.',
          },
          {
            icon: Layers,
            title: 'Synced Moodboards & Uploaded Tab',
            desc: 'Sign in once via browser. Every Moodboard, saved clip, and local reference you upload appears inside Maya automatically.',
          },
          {
            icon: Film,
            title: '1-Click Playblast Drafts',
            desc: 'Record Maya playblasts directly from the plugin and open them as editable drafts on AnimationReference.org to share with your portfolio.',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-[#120e20] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-black text-white">{card.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#120e20] p-6 md:p-8 space-y-5">
        <h2 className="text-2xl font-black text-white">30-Second Drag &amp; Drop Install</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-300">
          {[
            'Download and unzip animref_maya_plugin.zip anywhere on your computer.',
            'Drag and drop drag_and_drop_install.mel (or .py) straight into your Maya 3D viewport.',
            'AnimRef Studio docks on the right side of Maya and opens your Saved References immediately.',
          ].map((step, i) => (
            <li key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <span className="font-mono text-xs font-black text-cyan-300">STEP 0{i + 1}</span>
              <p className="text-xs leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white">Maya Plugin FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-white/10 bg-[#110d1e] p-5 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{f.q}</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed pl-6">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </div>
  );
}
