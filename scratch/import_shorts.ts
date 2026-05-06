
import { getFirestore } from '../src/lib/firebase-admin';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const videos = [
  {
    title: "TOMORROW | Omeleto",
    videoUrl: "https://www.youtube.com/watch?v=bVZl51CqUXk",
    thumbnailUrl: "https://img.youtube.com/vi/bVZl51CqUXk/maxresdefault.jpg",
    description: "A resilient 10-year-old street urchin grows up on the corners and alleys of 1970s Shiraz, Iran.",
    isShort: true,
    status: 'published',
    tags: ['animation', 'drama', 'iran'],
    uploader: 'Omeleto',
    originalUrl: "https://www.youtube.com/watch?v=bVZl51CqUXk"
  },
  {
    title: "FETCH | Omeleto Animation",
    videoUrl: "https://www.youtube.com/watch?v=SoiwR2k3Ga4",
    thumbnailUrl: "https://img.youtube.com/vi/SoiwR2k3Ga4/maxresdefault.jpg",
    description: "A dog rescues his owner aboard a colossal space station in this heartwarming sci-fi short.",
    isShort: true,
    status: 'published',
    tags: ['animation', 'sci-fi', 'dog'],
    uploader: 'Omeleto',
    originalUrl: "https://www.youtube.com/watch?v=SoiwR2k3Ga4"
  },
  {
    title: "WORMWOOD - Animation Short Film 2024 - GOBELINS",
    videoUrl: "https://www.youtube.com/watch?v=u6MIQMaJT7M",
    thumbnailUrl: "https://img.youtube.com/vi/u6MIQMaJT7M/maxresdefault.jpg",
    description: "Simon rushes to the heart of a radioactive zone in the hope of saving his colleague Agathe after radiation suddenly disappears.",
    isShort: true,
    status: 'published',
    tags: ['animation', 'sci-fi', 'gobelins'],
    uploader: 'GOBELINS',
    originalUrl: "https://www.youtube.com/watch?v=u6MIQMaJT7M"
  },
  {
    title: "CHÈRE FIN, - Animation Short Film 2025 - GOBELINS",
    videoUrl: "https://www.youtube.com/watch?v=AhlbmnCRKz0",
    thumbnailUrl: "https://img.youtube.com/vi/AhlbmnCRKz0/maxresdefault.jpg",
    description: "An old postman goes through his last tour of deliveries in a nostalgically beautiful and mystical archipelago.",
    isShort: true,
    status: 'published',
    tags: ['animation', 'fantasy', 'gobelins'],
    uploader: 'GOBELINS',
    originalUrl: "https://www.youtube.com/watch?v=AhlbmnCRKz0"
  },
  {
    title: "Blowing Off Steam - Award Winning Animated Short Film",
    videoUrl: "https://www.youtube.com/watch?v=1HLFHki-7tY",
    thumbnailUrl: "https://img.youtube.com/vi/1HLFHki-7tY/maxresdefault.jpg",
    description: "A young girl's day takes an unexpected turn when she finds herself in a mysterious, steam-filled mechanical world.",
    isShort: true,
    status: 'published',
    tags: ['animation', 'steampunk', 'award-winning'],
    uploader: 'TheCGBros',
    originalUrl: "https://www.youtube.com/watch?v=1HLFHki-7tY"
  },
  {
    title: "Sea of Lightning - CGI Sci-Fi Short Film",
    videoUrl: "https://www.youtube.com/watch?v=q7b73c775Q0",
    thumbnailUrl: "https://img.youtube.com/vi/q7b73c775Q0/maxresdefault.jpg",
    description: "Set against a violent electric seascape, a lone survivor navigates a world defined by constant storms and lightning.",
    isShort: true,
    status: 'published',
    tags: ['animation', 'sci-fi', 'cgi'],
    uploader: 'TheCGBros',
    originalUrl: "https://www.youtube.com/watch?v=q7b73c775Q0"
  }
];

async function importVideos() {
  const db = getFirestore();
  const collection = db.collection('videos');
  
  for (const video of videos) {
    const docRef = await collection.add({
      ...video,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime()
    });
    console.log(`Added video: ${video.title} with ID: ${docRef.id}`);
  }
}

importVideos().catch(console.error);
