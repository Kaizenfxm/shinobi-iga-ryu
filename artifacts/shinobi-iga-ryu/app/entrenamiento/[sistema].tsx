import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ImageSourcePropType,
  Platform,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { trainingApi, type TrainingSystemDetail, type ExerciseCategoryData, type KnowledgeCategoryData } from "@/lib/api";
import YouTubePlayer from "@/components/YouTubePlayer";

type SubTab = "conocimiento" | "ejercicios";

const SISTEMA_KANJI: Record<string, string> = {
  ninjutsu: "忍術",
  mma: "総合",
  box: "拳闘",
  jiujitsu: "柔術",
  muaythai: "拳法",
  kickboxing: "蹴拳",
  funcional: "機能",
};

const LEVEL_COLORS: Record<string, string> = {
  basico: "#22C55E",
  intermedio: "#F59E0B",
  avanzado: "#EF4444",
  elite: "#D4AF37",
};

const LEVEL_LABELS: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  elite: "Élite",
};

const SYSTEM_ART_IMAGES: Record<string, ImageSourcePropType> = {
  ninjutsu: require("@/assets/images/arts/ninjutsu.jpg"),
  mma: require("@/assets/images/arts/mma.jpg"),
  box: require("@/assets/images/arts/box.jpg"),
  jiujitsu: require("@/assets/images/arts/jiujitsu.jpg"),
  muaythai: require("@/assets/images/arts/muaythai.jpg"),
  kickboxing: require("@/assets/images/arts/kickboxing.png"),
  funcional: require("@/assets/images/arts/funcional.jpg"),
};

const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  gimnasia: require("@/assets/images/categories/gimnasia.png"),
  patadas: require("@/assets/images/categories/patadas.png"),
  combates: require("@/assets/images/categories/combates.png"),
  "resistencia al dolor": require("@/assets/images/categories/resistencia.png"),
  katas: require("@/assets/images/categories/katas.png"),
};

function getCategoryImage(name: string, systemKey: string): ImageSourcePropType {
  const key = name.toLowerCase().trim();
  if (CATEGORY_IMAGES[key]) return CATEGORY_IMAGES[key];
  return SYSTEM_ART_IMAGES[systemKey] ?? require("@/assets/images/arts/ninjutsu.jpg");
}

