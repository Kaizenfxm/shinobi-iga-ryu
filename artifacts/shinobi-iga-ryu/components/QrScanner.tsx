import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Image,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { classesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

let CameraView: React.ComponentType<{
  style?: object;
  facing?: string;
  barcodeScannerSettings?: { barcodeTypes: string[] };
  onBarcodeScanned?: (result: { data: string }) => void;
}> | null = null;

let useCameraPermissions: (() => [{ granted: boolean } | null, () => Promise<{ granted: boolean }>]) | null = null;

try {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  CameraView = null;
  useCameraPermissions = null;
}

function StarRating({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  return (
    <View style={starStyles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onRate(star)} style={starStyles.star}>
          <MaterialCommunityIcons
            name={star <= rating ? "star" : "star-outline"}
            size={32}
            color={star <= rating ? "#D4AF37" : "#444"}
          />
        </Pressable>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  star: {
    padding: 2,
  },
});

type ScanResult =
  | { type: "success"; className: string; classId: number; attendedAt: string; createdByName: string | null }
  | { type: "duplicate"; message: string }
  | null;

export default function QrScannerButton({ onAttendanceRecorded }: { onAttendanceRecorded?: () => void } = {}) {
  const { isAuthenticated } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [webToken, setWebToken] = useState("");
  const [sharing, setSharing] = useState(false);
  const processingRef = useRef(false);
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Info", "Compartir no está disponible en web");
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(viewShotRef, { format: "png", quality: 1, result: "tmpfile" });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartir Asistencia" });
      } else {
        Alert.alert("Error", "Compartir no está disponible en este dispositivo");
      }
    } catch {
      Alert.alert("Error", "No se pudo capturar la pantalla");
    } finally {
      setSharing(false);
    }
  };

  if (!isAuthenticated) return null;

  const handleBarCodeScanned = async (data: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setChecking(true);

    try {
      const res = await classesApi.scan(data);
      setResult({ type: "success", ...res });
      onAttendanceRecorded?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrar asistencia";
      if (msg.includes("Ya registraste")) {
        setResult({ type: "duplicate", message: msg });
      } else {
        Alert.alert("Error", msg);
        processingRef.current = false;
      }
    } finally {
      setChecking(false);
    }
  };

  const handleRate = async (r: number) => {
    setRating(r);
    if (result?.type === "success") {
      try {
        await classesApi.rate(result.classId, r);
        setRatingSubmitted(true);
      } catch {
        Alert.alert("Error", "No se pudo enviar la calificación");
      }
    }
  };

  const closeAll = () => {
    processingRef.current = false;
    setShowScanner(false);
    setResult(null);
    setRating(0);
    setRatingSubmitted(false);
    setWebToken("");
  };

  const handleWebSubmit = () => {
    const token = webToken.trim();
    if (!token) return;
    handleBarCodeScanned(token);
  };

  return (
    <>
      <Pressable style={fabStyles.fab} onPress={() => setShowScanner(true)}>
        <MaterialCommunityIcons name="qrcode-scan" size={20} color="#000" />
      </Pressable>

      <Modal visible={showScanner} animationType="slide" onRequestClose={closeAll}>
        <View style={scannerStyles.container}>
          {result?.type === "success" ? (
            <View style={scannerStyles.resultContainer}>
              <ViewShot ref={viewShotRef} style={{ alignSelf: "stretch" }}>
                <View style={[scannerStyles.resultCard, { backgroundColor: "#0a0a0a" }]}>
                  <Image
                    source={require("../assets/images/logo.png")}
                    style={{ width: 72, height: 72, resizeMode: "contain", marginBottom: 6 }}
                  />
                  <MaterialCommunityIcons name="check-circle" size={52} color="#D4AF37" />
                  <Text style={scannerStyles.resultTitle}>¡Asistencia Registrada!</Text>
                  <Text style={scannerStyles.resultClass}>{result.className}</Text>
                  {result.createdByName && (
                    <Text style={{ color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 11, marginTop: 2 }}>
                      Prof: {result.createdByName}
                    </Text>
                  )}
                  <Text style={scannerStyles.resultTime}>
                    {new Date(result.attendedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    {"  "}
                    {new Date(result.attendedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </ViewShot>

              <View style={[scannerStyles.resultCard, { marginTop: 8 }]}>
                {!ratingSubmitted ? (
                  <View style={scannerStyles.ratingSection}>
                    <Text style={scannerStyles.ratingLabel}>¿Cómo estuvo la clase?</Text>
                    <StarRating rating={rating} onRate={handleRate} />
                  </View>
                ) : (
                  <View style={scannerStyles.ratingSection}>
                    <MaterialCommunityIcons name="check" size={16} color="#D4AF37" />
                    <Text style={scannerStyles.ratingThanks}>¡Gracias por tu calificación!</Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14, alignItems: "center" }}>
                  {sharing ? (
                    <ActivityIndicator color="#D4AF37" size="small" style={{ width: 40 }} />
                  ) : (
                    <Pressable
                      style={{ width: 40, height: 40, borderRadius: 4, borderWidth: 1, borderColor: "#D4AF37", backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}
                      onPress={handleShare}
                    >
                      <Ionicons name="share-social-outline" size={18} color="#D4AF37" />
                    </Pressable>
                  )}
                  <Pressable style={[scannerStyles.closeBtn, { flex: 1, marginTop: 0, alignItems: "center" }]} onPress={closeAll}>
                    <Text style={scannerStyles.closeBtnText}>CERRAR</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : result?.type === "duplicate" ? (
            <View style={scannerStyles.resultContainer}>
              <View style={scannerStyles.resultCard}>
                <MaterialCommunityIcons name="calendar-check" size={60} color="#D4AF37" />
                <Text style={scannerStyles.resultTitle}>Ya Registrado</Text>
                <Text style={{ color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                  {result.message}
                </Text>
                <Text style={{ color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 10, marginTop: 4, textAlign: "center" }}>
                  Tu asistencia a esta clase ya fue marcada anteriormente.
                </Text>
                <Pressable style={scannerStyles.closeBtn} onPress={closeAll}>
                  <Text style={scannerStyles.closeBtnText}>CERRAR</Text>
                </Pressable>
              </View>
            </View>
          ) : Platform.OS === "web" ? (
            <View style={scannerStyles.noCameraContainer}>
              <MaterialCommunityIcons name="qrcode-scan" size={48} color="#D4AF37" />
              <Text style={[scannerStyles.noCameraText, { marginBottom: 4 }]}>Registrar Asistencia</Text>
              <Text style={{ color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 10, textAlign: "center", marginBottom: 20 }}>
                Ingresa el token del código QR que te muestra el profesor
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#111",
                  borderWidth: 1,
                  borderColor: "#D4AF37",
                  borderRadius: 4,
                  color: "#FFF",
                  fontFamily: "NotoSansJP_400Regular",
                  fontSize: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  width: "100%",
                  marginBottom: 12,
                }}
                placeholder="Pega aquí el token QR..."
                placeholderTextColor="#444"
                value={webToken}
                onChangeText={setWebToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={[scannerStyles.closeBtn, { backgroundColor: "#D4AF37", opacity: checking || !webToken.trim() ? 0.5 : 1 }]}
                onPress={handleWebSubmit}
                disabled={checking || !webToken.trim()}
              >
                {checking ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={[scannerStyles.closeBtnText, { color: "#000" }]}>REGISTRAR</Text>
                )}
              </Pressable>
              <Pressable style={scannerStyles.closeBtn} onPress={closeAll}>
                <Text style={scannerStyles.closeBtnText}>CANCELAR</Text>
              </Pressable>
            </View>
          ) : (
            <ScannerCamera
              onScanned={handleBarCodeScanned}
              checking={checking}
              onClose={closeAll}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

function ScannerCamera({
  onScanned,
  checking,
  onClose,
}: {
  onScanned: (data: string) => void;
  checking: boolean;
  onClose: () => void;
}) {
  if (!CameraView || !useCameraPermissions) {
    return (
      <View style={scannerStyles.noCameraContainer}>
        <MaterialCommunityIcons name="camera-off" size={40} color="#555" />
        <Text style={scannerStyles.noCameraText}>Cámara no disponible</Text>
        <Pressable style={scannerStyles.closeBtn} onPress={onClose}>
          <Text style={scannerStyles.closeBtnText}>CERRAR</Text>
        </Pressable>
      </View>
    );
  }

  return <CameraScanner onScanned={onScanned} checking={checking} onClose={onClose} />;
}

function CameraScanner({
  onScanned,
  checking,
  onClose,
}: {
  onScanned: (data: string) => void;
  checking: boolean;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions!();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  if (!permission?.granted) {
    return (
      <View style={scannerStyles.noCameraContainer}>
        <MaterialCommunityIcons name="camera" size={40} color="#D4AF37" />
        <Text style={scannerStyles.noCameraText}>Se necesita permiso de cámara</Text>
        <Pressable
          style={[scannerStyles.closeBtn, { backgroundColor: "#D4AF37" }]}
          onPress={requestPermission}
        >
          <Text style={[scannerStyles.closeBtnText, { color: "#000" }]}>PERMITIR CÁMARA</Text>
        </Pressable>
        <Pressable style={scannerStyles.closeBtn} onPress={onClose}>
          <Text style={scannerStyles.closeBtnText}>CERRAR</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {CameraView && (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={(result: { data: string }) => onScanned(result.data)}
        />
      )}

      <View style={scannerStyles.overlay}>
        <Pressable style={scannerStyles.backBtn} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>

        <View style={scannerStyles.scanFrame}>
          <View style={[scannerStyles.corner, scannerStyles.cornerTL]} />
          <View style={[scannerStyles.corner, scannerStyles.cornerTR]} />
          <View style={[scannerStyles.corner, scannerStyles.cornerBL]} />
          <View style={[scannerStyles.corner, scannerStyles.cornerBR]} />
        </View>

        <Text style={scannerStyles.scanText}>
          Escanea el código QR de la clase
        </Text>

        {checking && (
          <View style={scannerStyles.checkingOverlay}>
            <ActivityIndicator color="#D4AF37" size="large" />
            <Text style={scannerStyles.checkingText}>Registrando asistencia...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const fabStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 104 : 96,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(212, 175, 55, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },
});

const scannerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#D4AF37",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanText: {
    color: "#FFF",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    marginTop: 24,
    textAlign: "center",
  },
  checkingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkingText: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    marginTop: 12,
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultCard: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    borderTopWidth: 2,
    borderTopColor: "#D4AF37",
  },
  resultTitle: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 18,
    marginTop: 16,
  },
  resultClass: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    marginTop: 4,
  },
  resultTime: {
    color: "#888",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  ratingSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
  },
  ratingLabel: {
    color: "#CCC",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    marginBottom: 4,
  },
  ratingThanks: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
  },
  closeBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  closeBtnText: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  noCameraText: {
    color: "#888",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
});
