import { Video, Category } from '@/lib/types';
import { Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { VideoCard } from '@/components/VideoCard';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

interface LikedVideoRowProps {
    videos: Video[];
}

export function LikedVideoRow({ videos }: LikedVideoRowProps) {
    if (videos.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2 text-zinc-400 px-1">
                <Heart className="w-4 h-4" />
                <h3 className="text-sm font-semibold tracking-wider">Liked Videos</h3>
            </div>

            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-4">
                    {videos.map((video) => (
                        <CarouselItem key={video.id} className="pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                            <VideoCard video={video} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-12 border-white/10 hover:bg-white/10 hover:text-white" />
                <CarouselNext className="hidden md:flex -right-12 border-white/10 hover:bg-white/10 hover:text-white" />
            </Carousel>
        </div>
    );
}

interface LikedCategoryRowProps {
    categories: Category[];
}

export function LikedCategoryRow({ categories }: LikedCategoryRowProps) {
    if (categories.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center gap-2 text-zinc-400 px-1">
                <Heart className="w-4 h-4" />
                <h3 className="text-sm font-semibold tracking-wider">Liked Collections</h3>
            </div>

            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-4">
                    {categories.map((cat) => (
                        <CarouselItem key={cat.id} className="pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                            <Link href={`/browse?category=${cat.id}`} className="block group relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-purple-500/50 transition-all">
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

                                <div className="absolute inset-0 flex flex-col justify-end p-4">
                                    <h4 className="font-bold text-white text-lg leading-none mb-1 group-hover:text-purple-300 transition-colors line-clamp-1">{cat.title}</h4>
                                    <div className="flex items-center text-xs text-zinc-400 group-hover:text-zinc-300">
                                        <span>View Collection</span>
                                        <ArrowRight className="w-3 h-3 ml-1 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-12 border-white/10 hover:bg-white/10 hover:text-white" />
                <CarouselNext className="hidden md:flex -right-12 border-white/10 hover:bg-white/10 hover:text-white" />
            </Carousel>
        </div>
    );
}
