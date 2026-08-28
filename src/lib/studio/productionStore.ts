'use client';

// Unified Animation Production Data Store
// Connects Tasks -> Drive Folders -> Assets -> Frame.io/SyncSketch Review Playlist -> Master Timeline

export interface UnifiedTask {
  id: string;
  title: string;
  department: string;
  status: 'todo' | 'in-progress' | 'review' | 'complete';
  folderId: string;
  folderName: string;
  date: string;
  assignees: { name: string; avatar: string }[];
  latestDeliverable?: {
    name: string;
    version: string;
    thumbnail: string;
    src: string;
    uploadedAt: string;
  };
}

export interface UnifiedFolder {
  id: string;
  name: string;
  taskId?: string;
  department: string;
  icon: string;
  assetCount: number;
}

export interface UnifiedAsset {
  id: string;
  name: string;
  taskId: string;
  folderId: string;
  folderName: string;
  version: string;
  format: string;
  size: string;
  thumbnail: string;
  src: string;
  uploadedAt: string;
  owner: { name: string; avatar: string };
  status: 'Approved' | 'In Review' | 'WIP';
}

export interface UnifiedReviewItem {
  id: string;
  assetId: string;
  taskId: string;
  title: string;
  type: 'video' | 'image';
  version: string;
  status: 'Approved' | 'Revisions Needed' | 'Pending Dailies';
  department: string;
  artist: string;
  thumbnail: string;
  src: string;
}

// Initial Shared Production Data
export const initialTasks: UnifiedTask[] = [
  {
    id: 'tsk-monkey',
    title: 'Monkey Character VisDev Design',
    department: 'Art & Vis Dev',
    status: 'in-progress',
    folderId: 'fld-monkey',
    folderName: '02_VisDev_ConceptArt/Monkey_Character_Design',
    date: 'Due Feb 20',
    assignees: [
      { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80' }
    ],
    latestDeliverable: {
      name: 'Monkey_VisDev_Turnaround_v02.png',
      version: 'v02',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      uploadedAt: '10 mins ago'
    }
  },
  {
    id: 'tsk-dojo',
    title: 'Dojo Courtyard 3D Architecture Model',
    department: '3D Assets',
    status: 'in-progress',
    folderId: 'fld-dojo',
    folderName: '03_3D_Models_Rigs/Dojo_Courtyard_Model',
    date: 'Due Feb 25',
    assignees: [
      { name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80' }
    ],
    latestDeliverable: {
      name: 'Dojo_Courtyard_Mesh_v01.blend',
      version: 'v01',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',
      src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
      uploadedAt: '2 hours ago'
    }
  },
  {
    id: 'tsk-shot02',
    title: 'Shot 02 Combat Animation Blocking',
    department: 'Animation',
    status: 'review',
    folderId: 'fld-shot02',
    folderName: '04_Animation_Dailies/Shot_02_Combat',
    date: 'Due Today',
    assignees: [
      { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80' }
    ],
    latestDeliverable: {
      name: 'Shot_02_Blocking_Pass_v01.mp4',
      version: 'v01',
      thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      uploadedAt: 'Yesterday'
    }
  }
];

export const initialFolders: UnifiedFolder[] = [
  { id: 'fld-monkey', name: '02_VisDev_ConceptArt/Monkey_Character_Design', taskId: 'tsk-monkey', department: 'Art & Vis Dev', icon: '🎨', assetCount: 2 },
  { id: 'fld-dojo', name: '03_3D_Models_Rigs/Dojo_Courtyard_Model', taskId: 'tsk-dojo', department: '3D Assets', icon: '📦', assetCount: 1 },
  { id: 'fld-shot02', name: '04_Animation_Dailies/Shot_02_Combat', taskId: 'tsk-shot02', department: 'Animation', icon: '🎬', assetCount: 1 },
];

export const initialAssets: UnifiedAsset[] = [
  {
    id: 'ast-monkey-1',
    name: 'Monkey_VisDev_Turnaround_v02.png',
    taskId: 'tsk-monkey',
    folderId: 'fld-monkey',
    folderName: '02_VisDev_ConceptArt/Monkey_Character_Design',
    version: 'v02',
    format: 'PNG',
    size: '14.2 MB',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    uploadedAt: '10 mins ago',
    owner: { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80' },
    status: 'In Review'
  },
  {
    id: 'ast-dojo-1',
    name: 'Dojo_Courtyard_Mesh_v01.blend',
    taskId: 'tsk-dojo',
    folderId: 'fld-dojo',
    folderName: '03_3D_Models_Rigs/Dojo_Courtyard_Model',
    version: 'v01',
    format: 'BLEND',
    size: '128.5 MB',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80',
    uploadedAt: '2 hours ago',
    owner: { name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80' },
    status: 'WIP'
  },
  {
    id: 'ast-shot02-1',
    name: 'Shot_02_Blocking_Pass_v01.mp4',
    taskId: 'tsk-shot02',
    folderId: 'fld-shot02',
    folderName: '04_Animation_Dailies/Shot_02_Combat',
    version: 'v01',
    format: 'MP4',
    size: '42.1 MB',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    uploadedAt: 'Yesterday',
    owner: { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80' },
    status: 'In Review'
  }
];

export const initialReviewItems: UnifiedReviewItem[] = [
  {
    id: 'rev-monkey-1',
    assetId: 'ast-monkey-1',
    taskId: 'tsk-monkey',
    title: 'Monkey Character VisDev Design (v02)',
    type: 'image',
    version: 'v02',
    status: 'Pending Dailies',
    department: 'Art & Vis Dev',
    artist: 'Elena Rostova',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80'
  },
  {
    id: 'rev-shot02-1',
    assetId: 'ast-shot02-1',
    taskId: 'tsk-shot02',
    title: 'Shot 02 Combat Animation Blocking (v01)',
    type: 'video',
    version: 'v01',
    status: 'Pending Dailies',
    department: 'Animation',
    artist: 'Sarah Chen',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  }
];
