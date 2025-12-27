import { Video, Category } from '@/lib/types';
import { Card, CardContent } from "@/components/ui/card";
import { Play, ArrowRight, Heart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { VideoCard } from '@/components/VideoCard';

interface LikedVideoRowProps {
    videos: Video[];
}

export function LikedVideoRow({ videos }: LikedVideoRowProps) {
    if (videos.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2 text-zinc-400">
                <Heart className="w-4 h-4" />
                <h3 className="text-sm font-semibold tracking-wider">Liked Videos</h3>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8">
                {videos.map((video) => (
                    <div key={video.id} className="w-72 shrink-0">
                        <VideoCard video={video} />
                    </div>
                ))}
            </div>
        </div>
    );
}

interface LikedCategoryRowProps {
    categories: Category[];
}

export function LikedCategoryRow({ categories }: LikedCategoryRowProps) {
    if (categories.length === 0) return null;

    return (
        <div className="space-y-4 mb-4">
            <div className="flex items-center gap-2 text-zinc-400">
                <Heart className="w-4 h-4" />
                <h3 className="text-sm font-semibold tracking-wider">Liked Collections</h3>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:-mx-8 md:px-8">
                {categories.map((cat) => (
                    <Link href={`/browse?category=${cat.id}`} key={cat.id} className="shrink-0 group relative w-72 h-40 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-purple-500/50 transition-all">
                        {cat.imageUrl ? (
                            <Image
                                src={cat.imageUrl}
                                alt={cat.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-60 group-hover:opacity-40"
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-800" />
                        )}

                        <div className="absolute inset-0 flex flex-col justify-end p-3">
                            <h4 className="font-bold text-white text-lg leading-none mb-1 group-hover:text-purple-300 transition-colors">{cat.title}</h4>
                            <div className="flex items-center text-xs text-zinc-400 group-hover:text-zinc-300">
                                <span>View Collection</span>
                                <ArrowRight className="w-3 h-3 ml-1 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
