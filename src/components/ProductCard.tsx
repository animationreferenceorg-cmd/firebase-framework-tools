"use client";

import Image from 'next/image';
import { ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/marketplace-types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { toast } = useToast();

    const handleBuy = (e: React.MouseEvent) => {
        e.preventDefault();
        toast({
            title: "Coming Soon!",
            description: "Marketplace checkout is under development.",
        });
    };

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative w-full overflow-hidden rounded-xl bg-[#0f0c1d] border border-white/10 shadow-lg transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)] hover:border-purple-500/50"
        >
            {/* Image Container */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className={cn(
                        "object-cover transition-transform duration-500",
                        isHovered ? "scale-110" : "scale-100"
                    )}
                />
                {/* Overlay */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-[#0f0c1d] via-transparent to-transparent transition-opacity duration-300",
                    isHovered ? "opacity-90" : "opacity-60"
                )} />

                {/* Price Tag */}
                {product.type !== 'affiliate' && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-white font-bold">${product.price}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{product.title}</h3>
                        <p className="text-xs text-purple-400">{product.category}</p>
                    </div>
                    {product.rating && (
                        <div className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full">
                            <Star className="h-3 w-3 fill-yellow-400" />
                            <span>{product.rating}</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-zinc-400 line-clamp-2">{product.description}</p>

                <Button
                    onClick={handleBuy}
                    className="w-full mt-2 bg-white/5 hover:bg-purple-600 hover:text-white border border-white/10 transition-all duration-300 group-hover:border-purple-500/50"
                >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                </Button>
            </div>
        </div>
    );
}
