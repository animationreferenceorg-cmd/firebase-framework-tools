
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
    title: "Thicc crocodile 🐊🌈 | Kekeflipnote",
    videoUrl: "https://www.youtube.com/watch?v=k5v_5AEQoYs",
    thumbnailUrl: "https://img.youtube.com/vi/k5v_5AEQoYs/maxresdefault.jpg",
    description: "A vibrant and fluidly animated crocodile dancing in a signature flipnote style.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Creature', 'Kekeflipnote', '2D'],
    uploader: 'Kekeflipnote',
    originalUrl: "https://www.youtube.com/watch?v=k5v_5AEQoYs"
  },
  {
    title: "Cursed cats | Kekeflipnote",
    videoUrl: "https://www.youtube.com/watch?v=8UEU_05SLsA",
    thumbnailUrl: "https://img.youtube.com/vi/8UEU_05SLsA/maxresdefault.jpg",
    description: "A collection of bizarrely morphed cats showcasing creative and surreal character animation.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Surreal', 'Creature', 'Kekeflipnote'],
    uploader: 'Kekeflipnote',
    originalUrl: "https://www.youtube.com/watch?v=8UEU_05SLsA"
  },
  {
    title: "The Badger, The Rabbit and Billy | Birdbox Studio",
    videoUrl: "https://www.youtube.com/watch?v=GEXojL4EFOE",
    thumbnailUrl: "https://img.youtube.com/vi/GEXojL4EFOE/maxresdefault.jpg",
    description: "A charming and humorous short about unexpected animal interactions.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Creature', 'Character Animation', 'Birdbox Studio'],
    uploader: 'Birdbox Studio',
    originalUrl: "https://www.youtube.com/watch?v=GEXojL4EFOE"
  },
  {
    title: "Wildebeest | Birdbox Studio",
    videoUrl: "https://www.youtube.com/watch?v=JMJXvsCLu6s",
    thumbnailUrl: "https://img.youtube.com/vi/JMJXvsCLu6s/maxresdefault.jpg",
    description: "Two wildebeests ponder the nature of a log in a river, leading to a hilarious and dark twist.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Creature', 'Dark Humor', 'Birdbox Studio'],
    uploader: 'Birdbox Studio',
    originalUrl: "https://www.youtube.com/watch?v=JMJXvsCLu6s"
  },
  {
    title: "TV Dinner | Simon's Cat",
    videoUrl: "https://www.youtube.com/watch?v=w0ffwDYo00Q",
    thumbnailUrl: "https://img.youtube.com/vi/w0ffwDYo00Q/maxresdefault.jpg",
    description: "A hungry cat uses increasingly desperate measures to get his owner's attention.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Creature', 'Character Animation', "Simon's Cat"],
    uploader: "Simon's Cat",
    originalUrl: "https://www.youtube.com/watch?v=w0ffwDYo00Q"
  },
  {
    title: "Fly Guy | Simon's Cat",
    videoUrl: "https://www.youtube.com/watch?v=I1qHVVbYG8Y",
    thumbnailUrl: "https://img.youtube.com/vi/I1qHVVbYG8Y/maxresdefault.jpg",
    description: "Simon's cat encounters a persistent fly, resulting in chaotic and expressive movement.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Creature', 'Action', "Simon's Cat"],
    uploader: "Simon's Cat",
    originalUrl: "https://www.youtube.com/watch?v=I1qHVVbYG8Y"
  },
  {
    title: "Double King | Felix Colgrave",
    videoUrl: "https://www.youtube.com/watch?v=w_MSFkZHNi4",
    thumbnailUrl: "https://img.youtube.com/vi/w_MSFkZHNi4/maxresdefault.jpg",
    description: "A surreal and masterfully animated epic about a king's obsession with crowns.",
    isShort: true,
    status: 'published',
    tags: ['Surreal', 'Experimental', 'Humor', 'Felix Colgrave'],
    uploader: 'Felix Colgrave',
    originalUrl: "https://www.youtube.com/watch?v=w_MSFkZHNi4"
  },
  {
    title: "The Elephant's Garden | Felix Colgrave",
    videoUrl: "https://www.youtube.com/watch?v=vlUR09yRHXo",
    thumbnailUrl: "https://img.youtube.com/vi/vlUR09yRHXo/maxresdefault.jpg",
    description: "A trippy and imaginative short featuring a variety of strange creatures.",
    isShort: true,
    status: 'published',
    tags: ['Surreal', 'Experimental', 'Creature', 'Felix Colgrave'],
    uploader: 'Felix Colgrave',
    originalUrl: "https://www.youtube.com/watch?v=vlUR09yRHXo"
  },
  {
    title: "cows & cows & cows | Cyriak",
    videoUrl: "https://www.youtube.com/watch?v=FavUpD_IjVY",
    thumbnailUrl: "https://img.youtube.com/vi/FavUpD_IjVY/maxresdefault.jpg",
    description: "A classic surreal animation that uses repetitive motion and kaleidoscopic patterns.",
    isShort: true,
    status: 'published',
    tags: ['Surreal', 'Experimental', 'Cyriak'],
    uploader: 'Cyriak',
    originalUrl: "https://www.youtube.com/watch?v=FavUpD_IjVY"
  },
  {
    title: "MEOW | Cyriak",
    videoUrl: "https://www.youtube.com/watch?v=QNwCojCJ3-Q",
    thumbnailUrl: "https://img.youtube.com/vi/QNwCojCJ3-Q/maxresdefault.jpg",
    description: "A bizarre and psychedelic transformation of cats pushing visual boundaries.",
    isShort: true,
    status: 'published',
    tags: ['Surreal', 'Experimental', 'Creature', 'Cyriak'],
    uploader: 'Cyriak',
    originalUrl: "https://www.youtube.com/watch?v=QNwCojCJ3-Q"
  },
  {
    title: "Dear Alice | The Line",
    videoUrl: "https://www.youtube.com/watch?v=z-Ng5ZvrDm4",
    thumbnailUrl: "https://img.youtube.com/vi/z-Ng5ZvrDm4/maxresdefault.jpg",
    description: "A beautifully animated vision of a sustainable future, blending Ghibli-esque aesthetics.",
    isShort: true,
    status: 'published',
    tags: ['Sci-Fi', 'Experimental', 'The Line Animation', 'Future'],
    uploader: 'The Line Animation',
    originalUrl: "https://www.youtube.com/watch?v=z-Ng5ZvrDm4"
  },
  {
    title: "MEHUA | GOBELINS",
    videoUrl: "https://www.youtube.com/watch?v=k5j6vYTcgHY",
    thumbnailUrl: "https://img.youtube.com/vi/k5j6vYTcgHY/maxresdefault.jpg",
    description: "A visually stunning short film about a young girl and her grandfather.",
    isShort: true,
    status: 'published',
    tags: ['Drama', 'Experimental', 'GOBELINS', 'Cultural'],
    uploader: 'GOBELINS',
    originalUrl: "https://www.youtube.com/watch?v=k5j6vYTcgHY"
  },
  {
    title: "LOUISE | GOBELINS",
    videoUrl: "https://www.youtube.com/watch?v=7GjJef2QkQU",
    thumbnailUrl: "https://img.youtube.com/vi/7GjJef2QkQU/maxresdefault.jpg",
    description: "A beautifully painted short about memories and the passage of time.",
    isShort: true,
    status: 'published',
    tags: ['Drama', 'Experimental', 'GOBELINS', 'Artistic'],
    uploader: 'GOBELINS',
    originalUrl: "https://www.youtube.com/watch?v=7GjJef2QkQU"
  },
  {
    title: "KAIJU KID | Omeleto Animation",
    videoUrl: "https://www.youtube.com/watch?v=p1spyTGpeG0",
    thumbnailUrl: "https://img.youtube.com/vi/p1spyTGpeG0/maxresdefault.jpg",
    description: "A young boy with a giant monster friend navigates a world that doesn't understand them.",
    isShort: true,
    status: 'published',
    tags: ['Creature', 'Drama', 'Omeleto Animation', 'Fantasy'],
    uploader: 'Omeleto Animation',
    originalUrl: "https://www.youtube.com/watch?v=p1spyTGpeG0"
  },
  {
    title: "Beans In Jeans | Studio Showoff",
    videoUrl: "https://www.youtube.com/watch?v=S_U8vb6cCDg",
    thumbnailUrl: "https://img.youtube.com/vi/S_U8vb6cCDg/maxresdefault.jpg",
    description: "A fun and highly stylized character animation featuring a simple comedic premise.",
    isShort: true,
    status: 'published',
    tags: ['Humor', 'Experimental', 'Studio Showoff', 'Character Animation'],
    uploader: 'Studio Showoff',
    originalUrl: "https://www.youtube.com/watch?v=S_U8vb6cCDg"
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
