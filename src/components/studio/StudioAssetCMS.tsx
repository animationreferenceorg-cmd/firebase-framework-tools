'use client';

import React, { useState } from 'react';
import { 
  Folder, 
  FolderPlus,
  HardDrive, 
  ExternalLink, 
  Download, 
  Video, 
  UploadCloud, 
  RefreshCw, 
  Search, 
  Filter, 
  FileText, 
  Image as ImageIcon, 
  Box, 
  Check, 
  X, 
  Plus, 
  Sparkles,
  Layers,
  Clock,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Edit2,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface StudioAssetCMSProps {
  onNavigateToReview?: () => void;
}

export interface CustomFolder {
  id: string;
  name: string;
  section: string;
  icon: string; // emoji or icon tag
  color: string;
}

export interface ProductionAsset {
  id: string;
  name: string;
  folderId: string;
  folderName: string;
  sectionName: string;
  version: string;
  format: string;
  size: string;
  updatedAt: string;
  driveUrl: string;
  thumbnail: string;
  owner: { name: string; avatar: string };
  status: 'Approved' | 'In Review' | 'WIP' | 'Draft';
}

const initialFolders: CustomFolder[] = [
  { id: 'f-1', name: '01_PreProduction', section: 'Pre-Production', icon: '📝', color: 'bg-pink-100 text-pink-700' },
  { id: 'f-2', name: '02_VisDev_ConceptArt', section: 'Art & Design', icon: '🎨', color: 'bg-orange-100 text-orange-700' },
  { id: 'f-3', name: '03_3D_Models_Rigs', section: '3D Pipeline', icon: '📦', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'f-4', name: '04_Animation_Dailies', section: 'Animation', icon: '🎬', color: 'bg-blue-100 text-blue-700' },
  { id: 'f-5', name: '05_Renders_Compositing', section: 'Post-Production', icon: '💡', color: 'bg-purple-100 text-purple-700' },
];

const initialAssets: ProductionAsset[] = [
  {
    id: 'ast-1',
    name: 'Hero_Character_ModelSheet_Turnaround',
    folderId: 'f-2',
    folderName: '02_VisDev_ConceptArt',
    sectionName: 'Art & Design',
    version: 'v03',
    format: 'PSD',
    size: '142.8 MB',
    updatedAt: '12 mins ago',
    driveUrl: 'https://drive.google.com/file/d/hero_turnaround_v03',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    owner: { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80' },
    status: 'Approved'
  },
  {
    id: 'ast-2',
    name: 'Dojo_Courtyard_Environment_ColorScript',
    folderId: 'f-2',
    folderName: '02_VisDev_ConceptArt',
    sectionName: 'Art & Design',
    version: 'v02',
    format: 'PNG',
    size: '48.2 MB',
    updatedAt: '1 hour ago',
    driveUrl: 'https://drive.google.com/file/d/dojo_colorscript_v02',
    thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
    owner: { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80' },
    status: 'In Review'
  },
  {
    id: 'ast-3',
    name: 'Hero_Character_BaseRig_v04',
    folderId: 'f-3',
    folderName: '03_3D_Models_Rigs',
    sectionName: '3D Pipeline',
    version: 'v04',
    format: 'BLEND',
    size: '312.4 MB',
    updatedAt: '3 hours ago',
    driveUrl: 'https://drive.google.com/file/d/hero_baserig_v04',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',
    owner: { name: 'Chloe Zhao', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80' },
    status: 'Approved'
  },
  {
    id: 'ast-4',
    name: 'Shot_02_Combat_Blocking_Playblast',
    folderId: 'f-4',
    folderName: '04_Animation_Dailies',
    sectionName: 'Animation',
    version: 'v01',
    format: 'MP4',
    size: '85.6 MB',
    updatedAt: 'Yesterday at 4:15 PM',
    driveUrl: 'https://drive.google.com/file/d/shot02_blocking_v01',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    owner: { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80' },
    status: 'In Review'
  },
  {
    id: 'ast-5',
    name: 'Act_I_Screenplay_Master_Locked',
    folderId: 'f-1',
    folderName: '01_PreProduction',
    sectionName: 'Pre-Production',
    version: 'v02',
    format: 'PDF',
    size: '4.2 MB',
    updatedAt: 'Jan 28, 2026',
    driveUrl: 'https://drive.google.com/file/d/act1_screenplay_v02',
    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500&auto=format&fit=crop&q=80',
    owner: { name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80' },
    status: 'Approved'
  },
  {
    id: 'ast-6',
    name: 'Katana_Sword_HighPoly_Mesh',
    folderId: 'f-3',
    folderName: '03_3D_Models_Rigs',
    sectionName: '3D Pipeline',
    version: 'v01',
    format: 'FBX',
    size: '95.1 MB',
    updatedAt: 'Feb 02, 2026',
    driveUrl: 'https://drive.google.com/file/d/katana_highpoly_v01',
    thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80',
    owner: { name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80' },
    status: 'WIP'
  }
];

export function StudioAssetCMS({ onNavigateToReview }: StudioAssetCMSProps) {
  const { toast } = useToast();
  
  // State
  const [folders, setFolders] = useState<CustomFolder[]>(initialFolders);
  const [assets, setAssets] = useState<ProductionAsset[]>(initialAssets);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Form Inputs for New Folder
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSection, setNewFolderSection] = useState('Production');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');

  // Form Inputs for New Asset
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetFolderId, setNewAssetFolderId] = useState(initialFolders[1].id);
  const [newAssetFormat, setNewAssetFormat] = useState('PNG');
  const [newAssetVersion, setNewAssetVersion] = useState('v01');
  const [newAssetThumbnail, setNewAssetThumbnail] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80');

  // Create New Custom Folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: CustomFolder = {
      id: `f-${Date.now()}`,
      name: newFolderName.trim().replace(/\s+/g, '_'),
      section: newFolderSection,
      icon: newFolderIcon,
      color: 'bg-orange-100 text-orange-700'
    };
    setFolders([...folders, folder]);
    setActiveFolderId(folder.id);
    setNewFolderName('');
    setIsFolderModalOpen(false);
    toast({
      title: "Folder Created! 📁",
      description: `Created custom folder "${folder.name}"`,
    });
  };

  // Create New Custom Asset
  const handleCreateAsset = () => {
    if (!newAssetName.trim()) return;
    const targetFolder = folders.find(f => f.id === newAssetFolderId) || folders[0];
    
    const asset: ProductionAsset = {
      id: `ast-${Date.now()}`,
      name: newAssetName.trim().replace(/\s+/g, '_'),
      folderId: targetFolder.id,
      folderName: targetFolder.name,
      sectionName: targetFolder.section,
      version: newAssetVersion,
      format: newAssetFormat.toUpperCase(),
      size: '24.5 MB',
      updatedAt: 'Just now',
      driveUrl: `https://drive.google.com/file/d/${Date.now()}`,
      thumbnail: newAssetThumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      owner: { name: 'Katrina Malone', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80' },
      status: 'In Review'
    };

    setAssets([asset, ...assets]);
    setNewAssetName('');
    setIsAssetModalOpen(false);
    toast({
      title: "Progress Uploaded ➔ Auto-Routed to Dailies Review! 🎬",
      description: `Uploaded "${asset.name}" to ${targetFolder.name}. Automatically added to Frame.io / SyncSketch Review Playlist as latest deliverable!`,
    });
  };

  const handleSendToSyncSketch = (assetName: string) => {
    toast({
      title: `Sending ${assetName} to SyncSketch`,
      description: "Opening Review Theater...",
    });
    if (onNavigateToReview) {
      onNavigateToReview();
    }
  };

  // Filter Assets
  const filteredAssets = assets.filter(ast => {
    const matchesFolder = activeFolderId === 'all' || ast.folderId === activeFolderId;
    const matchesSearch = searchQuery === '' || 
      ast.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ast.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ast.folderName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#f7f7f8] font-sans">
      
      {/* ──────────────── LEFT SIDEBAR: CUSTOM FOLDER TREE BUILDER ──────────────── */}
      <div className="w-72 bg-white border-r border-gray-200/80 flex flex-col shrink-0 z-10 shadow-xs">
        
        {/* Sidebar Top Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-black text-gray-900">Custom Folders</h2>
          </div>
          
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Create Custom Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>+ Folder</span>
          </button>
        </div>

        {/* Folder List Tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* All Folder Button */}
          <button
            onClick={() => setActiveFolderId('all')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeFolderId === 'all' 
                ? "bg-[#212124] text-white shadow-sm" 
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <span>📂</span>
              <span className="truncate">All Shared Drive Assets</span>
            </div>
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
              activeFolderId === 'all' ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            )}>
              {assets.length}
            </span>
          </button>

          <div className="h-px bg-gray-100 my-2" />

          {/* User Custom Folders */}
          {folders.map(folder => {
            const isSelected = folder.id === activeFolderId;
            const count = assets.filter(a => a.folderId === folder.id).length;

            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group",
                  isSelected 
                    ? "bg-orange-50 border border-orange-200 text-orange-950 shadow-xs" 
                    : "text-gray-700 hover:bg-gray-100 border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span>{folder.icon}</span>
                  <span className="truncate">{folder.name}</span>
                </div>
                <span className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                  isSelected ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] font-semibold text-gray-500 font-mono">
          <span>Google Drive Synced</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* ──────────────── RIGHT MAIN CANVAS: ASSET TRACKER ──────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6">
        
        {/* Top Header Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shadow-xs shrink-0">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900">
                  {activeFolderId === 'all' ? 'All Shared Assets' : folders.find(f => f.id === activeFolderId)?.name || 'Custom Folder'}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  🟢 {filteredAssets.length} ASSETS
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Google Drive Shared Drive • Custom Asset Tracker & Version Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-white text-gray-900 shadow-xs font-bold" : "text-gray-400 hover:text-gray-700"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'list' ? "bg-white text-gray-900 shadow-xs font-bold" : "text-gray-400 hover:text-gray-700"
                )}
                title="Spreadsheet List View"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Track New Asset</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Subbar */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets by name, format, or folder..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="text-xs font-mono font-bold text-gray-400">
            Showing {filteredAssets.length} of {assets.length} Assets
          </div>
        </div>

        {/* ──────────────── ASSETS VIEW (GRID OR LIST) ──────────────── */}
        {viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex flex-col overflow-hidden group"
              >
                {/* Asset Image Preview */}
                <div className="h-44 bg-gray-900 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  />
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded-md border border-white/20">
                      {asset.version}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-orange-500 text-white px-2 py-0.5 rounded-md shadow-xs">
                      .{asset.format}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs border shadow-xs",
                      asset.status === 'Approved' ? 'bg-emerald-500/90 text-white border-emerald-400' :
                      asset.status === 'In Review' ? 'bg-amber-500/90 text-white border-amber-400' :
                      'bg-gray-800/90 text-gray-200 border-gray-600'
                    )}>
                      {asset.status}
                    </span>
                  </div>
                </div>

                {/* Content & Metadata */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {asset.name}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-400 block mt-0.5">
                      📁 {asset.folderName} • {asset.size}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <img src={asset.owner.avatar} alt={asset.owner.name} className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-semibold text-gray-700">{asset.owner.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{asset.updatedAt}</span>
                  </div>

                  {/* Action Triggers */}
                  <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleSendToSyncSketch(asset.name)}
                      className="py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>SyncSketch</span>
                    </button>

                    <a
                      href={asset.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                      <span>Drive Link</span>
                    </a>
                  </div>

                </div>

              </div>
            ))}
          </div>
        ) : (
          /* SPREADSHEET LIST VIEW */
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col mb-12">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
              <div className="col-span-4 pl-2">Asset Name</div>
              <div className="col-span-2">Folder</div>
              <div className="col-span-1">Version</div>
              <div className="col-span-1">Format</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Size</div>
              <div className="col-span-2 text-right pr-2">Actions</div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50/70 transition-colors">
                  <div className="col-span-4 pl-2 flex items-center gap-3">
                    <img src={asset.thumbnail} alt={asset.name} className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0" />
                    <span className="text-xs font-bold text-gray-900 truncate">{asset.name}</span>
                  </div>

                  <div className="col-span-2 text-xs font-semibold text-gray-600 truncate">
                    📁 {asset.folderName}
                  </div>

                  <div className="col-span-1">
                    <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                      {asset.version}
                    </span>
                  </div>

                  <div className="col-span-1">
                    <span className="text-[10px] font-mono font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      .{asset.format}
                    </span>
                  </div>

                  <div className="col-span-1">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      asset.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      asset.status === 'In Review' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {asset.status}
                    </span>
                  </div>

                  <div className="col-span-1 text-xs font-mono text-gray-400">
                    {asset.size}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 pr-2">
                    <button
                      onClick={() => handleSendToSyncSketch(asset.name)}
                      className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                      title="SyncSketch Review"
                    >
                      <Video className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={asset.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Open Drive Link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ──────────────── 5. NEW CUSTOM FOLDER MODAL ──────────────── */}
      {isFolderModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsFolderModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-bold text-gray-900">Create Custom Folder</h3>
              </div>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Folder Name</label>
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. 06_Prop_Rigs_Master" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Production Category</label>
                <select 
                  value={newFolderSection}
                  onChange={(e) => setNewFolderSection(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500"
                >
                  <option>Pre-Production</option>
                  <option>Art & Design</option>
                  <option>3D Pipeline</option>
                  <option>Animation</option>
                  <option>Post-Production</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Folder Icon</label>
                <div className="flex gap-2">
                  {['📁', '🎨', '📦', '⚙️', '🎬', '💡', '🔥'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewFolderIcon(emoji)}
                      className={cn(
                        "w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all",
                        newFolderIcon === emoji ? "border-orange-500 bg-orange-50 scale-110" : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setIsFolderModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Create Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── 6. NEW ASSET TRACKING MODAL ──────────────── */}
      {isAssetModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsAssetModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-bold text-gray-900">Track New Asset</h3>
              </div>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Asset Name</label>
                <input 
                  type="text" 
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="e.g. Hero_Weapon_Texture_Pass" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Folder</label>
                  <select 
                    value={newAssetFolderId}
                    onChange={(e) => setNewAssetFolderId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500"
                  >
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Format</label>
                  <select 
                    value={newAssetFormat}
                    onChange={(e) => setNewAssetFormat(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-orange-500"
                  >
                    <option>PNG</option>
                    <option>PSD</option>
                    <option>BLEND</option>
                    <option>FBX</option>
                    <option>MP4</option>
                    <option>EXR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Thumbnail Image URL</label>
                <input 
                  type="text" 
                  value={newAssetThumbnail}
                  onChange={(e) => setNewAssetThumbnail(e.target.value)}
                  placeholder="https://..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button 
                onClick={handleCreateAsset}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Track Asset</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
