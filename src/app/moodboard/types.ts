import { Video, LocalImage, MoodboardItem } from '@/lib/types';

export interface DraggableCanvasItem extends MoodboardItem {
    video?: Video | LocalImage;
}

export interface DraggableSidebarItemProps {
    video: Video;
    onMaximize?: () => void;
    onAdd?: (video: Video) => void;
    isSelectMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}
