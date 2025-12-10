
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getFirebaseStorage } from '@/lib/firebase-admin';

// Ensure the Firebase Admin SDK is initialized
getAdminApp();

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File | null;
    const folder = data.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${folder || 'uploads'}/${Date.now()}_${file.name}`;
    const bucket = getFirebaseStorage().bucket();
    const fileRef = bucket.file(filePath);

    // Use a Promise to wrap the stream events
    await new Promise<void>((resolve, reject) => {
      const stream = fileRef.createWriteStream({
        metadata: {
          contentType: file.type || 'application/octet-stream',
        },
        resumable: false,
      });

      stream.on("error", (err) => {
        console.error('Error during GCS upload stream:', err);
        reject(new Error('Upload to GCS failed.'));
      });

      stream.on("finish", () => {
        resolve();
      });

      stream.end(buffer);
    });

    // Make the file public after the upload is complete
    await fileRef.makePublic();
    const publicUrl = fileRef.publicUrl();
    
    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Upload failed.', details: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
