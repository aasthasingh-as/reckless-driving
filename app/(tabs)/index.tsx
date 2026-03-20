import React, { useState, useRef } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, Dimensions, Modal } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";
import * as Location from "expo-location";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const [accData, setAccData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });

  const [smoothedAcc, setSmoothedAcc] = useState({ x: 0, y: 0, z: 0 });
  const [smoothedGyro, setSmoothedGyro] = useState({ x: 0, y: 0, z: 0 });

  const [event, setEvent] = useState("No Event");
  const [monitoring, setMonitoring] = useState(false);

  const [accSubscription, setAccSubscription] = useState<any>(null);
  const [gyroSubscription, setGyroSubscription] = useState<any>(null);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  const [eventLog, setEventLog] = useState<string[]>([]);
  const [lastEventTime, setLastEventTime] = useState(0);
  const [lastEventName, setLastEventName] = useState("");

  const [accMagnitude, setAccMagnitude] = useState(0);
  const [gyroMagnitude, setGyroMagnitude] = useState(0);

  const [speed, setSpeed] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0);
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });

  const [safetyScore, setSafetyScore] = useState(100);
  const [speedHistory, setSpeedHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [inZone, setInZone] = useState(false);
  const [distanceToZone, setDistanceToZone] = useState(0);

  const [isSummaryVisible, setSummaryModalVisible] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const [tripEventCounts, setTripEventCounts] = useState<Record<string, number>>({});
  const [finalTripStats, setFinalTripStats] = useState({
    duration: "0 secs",
    topSpeed: 0,
    safetyScore: 100,
    totalEvents: 0
  });

  const inZoneRef = useRef(false);
  const tripIdRef = useRef<string | null>(null);
  const latestSpeedRef = useRef(0);
  const latestLocationRef = useRef({ latitude: 0, longitude: 0 });
  const API_BASE_URL = "http://192.168.58.165:5001/api";

  const smoothedAccRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedGyroRef = useRef({ x: 0, y: 0, z: 0 });
  const ALPHA = 0.3;

  const ACC_MAGNITUDE_THRESHOLD = 1.45;
  const BRAKE_THRESHOLD = -0.8;
  const ACCEL_THRESHOLD = 0.8;
  const TURN_THRESHOLD = 2.2;
  const SPEED_LIMIT = 50;
  const COOLDOWN_MS = 2500;
  const DUPLICATE_EVENT_BLOCK_MS = 3000;

  const DEMO_ZONE = {
    latitude: 28.3905803,
    longitude: 77.4162184,
    radius: 15, // meters
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const formatTimestamp = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const updateSafetyScore = (points: number) => {
    setSafetyScore((prev) => Math.max(0, prev - points));
  };

  const addEventToLog = (newEvent: string) => {
    const now = Date.now();

    if (
      newEvent === lastEventName &&
      now - lastEventTime < DUPLICATE_EVENT_BLOCK_MS
    ) {
      return false;
    }

    const timeString = formatTimestamp();
    setEventLog((prev) => [`${timeString} - ${newEvent}`, ...prev.slice(0, 9)]);
    setLastEventName(newEvent);
    setLastEventTime(now);

    if (tripIdRef.current) {
      fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: tripIdRef.current,
          eventType: newEvent,
          speed: latestSpeedRef.current,
          latitude: latestLocationRef.current.latitude,
          longitude: latestLocationRef.current.longitude,
        }),
      }).catch((err) => console.log("Failed to log event:", err));
    }

    setTripEventCounts((prev) => ({
      ...prev,
      [newEvent]: (prev[newEvent] || 0) + 1,
    }));

    return true;
  };

  const handleDetection = (
    x: number,
    y: number,
    z: number,
    gx: number,
    gy: number,
    gz: number
  ) => {
    const now = Date.now();

    const motionStrength = Math.sqrt(x * x + y * y + z * z);
    const turnStrength = Math.sqrt(gx * gx + gy * gy + gz * gz);

    setAccMagnitude(motionStrength);
    setGyroMagnitude(turnStrength);

    if (now - lastEventTime < COOLDOWN_MS) {
      return;
    }

    if (y < BRAKE_THRESHOLD && motionStrength > ACC_MAGNITUDE_THRESHOLD) {
      const detected = "Harsh Braking Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(10);
      return;
    }

    if (y > ACCEL_THRESHOLD && motionStrength > ACC_MAGNITUDE_THRESHOLD) {
      const detected = "Sudden Acceleration Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(8);
      return;
    }

    if (Math.abs(gz) > TURN_THRESHOLD && turnStrength > TURN_THRESHOLD) {
      const detected = "↩Sharp Turn Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(6);
      return;
    }

    setEvent("Safe Driving");
  };

  const handleSpeedDetection = (speedKmh: number) => {
    if (speedKmh > SPEED_LIMIT) {
      const detected = "Overspeed Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(12);
      return;
    }
  };

  const startMonitoring = async () => {
    if (monitoring) return;

    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required for speed tracking.");
      return;
    }

    setMonitoring(true);
    setEvent("Monitoring Started");
    setSafetyScore(100);
    setTopSpeed(0);
    setSpeedHistory([0, 0, 0, 0, 0, 0]);
    setTripStartTime(Date.now());
    setTripEventCounts({});

    try {
      const response = await fetch(`${API_BASE_URL}/trips/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        tripIdRef.current = data.trip._id;
      }
    } catch (err) {
      console.log("Failed to start trip on backend:", err);
    }

    Accelerometer.setUpdateInterval(300);
    Gyroscope.setUpdateInterval(300);

    const gyroSub = Gyroscope.addListener((gyroReading) => {
      setGyroData(gyroReading);

      const prev = smoothedGyroRef.current;
      smoothedGyroRef.current = {
        x: ALPHA * gyroReading.x + (1 - ALPHA) * prev.x,
        y: ALPHA * gyroReading.y + (1 - ALPHA) * prev.y,
        z: ALPHA * gyroReading.z + (1 - ALPHA) * prev.z,
      };
      setSmoothedGyro(smoothedGyroRef.current);
    });

    const accSub = Accelerometer.addListener((accReading) => {
      setAccData(accReading);

      const prev = smoothedAccRef.current;
      const smoothX = ALPHA * accReading.x + (1 - ALPHA) * prev.x;
      const smoothY = ALPHA * accReading.y + (1 - ALPHA) * prev.y;
      const smoothZ = ALPHA * accReading.z + (1 - ALPHA) * prev.z;

      smoothedAccRef.current = { x: smoothX, y: smoothY, z: smoothZ };
      setSmoothedAcc(smoothedAccRef.current);

      handleDetection(
        smoothX,
        smoothY,
        smoothZ,
        smoothedGyroRef.current.x,
        smoothedGyroRef.current.y,
        smoothedGyroRef.current.z
      );
    });

    const locSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (loc) => {
        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;
        const currentSpeedMps = loc.coords.speed ?? 0;

        const currentSpeedKmh = Math.max(0, currentSpeedMps * 3.6);

        setLocation({ latitude, longitude });
        latestLocationRef.current = { latitude, longitude };
        setSpeed(currentSpeedKmh);
        latestSpeedRef.current = currentSpeedKmh;

        setTopSpeed((prev) => (currentSpeedKmh > prev ? currentSpeedKmh : prev));

        setSpeedHistory((prev) => {
          const next = [...prev, currentSpeedKmh];
          if (next.length > 8) next.shift();
          return next;
        });

        const dist = getDistance(latitude, longitude, DEMO_ZONE.latitude, DEMO_ZONE.longitude);
        setDistanceToZone(dist);

        if (dist >= DEMO_ZONE.radius && inZoneRef.current) {
          inZoneRef.current = true;
          setInZone(true);
          addEventToLog("Geofence Entered");
        } else if (dist < DEMO_ZONE.radius && !inZoneRef.current) {
          inZoneRef.current = false;
          setInZone(false);
          addEventToLog("Geofence Exited");
        }

        handleSpeedDetection(currentSpeedKmh);
      }
    );

    setGyroSubscription(gyroSub);
    setAccSubscription(accSub);
    setLocationSubscription(locSub);
  };

  const stopMonitoring = () => {
    accSubscription?.remove();
    gyroSubscription?.remove();
    locationSubscription?.remove();

    setAccSubscription(null);
    setGyroSubscription(null);
    setLocationSubscription(null);

    setMonitoring(false);
    setEvent("Monitoring Stopped");

    if (tripIdRef.current) {
      fetch(`${API_BASE_URL}/trips/end/${tripIdRef.current}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topSpeed: topSpeed,
          finalSafetyScore: safetyScore,
        }),
      }).catch((err) => console.log("Failed to end trip on backend:", err));
      tripIdRef.current = null;
    }

    const durationSec = tripStartTime ? Math.floor((Date.now() - tripStartTime) / 1000) : 0;
    const durationStr = durationSec > 60 
      ? `${(durationSec / 60).toFixed(1)} mins`
      : `${durationSec} secs`;
    const totalEvents = Object.values(tripEventCounts).reduce((acc, count) => acc + count, 0);

    setFinalTripStats({
      duration: durationStr,
      topSpeed: topSpeed,
      safetyScore: safetyScore,
      totalEvents: totalEvents
    });
    setSummaryModalVisible(true);

    setAccData({ x: 0, y: 0, z: 0 });
    setGyroData({ x: 0, y: 0, z: 0 });
    setSmoothedAcc({ x: 0, y: 0, z: 0 });
    setSmoothedGyro({ x: 0, y: 0, z: 0 });
    smoothedAccRef.current = { x: 0, y: 0, z: 0 };
    smoothedGyroRef.current = { x: 0, y: 0, z: 0 };
    setAccMagnitude(0);
    setGyroMagnitude(0);
    setSpeed(0);
    setSpeedHistory([0, 0, 0, 0, 0, 0]);
    setDistanceToZone(0);
    setInZone(false);
    inZoneRef.current = false;
  };

  const clearHistory = () => {
    setEventLog([]);
    setLastEventName("");
    setLastEventTime(0);
    setSafetyScore(100);
  };

  const getScoreLabel = () => {
    if (safetyScore >= 85) return "Excellent";
    if (safetyScore >= 70) return "Good";
    if (safetyScore >= 50) return "Risky";
    return "Dangerous";
  };

  const closeSummary = () => {
    setSummaryModalVisible(false);
    clearHistory();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Smart Driving Monitor</Text>
      <Text style={styles.subheading}>Sensor + GPS Safety Prototype</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Status</Text>
        <Text style={styles.eventText}>{event}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Safety Score</Text>
        <Text style={styles.scoreText}>{safetyScore}/100</Text>
        <Text style={styles.metricText}>Driver Status: {getScoreLabel()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Speed</Text>
        <Text style={styles.speedText}>{speed.toFixed(1)} km/h</Text>
        <Text style={styles.metricText}>Top Speed: {topSpeed.toFixed(1)} km/h</Text>
        <Text style={styles.metricText}>Speed Limit: {SPEED_LIMIT} km/h</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Speed Trend (km/h)</Text>
        <LineChart
          data={{
            labels: [],
            datasets: [{ data: speedHistory }],
          }}
          width={screenWidth - 84}
          height={180}
          withDots={true}
          withInnerLines={false}
          withOuterLines={false}
          withHorizontalLabels={true}
          withVerticalLabels={false}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#2563eb",
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Location</Text>
        <Text style={styles.valueText}>Latitude: {location.latitude.toFixed(5)}</Text>
        <Text style={styles.valueText}>Longitude: {location.longitude.toFixed(5)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Geofence Status</Text>
        <Text style={[styles.valueText, { color: inZone ? "#dc2626" : "#16a34a", fontWeight: "700" }]}>
          {inZone ? "Inside Risk Zone" : "Outside Risk Zone"}
        </Text>
        <Text style={styles.metricText}>Distance to center: {distanceToZone.toFixed(0)}m</Text>
        <Text style={styles.valueText}>Radius: {DEMO_ZONE.radius}m</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accelerometer (Smoothed)</Text>
        <Text style={styles.valueText}>X: {smoothedAcc.x.toFixed(2)}</Text>
        <Text style={styles.valueText}>Y: {smoothedAcc.y.toFixed(2)}</Text>
        <Text style={styles.valueText}>Z: {smoothedAcc.z.toFixed(2)}</Text>
        <Text style={styles.metricText}>
          Motion Strength: {accMagnitude.toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gyroscope (Smoothed)</Text>
        <Text style={styles.valueText}>X: {smoothedGyro.x.toFixed(2)}</Text>
        <Text style={styles.valueText}>Y: {smoothedGyro.y.toFixed(2)}</Text>
        <Text style={styles.valueText}>Z: {smoothedGyro.z.toFixed(2)}</Text>
        <Text style={styles.metricText}>
          Turn Strength: {gyroMagnitude.toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Events</Text>
        {eventLog.length === 0 ? (
          <Text style={styles.valueText}>No events detected yet</Text>
        ) : (
          eventLog.map((item, index) => (
            <Text key={index} style={styles.logText}>
              {item}
            </Text>
          ))
        )}
      </View>

      <View style={styles.row}>
        {!monitoring ? (
          <Pressable style={styles.startButton} onPress={startMonitoring}>
            <Text style={styles.buttonText}>Start Driving</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.stopButton} onPress={stopMonitoring}>
            <Text style={styles.buttonText}>Stop Driving</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.clearButton} onPress={clearHistory}>
        <Text style={styles.buttonText}>Clear Event History</Text>
      </Pressable>

      <Modal
        visible={isSummaryVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Trip Summary</Text>
            
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Duration:</Text>
              <Text style={styles.modalValue}>{finalTripStats.duration}</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Top Speed:</Text>
              <Text style={styles.modalValue}>{finalTripStats.topSpeed.toFixed(1)} km/h</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Final Safety Score:</Text>
              <Text style={[styles.modalValue, { color: finalTripStats.safetyScore >= 70 ? "#16a34a" : "#dc2626" }]}>
                {finalTripStats.safetyScore}/100
              </Text>
            </View>

            <Text style={styles.modalSectionTitle}>Event log ({finalTripStats.totalEvents})</Text>
            
            <ScrollView style={styles.eventsList}>
              {Object.keys(tripEventCounts).length === 0 ? (
                <Text style={styles.metricText}>Perfect Trip! No unsafe events.</Text>
              ) : (
                Object.entries(tripEventCounts).map(([eventName, count]) => (
                  <View key={eventName} style={styles.eventRow}>
                    <Text style={styles.eventName}>{eventName}</Text>
                    <Text style={styles.eventCount}>x{count}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable style={styles.modalCloseButton} onPress={closeSummary}>
              <Text style={styles.buttonText}>Close & Start New Trip</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f4f7fb",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: "#1f2937",
  },
  subheading: {
    fontSize: 16,
    marginBottom: 24,
    color: "#6b7280",
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827",
  },
  eventText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#dc2626",
  },
  scoreText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#16a34a",
    marginBottom: 6,
  },
  speedText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2563eb",
    marginBottom: 6,
  },
  valueText: {
    fontSize: 16,
    marginBottom: 6,
    color: "#374151",
  },
  metricText: {
    fontSize: 15,
    marginTop: 8,
    fontWeight: "600",
    color: "#2563eb",
  },
  logText: {
    fontSize: 15,
    marginBottom: 6,
    color: "#1d4ed8",
  },
  row: {
    width: "100%",
    marginTop: 8,
  },
  startButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  stopButton: {
    width: "100%",
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  clearButton: {
    width: "100%",
    backgroundColor: "#6b7280",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    maxHeight: "80%",
    elevation: 10,
  },
  modalHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 18,
    color: "#4b5563",
    fontWeight: "600",
  },
  modalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  eventsList: {
    maxHeight: 180,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  eventName: {
    fontSize: 15,
    color: "#dc2626",
    flex: 1,
  },
  eventCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginLeft: 10,
  },
  modalCloseButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },
});
