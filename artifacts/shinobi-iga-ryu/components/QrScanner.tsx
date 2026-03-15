import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
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

export default function QrScannerButton() {
  const { isAuthenticated } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    className: string;
    classId: number;
    checkedInAt: string;
  } | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  if (!isAuthenticated || Platform.OS === "web") return null;

  const handleBarCodeScanned = async (data: string) => {
    if (scanned || checking) return;
    setScanned(true);
    setChecking(true);

    try {
      const res = await classesApi.scan(data);
      setResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrar asistencia";
      Alert.alert("Error", msg);
      setScanned(false);
    } finally {
      setChecking(false);
    }
  };

  const handleRate = async (r: number) => {
    setRating(r);
    if (result) {
      try {
        await classesApi.rate(result.classId, r);
        setRatingSubmitted(true);
      } catch {
        Alert.alert("Error", "No se pudo enviar la calificación");
      }
    }
  };

  const closeAll = () => {
    setShowScanner(false);
    setScanned(false);
    setResult(null);
    setRating(0);
    setRatingSubmitted(false);
  };

  return (
    <>
      <Pressable style={fabStyles.fab} onPress={() => setShowScanner(true)}>
        <MaterialCommunityIcons name="qrcode-scan" size={24} color="#000" />
      </Pressable>

      <Modal visible={showScanner} animationType="slide" onRequestClose={closeAll}>
        <View style={scannerStyles.container}>
          {result ? (
            <View style={scannerStyles.resultContainer}>
              <View style={scannerStyles.resultCard}>
                <MaterialCommunityIcons name="check-circle" size={60} color="#D4AF37" />
                <Text style={scannerStyles.resultTitle}>¡Asistencia Registrada!</Text>
                <Text style={scannerStyles.resultClass}>{result.className}</Text>
                <Text style={scannerStyles.resultTime}>
                  {new Date(result.checkedInAt).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>

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

                <Pressable style={scannerStyles.closeBtn} onPress={closeAll}>
                  <Text style={scannerStyles.closeBtnText}>CERRAR</Text>
                </Pressable>
              </View>
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
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
