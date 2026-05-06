
import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing credentials");
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
});

const db = admin.firestore();

const videos = [
  {
    title: "Wire | Worthikids",
    videoUrl: "https://www.youtube.com/watch?v=kGj_HkKhhSE",
    thumbnailUrl: "https://img.youtube.com/vi/kGj_HkKhhSE/maxresdefault.jpg",
    description: "A unique 2D/3D hybrid animation featuring a character navigating a surreal environment.",
    isShort: true,
    status: 'published',
    tags: ['Worthikids', 'Hybrid Animation', 'Character Animation', 'Surreal'],
    uploader: 'Worthikids',
    originalUrl: "https://www.youtube.com/watch?v=kGj_HkKhhSE"
  },
  {
    title: "Monsters Down Under | Dead Sound",
    videoUrl: "https://www.youtube.com/watch?v=Sc-RYjjOtNQ",
    thumbnailUrl: "https://img.youtube.com/vi/Sc-RYjjOtNQ/maxresdefault.jpg",
    description: "A beautifully animated short film about dinosaurs in prehistoric Australia.",
    isShort: true,
    status: 'published',
    tags: ['Dead Sound', 'Creature', 'Nature', 'Dinosauria'],
    uploader: 'Dead Sound',
    originalUrl: "https://www.youtube.com/watch?v=Sc-RYjjOtNQ"
  },
  {
    title: "ENA - Temptation Stairway | Joel G",
    videoUrl: "https://www.youtube.com/watch?v=juBv2XWnwt8",
    thumbnailUrl: "https://img.youtube.com/vi/juBv2XWnwt8/maxresdefault.jpg",
    description: "A surreal and abstract animation featuring the character ENA in a bizarre, ever-changing world.",
    isShort: true,
    status: 'published',
    tags: ['Joel G', 'ENA', 'Surrealism', 'Experimental'],
    uploader: 'Joel G',
    originalUrl: "https://www.youtube.com/watch?v=juBv2XWnwt8"
  },
  {
    title: "Amaro and Walden's Joyride | The Line",
    videoUrl: "https://www.youtube.com/watch?v=0E3u6ALWYcg",
    thumbnailUrl: "https://img.youtube.com/vi/0E3u6ALWYcg/maxresdefault.jpg",
    description: "A high-octane, stylized 2D animation featuring a fast-paced car chase through a vibrant city.",
    isShort: true,
    status: 'published',
    tags: ['The Line Animation', 'Action', 'Combat', 'Stylized 2D'],
    uploader: 'The Line Animation',
    originalUrl: "https://www.youtube.com/watch?v=0E3u6ALWYcg"
  },
  {
    title: "Animation vs. Minecraft (Official) | Alan Becker",
    videoUrl: "https://www.youtube.com/watch?v=m6tfuPaZ0_Y",
    thumbnailUrl: "https://img.youtube.com/vi/m6tfuPaZ0_Y/maxresdefault.jpg",
    description: "An epic stick figure animation where a character enters a computer desktop and interacts with Minecraft.",
    isShort: true,
    status: 'published',
    tags: ['Alan Becker', 'Stick Figure', 'Action', 'Combat', 'Gaming'],
    uploader: 'Alan Becker',
    originalUrl: "https://www.youtube.com/watch?v=m6tfuPaZ0_Y"
  },
  {
    title: "Best Friend | GOBELINS",
    videoUrl: "https://www.youtube.com/watch?v=j01Hg4QJ6NE",
    thumbnailUrl: "https://img.youtube.com/vi/j01Hg4QJ6NE/maxresdefault.jpg",
    description: "A thought-provoking short film about a lonely man who finds companionship through virtual reality.",
    isShort: true,
    status: 'published',
    tags: ['GOBELINS', 'Sci-Fi', 'Drama', 'Character Animation'],
    uploader: 'GOBELINS',
    originalUrl: "https://www.youtube.com/watch?v=j01Hg4QJ6NE"
  },
  {
    title: "BLIND EYE | GOBELINS",
    videoUrl: "https://www.youtube.com/watch?v=QaeTYAsV0fg",
    thumbnailUrl: "https://img.youtube.com/vi/QaeTYAsV0fg/maxresdefault.jpg",
    description: "A visually stunning short film about a world where everyone is blind.",
    isShort: true,
    status: 'published',
    tags: ['GOBELINS', 'Sci-Fi', 'Drama', 'Society'],
    uploader: 'GOBELINS',
    originalUrl: "https://www.youtube.com/watch?v=QaeTYAsV0fg"
  },
  {
    title: "EGGPLANT | Omeleto Animation",
    videoUrl: "https://www.youtube.com/watch?v=QWot-66DWdw",
    thumbnailUrl: "https://img.youtube.com/vi/QWot-66DWdw/maxresdefault.jpg",
    description: "A whimsical and artistic short film about a man who grows eggplants in a very unusual way.",
    isShort: true,
    status: 'published',
    tags: ['Omeleto Animation', 'Whimsical', 'Artistic', 'Surreal'],
    uploader: 'Omeleto Animation',
    originalUrl: "https://www.youtube.com/watch?v=QWot-66DWdw"
  },
  {
    title: "Sintel | Blender Open Movie",
    videoUrl: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
    thumbnailUrl: "https://img.youtube.com/vi/eRsGyueVLvQ/maxresdefault.jpg",
    description: "A legendary open-source fantasy short film about a girl and her dragon.",
    isShort: true,
    status: 'published',
    tags: ['Blender', '3D', 'Fantasy', 'Adventure'],
    uploader: 'Blender Foundation',
    originalUrl: "https://www.youtube.com/watch?v=eRsGyueVLvQ"
  },
  {
    title: "THE REWARD | Sun Creature Studio",
    videoUrl: "https://www.youtube.com/watch?v=kkAYze6ae18",
    thumbnailUrl: "https://img.youtube.com/vi/kkAYze6ae18/maxresdefault.jpg",
    description: "An epic 2D adventure short film about two friends on a lifelong quest for treasure.",
    isShort: true,
    status: 'published',
    tags: ['Sun Creature Studio', 'Adventure', 'Fantasy', 'Epic'],
    uploader: 'Sun Creature Studio',
    originalUrl: "https://www.youtube.com/watch?v=kkAYze6ae18"
  }
];

async function importVideos() {
  const collection = db.collection('videos');
  
  for (const video of videos) {
    const docRef = await collection.add({
      ...video,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log(`Added video: ${video.title} with ID: ${docRef.id}`);
  }
}

importVideos().catch(console.error);
