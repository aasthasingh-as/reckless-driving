import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";

export default function HomeScreen() {
  const [accData, setAccData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });

  const [event, setEvent] = useState("No Event");
  const [monitoring, setMonitoring] = useState(false);

  const [accSubscription, setAccSubscription] = useState<any>(null);
  const [gyroSubscription, setGyroSubscription] = useState<any>(null);

  const [eventLog, setEventLog] = useState<string[]>([]);
  const [lastEventTime, setLastEventTime] = useState(0);

  const ACC_THRESHOLD = 1.8;
  const BRAKE_THRESHOLD = -1.2;
  const ACCEL_THRESHOLD = 1.2;
  const TURN_THRESHOLD = 1.5;
  const COOLDOWN_MS = 2500;

  const addEventToLog = (newEvent: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    setEventLog((prev) => [`${timeString} - ${newEvent}`, ...prev.slice(0, 4)]);
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
    if (now - lastEventTime < COOLDOWN_MS) return;

    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const turnStrength = Math.sqrt(gx * gx + gy * gy + gz * gz);

    if (turnStrength > TURN_THRESHOLD) {
      const detected = " Sharp Turn Detected";
      setEvent(detected);
      addEventToLog(detected);
      setLastEventTime(now);
      return;
    }

    if (y < BRAKE_THRESHOLD && magnitude > ACC_THRESHOLD) {
      const detected = " Harsh Braking Detected";
      setEvent(detected);
      addEventToLog(detected);
      setLastEventTime(now);
      return;
    }

    if (y > ACCEL_THRESHOLD && magnitude > ACC_THRESHOLD) {
      const detected = " Sudden Acceleration Detected";
      setEvent(detected);
      addEventToLog(detected);
      setLastEventTime(now);
      return;
    }

    setEvent(" Safe Driving");
  };

  const startMonitoring = () => {
    if (monitoring) return;

    setMonitoring(true);
    setEvent("Monitoring Started");

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

    setGyroSubscription(gyroSub);
    setAccSubscription(accSub);
  };

  const stopMonitoring = () => {
    accSubscription?.remove();
    gyroSubscription?.remove();

    setAccSubscription(null);
    setGyroSubscription(null);

    setMonitoring(false);
    setEvent("Monitoring Stopped");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Smart Driving Monitor</Text>
      <Text style={styles.subheading}>Advanced Sensor Detection Prototype</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Status</Text>
        <Text style={styles.eventText}>{event}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accelerometer</Text>
        <Text style={styles.valueText}>X: {accData.x.toFixed(2)}</Text>
        <Text style={styles.valueText}>Y: {accData.y.toFixed(2)}</Text>
        <Text style={styles.valueText}>Z: {accData.z.toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gyroscope</Text>
        <Text style={styles.valueText}>X: {gyroData.x.toFixed(2)}</Text>
        <Text style={styles.valueText}>Y: {gyroData.y.toFixed(2)}</Text>
        <Text style={styles.valueText}>Z: {gyroData.z.toFixed(2)}</Text>
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

      {!monitoring ? (
        <Pressable style={styles.startButton} onPress={startMonitoring}>
          <Text style={styles.buttonText}>Start Driving</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.stopButton} onPress={stopMonitoring}>
          <Text style={styles.buttonText}>Stop Driving</Text>
        </Pressable>
      )}
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
  valueText: {
    fontSize: 16,
    marginBottom: 6,
    color: "#374151",
  },
  logText: {
    fontSize: 15,
    marginBottom: 6,
    color: "#1d4ed8",
  },
  startButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  stopButton: {
    width: "100%",
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
});
