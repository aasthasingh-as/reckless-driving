import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Alert } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";
import * as Location from "expo-location";

export default function HomeScreen() {
  const [accData, setAccData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });

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

  const ACC_MAGNITUDE_THRESHOLD = 1.55;
  const BRAKE_THRESHOLD = -1.0;
  const ACCEL_THRESHOLD = 1.0;
  const TURN_THRESHOLD = 2.8;
  const SPEED_LIMIT = 50;
  const COOLDOWN_MS = 2500;
  const DUPLICATE_EVENT_BLOCK_MS = 3000;

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
      const detected = "🛑 Harsh Braking Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(10);
      return;
    }

    if (y > ACCEL_THRESHOLD && motionStrength > ACC_MAGNITUDE_THRESHOLD) {
      const detected = "🚀 Sudden Acceleration Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(8);
      return;
    }

    if (Math.abs(gz) > TURN_THRESHOLD && turnStrength > TURN_THRESHOLD) {
      const detected = "↩️ Sharp Turn Detected";
      setEvent(detected);
      const added = addEventToLog(detected);
      if (added) updateSafetyScore(6);
      return;
    }

    setEvent("✅ Safe Driving");
  };

  const handleSpeedDetection = (speedKmh: number) => {
    if (speedKmh > SPEED_LIMIT) {
      const detected = "🚨 Overspeed Detected";
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

    Accelerometer.setUpdateInterval(300);
    Gyroscope.setUpdateInterval(300);

    let latestGyro = { x: 0, y: 0, z: 0 };

    const gyroSub = Gyroscope.addListener((gyroReading) => {
      latestGyro = gyroReading;
      setGyroData(gyroReading);
    });

    const accSub = Accelerometer.addListener((accReading) => {
      const { x, y, z } = accReading;
      setAccData(accReading);

      handleDetection(
        x,
        y,
        z,
        latestGyro.x,
        latestGyro.y,
        latestGyro.z
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
        setSpeed(currentSpeedKmh);

        setTopSpeed((prev) => (currentSpeedKmh > prev ? currentSpeedKmh : prev));

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
    setAccData({ x: 0, y: 0, z: 0 });
    setGyroData({ x: 0, y: 0, z: 0 });
    setAccMagnitude(0);
    setGyroMagnitude(0);
    setSpeed(0);
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
        <Text style={styles.cardTitle}>Current Location</Text>
        <Text style={styles.valueText}>Latitude: {location.latitude.toFixed(5)}</Text>
        <Text style={styles.valueText}>Longitude: {location.longitude.toFixed(5)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accelerometer</Text>
        <Text style={styles.valueText}>X: {accData.x.toFixed(2)}</Text>
        <Text style={styles.valueText}>Y: {accData.y.toFixed(2)}</Text>
        <Text style={styles.valueText}>Z: {accData.z.toFixed(2)}</Text>
        <Text style={styles.metricText}>
          Motion Strength: {accMagnitude.toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gyroscope</Text>
        <Text style={styles.valueText}>X: {gyroData.x.toFixed(2)}</Text>
        <Text style={styles.valueText}>Y: {gyroData.y.toFixed(2)}</Text>
        <Text style={styles.valueText}>Z: {gyroData.z.toFixed(2)}</Text>
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
});
