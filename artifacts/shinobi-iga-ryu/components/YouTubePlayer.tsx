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

function shouldBlockNavigation(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("about:") || url.startsWith("blob:")) {
    return false;
  }
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
    return true;
  }
  if (url.startsWith("http") && !url.includes("youtube") && !url.includes("ytimg.com") && !url.includes("googlevideo.com") && !url.includes("ggpht.com")) {
    return true;
  }
  return false;
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
            return !shouldBlockNavigation(request.url);
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
