export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    imageUrl: string;
    category: 'Rigs' | 'Sets' | 'Plugins';
    rating?: number;
}

export const MARKETPLACE_PRODUCTS: Product[] = [
    {
        id: 'rig-1',
        title: 'Advanced Toon Rig',
        description: 'A fully flexible toon shading rig with squash and stretch capabilities.',
        price: 25,
        imageUrl: 'https://placehold.co/600x400/png?text=Toon+Rig', // Placeholder
        category: 'Rigs',
        rating: 4.8
    },
    {
        id: 'rig-2',
        title: 'Mecha-Warrior Bundle',
        description: 'High fidelity mechanical warrior rig with IK/FK switching.',
        price: 45,
        imageUrl: 'https://placehold.co/600x400/png?text=Mecha+Rig',
        category: 'Rigs',
        rating: 4.9
    },
    {
        id: 'set-1',
        title: 'Sci-Fi Corridor',
        description: 'Modular sci-fi corridor environment with PBR textures.',
        price: 15,
        imageUrl: 'https://placehold.co/600x400/png?text=Sci-Fi+Set',
        category: 'Sets',
        rating: 4.5
    },
    {
        id: 'set-2',
        title: 'Fantasy Forest Pack',
        description: 'Stylized low-poly forest assets including trees, rocks, and foliage.',
        price: 20,
        imageUrl: 'https://placehold.co/600x400/png?text=Forest+Set',
        category: 'Sets',
        rating: 4.7
    },
    {
        id: 'plugin-1',
        title: 'AnimCurve Tools',
        description: 'Blender plugin to smooth animation curves automatically.',
        price: 10,
        imageUrl: 'https://placehold.co/600x400/png?text=AnimCurve+Plugin',
        category: 'Plugins',
        rating: 4.6
    },
    {
        id: 'plugin-2',
        title: 'Lighting Studio Pro',
        description: 'One-click professional lighting setups for Maya and Blender.',
        price: 30,
        imageUrl: 'https://placehold.co/600x400/png?text=Lighting+Plugin',
        category: 'Plugins',
        rating: 4.9
    },
];
