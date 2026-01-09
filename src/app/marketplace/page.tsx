"use client";

import React, { useState, useEffect } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/lib/firestore-marketplace';
import type { Product } from '@/lib/marketplace-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Box, Layers, Cuboid, Wrench, Construction } from 'lucide-react';

export default function MarketplacePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProducts() {
            try {
                const data = await getProducts();
                setProducts(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadProducts();
    }, []);

    const rigs = products.filter(p => p.category === 'Rigs');
    const sets = products.filter(p => p.category === 'Sets');
    const plugins = products.filter(p => p.category === 'Plugins');

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0814] flex items-center justify-center">
                <p className="text-white animate-pulse">Loading Marketplace...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0814] text-white selection:bg-purple-500/30">

            <main className="container mx-auto px-4 pt-32 pb-20">

                {/* Marketplace Hero */}
                <div className="text-center space-y-4 mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                        Creator Marketplace
                    </h1>
                    <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                        Premium assets for your animation workflow. Discover top-tier rigs, environments, and plugins curated for professionals.
                    </p>
                </div>

                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                        <div className="bg-white/5 p-6 rounded-full mb-6">
                            <Construction className="h-12 w-12 text-purple-400/80" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon</h2>
                        <p className="text-zinc-400 max-w-md text-center">
                            We are currently curating the best assets for you. Check back later for high-quality rigs, sets, and tools!
                        </p>
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <div className="flex justify-center mb-12">
                            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full">
                                <TabsTrigger value="all" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white">All Assets</TabsTrigger>
                                <TabsTrigger value="rigs" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Box className="mr-2 h-4 w-4" /> Rigs</TabsTrigger>
                                <TabsTrigger value="sets" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Layers className="mr-2 h-4 w-4" /> Sets</TabsTrigger>
                                <TabsTrigger value="plugins" className="rounded-full px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Wrench className="mr-2 h-4 w-4" /> Plugins</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="rigs" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {rigs.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="sets" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {sets.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="plugins" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {plugins.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

            </main>
        </div>
    );
}