export default function EntrenamientoScreen() {
  const params = useLocalSearchParams<{ sistema: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const sistemaKey = params.sistema ?? "ninjutsu";
  const [activeTab, setActiveTab] = useState<SubTab>(
    params.tab === "ejercicios" ? "ejercicios" : "conocimiento"
  );

  const [data, setData] = useState<TrainingSystemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await trainingApi.getSystem(sistemaKey);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sistemaKey]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const kanji = SISTEMA_KANJI[sistemaKey] ?? "武術";
  const name = data?.system.name ?? sistemaKey.toUpperCase();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: isWeb ? 20 : insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKanji}>{kanji}</Text>
          <Text style={styles.headerName}>{name}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.subTabBar}>
        <Pressable
          style={[styles.subTab, activeTab === "conocimiento" && styles.subTabActive]}
          onPress={() => setActiveTab("conocimiento")}
        >
          <Ionicons name="book-outline" size={14} color={activeTab === "conocimiento" ? "#D4AF37" : "#555"} />
          <Text style={[styles.subTabText, activeTab === "conocimiento" && styles.subTabTextActive]}>
            CONOCIMIENTO
          </Text>
        </Pressable>
        <View style={styles.subTabSep} />
        <Pressable
          style={[styles.subTab, activeTab === "ejercicios" && styles.subTabActive]}
          onPress={() => setActiveTab("ejercicios")}
        >
          <MaterialCommunityIcons name="dumbbell" size={14} color={activeTab === "ejercicios" ? "#D4AF37" : "#555"} />
          <Text style={[styles.subTabText, activeTab === "ejercicios" && styles.subTabTextActive]}>
            EJERCICIOS
          </Text>
        </Pressable>
      </View>
      <View style={styles.subTabUnderline} />

      {loading ? (
        <ActivityIndicator color="#D4AF37" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: isWeb ? 40 : insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={["#D4AF37"]} />}
        >
          {activeTab === "conocimiento" ? (
            <ConocimientoTab
              items={data?.knowledge ?? []}
              categories={data?.knowledgeCategories ?? []}
              sistemaKey={sistemaKey}
            />
          ) : (
            <EjerciciosTab
              items={data?.exercises ?? []}
              categories={data?.exerciseCategories ?? []}
              sistemaKey={sistemaKey}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

type KnowledgeItem = {
  id: number;
  title: string;
  content: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  orderIndex: number;
  categoryId: number | null;
};

type ExerciseItem = {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
  orderIndex: number;
  categoryId: number | null;
  isLocked?: boolean;
  lockReason?: string | null;
  completedByUser?: boolean;
};

function CategoryCard({
  category,
  sistemaKey,
  onPress,
}: {
  category: KnowledgeCategoryData | ExerciseCategoryData;
  sistemaKey: string;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const gap = 10;
  const padding = 16;
  const cardSize = (width - padding * 2 - gap) / 2;
  const img = getCategoryImage(category.name, sistemaKey);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.catCard,
        { width: cardSize, height: cardSize, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Image source={img} style={styles.catCardBg} resizeMode="cover" />
      <View style={styles.catCardOverlay} />
      <View style={styles.catCardContent}>
        <Text style={styles.catCardName}>{category.name}</Text>
        {category.description ? (
          <Text style={styles.catCardDesc} numberOfLines={2}>{category.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const UNCATEGORIZED_ID = -1;

function KnowledgeList({ items }: { items: KnowledgeItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => (
        <View key={item.id} style={styles.knowledgeCard}>
          <View style={styles.cardGoldBar} />
          <Text style={styles.knowledgeTitle}>{item.title}</Text>
          {item.content ? <Text style={styles.knowledgeContent}>{item.content}</Text> : null}
          {item.videoUrl ? <YouTubePlayer videoUrl={item.videoUrl} /> : null}
        </View>
      ))}
    </>
  );
}

function ExerciseCard({ item }: { item: ExerciseItem }) {
  const [expanded, setExpanded] = useState(false);
  const completedRef = useRef(false);

  const handlePress = () => {
    if (item.isLocked) {
      if (Platform.OS === "web") {
        window.alert(item.lockReason ?? "Este ejercicio está bloqueado");
      } else {
        Alert.alert("Ejercicio bloqueado", item.lockReason ?? "No cumples los requisitos para ver este ejercicio", [{ text: "Entendido" }]);
      }
      return;
    }
    setExpanded((v) => !v);
    if (!expanded && !completedRef.current && !item.completedByUser) {
      completedRef.current = true;
      trainingApi.completeExercise(item.id).catch(() => {});
    }
  };

  const locked = item.isLocked;

  return (
    <View style={[styles.exerciseCard, locked && styles.exerciseCardLocked]}>
      <Pressable style={styles.exerciseCardTop} onPress={handlePress}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {locked ? (
              <Ionicons name="lock-closed" size={14} color="#555" />
            ) : item.completedByUser || (expanded && completedRef.current) ? (
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
            ) : null}
            <Text style={[styles.exerciseTitle, locked && { color: "#555" }]}>{item.title}</Text>
          </View>
          {locked && item.lockReason ? (
            <Text style={styles.lockReason}>{item.lockReason}</Text>
          ) : null}
          <View style={styles.exerciseMeta}>
            {item.level ? (
              <View style={[styles.levelBadge, { borderColor: locked ? "#333" : (LEVEL_COLORS[item.level] ?? "#D4AF37") }]}>
                <Text style={[styles.levelBadgeText, { color: locked ? "#444" : (LEVEL_COLORS[item.level] ?? "#D4AF37") }]}>
                  {LEVEL_LABELS[item.level] ?? item.level}
                </Text>
              </View>
            ) : null}
            {item.durationMinutes ? (
              <View style={styles.durationTag}>
                <Ionicons name="time-outline" size={11} color={locked ? "#444" : "#555"} />
                <Text style={[styles.durationText, locked && { color: "#444" }]}>{item.durationMinutes} min</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={locked ? "lock-closed" : expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={locked ? "#333" : "#555"}
          style={{ marginLeft: 6 }}
        />
      </Pressable>
      {!locked && expanded ? (
        <View style={{ marginTop: 8 }}>
          {item.description ? <Text style={styles.exerciseDesc}>{item.description}</Text> : null}
          {item.videoUrl ? <YouTubePlayer videoUrl={item.videoUrl} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function ExerciseList({ items }: { items: ExerciseItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => (
        <ExerciseCard key={item.id} item={item} />
      ))}
    </>
  );
}

function ConocimientoTab({
  items,
  categories,
  sistemaKey,
}: {
  items: KnowledgeItem[];
  categories: KnowledgeCategoryData[];
  sistemaKey: string;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const uncategorized = useMemo(() => items.filter((i) => i.categoryId === null), [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategoryId === null) return [];
    if (selectedCategoryId === UNCATEGORIZED_ID) return uncategorized;
    return items.filter((i) => i.categoryId === selectedCategoryId);
  }, [items, selectedCategoryId, uncategorized]);

  if (categories.length === 0 && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyKanji}>知</Text>
        <Text style={styles.emptyTitle}>Sin contenido aún</Text>
        <Text style={styles.emptySubtitle}>El conocimiento de este arte llegará pronto</Text>
      </View>
    );
  }

  if (categories.length === 0 || selectedCategoryId === null) {
    if (categories.length === 0) {
      return <View style={styles.listContainer}><KnowledgeList items={items} /></View>;
    }
    return (
      <View style={{ gap: 10 }}>
        <Text style={styles.gridLabel}>CATEGORÍAS</Text>
        <View style={styles.catGrid}>
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              sistemaKey={sistemaKey}
              onPress={() => setSelectedCategoryId(cat.id)}
            />
          ))}
          {uncategorized.length > 0 && (
            <GeneralesCard count={uncategorized.length} onPress={() => setSelectedCategoryId(UNCATEGORIZED_ID)} />
          )}
        </View>
      </View>
    );
  }

  const selectedCat = selectedCategoryId === UNCATEGORIZED_ID
    ? { name: "Generales" }
    : categories.find((c) => c.id === selectedCategoryId);

  return (
    <View style={styles.listContainer}>
      <Pressable style={styles.backToCats} onPress={() => setSelectedCategoryId(null)}>
        <Ionicons name="arrow-back" size={14} color="#D4AF37" />
        <Text style={styles.backToCatsText}>Categorías</Text>
        {selectedCat ? <Text style={styles.backToCatsCurrent}> / {selectedCat.name}</Text> : null}
      </Pressable>
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Sin contenido en esta categoría</Text>
        </View>
      ) : (
        <KnowledgeList items={filteredItems} />
      )}
    </View>
  );
}

function EjerciciosTab({
  items,
  categories,
  sistemaKey,
}: {
  items: ExerciseItem[];
  categories: ExerciseCategoryData[];
  sistemaKey: string;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const uncategorized = useMemo(() => items.filter((i) => i.categoryId === null), [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategoryId === null) return [];
    if (selectedCategoryId === UNCATEGORIZED_ID) return uncategorized;
    return items.filter((i) => i.categoryId === selectedCategoryId);
  }, [items, selectedCategoryId, uncategorized]);

  if (categories.length === 0 && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyKanji}>練</Text>
        <Text style={styles.emptyTitle}>Sin ejercicios aún</Text>
        <Text style={styles.emptySubtitle}>Los ejercicios de este arte llegarán pronto</Text>
      </View>
    );
  }

  if (categories.length === 0 || selectedCategoryId === null) {
    if (categories.length === 0) {
      return <View style={styles.listContainer}><ExerciseList items={items} /></View>;
    }
    return (
      <View style={{ gap: 10 }}>
        <Text style={styles.gridLabel}>CATEGORÍAS</Text>
        <View style={styles.catGrid}>
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              sistemaKey={sistemaKey}
              onPress={() => setSelectedCategoryId(cat.id)}
            />
          ))}
          {uncategorized.length > 0 && (
            <GeneralesCard count={uncategorized.length} onPress={() => setSelectedCategoryId(UNCATEGORIZED_ID)} />
          )}
        </View>
      </View>
    );
  }

  const selectedCat = selectedCategoryId === UNCATEGORIZED_ID
    ? { name: "Generales" }
    : categories.find((c) => c.id === selectedCategoryId);

  return (
    <View style={styles.listContainer}>
      <Pressable style={styles.backToCats} onPress={() => setSelectedCategoryId(null)}>
        <Ionicons name="arrow-back" size={14} color="#D4AF37" />
        <Text style={styles.backToCatsText}>Categorías</Text>
        {selectedCat ? <Text style={styles.backToCatsCurrent}> / {selectedCat.name}</Text> : null}
      </Pressable>
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Sin ejercicios en esta categoría</Text>
        </View>
      ) : (
        <ExerciseList items={filteredItems} />
      )}
    </View>
  );
}

