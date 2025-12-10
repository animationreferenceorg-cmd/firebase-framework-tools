
'use client';

import VideoForm from "@/components/admin/VideoForm";

export default function NewShortPage() {
    return (
        <div className="admin-theme">
            <div className="bg-background">
                <VideoForm isShort={true} />
            </div>
        </div>
    )
}
