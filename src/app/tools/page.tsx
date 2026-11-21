import type { Metadata } from 'next';
import { ToolsPageClient } from '@/components/tools/ToolsPageClient';

export const metadata: Metadata = {
  title: 'Maya & Blender Animation Reference Plugins | AnimationReference.org Tools',
  description:
    'Download the official AnimationReference.org Studio plugins for Autodesk Maya and Blender. Free users get 15 daily imports + unlimited own uploads; Pro users get unlimited imports from AnimRef Moodboards & the entire 8,000+ library.',
};

export default function ToolsPage() {
  return <ToolsPageClient />;
}
