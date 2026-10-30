import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, documentId } from 'firebase/firestore';
import type { BlogPost, Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Film, CheckCircle2, ChevronRight, Activity, Sliders, Layers } from 'lucide-react';
import Link from 'next/link';
import { filterAvailableVideos } from '@/lib/video-availability';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ slug: string }>;
};

const ENRICHED_BLOG_CONTENT: Record<string, {
    openingDef: string;
    sections: { heading: string; body: string }[];
    timingChart: { phase: string; frameRange: string; focus: string }[];
    pitfalls: string[];
}> = {
    'hit-reaction-animation-reference': {
        openingDef: 'Hit reaction animation reference is a kinetic study guide for animating physical impacts, directional force displacement, and involuntary muscular recoil in 2D and 3D character animation.',
        sections: [
            {
                heading: 'The Biomechanics of Force Transfer & Impact Absorption',
                body: 'A convincing hit reaction is never just a backward head snap. When a fist, blunt weapon, or projectile strikes an anatomical target, force propagates through skeletal chains in strict physiological sequence. On contact frame 0, local soft tissue compresses before skeletal movement occurs. The cervical vertebrae lock momentarily before kinetic energy forces the head backward, dragging the thoracic spine and pelvis into secondary reaction arcs. Notice how an unprepared character collapses at the knees, while an anchored fighter counter-steps to regain their center of gravity.'
            },
            {
                heading: 'Anticipation, Whiplash & Reversal Timing',
                body: 'Most animator mistakes in combat reactions stem from missing the anticipation micro-beat or lingering too long at the apex of impact. In high-speed martial arts or combat sports, the head reaches its maximum displacement within 2 to 4 frames (at 24 FPS). Holding the extreme impact frame for more than a single frame causes the blow to feel sluggish and weightless. The reversal — where the neck muscles violently resist over-extension — must immediately follow with sharp deceleration and elastic rebound.'
            },
            {
                heading: 'Center of Gravity & Ground Stance Disruption',
                body: 'Every strike alters the root coordinate of the character. If the impact line passes through the character\'s center of mass, both hips travel backward along the force vector. If the blow strikes an off-axis point (such as a hook punch to the jaw or an angled roundhouse kick), the torso must rotate violently along the vertical spine axis before the feet compensate. Animators should track the pelvic trajectory: a heavy hit causes the hips to drop 10-15% on contact as kinetic energy overrides muscular posture.'
            },
            {
                heading: 'Game Engine vs. Cinematic Production Considerations',
                body: 'In real-time action gameplay, hit reactions must blend cleanly within 12 to 18 frames so players do not experience unresponsive input lag. In cinematic cuts, animators have the liberty to extend the recovery phase to 36 or 48 frames, introducing staggered foot drags, disoriented eye blinks, and torso settling. Scrub our curated reference clips frame by frame to observe how studio animators compress timing without sacrificing kinetic credibility.'
            }
        ],
        timingChart: [
            { phase: 'Contact & Flesh Compression', frameRange: 'Frame 0 - 1', focus: 'Immediate soft tissue squash, weapon deceleration, zero root displacement.' },
            { phase: 'Cervical Snap & Whiplash', frameRange: 'Frame 2 - 4', focus: 'Maximum head rotation, jaw acceleration, eyes trail the primary force vector.' },
            { phase: 'Root Displacement & Hip Drop', frameRange: 'Frame 5 - 8', focus: 'Center of gravity shifts backward, knees flex, arms splay outwards for balance.' },
            { phase: 'Secondary Bounce & Recovery Arc', frameRange: 'Frame 9 - 18', focus: 'Spine counter-flexes, feet re-anchor with staggered friction steps.' }
        ],
        pitfalls: [
            'Moving all body parts simultaneously on frame 1 instead of staggering the kinetic chain.',
            'Linear interpolation between contact and recovery poses with no snappy deceleration.',
            'Ignoring pelvic drop and foot sliding, causing the character to look attached to the floor grid.'
        ]
    },
    'run-cycle-locomotion-animation-reference': {
        openingDef: 'Run cycle locomotion animation reference is a technical biomechanics breakdown covering flight phases, ground contact compression, forward hip drive, and arm swing rhythm at 24 frames per second.',
        sections: [
            {
                heading: 'The Critical Difference Between Walking and Running: The Airborne Flight Phase',
                body: 'While walking maintains double support where both feet contact the ground simultaneously, a true run cycle features zero double support. Instead, running introduces an airborne flight phase where neither foot touches the ground. The height of this flight phase directly communicates character velocity, intent, and athletic power. A sprint features an extended ballistic flight arc, whereas an exhausted jog minimizes airborne hang time to conserve metabolic stamina.'
            },
            {
                heading: 'Ground Strike Mechanics: Heel vs. Forefoot Contact',
                body: 'Sprinters and agile humanoid characters make ground contact on the ball of the foot (forefoot strike), keeping the ankle dorsiflexed to act as a coiled biological spring. Heavy armored units or jog cycles often feature a midfoot or heel strike where impact ripples up the shin into the knee joint. When keyframing the down frame (impact absorption), the supporting knee must flex deeply as the pelvis reaches its lowest vertical point in the cycle.'
            },
            {
                heading: 'Pelvic Tilt, Rotation & Torso Counter-Balance',
                body: 'A mechanical run cycle occurs when animators move only legs and arms while locking the hips flat. In natural locomotion, the pelvis performs three distinct rotations: pitch (forward tilt as the spine leans), yaw (twisting toward the driving forward knee), and roll (tilting downward toward the unsupported swinging leg). The clavicles and shoulders counter-rotate in exact opposition to the pelvis, creating a twisted torso torsion line that stores dynamic energy.'
            },
            {
                heading: 'Spacing, Timing & Foot Trajectory Arcs',
                body: 'At standard 24 FPS playback, an athletic run cycle typically completes a full two-step stride in 14 to 18 frames (7 to 9 frames per step). Slower jogs may take 20 to 22 frames, while high-velocity sprints tighten to 12 frames. When tracing the ankle in 3D or 2D space, the trajectory forms an elongated teardrop arc: low and straight along the ground during contact and push-off, rising sharply up toward the gluteus during the airborne recovery swing.'
            }
        ],
        timingChart: [
            { phase: 'Contact & Foot Strike', frameRange: 'Frame 1 (0s)', focus: 'Forefoot or midfoot strikes ground ahead of center of gravity.' },
            { phase: 'Down Position & Cushion', frameRange: 'Frame 3 (0.12s)', focus: 'Maximum knee flex, lowest pelvic elevation, weight absorption.' },
            { phase: 'Passing / Push-off Drive', frameRange: 'Frame 5 (0.20s)', focus: 'Rear leg fully extends, ankle plantarflexes, driving pelvis forward.' },
            { phase: 'Airborne Flight Suspension', frameRange: 'Frame 7 (0.29s)', focus: 'Both feet off ground, highest pelvic elevation, trailing leg recovers.' }
        ],
        pitfalls: [
            'Even spacing on the airborne recovery arc resulting in robotic, wheel-like foot motion.',
            'Failing to counter-rotate shoulders against hip yaw, causing the torso to look stiff as cardboard.',
            'Lacking vertical pelvic variation: a flat horizontal root line destroys the perception of weight.'
        ]
    },
    'sword-animation-reference-guide': {
        openingDef: 'Sword animation reference guide is an analysis of weapon momentum, hand-and-wrist leverage, fulcrum physics, and follow-through arcs across historical and stylized combat animation.',
        sections: [
            {
                heading: 'Weapon Physics: Weight Distribution & The Fulcrum Principle',
                body: 'A sword is an extension of the animator\'s kinetic chain, not a weightless stick glued to a palm bone. Even a light rapier or katana has a center of mass positioned 3 to 5 inches forward from the crossguard or tsuba. When a character initiates a slash, the lead hand acts as a fulcrum while the rear hand exerts rotational leverage. The tip of the blade must always trail behind the hands during initial acceleration, overtaking them only at the moment of peak velocity.'
            },
            {
                heading: 'The 3 Distinct Combat Phases: Chambering, Edge Alignment & Cleave',
                body: 'Every convincing sword swing is composed of three interconnected beats: anticipation chambering, edge alignment along the cutting plane, and the follow-through cleave. During chambering, the hips and shoulders wind up in the opposite direction of the planned cut, loading weight onto the rear foot. As the cut begins, the blade must rotate so its edge aligns with the velocity vector. A cut with misaligned blade angle reads to audiences and martial artists as a blunt slap rather than a lethal cleave.'
            },
            {
                heading: 'Two-Handed vs. One-Handed Swing Mechanics',
                body: 'One-handed blades (like historical sideswords or cutlasses) rely heavily on shoulder abduction, wrist snapping, and lateral lunges. Two-handed greatswords and longswords shift the fulcrum between both hands: pushing with the top hand while pulling with the bottom hand around the pommel creates extreme rotational speed. Notice how real historical fencers use the entire body — dropping their center of gravity and driving off the back heel — rather than swinging purely with arm musculature.'
            },
            {
                heading: 'Stylized Anime Smears vs. Realistic Historical Weapon Arcs',
                body: 'In Japanese Sakuga and stylized action gaming, animators exaggerate blade arcs using elongated smear frames, dry-brush trails, and multi-frame perspective distortions. To maintain believability, these stylized smears must still honor the anatomical force direction: the anticipation must establish weight before the single-frame flash of the blade cuts through the screen.'
            }
        ],
        timingChart: [
            { phase: 'Windup & Torso Chambering', frameRange: 'Frames 1 - 6', focus: 'Weight shifts to rear foot, spine twists, weapon tip lags behind wrists.' },
            { phase: 'Torso Drive & Edge Alignment', frameRange: 'Frames 7 - 9', focus: 'Hips lead the stroke, blade enters cutting plane, extreme acceleration.' },
            { phase: 'Peak Slash Velocity & Smear', frameRange: 'Frames 10 - 11', focus: 'Blade overtakes hands, maximum arc extension, optional smear frame.' },
            { phase: 'Overshoot & Recovery Stance', frameRange: 'Frames 12 - 20', focus: 'Blade momentum drags arms forward, torso settles into balanced guard.' }
        ],
        pitfalls: [
            'Parenting the weapon rigidly to the hand without secondary wrist flexibility or tip lag.',
            'Ignoring edge alignment: rotating the blade flat-side forward during a cutting stroke.',
            'Stopping the sword instantly at the target without overshoot or muscular resistance recoil.'
        ]
    }
};

