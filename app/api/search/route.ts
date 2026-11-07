import { NextResponse } from "next/server";
import ytSearch from "yt-search";

// YouTube linkinden video ID ayıklama yardımcısı
function extractVideoId(urlOrText: string): string | null {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = urlOrText.match(regExp);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Arama terimi girilmedi." }, { status: 400 });
  }

  // 1. Kullanıcı doğrudan YouTube linki yapıştırdıysa:
  const directId = extractVideoId(query);
  if (directId) {
    return NextResponse.json({
      videos: [
        {
          videoId: directId,
          title: "Yapıştırılan Video Bağlantısı",
          thumbnail: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
          timestamp: "--:--",
          author: "YouTube",
          url: `https://www.youtube.com/watch?v=${directId}`,
        },
      ],
    });
  }

  // 2. Normal metin araması (yt-search)
  try {
    const result = await ytSearch(query);
    const videos = (result?.videos || []).slice(0, 6).map((video) => ({
      videoId: video.videoId,
      title: video.title,
      thumbnail: video.thumbnail,
      timestamp: video.timestamp,
      author: video.author?.name || "Bilinmiyor",
      url: video.url,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("YouTube Arama Hatası:", error);
    return NextResponse.json(
      { error: "Arama servisi geçici olarak yanıt vermedi. Lütfen doğrudan YouTube video linki yapıştırın." },
      { status: 500 }
    );
  }
}