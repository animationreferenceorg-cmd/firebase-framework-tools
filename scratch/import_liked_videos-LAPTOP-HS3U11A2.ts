import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Configuration
const BATCH_START_INDEX = 0; // Index to start importing from
const BATCH_LIMIT = 5;      // Import 5 videos per run to avoid rate limits and long wait times

async function getAiCategorization(title: string, description: string, thumbnailUrl: string | undefined, existingCategories: string[]) {
  // Use the verified active Gemini API key
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  const promptText = `You are an expert animation archivist and categorizer for an animation reference library.
  Your task is to analyze the video titled "${title}" and describe/categorize it.

  Original Description:
  "${description}"

  Thumbnail URL:
  "${thumbnailUrl || ''}"

  Existing Categories:
  ${existingCategories.map(c => `- ${c}`).join('\n')}

  Based on the video title, description, and thumbnail, please:
  1. Determine the best matching category from the existing list, or suggest a new category name if none fit (e.g. 2D Animation, 3D Animation, Stop Motion, FX Animation, Character Acting, Combat, Lip Sync, Creature, Body Mechanics, etc.).
  2. Generate a compelling, SEO-friendly description of the video content. Describe the character movement, timing, spacing, and key performance details that would be helpful for an animator studying this as reference.
  3. Identify the movie, TV show, short film, animator, or studio this animation is from, if possible.
  4. Suggest 3-5 relevant tags (e.g., body mechanics, squash and stretch, spacing, weight, etc.).
  5. Provide a confidence score and short reasoning.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              suggestedCategory: { type: "STRING" },
              isNewCategory: { type: "BOOLEAN" },
              confidence: { type: "NUMBER" },
              reasoning: { type: "STRING" },
              suggestedTags: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              generatedDescription: { type: "STRING" },
              identifiedSource: { type: "STRING" }
            },
            required: ["suggestedCategory", "isNewCategory", "confidence", "reasoning", "suggestedTags", "generatedDescription"]
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResult) {
    throw new Error("No text response from Gemini API");
  }
  return JSON.parse(textResult);
}

async function runImport() {
  // Load dotenv config BEFORE importing any firebase or project files
  config({ path: path.resolve(process.cwd(), '.env.local') });

  // Dynamically import admin modules to bypass hoisting
  const admin = await import('firebase-admin');
  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  const { downloadSocialVideo } = await import('../src/app/actions/downloader');

  getAdminApp();
  const db = getFirestore();

  console.log("----------------------------------------");
  console.log("Loading Instagram URLs from file...");
  const urlsPath = path.resolve(process.cwd(), 'scratch/collection_urls.txt');
  if (!fs.existsSync(urlsPath)) {
    console.error(`❌ URLs file not found at ${urlsPath}`);
    return;
  }

  const urlsContent = fs.readFileSync(urlsPath, 'utf8');
  const urls = urlsContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('http'));

  console.log(`Loaded ${urls.length} URLs in total.`);
  console.log(`Batch Configuration: Start Index = ${BATCH_START_INDEX}, Limit = ${BATCH_LIMIT}`);
  console.log("----------------------------------------");

  // Get active list for this batch
  const batchUrls = urls.slice(BATCH_START_INDEX, BATCH_START_INDEX + BATCH_LIMIT);
  if (batchUrls.length === 0) {
    console.log("No URLs to process in this range.");
    return;
  }

  // 1. Fetch existing categories to build a name -> ID lookup map
  console.log("Fetching existing categories...");
  const categoriesSnapshot = await db.collection('categories').get();
  const categoryMap: { [key: string]: string } = {};
  
  categoriesSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.title) {
      categoryMap[data.title.trim().toLowerCase()] = doc.id;
    }
  });
  console.log(`Loaded ${Object.keys(categoryMap).length} existing categories.`);

  // 2. Loop through active batch URLs
  for (let i = 0; i < batchUrls.length; i++) {
    const url = batchUrls[i];
    const absoluteIndex = BATCH_START_INDEX + i;
    console.log(`\n[${absoluteIndex + 1}/${urls.length}] Processing URL: ${url}`);

    try {
      // 2a. Check if video already exists in Firestore
      const existingVideos = await db.collection('videos')
        .where('originalUrl', '==', url)
        .limit(1)
        .get();

      if (!existingVideos.empty) {
        console.log(`⏩ Video already imported. Skipping. (ID: ${existingVideos.docs[0].id})`);
        continue;
      }

      // 2b. Download video via downloader
      console.log(`📥 Downloading video...`);
      const downloadResult = await downloadSocialVideo(url, false);

      if (!downloadResult.success || !downloadResult.video) {
        console.error(`❌ Download failed: ${downloadResult.error}`);
        continue;
      }

      const video = downloadResult.video;
      console.log(`✅ Downloaded successfully. Title: "${video.title}" by "${video.uploader}"`);

      // 2c. Run AI Categorization
      console.log(`🤖 Analyzing video with Gemini 3.5 Flash...`);
      const aiResult = await getAiCategorization(
        video.title || 'Untitled',
        video.description || '',
        video.thumbnailUrl || undefined,
        Object.keys(categoryMap)
      );

      console.log(`   Suggested Category: "${aiResult.suggestedCategory}" (Confidence: ${aiResult.confidence})`);
      console.log(`   Suggested Tags: ${aiResult.suggestedTags.join(', ')}`);
      if (aiResult.identifiedSource) {
        console.log(`   Identified Source: "${aiResult.identifiedSource}"`);
      }

      // 2d. Map suggested category to an ID (or create a new category)
      let categoryId = categoryMap[aiResult.suggestedCategory.trim().toLowerCase()];

      if (!categoryId) {
        console.log(`🆕 Category "${aiResult.suggestedCategory}" does not exist. Creating it...`);
        const newCategoryRef = db.collection('categories').doc();
        const categorySlug = aiResult.suggestedCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newCategory = {
          id: newCategoryRef.id,
          title: aiResult.suggestedCategory,
          slug: categorySlug,
          description: `Curated reference videos for ${aiResult.suggestedCategory}.`,
          tags: aiResult.suggestedTags,
          href: `/categories/${categorySlug}`,
          status: 'published',
          imageUrl: video.thumbnailUrl || '',
          sortIndex: Object.keys(categoryMap).length
        };

        await newCategoryRef.set(newCategory);
        categoryId = newCategoryRef.id;
        categoryMap[aiResult.suggestedCategory.trim().toLowerCase()] = categoryId;
        console.log(`✅ Created category: "${aiResult.suggestedCategory}" (ID: ${categoryId})`);
      }

      // 2e. Save video to Firestore, tagging with creator name
      const videoRef = db.collection('videos').doc();
      
      // Build clean list of tags, including creator name if available
      const tagsList = [...(video.tags || []), ...aiResult.suggestedTags];
      if (video.uploader && video.uploader !== 'Unknown') {
        tagsList.push(video.uploader);
      }
      
      const videoToSave = {
        title: video.title || 'Untitled',
        description: aiResult.generatedDescription || video.description || '',
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || '',
        posterUrl: video.thumbnailUrl || '',
        tags: Array.from(new Set(tagsList.filter(t => t && t.trim() !== ''))),
        categoryIds: [categoryId],
        type: 'social',
        originalUrl: url,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        uploader: video.uploader || 'Unknown',
        duration: video.duration || 0,
        width: video.width || 0,
        height: video.height || 0,
        status: 'published',
        isShort: false,
        identifiedSource: aiResult.identifiedSource || null
      };

      await videoRef.set(videoToSave);
      console.log(`🎉 Saved video to Firestore (ID: ${videoRef.id}) with creator tag: "${video.uploader}"`);

    } catch (err: any) {
      console.error(`❌ Error processing ${url}:`, err.message || err);
    }
  }

  console.log("\n----------------------------------------");
  console.log("Import batch process completed!");
  console.log("----------------------------------------");
}

runImport().catch(console.error);
