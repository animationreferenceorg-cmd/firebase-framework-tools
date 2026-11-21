import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Layers, Sliders, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Free Blender Animation Reference Add-on (3D Viewport Planes) | AnimationReference.org',
  description:
    'Download the free Blender animation reference add-on for Blender 3.6 – 5.1+. Browse 8,000+ clips, sync Moodboards, drop auto-framed 3D reference planes & Camera PiP, and control timing live from the View3D N-panel.',
  keywords: [
    'blender animation reference addon',
    'free blender reference plane addon',
    'import video reference into blender viewport',
    'blender camera background reference video',
    'blender animation workflow addon 4.2 5.0',
  ],
  alternates: {
    canonical: 'https://animationreference.org/blender-animation-reference-addon',
  },
};

const FAQS = [
  {
    q: 'Which versions of Blender are supported?',
    a: 'AnimRef Studio works with Blender 3.6 through Blender 5.1+ using both the modern Get Extensions installer and classic Add-ons → Install from Disk.',
  },
  {
    q: 'How do I install the Blender animation reference add-on?',
    a: 'Download animref_blender_addon.zip (keep it zipped). In Blender, open Edit → Preferences → Get Extensions (or Add-ons) → Install from Disk, enable AnimRef Studio, then press N in the 3D Viewport → AnimRef tab.',
  },
  {
    q: 'Can I import references as 3D planes, Camera Backgrounds, or VSE strips?',
    a: 'Yes! AnimRef Studio lets you import any animation reference as an auto-framed 3D Reference Plane, a Camera Background PiP, or a Video Sequence Editor strip, and tweak Size, Opacity, Flip, and Timeline Offset live in the N-panel.',
  },
  {
    q: 'Is the Blender add-on free?',
    a: 'Yes! It is 100% free to download with 15 daily library imports and unlimited imports of your own uploaded references. Pro ($1 first month) unlocks unlimited imports from all AnimRef Moodboards.',
  },
];

export default function BlenderAddonSeoPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AnimRef Studio for Blender',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Windows, macOS, Linux',
    softwareVersion: '2.0',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://animationreference.org/blender-animation-reference-addon',
    downloadUrl: 'https://animationreference.org/downloads/animref_blender_addon.zip',
    description:
      'Free Blender add-on with a frameless dark Companion Studio window and native View3D N-panel for importing and controlling 3D animation reference planes, Camera PiP, and Moodboards.',
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
      <section className="relative overflow-hidden rounded-[2rem] border border-orange-500/30 bg-gradient-to-br from-[#231426] via-[#120e1e] to-[#08090f] p-6 md:p-10 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/35 bg-orange-500/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Blender 3.6 – 5.1+ · Extensions &amp; Add-ons</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.06]">
              Free Blender Animation{' '}
              <span className="bg-gradient-to-r from-orange-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
                Reference Add-on
              </span>
            </h1>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
              Bring 8,000+ animation references and your synced Moodboards straight into Blender.{' '}
              <strong className="text-white">AnimRef Studio for Blender</strong> pairs a sleek frameless Companion
              Studio window with a live View3D N-panel controller for 3D planes, Camera PiP, and timeline offset.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href="/downloads/animref_blender_addon.zip" download>
                <Button className="h-12 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 hover:from-orange-400 hover:to-violet-500 text-white font-extrabold px-6 gap-2 shadow-lg cursor-pointer">
                  <Download className="h-4 w-4" />
                  <span>Download Free for Blender (.zip)</span>
                </Button>
              </a>
              <Link href="/maya-animation-reference-plugin">
                <Button variant="outline" className="h-12 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold px-5 gap-1.5 cursor-pointer">
                  <span>Also Available for Maya</span>
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
                src="/images/plugins/blender-studio-preview.jpg"
                alt="AnimRef Studio Companion Window and N-panel inside Blender"
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
            title: 'Live View3D N-Panel Controls',
            desc: 'Adjust Size, Opacity, Origin, Flip X, and Timeline Frame Offset on any active scene reference plane without leaving your rig.',
          },
          {
            icon: Layers,
            title: '3D Plane, Camera PiP & VSE',
            desc: 'Drop references as auto-framed 3D planes, camera background overlays, or Video Sequence Editor strips in 1 click.',
          },
          {
            icon: Film,
            title: 'Playblast Drafts & Auto-Updates',
            desc: 'Capture Blender viewport playblasts straight to editable drafts on AnimationReference.org and receive automatic SHA-256 updates.',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-[#120e20] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/15 border border-orange-400/30 flex items-center justify-center text-orange-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-black text-white">{card.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#120e20] p-6 md:p-8 space-y-5">
        <h2 className="text-2xl font-black text-white">30-Second Blender Install</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-300">
          {[
            'Download animref_blender_addon.zip (leave it zipped).',
            'In Blender, open Edit → Preferences → Get Extensions / Add-ons → Install from Disk.',
            'Press N in the 3D Viewport → AnimRef tab → click Open AnimRef Studio Window.',
          ].map((step, i) => (
            <li key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <span className="font-mono text-xs font-black text-orange-300">STEP 0{i + 1}</span>
              <p className="text-xs leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black text-white">Blender Add-on FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-white/10 bg-[#110d1e] p-5 space-y-2">
              <h3 className="text-sm font-bold text-white flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
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
