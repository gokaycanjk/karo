import { NextResponse } from "next/server";
import ytSearch from "yt-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Arama terimi girilmedi." }, { status: 400 });
  }

  try {
    const result = await ytSearch(query);
    // İlk 6 video sonucunu döndür
    const videos = result.videos.slice(0, 6).map((video) => ({
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      timestamp: video.timestamp,
      author: video.author.name,
      url: video.url,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json({ error: "Arama sırasında hata oluştu." }, { status: 500 });
  }
}