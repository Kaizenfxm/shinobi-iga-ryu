import React from "react";
import { View, StyleSheet } from "react-native";
import YoutubeIframe from "react-native-youtube-iframe";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const ALLOWED_ORIGINS = [
  "https://www.youtube.com",
  "https://youtube.com",
  "https://www.youtube-nocookie.com",
];

function isAllowedUrl(url: string): boolean {
  if (url === "about:blank" || url === "" || url === "about:srcdoc") return true;
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin + "/embed"));
}

export default function YouTubePlayer({ videoUrl }: { videoUrl: string }) {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  return (
    <View style={styles.container}>
      <YoutubeIframe
        videoId={videoId}
        height={200}
        play={false}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          allowsLinkPreview: false,
          allowsBackForwardNavigationGestures: false,
          onShouldStartLoadWithRequest: (request: { url: string }) => {
            return isAllowedUrl(request.url);
          },
        }}
        initialPlayerParams={{
          modestbranding: true,
          rel: false,
          showClosedCaptions: false,
          iv_load_policy: 3,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "#111",
    marginTop: 4,
  },
});
