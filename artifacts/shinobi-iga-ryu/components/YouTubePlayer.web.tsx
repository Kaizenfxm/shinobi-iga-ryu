import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  const [expanded, setExpanded] = useState(false);
  const videoId = extractYouTubeId(videoUrl);

  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&playsinline=1&iv_load_policy=3`;

  return (
    <View style={playerStyles.wrapper}>
      <Pressable
        style={playerStyles.toggleBtn}
        onPress={() => setExpanded(!expanded)}
      >
        <Ionicons
          name={expanded ? "close-circle-outline" : "play-circle-outline"}
          size={14}
          color="#D4AF37"
        />
        <Text style={playerStyles.toggleText}>
          {expanded ? "Ocultar video" : "Ver video"}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={12}
          color="#555"
        />
      </Pressable>

      {expanded && (
        <View style={playerStyles.playerArea}>
          <View style={playerStyles.iframeContainer}>
            <iframe
              src={embedUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 2,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </View>
        </View>
      )}
    </View>
  );
}

const playerStyles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  toggleText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#D4AF37",
    flex: 1,
  },
  playerArea: {
    marginTop: 8,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  iframeContainer: {
    aspectRatio: 16 / 9,
  },
});
