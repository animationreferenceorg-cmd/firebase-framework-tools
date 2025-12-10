

'use client';

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { VideoPlayer } from "@/components/VideoPlayer";
import Image from 'next/image';
import { Film, Image as ImageIcon, Camera } from "lucide-react";
import { useUpload } from "@/hooks/use-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),

  imageSourceType: z.enum(['url', 'upload', 'capture']).default('url'),
  imageUrl: z.string().optional(),
  imageFile: z.any().optional(),

  videoSourceType: z.enum(['url', 'upload']).default('url'),
  videoUrl: z.string().optional(),
  videoFile: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.imageSourceType === 'url' && (!data.imageUrl || data.imageUrl.trim() === '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image URL is required.", path: ['imageUrl'] });
    }
    // File upload not required on edit
    // if (data.imageSourceType === 'upload' && !data.imageFile?.[0]) {
    //     ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image file is required.", path: ['imageFile'] });
    // }
     if (data.videoSourceType === 'url' && data.videoUrl && data.videoUrl.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Video URL cannot be empty.", path: ['videoUrl'] });
    }
});

type FormValues = z.infer<typeof formSchema>;


interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
}

function UploadPlaceholder({ text, icon: Icon }: { text: string, icon: React.ElementType }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-center p-2 rounded-lg">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">{text}</p>
        </div>
    )
}