function GeneralesCard({ count, onPress }: { count: number; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const gap = 10;
  const padding = 16;
  const cardSize = (width - padding * 2 - gap) / 2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.catCard,
        styles.generalesCard,
        { width: cardSize, height: cardSize, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <MaterialCommunityIcons name="infinity" size={32} color="#D4AF37" />
      <Text style={[styles.catCardName, { marginTop: 8 }]}>Generales</Text>
      <Text style={styles.catCardCount}>{count} {count === 1 ? "item" : "items"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
    gap: 2,
  },
  headerKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 20,
    color: "#D4AF37",
    letterSpacing: 4,
  },
  headerName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#555",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  subTabActive: {},
  subTabText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#555",
    letterSpacing: 1.5,
  },
  subTabTextActive: {
    color: "#D4AF37",
  },
  subTabSep: {
    width: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 8,
  },
  subTabUnderline: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyKanji: {
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 64,
    color: "#1A1A1A",
    lineHeight: 80,
  },
  emptyTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#444",
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#333",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  gridLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#444",
    letterSpacing: 2,
    marginBottom: 12,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catCard: {
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  catCardBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.35,
  },
  catCardOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  catCardContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  catCardName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  catCardDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#888",
    marginTop: 2,
    lineHeight: 14,
  },
  catCardCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#555",
    marginTop: 2,
  },
  generalesCard: {
    borderColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  backToCats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    paddingVertical: 4,
  },
  backToCatsText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#D4AF37",
    letterSpacing: 0.5,
  },
  backToCatsCurrent: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#555",
  },
  listContainer: {
    gap: 10,
  },
  knowledgeCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 14,
    gap: 8,
    overflow: "hidden",
  },
  cardGoldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#D4AF37",
  },
  knowledgeTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  knowledgeContent: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 14,
    gap: 8,
  },
  exerciseCardLocked: {
    borderColor: "#111",
    opacity: 0.7,
  },
  exerciseCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  lockReason: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
  exerciseTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  exerciseMeta: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  durationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  durationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#555",
  },
  exerciseDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
  },
});