const RELATED_GUIDES = [
    { title: 'Human Walk Cycle Animation Reference', href: '/resources/human-walk-cycle-animation-reference' },
    { title: 'Real Life & Live-Action Animation Reference', href: '/resources/real-life-animation-reference' },
    { title: 'Walk Cycle Animation Reference', href: '/resources/walk-cycle-animation-reference' },
    { title: 'Run Cycle Locomotion Animation Reference', href: '/resources/run-cycle-animation-reference' },
    { title: 'Punch & Combat Animation Reference', href: '/resources/punch-animation-reference' },
    { title: 'Body Mechanics Animation Reference', href: '/resources/body-mechanics-animation-reference' },
    { title: 'Frame-by-Frame Video Player Online', href: '/frame-by-frame-player' },
    { title: 'Browse All Animation Categories', href: '/categories' }
];

async function getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
        const postsRef = collection(db, 'blogPosts');
        const q = query(postsRef, where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as BlogPost;
        }
    } catch (error) {
        console.error("Error fetching SEO page by slug:", error);
    }
    return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post) return { title: 'Page Not Found' };

    const rawTitle = (post.seoTitle || post.title || slug)
        .replace(/\s*\|\s*Animation Reference/gi, '')
        .replace(/\s*-\s*Animation Reference/gi, '')
        .trim();
    const cleanTitle = rawTitle.length > 36 ? rawTitle.slice(0, 33) + '...' : rawTitle;

    const rawDesc = (post.seoDescription || post.excerpt || '').trim();
    const description = rawDesc.length >= 110 && rawDesc.length <= 160
        ? rawDesc
        : `Study ${post.title} with frame-by-frame video reference. Breakdown timing, body mechanics, and key poses for 2D, 3D, and game animators.`;

    return {
        title: cleanTitle,
        description: description,
        keywords: post.keywords?.join(', '),
        alternates: { canonical: `https://animationreference.org/blog/${slug}` },
    };
}

