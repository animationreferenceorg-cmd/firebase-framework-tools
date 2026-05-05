import { Video, LocalImage } from '@/lib/types';

export interface DraggableCanvasItem {
    id: string;
    type?: 'image' | 'video' | 'note';
    text?: string;
    video: Video | LocalImage;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export interface DraggableSidebarItemProps {
    video: Video;
    onMaximize?: () => void;
}
