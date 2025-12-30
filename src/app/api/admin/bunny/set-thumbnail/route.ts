
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { videoId, libraryId } = await req.json();

        if (!videoId || !libraryId) {
            return new Response("Missing videoId or libraryId", { status: 400 });
        }

        const API_KEY = process.env.BUNNY_API_KEY;

        if (!API_KEY) {
            return new Response("Server misconfigured (BUNNY_API_KEY missing)", { status: 500 });
        }

        const url = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;

        // Set thumbnailTime to 0 to capture first frame
        const payload = {
            thumbnailTime: 0,
        };

        const res = await fetch(url, {
            method: "POST", // Creating/Updating video details uses POST in Bunny API often, or SHA256 auth... wait, POST to /videos/{id} updates it.
            headers: {
                "AccessKey": API_KEY, // Or AccessKey depending on endpoint. Video API usually uses AccessKey.
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Bunny API Error:", errText);
            return new Response(`Bunny API Error: ${errText}`, { status: res.status });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Set Thumbnail API Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