export default async function SeoLandingPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post || post.status !== 'published') {
        notFound();
    }

    const enriched = ENRICHED_BLOG_CONTENT[slug];

    let videos: Video[] = [];
    if (post.videoIds && post.videoIds.length > 0) {
        try {
            const videosRef = collection(db, 'videos');
            const q = query(videosRef, where(documentId(), 'in', post.videoIds));
            const snapshot = await getDocs(q);
            videos = filterAvailableVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Video));
        } catch (error) {
            console.error("Error fetching associated videos for blog post:", error);
        }
    }

    if (videos.length === 0) {
        try {
            const snapshotVids = getAllSnapshotVideos();
            const keyword = slug.split('-')[0];
            videos = snapshotVids.filter(v => 
                (v.title || '').toLowerCase().includes(keyword) || 
                (v.tags || []).some(t => t.toLowerCase().includes(keyword))
            ).slice(0, 6);
        } catch {}
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://animationreference.org' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://animationreference.org/blog' },
            { '@type': 'ListItem', position: 3, name: post.title, item: `https://animationreference.org/blog/${slug}` },
        ],
    };

    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans -mt-24">
            {/* Hero Section */}
            <section className="relative pt-44 pb-24 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[#030014] -z-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent -z-10" />
                
                <div className="container mx-auto px-6 text-center max-w-4xl">
                    {/* Breadcrumbs */}
                    <nav className="text-xs text-zinc-400 mb-8 flex items-center justify-center gap-1.5" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/categories" className="hover:text-white transition-colors">Categories</Link>
                        <span>/</span>
                        <span className="text-purple-300 font-medium truncate max-w-[240px] sm:max-w-none">{post.title}</span>
                    </nav>

                    <div className="flex justify-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">Animation Study Guide</span>
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                            {post.title}
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        {enriched ? enriched.openingDef : (post.seoDescription || `${post.title} is an in-depth animation reference guide for studying mechanical timing, force transfer, and physical weight distribution.`)}
                    </p>

                    <Button asChild className="h-14 px-8 rounded-xl text-base font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-500/20">
                        <Link href="/categories">
                            Explore Full Reference Library
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-16 bg-white/[0.02]">
                <div className="container mx-auto px-6 max-w-4xl space-y-12">
                    {/* Opening Definition Card */}
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 backdrop-blur-md">
                        <p className="text-base sm:text-lg text-purple-100 leading-relaxed">
                            <strong className="text-white">{post.title}</strong> is a dedicated reference breakdown for animators studying biomechanics, keyframing cadence, and weight transfer at 24 frames per second.
                        </p>
                    </div>

                    {/* Original Blog Content if present */}
                    {post.content && post.content.trim().length > 0 && (
                        <div className="prose prose-invert prose-purple max-w-none text-zinc-300 text-lg leading-relaxed space-y-6 whitespace-pre-wrap">
                            {post.content}
                        </div>
                    )}

                    {/* Enriched Detailed Breakdowns if present */}
                    {enriched && (
                        <div className="space-y-12 pt-6">
                            {enriched.sections.map((sec, idx) => (
                                <section key={sec.heading} className="space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-6 md:p-8">
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                        {sec.heading}
                                    </h2>
                                    <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
                                        {sec.body}
                                    </p>
                                </section>
                            ))}

                            {/* Timing & Spacing Reference Table */}
                            <section className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 space-y-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Sliders className="h-6 w-6 text-purple-400" />
                                    Frame-by-Frame Timing Chart (24 FPS)
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-purple-300">
                                            <tr>
                                                <th className="py-3 px-4">Motion Phase</th>
                                                <th className="py-3 px-4">Frame Range</th>
                                                <th className="py-3 px-4">Keyframe Focus</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-zinc-300">
                                            {enriched.timingChart.map((row) => (
                                                <tr key={row.phase} className="hover:bg-white/[0.02]">
                                                    <td className="py-3 px-4 font-semibold text-white">{row.phase}</td>
                                                    <td className="py-3 px-4 font-mono text-purple-300">{row.frameRange}</td>
                                                    <td className="py-3 px-4">{row.focus}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Common Animator Mistakes */}
                            <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 md:p-8 space-y-4">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Activity className="h-6 w-6 text-red-400" />
                                    Common Animating Pitfalls to Avoid
                                </h2>
                                <ul className="space-y-3">
                                    {enriched.pitfalls.map((pit, i) => (
                                        <li key={i} className="flex items-start gap-3 text-zinc-300 text-base">
                                            <span className="h-5 w-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">!</span>
                                            <span>{pit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    )}
                </div>
            </section>

            {/* Associated Reference Videos Grid */}
            {videos.length > 0 && (
                <section className="py-16 border-t border-white/5 bg-black/20">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-8 tracking-tight flex items-center gap-3">
                            <Film className="h-6 w-6 text-purple-400" />
                            Curated Reference Clips
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {videos.map(video => (
                                <VideoCard key={video.id} video={video} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Related Guides Block — solves t_orphan_pages */}
            <aside aria-label="Related Guides" className="py-16 border-t border-white/5 bg-black/40">
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-2xl font-bold text-white mb-6">Related Animation Guides &amp; Mechanics</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {RELATED_GUIDES.map((g) => (
                            <Link
                                key={g.href}
                                href={g.href}
                                className="p-4 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/80 hover:border-purple-500/40 transition-colors flex items-center justify-between group"
                            >
                                <span className="font-semibold text-zinc-200 group-hover:text-white text-sm">{g.title}</span>
                                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Final CTA */}
            <section className="py-24 text-center border-t border-t-white/5 bg-[#030014]">
                <div className="container mx-auto px-6 max-w-2xl">
                    <h2 className="text-3xl font-bold mb-4">Master your animation timing today.</h2>
                    <p className="text-zinc-400 mb-8 text-sm">Step frame by frame, compare playblasts side by side, and save references to your visual boards.</p>
                    <Button asChild size="lg" className="rounded-xl px-10 py-6 text-base font-semibold bg-purple-600 hover:bg-purple-500">
                        <Link href="/login?tab=sign-up">Get Started Free</Link>
                    </Button>
                </div>
            </section>

            {/* BreadcrumbList Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </div>
    );
}
