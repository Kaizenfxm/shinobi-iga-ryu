import React from "react";
import { View, StyleSheet } from "react-native";

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

export default function YouTubePlayer({ videoUrl }: { videoUrl: string }) {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&playsinline=1&iv_load_policy=3`;

  return (
    <View style={styles.container}>
      <View style={styles.aspectBox}>
        <iframe
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </View>
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
  aspectBox: {
    aspectRatio: 16 / 9,
  },
});
