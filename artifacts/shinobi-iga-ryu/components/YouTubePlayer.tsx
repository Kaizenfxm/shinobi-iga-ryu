import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  "about:blank",
];

function isAllowedUrl(url: string): boolean {
  if (url === "about:blank" || url === "" || url === "about:srcdoc") return true;
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin + "/embed"));
}

export default function YouTubePlayer({ videoUrl }: { videoUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(videoUrl);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") setPlaying(false);
  }, []);

  if (!videoId) return null;

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
          <YoutubeIframe
            videoId={videoId}
            height={200}
            play={playing}
            onChangeState={onStateChange}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
              allowsLinkPreview: false,
              allowsBackForwardNavigationGestures: false,
              onShouldStartLoadWithRequest: (request: { url: string }) => {
                return isAllowedUrl(request.url);
              },
              onNavigationStateChange: (navState: { url: string }) => {
                if (!isAllowedUrl(navState.url)) {
                  return false;
                }
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
});
