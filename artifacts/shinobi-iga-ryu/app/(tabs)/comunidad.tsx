import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { eventsApi, getAvatarServingUrl, EventItem, EventAttendee } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type ComunidadTab = "eventos" | "retos" | "ranking" | "clases";
const TABS: { key: ComunidadTab; label: string }[] = [
  { key: "eventos", label: "EVENTOS" },
  { key: "retos", label: "RETOS" },
  { key: "ranking", label: "RANKING" },
  { key: "clases", label: "CLASES" },
];

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}
function formatEventTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function AttendeesModal({ eventId, eventTitle, visible, onClose }: {
  eventId: number;
  eventTitle: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    eventsApi.getAttendees(eventId)
      .then((res) => setAttendees(res.attendees))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, eventId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={aStyles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={aStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={aStyles.title}>{eventTitle}</Text>
          <Text style={aStyles.subtitle}>
            {loading ? "" : `${attendees.length} asistente${attendees.length !== 1 ? "s" : ""}`}
          </Text>
          {loading ? (
            <ActivityIndicator color="#D4AF37" style={{ marginTop: 24 }} />
          ) : attendees.length === 0 ? (
            <Text style={aStyles.empty}>Nadie ha confirmado asistencia aún</Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {attendees.map((a) => (
                <View key={a.id} style={aStyles.row}>
                  {a.avatarUrl ? (
                    <Image
                      source={{ uri: getAvatarServingUrl(a.avatarUrl) ?? undefined }}
                      style={aStyles.avatar}
                    />
                  ) : (
                    <View style={[aStyles.avatar, aStyles.avatarFallback]}>
                      <Text style={aStyles.avatarLetter}>{(a.displayName?.[0] ?? "?").toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={aStyles.name}>{a.displayName}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable style={aStyles.closeBtn} onPress={onClose}>
            <Text style={aStyles.closeBtnText}>CERRAR</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const aStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111", borderTopLeftRadius: 12, borderTopRightRadius: 12,
    padding: 24, paddingBottom: 40, borderTopWidth: 2, borderTopColor: "#D4AF37",
  },
  handle: { width: 40, height: 3, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 15, textAlign: "center" },
  subtitle: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 11, textAlign: "center", marginTop: 2, marginBottom: 16 },
  empty: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 12, textAlign: "center", marginTop: 24, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#222" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 14 },
  name: { color: "#CCC", fontFamily: "NotoSansJP_400Regular", fontSize: 13, flex: 1 },
  closeBtn: { marginTop: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 4, paddingVertical: 10, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
});

function CreateEventModal({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (ev: EventItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setDate(""); setTime(""); setLocation("");
    setCoverUri(null); setCoverPath(null);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permiso", "Se necesita acceso a la galería"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    setUploadingImg(true);
    try {
      const { uploadURL, objectPath } = await eventsApi.getCoverUploadUrl(mimeType);
      const blob = await fetch(asset.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": mimeType } });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setCoverUri(asset.uri);
      setCoverPath(objectPath);
    } catch {
      Alert.alert("Error", "No se pudo subir la imagen");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !date.trim() || !time.trim() || !location.trim()) {
      Alert.alert("Error", "Completa todos los campos"); return;
    }
    const isoDate = `${date.trim()}T${time.trim()}:00`;
    if (isNaN(new Date(isoDate).getTime())) {
      Alert.alert("Error", "Formato de fecha inválido (AAAA-MM-DD) y hora (HH:MM)"); return;
    }
    setSaving(true);
    try {
      const res = await eventsApi.create({ title: title.trim(), coverImageUrl: coverPath, eventDate: isoDate, location: location.trim() });
      onCreated(res.event);
      reset();
      onClose();
    } catch {
      Alert.alert("Error", "No se pudo crear el evento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cStyles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={cStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={cStyles.heading}>NUEVO EVENTO</Text>

          <Pressable style={cStyles.imagePicker} onPress={pickImage} disabled={uploadingImg}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={cStyles.imagePreview} resizeMode="cover" />
            ) : uploadingImg ? (
              <ActivityIndicator color="#D4AF37" />
            ) : (
              <>
                <MaterialCommunityIcons name="image-plus" size={28} color="#555" />
                <Text style={cStyles.imagePickerText}>Imagen de portada</Text>
              </>
            )}
          </Pressable>

          <TextInput
            style={cStyles.input} placeholder="Nombre del evento" placeholderTextColor="#444"
            value={title} onChangeText={setTitle}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[cStyles.input, { flex: 1 }]} placeholder="Fecha (AAAA-MM-DD)" placeholderTextColor="#444"
              value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[cStyles.input, { width: 90 }]} placeholder="HH:MM" placeholderTextColor="#444"
              value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation"
            />
          </View>
          <TextInput
            style={cStyles.input} placeholder="Lugar" placeholderTextColor="#444"
            value={location} onChangeText={setLocation}
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable style={[cStyles.btn, { flex: 1, backgroundColor: "#1a1a1a" }]} onPress={() => { reset(); onClose(); }}>
              <Text style={[cStyles.btnText, { color: "#555" }]}>CANCELAR</Text>
            </Pressable>
            <Pressable style={[cStyles.btn, { flex: 1, backgroundColor: "#D4AF37", opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
              <Text style={[cStyles.btnText, { color: "#000" }]}>{saving ? "CREANDO..." : "CREAR"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 24, paddingBottom: 40, borderTopWidth: 2, borderTopColor: "#D4AF37" },
  heading: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 13, letterSpacing: 2, textAlign: "center", marginBottom: 16 },
  imagePicker: { height: 120, backgroundColor: "#0a0a0a", borderRadius: 4, borderWidth: 1, borderColor: "#2a2a2a", borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  imagePickerText: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 11, marginTop: 6 },
  input: { backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 4, color: "#FFF", fontFamily: "NotoSansJP_400Regular", fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  btn: { borderRadius: 4, paddingVertical: 12, alignItems: "center" },
  btnText: { fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
});

function EventCard({ event, canManage, onAttendToggle, onDelete, onViewAttendees }: {
  event: EventItem;
  canManage: boolean;
  onAttendToggle: (id: number, current: boolean | null) => void;
  onDelete: (id: number) => void;
  onViewAttendees: (ev: EventItem) => void;
}) {
  const coverUrl = getAvatarServingUrl(event.coverImageUrl);
  const attending = event.userWillAttend === true;

  return (
    <View style={eStyles.card}>
      {coverUrl ? (
        <ImageBackground source={{ uri: coverUrl }} style={eStyles.cardBg} resizeMode="cover">
          <View style={eStyles.overlay} />
          <CardContent event={event} attending={attending} canManage={canManage} onAttendToggle={onAttendToggle} onDelete={onDelete} onViewAttendees={onViewAttendees} />
        </ImageBackground>
      ) : (
        <View style={[eStyles.cardBg, { backgroundColor: "#0d0d0d" }]}>
          <CardContent event={event} attending={attending} canManage={canManage} onAttendToggle={onAttendToggle} onDelete={onDelete} onViewAttendees={onViewAttendees} />
        </View>
      )}
    </View>
  );
}

function CardContent({ event, attending, canManage, onAttendToggle, onDelete, onViewAttendees }: {
  event: EventItem;
  attending: boolean;
  canManage: boolean;
  onAttendToggle: (id: number, current: boolean | null) => void;
  onDelete: (id: number) => void;
  onViewAttendees: (ev: EventItem) => void;
}) {
  return (
    <View style={eStyles.cardInner}>
      <View style={{ flex: 1 }}>
        <Text style={eStyles.cardTitle} numberOfLines={2}>{event.title}</Text>
        <View style={eStyles.metaRow}>
          <Ionicons name="calendar-outline" size={11} color="#D4AF37" />
          <Text style={eStyles.metaGold}>{formatEventDate(event.eventDate)}</Text>
          <Text style={eStyles.metaSep}>·</Text>
          <Ionicons name="time-outline" size={11} color="#D4AF37" />
          <Text style={eStyles.metaGold}>{formatEventTime(event.eventDate)}</Text>
        </View>
        <View style={eStyles.metaRow}>
          <Ionicons name="location-outline" size={11} color="#888" />
          <Text style={eStyles.metaGrey} numberOfLines={1}>{event.location}</Text>
        </View>
      </View>

      <View style={eStyles.actions}>
        {canManage && (
          <Pressable style={eStyles.deleteBtn} onPress={() => onDelete(event.id)}>
            <MaterialCommunityIcons name="trash-can-outline" size={14} color="#555" />
          </Pressable>
        )}
        <Pressable style={eStyles.attendeesBtn} onPress={() => onViewAttendees(event)}>
          <MaterialCommunityIcons name="account-group" size={14} color="#D4AF37" />
          <Text style={eStyles.attendeeCount}>{event.attendeeCount}</Text>
        </Pressable>
        <Pressable
          style={[eStyles.attendBtn, attending && eStyles.attendBtnActive]}
          onPress={() => onAttendToggle(event.id, event.userWillAttend)}
        >
          <Text style={[eStyles.attendBtnText, attending && eStyles.attendBtnTextActive]}>
            {attending ? "ASISTIRÉ ✓" : "ASISTIRÉ"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const eStyles = StyleSheet.create({
  card: { borderTopWidth: 2, borderTopColor: "#D4AF37", marginBottom: 1, overflow: "hidden" },
  cardBg: { width: "100%", minHeight: 160 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  cardInner: { flex: 1, padding: 16, flexDirection: "row", alignItems: "flex-end", gap: 12, minHeight: 160, justifyContent: "space-between" },
  cardTitle: { color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 16, marginBottom: 6, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaGold: { color: "#D4AF37", fontFamily: "NotoSansJP_400Regular", fontSize: 11 },
  metaSep: { color: "#555", fontSize: 10, marginHorizontal: 2 },
  metaGrey: { color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 11, flex: 1 },
  actions: { alignItems: "flex-end", gap: 6, justifyContent: "flex-end" },
  deleteBtn: { padding: 4 },
  attendeesBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2, borderWidth: 1, borderColor: "#2a2a2a" },
  attendeeCount: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 11 },
  attendBtn: { backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "#555", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2 },
  attendBtnActive: { backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  attendBtnText: { color: "#999", fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 0.5 },
  attendBtnTextActive: { color: "#000" },
});

function EventosTab({ canManage, extraEvents }: {
  canManage: boolean;
  extraEvents?: EventItem[];
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendeesEvent, setAttendeesEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    if (extraEvents && extraEvents.length > 0) {
      setEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newOnes = extraEvents.filter((e) => !ids.has(e.id));
        return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
      });
    }
  }, [extraEvents]);

  const load = useCallback(async () => {
    try {
      const res = await eventsApi.getAll();
      setEvents(res.events);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los eventos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAttendToggle = async (id: number, current: boolean | null) => {
    const willAttend = current !== true;
    try {
      const res = await eventsApi.attend(id, willAttend);
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, userWillAttend: res.willAttend, attendeeCount: res.attendeeCount } : e));
    } catch {
      Alert.alert("Error", "No se pudo actualizar tu asistencia");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar evento", "¿Seguro que deseas eliminar este evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          try {
            await eventsApi.delete(id);
            setEvents((prev) => prev.filter((e) => e.id !== id));
          } catch {
            Alert.alert("Error", "No se pudo eliminar el evento");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#D4AF37" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#D4AF37" />}
      >
        {events.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={40} color="#222" />
            <Text style={{ color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 12, letterSpacing: 2, marginTop: 12 }}>SIN EVENTOS</Text>
          </View>
        ) : (
          events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              canManage={canManage}
              onAttendToggle={handleAttendToggle}
              onDelete={handleDelete}
              onViewAttendees={setAttendeesEvent}
            />
          ))
        )}
      </ScrollView>

      {attendeesEvent && (
        <AttendeesModal
          eventId={attendeesEvent.id}
          eventTitle={attendeesEvent.title}
          visible={!!attendeesEvent}
          onClose={() => setAttendeesEvent(null)}
        />
      )}
    </View>
  );
}

function ComingSoon() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 13, letterSpacing: 2 }}>PRÓXIMAMENTE</Text>
    </View>
  );
}

export default function ComunidadScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { hasRole, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ComunidadTab>("eventos");
  const [createVisible, setCreateVisible] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([]);

  const canManage = !isLoading && isAuthenticated && (hasRole("admin") || hasRole("profesor"));

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: isWeb ? 16 : insets.top + 8 }]}>
        <View style={styles.logoRow}>
          <Image source={require("@/assets/images/logo.png")} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.subTabBar}>
          {TABS.map((tab, i) => (
            <React.Fragment key={tab.key}>
              {i > 0 && <View style={styles.subTabSep} />}
              <Pressable
                style={[styles.subTab, activeTab === tab.key && styles.subTabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.subTabText, activeTab === tab.key && styles.subTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </View>

      {canManage && activeTab === "eventos" && (
        <Pressable style={styles.createBar} onPress={() => setCreateVisible(true)}>
          <MaterialCommunityIcons name="plus" size={18} color="#D4AF37" />
        </Pressable>
      )}

      {activeTab === "eventos" ? (
        <EventosTab canManage={canManage} extraEvents={createdEvents} />
      ) : (
        <ComingSoon />
      )}

      <CreateEventModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={(ev) => setCreatedEvents((prev) => [ev, ...prev])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  headerContainer: { backgroundColor: "#000", borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  logoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  logoImage: { width: 34, height: 34 },
  subTabBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  subTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabActive: { borderBottomColor: "#D4AF37" },
  subTabSep: { width: 1, height: 14, backgroundColor: "#1a1a1a" },
  subTabText: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 10, letterSpacing: 1 },
  subTabTextActive: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold" },
  createBar: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    backgroundColor: "#050505",
  },
});