function ImageCaptureDialog({ videoSrc, onCapture, triggerText, title, description, disabled }: { videoSrc: string, onCapture: (dataUrl: string) => void, triggerText: string, title: string, description: string, disabled: boolean }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleCapture = (dataUrl: string) => {
        onCapture(dataUrl);
        setIsDialogOpen(false);
    }
    
    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={disabled}>
                    <Camera className="mr-2 h-4 w-4" />
                    {triggerText}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 border-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="px-6 pb-6">
                   <VideoPlayer 
                        video={{ id: 'capture', videoUrl: videoSrc, title: 'Capture Preview', thumbnailUrl: '' } as any} 
                        onCapture={handleCapture}
                        showCaptureButton
                        startsPaused
                   />
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { startUpload, finishUpload } = useUpload();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: category?.title || "",
      description: category?.description || "",
      imageSourceType: category?.imageUrl ? 'url' : 'upload',
      imageUrl: category?.imageUrl || "",
      videoSourceType: category?.videoUrl ? 'url' : 'upload',
      videoUrl: category?.videoUrl || "",
    },
  });
  
  const { watch, control, setValue } = form;
  const watchedValues = watch();

  const [videoPreview, setVideoPreview] = useState<string | null>(category?.videoUrl || null);
  const [imagePreview, setImagePreview] = useState<string | null>(category?.imageUrl || null);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'videoUrl' || name === 'videoFile' || name === 'videoSourceType') {
        const file = value.videoFile?.[0];
        if (value.videoSourceType === 'upload' && file) {
          setVideoPreview(URL.createObjectURL(file));
        } else {
          setVideoPreview(value.videoUrl || null);
        }
      }
       if (name === 'imageUrl' || name === 'imageFile' || name === 'imageSourceType') {
        const file = value.imageFile?.[0];
        if (value.imageSourceType === 'upload' && file) {
          setImagePreview(URL.createObjectURL(file));
        } else if (value.imageSourceType === 'url') {
          setImagePreview(value.imageUrl || null);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  
  const handleCaptureThumbnail = (dataUrl: string) => {
    setValue('imageSourceType', 'capture', { shouldValidate: true });
    setValue('imageUrl', dataUrl, { shouldValidate: true });
    setImagePreview(dataUrl);
    setValue('imageFile', undefined);
  }

  const canCapture = videoPreview && !videoPreview.includes('youtube.com') && !videoPreview.includes('vimeo.com');

  
  async function uploadFile(file: File, folder: string): Promise<string> {
    const uploadId = startUpload(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
      });
      
      if (!res.ok) {
          const errorBody = await res.text();
          console.error("Upload API response error:", errorBody);
          throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      finishUpload(uploadId, 'success');
      return data.url;

    } catch (error) {
      console.error(error);
      finishUpload(uploadId, 'error');
      toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `The file ${file.name} could not be uploaded.`,
      });
      throw error;
    }
  }

 
  async function onSubmit(values: FormValues) {
    try {
      let imageUrl = values.imageUrl;
      if (values.imageSourceType === 'upload' && values.imageFile?.[0]) {
          imageUrl = await uploadFile(values.imageFile[0], 'category-images');
      }
      
      let videoUrl = values.videoUrl;
       if (values.videoSourceType === 'upload' && values.videoFile?.[0]) {
          videoUrl = await uploadFile(values.videoFile[0], 'category-videos');
      }

      const dataToSave = {
        title: values.title,
        description: values.description,
        imageUrl: imageUrl || 'https://placehold.co/400x300.png',
        videoUrl: videoUrl || '',
      };
      
      if (category) {
        // Editing an existing category
        const categoryRef = doc(db, "categories", category.id);
        await updateDoc(categoryRef, dataToSave);
        toast({
          title: "Category Updated!",
          description: "The category details have been saved.",
        });
      } else {
        // Creating a new category
        const docRef = await addDoc(collection(db, "categories"), {
            ...dataToSave,
            tags: [],
            status: 'draft',
            href: `/browse/preview-id`, // Placeholder
        });

        // Update with real href
        const finalDocRef = doc(db, "categories", docRef.id);
        await updateDoc(finalDocRef, { href: `/browse/${docRef.id}`});

        toast({
            title: "Category Saved as Draft!",
            description: "The new category has been saved. You can publish it from the categories list.",
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/categories");
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while saving the category.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8">
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Running Animation" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Character movement and locomotion" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                      <CardHeader>
                          <CardTitle>Video Content</CardTitle>
                          <CardDescription>This video plays when a user hovers over the category card.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed border-border mb-4 bg-muted">
                              {videoPreview ? (
                                  <VideoPlayer video={{id: 'preview', videoUrl: videoPreview, title: 'Preview', thumbnailUrl: ''} as any} startsPaused />
                              ) : (
                                  <UploadPlaceholder text="Video Preview (16:9)" icon={Film} />
                              )}
                          </div>
                          <FormField
                              control={control}
                              name="videoSourceType"
                              render={({ field }) => (
                              <FormItem className="mb-4">
                                  <FormLabel>Video Source</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? 'url'}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="url">URL</SelectItem>
                                      <SelectItem value="upload">Upload</SelectItem>
                                  </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                          {watchedValues.videoSourceType === 'url' ? (
                          <FormField
                                  control={control}
                                  name="videoUrl"
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Video URL</FormLabel>
                                      <FormControl><Input placeholder="https://..." {...field} value={field.value || ''} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                          ) : (
                              <FormField
                                  control={control}
                                  name="videoFile"
                                  render={({ field: { value, onChange, ...fieldProps } }) => (
                                  <FormItem>
                                      <FormLabel>Video File</FormLabel>
                                      <FormControl><Input type="file" accept="video/*" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                                  )}
                              />
                          )}
                      </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                        <CardTitle>Thumbnail</CardTitle>
                        <CardDescription>The main image for the category card.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed border-border mb-4">
                            {imagePreview ? <Image src={imagePreview} alt="Thumbnail preview" fill className="object-cover" /> : <UploadPlaceholder text="Thumbnail (16:9)" icon={ImageIcon} />}
                        </div>
                        <div className="flex justify-center mb-4">
                            <ImageCaptureDialog 
                                videoSrc={videoPreview || ''} 
                                onCapture={handleCaptureThumbnail} 
                                triggerText="Capture from Video"
                                title="Capture Thumbnail"
                                description='Use the player to find the perfect frame, then click "Capture Frame" to set it as your thumbnail. You can use the comma (,) and period (.) keys to step frame-by-frame.'
                                disabled={!canCapture}
                            />
                        </div>
                        <FormField
                            control={control}
                            name="imageSourceType"
                            render={({ field }) => (
                            <FormItem className="mb-4">
                                <FormLabel>Source</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? 'url'}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="url">URL</SelectItem>
                                    <SelectItem value="upload">Upload</SelectItem>
                                    <SelectItem value="capture" disabled>Captured</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        {watchedValues.imageSourceType === 'url' ? (
                            <FormField control={control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        ) : watchedValues.imageSourceType === 'upload' ? (
                            <FormField control={control} name="imageFile" render={({ field: { value, onChange, ...fieldProps } }) => (<FormItem><FormLabel>File</FormLabel><FormControl><Input type="file" accept="image/*" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl><FormMessage /></FormItem>)} />
                        ) : null}
                    </CardContent>
                </Card>
                </div>
            </div>
        </div>
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
}
