
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutGrid, FolderHeart, Share2, Cloud, Sparkles, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Why Every Professional Animator Needs a Personal Reference Vault',
    description: 'Optimize your animation workflow by building a personal reference vault. Organize, categorize, and access your inspiration instantly.',
    keywords: 'organize animation reference, reference moodboard, animation workflow, reference manager, animation productivity tools',
};

export default function VaultResource() {
    return (
        <div className="min-h-screen bg-[#fafafa] text-[#030014] -mt-24 selection:bg-blue-100">
            {/* Clean Product Hero */}
            <section className="relative pt-48 pb-32 overflow-hidden bg-white">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent -z-10" />
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-4">
                            Workflow Optimization
                        </div>
                        <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.1] text-zinc-900">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Personal Vault</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl leading-relaxed">
                            Stop hunting through bookmarks. Build a professional reference library that grows with your career. Organize your inspiration, categorize by mechanic, and access it instantly.
                        </p>
                        <div className="pt-8 flex flex-col sm:flex-row gap-4">
                            <Button asChild size="lg" className="h-16 px-10 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200">
                                <Link href="/signup">Create Your Free Vault</Link>
                            </Button>
                            <Button asChild variant="ghost" size="lg" className="h-16 px-10 rounded-2xl hover:bg-zinc-100">
                                <Link href="/browse">Browse Examples</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pain Points vs Solution */}
            <section className="py-32 container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 leading-tight">The "Old Way" is <span className="text-red-500">Slow.</span></h2>
                        <div className="space-y-6">
                            {[
                                'Scattered bookmarks across multiple sites',
                                'Low-res YouTube clips with annoying ads',
                                'Losing that "perfect" video when you need it most',
                                'Zero organization for specific mechanics'
                            ].map(item => (
                                <div key={item} className="flex items-center gap-4 text-zinc-500">
                                    <div className="h-2 w-2 rounded-full bg-zinc-300" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-12 rounded-[40px] bg-blue-600 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <Sparkles className="h-32 w-32" />
                        </div>
                        <h3 className="text-3xl font-bold mb-8">The Vault Way</h3>
                        <div className="space-y-8">
                            {[
                                { title: 'Centralized Hub', desc: 'One high-speed home for every reference you love.', icon: <LayoutGrid /> },
                                { title: 'Smart Collections', desc: 'Organize by "Fighting," "Weight," or "Acting" instantly.', icon: <FolderHeart /> },
                                { title: 'Instant Access', desc: 'Cloud-synced. Access your vault from any machine, anywhere.', icon: <Cloud /> }
                            ].map((feat, i) => (
                                <div key={i} className="flex gap-6">
                                    <div className="mt-1">{feat.icon}</div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">{feat.title}</h4>
                                        <p className="text-blue-100 opacity-90">{feat.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Statistics / Value Prop */}
            <section className="py-32 bg-zinc-50 border-y border-zinc-100">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        {[
                            { val: '40%', label: 'Time Saved Searching' },
                            { val: '10k+', label: 'Artists Using Vaults' },
                            { val: 'Zero', label: 'Broken Bookmarks' }
                        ].map((stat, i) => (
                            <div key={i} className="space-y-2">
                                <div className="text-6xl font-bold text-zinc-900 tracking-tighter">{stat.val}</div>
                                <div className="text-zinc-500 font-medium uppercase text-xs tracking-widest">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final Soft CTA */}
            <section className="py-48 text-center bg-white">
                <div className="max-w-3xl mx-auto space-y-12">
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900">Your future self <br />will thank you.</h2>
                    <p className="text-xl text-zinc-500 leading-relaxed">Start building your personal reference vault today and spend your time where it matters most: on the timeline.</p>
                    <div className="pt-8">
                        <Button asChild size="lg" className="h-20 px-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all text-xl font-bold shadow-2xl shadow-blue-200">
                            <Link href="/signup">Get Started for Free <ArrowRight className="ml-3 h-6 w-6 inline" /></Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
