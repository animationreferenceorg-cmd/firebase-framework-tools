"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus, ExternalLink, ShoppingCart, Box, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getProducts, addProduct, deleteProduct, updateProduct } from '@/lib/firestore-marketplace';
import type { Product } from '@/lib/marketplace-types';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AdminMarketplacePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const [uploading, setUploading] = useState(false);


    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0');
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState<'Rigs' | 'Sets' | 'Plugins'>('Rigs');
    const [type, setType] = useState<'product' | 'affiliate'>('product');
    const [linkUrl, setLinkUrl] = useState('');
    const [isScraping, setIsScraping] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load products." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setPrice('0');
        setImageUrl('');
        setCategory('Rigs');
        setType('product');
        setLinkUrl('');
    };

    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setTitle(product.title);
        setDescription(product.description);
        setPrice(product.price.toString());
        setImageUrl(product.imageUrl);
        setCategory(product.category);
        setType(product.type);
        setLinkUrl(product.linkUrl);
        setIsDialogOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage) return;

        try {
            setUploading(true);
            const storageRef = ref(storage, `marketplace/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setImageUrl(url);
            toast({ title: "Image Uploaded", description: "Image successfully uploaded." });
        } catch (error) {
            console.error("Upload error:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to upload image." });
        } finally {
            setUploading(false);
        }
    };

    const handleAutoFill = async () => {
        if (!linkUrl) {
            toast({ title: "Missing URL", description: "Please enter a link first.", variant: "destructive" });
            return;
        }

        setIsScraping(true);
        try {
            const res = await fetch(`/api/metadata?url=${encodeURIComponent(linkUrl)}`);
            if (!res.ok) throw new Error('Failed to fetch data');

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.title) setTitle(data.title.substring(0, 100)); // Limit length
            if (data.description) setDescription(data.description.substring(0, 500));
            if (data.image) setImageUrl(data.image);

            toast({ title: "Auto-filled!", description: "Data fetched from URL." });
        } catch (error) {
            console.error("Scraping error:", error);
            toast({ title: "Failed to auto-fill", description: "Could not fetch metadata from this URL.", variant: "destructive" });
        } finally {
            setIsScraping(false);
        }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const productData: Omit<Product, 'id'> = {
                title,
                description,
                price: parseFloat(price),
                imageUrl,
                category,
                type,
                linkUrl,
                rating: 5.0 // Default or logic to manage ratings
            };

            if (editingId) {
                await updateProduct(editingId, productData);
                toast({ title: "Success", description: "Product updated successfully." });
            } else {
                await addProduct(productData);
                toast({ title: "Success", description: "Product created successfully." });
            }

            setIsDialogOpen(false);
            resetForm();
            fetchProducts();
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await deleteProduct(id);
            toast({ title: "Deleted", description: "Product removed." });
            fetchProducts();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete product." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Marketplace Items</h2>
                    <p className="text-muted-foreground">Manage your marketplace products and affiliate links.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                            <DialogDescription>
                                Fill in the details for the marketplace item.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Rigs">Rigs</SelectItem>
                                            <SelectItem value="Sets">Sets</SelectItem>
                                            <SelectItem value="Plugins">Plugins</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price ($)</Label>
                                    <Input id="price" type="number" min="0" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <RadioGroup value={type} onValueChange={(val: any) => setType(val)} className="flex items-center space-x-4 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="product" id="r-product" />
                                            <Label htmlFor="r-product">Product</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="affiliate" id="r-affiliate" />
                                            <Label htmlFor="r-affiliate">Affiliate Link</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="linkUrl">{type === 'affiliate' ? 'Affiliate Link URL' : 'Download/Purchase Link'}</Label>
                                <div className="flex gap-2">
                                    <Input id="linkUrl" required value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                                    <Button type="button" variant="secondary" onClick={handleAutoFill} disabled={isScraping || !linkUrl}>
                                        {isScraping ? 'Fetching...' : 'Auto-fill'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Paste a link and click Auto-fill to populate title, description, and image.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="imageUrl">Image URL</Label>
                                <div className="flex gap-2">
                                    <Input id="imageUrl" required value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                                </div>
                                <div className="mt-2">
                                    <Label htmlFor="imageUpload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">
                                        {uploading ? "Uploading..." : "Upload Image"}
                                        <input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </Label>
                                </div>
                                {imageUrl && (
                                    <div className="relative h-32 w-full rounded-md overflow-hidden border mt-2">
                                        <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Product'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    <p className="text-muted-foreground col-span-full text-center py-10">Loading products...</p>
                ) : products.length === 0 ? (
                    <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
                        <Box className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-2 text-lg font-semibold">No products found</h3>
                        <p className="text-sm text-muted-foreground">Get started by adding a new product to the marketplace.</p>
                    </div>
                ) : products.map((product) => (
                    <Card key={product.id} className="overflow-hidden group">
                        <div className="relative aspect-video w-full overflow-hidden bg-muted">
                            <Image src={product.imageUrl} alt={product.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                            {product.type === 'affiliate' && (
                                <div className="absolute top-2 left-2 h-3 w-3 bg-red-500 rounded-full shadow-md z-10" title="Affiliate Link" />
                            )}
                            {product.type !== 'affiliate' && (
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                                    ${product.price}
                                </div>
                            )}
                        </div>
                        <CardHeader className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg line-clamp-1" title={product.title}>{product.title}</CardTitle>
                                    <CardDescription>{product.category}</CardDescription>
                                </div>
                                {product.type === 'affiliate' && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">{product.description}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(product)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(product.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
