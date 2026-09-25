import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const BASE_URL = 'https://animationreference.org';

type Topic = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: { heading: string; body: string }[];
  tags: { label: string; slug: string }[];
  related: { label: string; href: string }[];
  faqs: { question: string; answer: string }[];
};

const TOPICS: Record<string, Topic> = {
  'walk-cycle-animation-reference': {
    slug: 'walk-cycle-animation-reference',
    title: 'Walk Cycle Animation Reference',
    description: 'Study walk cycle animation reference clips frame by frame. Learn foot placement, weight shifts, timing, spacing, and believable character locomotion.',
    intro: 'A convincing walk cycle communicates personality, weight, rhythm, and direction before a character says a word. Use these references to compare contact, passing, down, and up poses while you refine timing and spacing.',
    sections: [
      { heading: 'What to study in a walk cycle', body: 'Start with the feet and hips: identify the contact pose, how the pelvis shifts over the supporting leg, and where the body settles on the down pose. Then study the counter-swing of the arms, head, and shoulders. Small offsets between these parts are often what make a walk feel alive.' },
      { heading: 'Timing and spacing tips', body: 'Compare the number of frames between contacts and how far the hips travel on each beat. Even spacing can feel mechanical; changes in spacing can show acceleration, fatigue, confidence, or uneven terrain. Scrub several references at the same playback speed before choosing a rhythm.' },
    ],
    tags: [{ label: 'Walk', slug: 'walk' }, { label: 'Locomotion', slug: 'locomotion' }, { label: 'Body Mechanics', slug: 'body-mechanics' }],
    related: [{ label: 'Locomotion animation reference', href: '/resources/locomotion-animation-reference' }, { label: 'How to analyze animation reference', href: '/resources/how-to-analyze-animation-reference' }],
    faqs: [{ question: 'How many frames are in a walk cycle?', answer: 'There is no single correct length. Many character walks use roughly 8 to 24 frames per step depending on style, speed, and frame rate. Match the rhythm to the character and action.' }, { question: 'What are the key poses in a walk cycle?', answer: 'The common key poses are contact, down, passing, and up. The exact poses can be adapted for personality, terrain, footwear, and camera angle.' }],
  },
  'run-cycle-animation-reference': {
    slug: 'run-cycle-animation-reference', title: 'Run Cycle Animation Reference',
    description: 'Explore run cycle animation reference clips for stride length, airborne poses, foot contact, body lean, and fast character locomotion.',
    intro: 'Running is a study in rhythm, suspension, impact, and recovery. These clips help you compare realistic and stylized run cycles so you can choose the right stride, body lean, and contact timing for your shot.',
    sections: [{ heading: 'Read the stride', body: 'Track the center of gravity from one foot strike to the next. Look for the difference between the compressed impact pose and the extended recovery pose, then compare how the arms and torso counter the legs.' }, { heading: 'Make speed readable', body: 'Speed comes from the relationship between stride length, cadence, and spacing—not simply from moving every part faster. Use a longer stride for power and a quicker, tighter cadence for panic or urgency.' }],
    tags: [{ label: 'Run', slug: 'run' }, { label: 'Locomotion', slug: 'locomotion' }, { label: 'Body Mechanics', slug: 'body-mechanics' }],
    related: [{ label: 'Walk cycle reference', href: '/resources/walk-cycle-animation-reference' }, { label: 'Foundations of life', href: '/resources/foundations-of-life' }],
    faqs: [{ question: 'What makes a run different from a walk?', answer: 'A run typically includes a brief airborne or suspension phase, stronger vertical movement, and a different relationship between stride length and cadence.' }, { question: 'Should a run cycle have an airborne pose?', answer: 'For many runs, yes. The pose does not have to be exaggerated, but showing suspension helps distinguish running from a fast walk.' }],
  },
  'punch-animation-reference': {
    slug: 'punch-animation-reference', title: 'Punch Animation Reference',
    description: 'Study punch animation reference clips frame by frame, including anticipation, weight transfer, impact, recoil, and believable follow-through.',
    intro: 'A strong punch is a coordinated body action, not only an arm movement. Use these references to study anticipation, force direction, contact, recoil, and the delayed follow-through of the torso, shoulders, and hand.',
    sections: [{ heading: 'Break down the action', body: 'Mark the preparation, launch, contact, and recovery. Check whether the hips and feet support the direction of force, and whether the striking hand arrives after the body has begun to commit.' }, { heading: 'Show impact without overacting', body: 'Impact can be communicated through a sharp change in spacing, a brief hold, and a clear reaction in the target. Preserve the character’s balance so the action feels powered rather than weightless.' }],
    tags: [{ label: 'Punch', slug: 'punch' }, { label: 'Combat', slug: 'combat' }, { label: 'Action', slug: 'action' }],
    related: [{ label: 'Combat animation reference', href: '/resources/combat-animation-reference' }, { label: 'Body mechanics reference', href: '/resources/foundations-of-life' }],
    faqs: [{ question: 'What are the key poses in a punch?', answer: 'Common poses include anticipation, launch, contact, and recoil. Add breakdowns for the torso, hips, feet, and target reaction so the force reads clearly.' }, { question: 'How do you make a punch feel heavy?', answer: 'Use grounded footwork, a clear weight shift, purposeful spacing changes, and a reaction that preserves cause and effect between the attacker and target.' }],
  },
  'facial-acting-animation-reference': {
    slug: 'facial-acting-animation-reference', title: 'Facial Acting Animation Reference',
    description: 'Study facial acting animation reference for eye focus, expressions, lip sync, blinks, head movement, and subtle character performance.',
    intro: 'Facial acting is built from decisions: where the eyes focus, when a thought changes, and how the face settles between expressions. Compare these references to find the small timing choices that make a performance readable.',
    sections: [{ heading: 'Look for the thought change', body: 'The most useful moment is often just before the expression changes. Observe eye darts, blinks, breath, and tiny shifts in the mouth or brows that prepare the audience for the next idea.' }, { heading: 'Use the whole head', body: 'A facial pose rarely works in isolation. Head angle, neck tension, shoulders, and eye direction all affect the meaning of the same mouth and brow shapes.' }],
    tags: [{ label: 'Acting', slug: 'acting' }, { label: 'Facial', slug: 'facial' }, { label: 'Lip Sync', slug: 'lip-sync' }],
    related: [{ label: 'Character acting reference', href: '/resources/character-acting-animation-reference' }, { label: 'How to analyze reference', href: '/resources/how-to-analyze-animation-reference' }],
    faqs: [{ question: 'What should animators study in facial reference?', answer: 'Study eye focus, blinks, expression transitions, head movement, pauses, asymmetry, and the relationship between speech and facial thought.' }, { question: 'How long should an expression hold?', answer: 'Hold it long enough for the audience to read the idea, then vary the timing based on the character’s confidence, emotion, and dialogue.' }],
  },
  'body-mechanics-animation-reference': {
    slug: 'body-mechanics-animation-reference', title: 'Body Mechanics Animation Reference',
    description: 'Use body mechanics animation reference to study balance, weight, pushing, pulling, lifting, falling, and believable full-body movement.',
    intro: 'Body mechanics connects poses through force and balance. These references are useful for checking where weight is supported, how momentum travels through the body, and when a pose needs a stronger preparation or recovery.',
    sections: [{ heading: 'Find the support and force', body: 'Ask which foot or surface supports the character at every key moment. Then trace the force through the hips, spine, shoulders, and hands. A clear line of action makes the movement easier to understand.' }, { heading: 'Use cause and effect', body: 'A heavy object should affect posture before, during, and after the lift. Study the preparation, effort, release, and settling phases rather than focusing only on the most dramatic pose.' }],
    tags: [{ label: 'Body Mechanics', slug: 'body-mechanics' }, { label: 'Weight', slug: 'weight' }, { label: 'Movement', slug: 'movement' }],
    related: [{ label: 'Foundations of life', href: '/resources/foundations-of-life' }, { label: 'Locomotion reference', href: '/resources/locomotion-animation-reference' }],
    faqs: [{ question: 'What is body mechanics in animation?', answer: 'Body mechanics is the study of how a character moves through balance, force, weight, momentum, and physical cause and effect.' }, { question: 'How do you animate weight?', answer: 'Show preparation, resistance, compression, changes in balance, and recovery. Timing and spacing should support the apparent mass of the object and character.' }],
  },
  'creature-locomotion-animation-reference': {
    slug: 'creature-locomotion-animation-reference', title: 'Creature Locomotion Animation Reference',
    description: 'Study creature locomotion animation reference for quadruped walks, animal runs, weight shifts, paws, hooves, tails, and believable movement.',
    intro: 'Creature motion becomes convincing when the rhythm of the limbs, spine, head, and body weight works together. Use these references to compare real animal mechanics with stylized animation choices.',
    sections: [{ heading: 'Study the limb pattern', body: 'Track which limbs share the load and how the feet alternate. Then follow the spine and pelvis: they often reveal the true rhythm more clearly than the paws alone.' }, { heading: 'Add secondary motion', body: 'Ears, tails, fur, and loose skin should respond to the primary movement with a slight delay. Secondary action is most effective when it follows the force of the body rather than moving randomly.' }],
    tags: [{ label: 'Creature', slug: 'creature' }, { label: 'Animal', slug: 'animal' }, { label: 'Locomotion', slug: 'locomotion' }],
    related: [{ label: 'Locomotion animation reference', href: '/resources/locomotion-animation-reference' }, { label: 'Body mechanics reference', href: '/resources/body-mechanics-animation-reference' }],
    faqs: [{ question: 'What should I study first in creature animation?', answer: 'Begin with the contact pattern and weight-bearing limbs, then study the spine, head, and secondary motion.' }, { question: 'How do you make an animal walk feel believable?', answer: 'Use a consistent limb rhythm, grounded contacts, appropriate body compression, and follow-through that reflects the creature’s anatomy and mass.' }],
  },
  'animation-timing-and-spacing-reference': {
    slug: 'animation-timing-and-spacing-reference', title: 'Animation Timing and Spacing Reference',
    description: 'Learn animation timing and spacing from reference clips. Study rhythm, holds, acceleration, deceleration, impact, and the difference between fast and slow movement.',
    intro: 'Timing tells you how long an action takes; spacing shows how far the subject travels between frames. Together they control weight, energy, clarity, and emotion. These references make those choices easier to compare.',
    sections: [{ heading: 'Read the rhythm', body: 'Count frames between key poses and notice where the action pauses, accelerates, or changes direction. A short hold can make an idea readable, while tight spacing can create a sharp accent.' }, { heading: 'Compare spacing patterns', body: 'Even spacing suggests constant motion. Ease-ins and ease-outs create acceleration and deceleration. Large spacing changes can communicate impact, surprise, speed, or force.' }],
    tags: [{ label: 'Timing', slug: 'timing' }, { label: 'Spacing', slug: 'spacing' }, { label: 'Movement', slug: 'movement' }],
    related: [{ label: 'How to analyze animation reference', href: '/resources/how-to-analyze-animation-reference' }, { label: '12 principles of animation', href: '/resources/12-principles-of-animation-reference' }],
    faqs: [{ question: 'What is the difference between timing and spacing?', answer: 'Timing is the duration of an action. Spacing is the distance traveled between frames. Changing either one changes how movement feels.' }, { question: 'How can reference improve timing?', answer: 'Scrub several examples, count frames between important poses, and compare where each action holds, accelerates, and settles.' }],
  },
  'fx-animation-reference': {
    slug: 'fx-animation-reference', title: 'FX Animation Reference',
    description: 'Study FX animation reference for fire, smoke, water, explosions, sparks, magic, and energy. Analyze shape, flow, timing, and dissipation.',
    intro: 'Effects are often abstract, but they still need rhythm, force, and a clear visual cause. Use these references to study how an effect appears, develops, peaks, breaks apart, and disappears.',
    sections: [{ heading: 'Break the effect into phases', body: 'Identify the birth, growth, peak, breakup, and dissipation of the effect. Each phase can use a different rhythm, from a sharp ignition to a slower drifting settle.' }, { heading: 'Follow the flow', body: 'Track the direction of motion through smoke, flame, water, or energy. Strong silhouettes and directional flow make effects readable even when the shapes are changing quickly.' }],
    tags: [{ label: 'FX', slug: 'fx' }, { label: 'Fire', slug: 'fire' }, { label: 'Smoke', slug: 'smoke' }],
    related: [{ label: 'FX animation reference guide', href: '/resources/fx-animation-reference' }, { label: 'Animation timing and spacing', href: '/resources/animation-timing-and-spacing-reference' }],
    faqs: [{ question: 'What should I look for in FX reference?', answer: 'Study the effect’s phases, silhouette, directional flow, rhythm, scale changes, and how it reacts to its environment.' }, { question: 'How do you animate believable smoke?', answer: 'Use overlapping shapes with varied timing, clear upward or directional flow, and gradual breakup rather than moving one uniform mass.' }],
  },
};

