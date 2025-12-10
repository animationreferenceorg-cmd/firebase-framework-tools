
"use client";

import type { Video, Category } from '@/lib/types';
import { VideoCard } from './VideoCard';
import { ChevronLeft, ChevronRight, MoveRight, Heart, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { likeCategory, unlikeCategory } from '@/lib/firestore';

interface VideoRowProps {
  title: string;
  videos: Video[];
  href?: string;
  poster?: boolean;
  category?: Category;
}

export function VideoRow({ title, videos, href, poster = false, category }: VideoRowProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  
  const { user: authUser } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();

  const isLiked = useMemo(() => {
    if (!category) return false;
    return userProfile?.likedCategoryTitles?.includes(category.title) ?? false;
  }, [userProfile, category]);


  const checkForScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8
        : scrollLeft + clientWidth * 0.8;
      
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const currentRef = scrollRef.current;
    if (currentRef) {
      checkForScrollPosition();
      currentRef.addEventListener('scroll', checkForScrollPosition);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', checkForScrollPosition);
      }
    };
  }, [videos]);


  if (!videos || videos.length === 0) {
    return null;
  }
  
  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authUser || !category) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be signed in to like categories.",
      });
      return;
    }

    try {
      if (isLiked) {
        await unlikeCategory(authUser.uid, category.title);
        toast({ title: "Removed from Liked Categories", description: category.title });
      } else {
        await likeCategory(authUser.uid, category.title);
        toast({ title: "Added to Liked Categories!", description: category.title });
      }
      mutate();
    } catch (error) {
      console.error("Failed to update like status:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Could not update your liked categories.",
      });
    }
  };
  
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (href) {
        const fullUrl = `${window.location.origin}${href}`;
        navigator.clipboard.writeText(fullUrl);
        toast({
            title: "Link Copied!",
            description: "Category link copied to clipboard.",
        });
    }
  };

  
  return (
    <section className="group/row relative">
       <div className="flex items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        <div className="flex items-center gap-1 ml-4 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
            {category && (
                <>
                    <Button variant="ghost" size="icon" onClick={handleLikeToggle} className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white">
                        <Heart className={cn("h-5 w-5", isLiked && "fill-red-500 text-red-500")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white">
                        <Share2 className="h-5 w-5" />
                    </Button>
                </>
            )}
            {href && (
              <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-primary ml-2">
                View All
                <MoveRight className="h-4 w-4" />
              </Link>
            )}
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all opacity-0 group-hover/row:opacity-100",
          !canScrollLeft && "opacity-0 pointer-events-none"
        )}
        onClick={() => scroll('left')}
      >
        <ChevronLeft size={24} />
      </Button>

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex space-x-3 md:space-x-4 pb-4">
          {videos.map(video => (
            <div key={video.id} className={cn(
                "flex-shrink-0",
                poster 
                  ? "w-[28vw] sm:w-[22vw] md:w-[18vw] lg:w-[15vw]"
                  : "w-[40vw] sm:w-[30vw] md:w-[25vw] lg:w-[20vw]"
              )}>
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all opacity-0 group-hover/row:opacity-100",
          !canScrollRight && "opacity-0 pointer-events-none"
        )}
        onClick={() => scroll('right')}
      >
        <ChevronRight size={24} />
      </Button>
    </section>
  );
}
