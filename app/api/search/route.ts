import { NextResponse } from "next/server";

function extractVideoId(urlOrText: string): string | null {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = urlOrText.match(regExp);
  return match ? match[1] : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ videos: [], error: "Arama terimi girilmedi." }, { status: 400 });
  }

  // 1. Kullanıcı doğrudan YouTube linki yapıştırdıysa:
  const directId = extractVideoId(query);
  if (directId) {
    return NextResponse.json({
      videos: [
        {
          videoId: directId,
          title: "Eklenen Video Bağlantısı",
          thumbnail: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
          timestamp: "--:--",
          author: "YouTube",
          url: `https://www.youtube.com/watch?v=${directId}`,
        },
      ],
    });
  }

  // 2. YouTube Data API v3 ile Resmi Arama
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { videos: [], error: "YOUTUBE_API_KEY yapılandırılmamış. Lütfen doğrudan YouTube linki yapıştırın." },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${encodeURIComponent(query)}&key=${apiKey}`
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error("YouTube API Yanıt Hatası:", errData);
      return NextResponse.json(
        { videos: [], error: "YouTube arama kotası aşıldı veya anahtar geçersiz. Link yapıştırarak izleyebilirsiniz." },
        { status: 200 }
      );
    }

    const data = await res.json();
    const videos = (data.items || []).map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      timestamp: "Canlı / Video",
      author: item.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return NextResponse.json({ videos });
  } catch (err) {
    console.error("Arama sunucu hatası:", err);
    return NextResponse.json({ videos: [], error: "Bağlantı hatası oluştu." }, { status: 200 });
  }
}