export function generateStaticParams() {
  return Object.keys(TOPICS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const topic = TOPICS[(await params).slug];
  if (!topic) return { title: 'Resource Not Found | Animation Reference', robots: { index: false } };
  return { title: topic.title, description: topic.description, alternates: { canonical: `${BASE_URL}/resources/${topic.slug}` }, openGraph: { title: topic.title, description: topic.description, url: `${BASE_URL}/resources/${topic.slug}`, type: 'article' } };
}

export default async function TopicResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const topic = TOPICS[(await params).slug];
  if (!topic) notFound();
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: topic.faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) };
  const articleSchema = { '@context': 'https://schema.org', '@type': 'Article', headline: topic.title, description: topic.description, url: `${BASE_URL}/resources/${topic.slug}`, publisher: { '@type': 'Organization', name: 'Animation Reference', url: BASE_URL } };

  return <main className="container mx-auto max-w-5xl px-4 py-12 md:px-8">
    <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground"><Link href="/" className="hover:text-foreground">Home</Link><span className="mx-2">/</span><Link href="/resources" className="hover:text-foreground">Resources</Link><span className="mx-2">/</span><span className="text-foreground">{topic.title}</span></nav>
    <article>
      <header className="mb-12 max-w-4xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-purple-300">Animation study guide</p><h1 className="mb-5 text-4xl font-black tracking-tight md:text-6xl">{topic.title}</h1><p className="text-lg leading-relaxed text-muted-foreground">{topic.intro}</p></header>
      <div className="grid gap-8 md:grid-cols-2">{topic.sections.map(section => <section key={section.heading} className="rounded-2xl border border-border bg-card p-6"><h2 className="mb-3 text-xl font-bold">{section.heading}</h2><p className="leading-relaxed text-muted-foreground">{section.body}</p></section>)}</div>
      <section className="mt-12 rounded-2xl border border-purple-400/20 bg-purple-950/20 p-6"><h2 className="mb-4 text-2xl font-bold">Study related reference clips</h2><p className="mb-5 text-muted-foreground">Compare examples in the library and scrub them frame by frame to see how timing, spacing, posing, and weight change across performances.</p><div className="flex flex-wrap gap-3">{topic.tags.map(tag => <Link key={tag.slug} href={`/tags/${tag.slug}`} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:border-primary/50">{tag.label} references</Link>)}</div></section>
      <section className="mt-12"><h2 className="mb-5 text-2xl font-bold">Keep learning</h2><div className="grid gap-3 sm:grid-cols-2">{topic.related.map(link => <Link key={link.href} href={link.href} className="rounded-xl border border-border p-4 font-semibold hover:border-primary/50">{link.label} <span aria-hidden="true">→</span></Link>)}</div></section>
      <section className="mt-12"><h2 className="mb-5 text-2xl font-bold">Frequently asked questions</h2><div className="space-y-6">{topic.faqs.map(faq => <div key={faq.question}><h3 className="mb-2 text-lg font-semibold">{faq.question}</h3><p className="leading-relaxed text-muted-foreground">{faq.answer}</p></div>)}</div></section>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
  </main>;
}
