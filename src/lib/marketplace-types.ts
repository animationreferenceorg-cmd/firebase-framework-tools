export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    imageUrl: string;
    category: 'Rigs' | 'Sets' | 'Plugins';
    type: 'product' | 'affiliate';
    linkUrl: string; // Affiliate link or download/purchase link
    rating?: number;
    createdAt?: string;
}
