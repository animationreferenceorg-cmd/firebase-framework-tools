
"use client";

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { likeCategory, unlikeCategory } from '@/lib/firestore';
import ReactPlayer from 'react-player/lazy';

export function CategoryCard({ title, description, tags, href, imageUrl, videoUrl, hint, hideLikeButton }: Category & { hideLikeButton?: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user: authUser } = useAuth();
  const { userProfile, mutate } = useUser();
  const { toast } = useToast();

  const isLiked = useMemo(() => {
    return userProfile?.likedCategoryTitles?.includes(title) ?? false;
  }, [userProfile, title]);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authUser) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be signed in to like categories.",
      });
      return;
    }

    try {
      if (isLiked) {
        await unlikeCategory(authUser.uid, title);
        toast({ title: "Removed from Liked Categories", description: title });
      } else {
        await likeCategory(authUser.uid, title);
        toast({ title: "Added to Liked Categories!", description: title });
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

  return (
    <div className="relative group/card">
      <Link 
        href={href} 
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-[15px] shadow-lg"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
          {!isImageLoaded && <Skeleton className="absolute inset-0" />}
          
          <Image
              src={imageUrl}
              alt={title}
              width={400}
              height={300}
              className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  !isImageLoaded && "opacity-0",
                  (isHovered && videoUrl) && "opacity-0"
              )}
              onLoad={() => setIsImageLoaded(true)}
              data-ai-hint={hint}
          />

          {videoUrl && (
             <div className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                <ReactPlayer 
                    url={videoUrl}
                    playing={isHovered}
                    loop={true}
                    muted={true}
                    playsinline={true}
                    controls={false}
                    width="100%"
                    height="100%"
                    style={{ position: 'absolute', top: 0, left: 0, borderRadius: 'var(--radius)', overflow: 'hidden' }}
                    config={{
                        file: {
                            attributes: {
                                style: {
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: 'inherit',
                                },
                            },
                        },
                    }}
                />
              </div>
          )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 text-white">
          <h3 className="text-xl lg:text-2xl font-bold drop-shadow-lg">{title}</h3>
          <p className="mt-1 text-sm text-gray-200 drop-shadow-md line-clamp-2">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Link>
      {authUser && !hideLikeButton && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLikeToggle}
          className="absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
        >
            <Heart className={cn("h-5 w-5", isLiked && "fill-red-500 text-red-500")} />
        </Button>
      )}
    </div>
  );
}
