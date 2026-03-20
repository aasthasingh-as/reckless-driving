import React, { useState, useRef, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, Dimensions, Modal, Linking, Platform } from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";
import * as Location from "expo-location";
import { LineChart } from "react-native-chart-kit";
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const { token, user } = useAuth();
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

  const [stats, setStats] = useState<any>(null);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);

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
    radius: 15,
  };

  const fetchDashboardData = async () => {
    try {
      const [resStats, resTrips] = await Promise.all([
        fetch(`${API_BASE_URL}/users/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/trips`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const dataStats = await resStats.json();
      const dataTrips = await resTrips.json();

      if (dataStats.success) setStats(dataStats.stats);
      if (dataTrips.success) setRecentTrips(dataTrips.trips.slice(0, 3));
    } catch (err) {
      console.log("Failed to fetch dashboard data:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!monitoring && token) fetchDashboardData();
    }, [monitoring, token])
  );

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          tripId: tripIdRef.current,
          eventType: newEvent,
          speed: latestSpeedRef.current,
          location: {
            latitude: latestLocationRef.current.latitude,
            longitude: latestLocationRef.current.longitude,
          },
        }),
      }).catch((err) => console.log("Failed to log event:", err));
    }

    setTripEventCounts((prev) => ({
      ...prev,
      [newEvent]: (prev[newEvent] || 0) + 1,
    }));

    return true;
  };

  const confirmSOS = () => {
    Alert.alert(
      "DEPLOY EXTENSION SOS?",
      "Only deploy an SOS in a true emergency. This will alert all your configured contacts with your live location.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "DEPLOY SOS", style: "destructive", onPress: handleSOS }
      ]
    );
  };

  const handleSOS = async () => {
    const currentLocation = latestLocationRef.current || { latitude: 0, longitude: 0 };
    const currentSpeed = latestSpeedRef.current || 0;

    try {
      await fetch(`${API_BASE_URL}/alerts/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          location: currentLocation,
          speed: currentSpeed,
          tripId: tripIdRef.current
        })
      });
    } catch (err) {
      console.log("Failed to execute backend SOS pipeline.");
    }

    if (user?.emergencyContacts && user.emergencyContacts.length > 0) {
      const numbers = user.emergencyContacts.map((c: any) => c.phone).filter(Boolean).join(",");
      const msg = `[SOS ALERT] My harsh driving detector indicates an emergency! I need help. Lat: ${currentLocation?.latitude}, Lon: ${currentLocation?.longitude}`;

      const url = Platform.OS === "ios" ? `sms:${numbers}&body=${msg}` : `sms:${numbers}?body=${msg}`;
      Linking.openURL(url).catch((err) => console.log("Failed to open SMS", err));

      Alert.alert("SOS Protocol Deployed!", "Global alerts and messages have been dispatched.");
    } else {
      Alert.alert("SOS Logged Internally!", "We alerted the backend, but you haven't added any SMS emergency nodes in your Profile configurations!");
    }
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
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
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

        const isInsideZone = dist <= DEMO_ZONE.radius;

        if (isInsideZone && !inZoneRef.current) {
          inZoneRef.current = true;
          setInZone(true);
          addEventToLog("Geofence Entered");
        } else if (!isInsideZone && inZoneRef.current) {
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
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          topSpeed: topSpeed,
          finalSafetyScore: safetyScore,
        }),
      }).catch((err) => console.log("Failed to end trip on backend:", err));
      tripIdRef.current = null;
    }

    const durationSec = tripStartTime ? Math.floor((Date.now() - tripStartTime) / 1000) : 0;
    const durationStr =
      durationSec > 60 ? `${(durationSec / 60).toFixed(1)} mins` : `${durationSec} secs`;
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

  const closeSummary = () => {
    setSummaryModalVisible(false);
    clearHistory();
  };

  const triggerEmergency = () => {
    const phoneNumber = user?.familyContact || "911";
    const body = `EMERGENCY ALERT: I may have been in a harsh driving incident or need assistance. My last known location is https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    Linking.openURL(`sms:${phoneNumber}?body=${encodeURIComponent(body)}`).catch(() => {
      Alert.alert("Error", "Failed to open SMS app.");
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!monitoring ? (
        <View style={styles.idleContainer}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Good Morning,</Text>
              <Text style={styles.userName}>{user?.name || "Driver"}</Text>
            </View>
            <Pressable onPress={triggerEmergency} style={styles.headerSosBtn}>
              <Text style={styles.headerSosText}>SOS</Text>
            </Pressable>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Avg Score</Text>
              <Text style={[styles.statBoxValue, { color: (stats?.avgSafetyScore || 100) >= 70 ? "#16a34a" : "#dc2626" }]}>
                {stats?.avgSafetyScore ?? "--"}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Total Trips</Text>
              <Text style={styles.statBoxValue}>{stats?.totalTrips || 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Alerts</Text>
              <Text style={styles.statBoxValue}>{stats?.totalEvents || 0}</Text>
            </View>
          </View>

          <Text style={styles.sectionHeader}>Trend Summary</Text>
          <View style={[styles.card, { paddingHorizontal: 0, paddingVertical: 16 }]}>
            <Text style={[styles.cardTitle, { marginLeft: 20 }]}>Safety Score Progression</Text>
            {stats && stats.charts && stats.charts.safetyScoreTrend.length > 0 ? (
              <LineChart
                data={{
                  labels: stats.charts.trendLabels,
                  datasets: [{ data: stats.charts.safetyScoreTrend }]
                }}
                width={screenWidth - 48}
                height={160}
                withDots={true}
                withInnerLines={false}
                yAxisSuffix=""
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#16a34a" },
                }}
                bezier
                style={{ borderRadius: 12, marginTop: 10, alignSelf: "center" }}
              />
            ) : (
              <Text style={[styles.emptyText, { marginLeft: 20 }]}>Complete your first trip to fuel data!</Text>
            )}
          </View>

          {stats && stats.recentEvents && stats.recentEvents.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Recent Alerts</Text>
              <View style={[styles.card, { padding: 16 }]}>
                {stats.recentEvents.map((evt: any, i: number) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                      borderBottomColor: "#f3f4f6",
                      borderBottomWidth: i === stats.recentEvents.length - 1 ? 0 : 1
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: evt.eventType.includes("Geofence") ? "#f59e0b" : "#dc2626" }}>
                        {evt.eventType}
                      </Text>
                      {evt.speed !== undefined && (
                        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {evt.speed.toFixed(1)} km/h
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: "#9ca3af", alignSelf: "center" }}>
                      {new Date(evt.timestamp).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Pressable style={styles.massiveStartBtn} onPress={startMonitoring}>
            <Text style={styles.massiveStartText}>START TRIP</Text>
          </Pressable>

          <Text style={styles.sectionHeader}>Recent Trips</Text>
          {recentTrips.length === 0 ? (
            <Text style={styles.emptyText}>No recent trips found.</Text>
          ) : (
            recentTrips.map((trip) => (
              <View key={trip._id} style={styles.miniTripCard}>
                <Text style={styles.miniTripDate}>
                  {new Date(trip.startTime).toLocaleDateString()}{" "}
                  {new Date(trip.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Text style={[styles.miniTripScore, { color: trip.finalSafetyScore >= 70 ? "#16a34a" : "#dc2626" }]}>
                  Score: {trip.finalSafetyScore}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.activeContainer}>
          <View style={styles.activeHeaderRow}>
            <Text style={styles.pulsingText}>🔴 LIVE TRACKING</Text>
            <Text style={styles.limitText}>Limit: {SPEED_LIMIT} km/h</Text>
          </View>

          <Pressable style={styles.massiveStopBtn} onPress={stopMonitoring}>
            <Text style={styles.massiveStartText}>STOP RECORDING</Text>
          </Pressable>

          <Pressable style={styles.sosSecondaryBtn} onPress={confirmSOS}>
            <Text style={styles.sosSecondaryText}>DEPLOY SOS</Text>
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status Radar</Text>
            <Text style={[styles.eventText, { color: event === "Safe Driving" ? "#16a34a" : "#dc2626" }]}>
              {event}
            </Text>
            <Text style={styles.metricText}>Current Score: {safetyScore}/100</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.card, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
              <Text style={styles.cardTitle}>Speed</Text>
              <Text style={styles.speedText}>
                {speed.toFixed(0)} <Text style={{ fontSize: 16 }}>km/h</Text>
              </Text>
            </View>
            <View style={[styles.card, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>
              <Text style={styles.cardTitle}>Top</Text>
              <Text style={[styles.speedText, { color: "#4b5563" }]}>
                {topSpeed.toFixed(0)} <Text style={{ fontSize: 16 }}>km/h</Text>
              </Text>
            </View>
          </View>

          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.cardTitle}>Geofence Status</Text>
            <Text style={[styles.valueText, { color: inZone ? "#dc2626" : "#16a34a", fontWeight: "700" }]}>
              {inZone ? "Inside Risk Zone" : "Outside Risk Zone"}
            </Text>
            <Text style={styles.metricText}>Distance: {distanceToZone.toFixed(0)}m</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Velocity Trend</Text>
            <LineChart
              data={{ labels: [], datasets: [{ data: speedHistory }] }}
              width={screenWidth - 88}
              height={140}
              withDots={true}
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (o = 1) => `rgba(37, 99, 235, ${o})`,
                labelColor: (o = 1) => `rgba(107, 114, 128, ${o})`,
                propsForDots: { r: "3", strokeWidth: "2", stroke: "#2563eb" },
              }}
              bezier
              style={{ borderRadius: 12, marginTop: 10 }}
            />
          </View>
        </View>
      )}

      <Modal visible={isSummaryVisible} animationType="slide" transparent={true}>
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
  container: { flexGrow: 1, backgroundColor: "#f4f7fb", padding: 24, paddingTop: 60 },
  idleContainer: { flex: 1 },
  activeContainer: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { fontSize: 16, color: "#6b7280", fontWeight: "500" },
  userName: { fontSize: 28, color: "#111827", fontWeight: "800" },
  headerSosBtn: { backgroundColor: "#ef4444", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  headerSosText: { color: "white", fontWeight: "800" },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: "white", padding: 16, borderRadius: 16, alignItems: "center", marginHorizontal: 4, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  statBoxLabel: { fontSize: 12, color: "#6b7280", fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  statBoxValue: { fontSize: 22, fontWeight: "800", color: "#1f2937" },
  insightCard: { backgroundColor: "#dbeafe", padding: 20, borderRadius: 16, marginBottom: 24 },
  insightTitle: { fontSize: 16, color: "#1e40af", fontWeight: "800", marginBottom: 8 },
  insightText: { fontSize: 14, color: "#2563eb", lineHeight: 20 },
  massiveStartBtn: { backgroundColor: "#16a34a", paddingVertical: 20, borderRadius: 20, alignItems: "center", marginBottom: 32, elevation: 6, shadowColor: "#16a34a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  massiveStartText: { color: "white", fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  massiveStopBtn: { backgroundColor: "#dc2626", paddingVertical: 20, borderRadius: 20, alignItems: "center", marginBottom: 20, elevation: 6, shadowColor: "#dc2626", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  sectionHeader: { fontSize: 18, color: "#374151", fontWeight: "700", marginBottom: 12 },
  emptyText: { color: "#6b7280", fontSize: 15 },
  miniTripCard: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 10, elevation: 2 },
  miniTripDate: { fontSize: 15, color: "#1f2937", fontWeight: "600" },
  miniTripScore: { fontSize: 15, fontWeight: "800" },

  activeHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pulsingText: { fontSize: 18, color: "#dc2626", fontWeight: "800" },
  limitText: { fontSize: 15, color: "#4b5563", fontWeight: "600" },

  card: { width: "100%", backgroundColor: "white", padding: 20, borderRadius: 16, marginBottom: 16, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: 8 },
  eventText: { fontSize: 24, fontWeight: "800", color: "#dc2626" },
  speedText: { fontSize: 36, fontWeight: "800", color: "#2563eb" },
  valueText: { fontSize: 16, marginBottom: 4, color: "#374151" },
  metricText: { fontSize: 14, marginTop: 4, fontWeight: "600", color: "#6b7280" },
  row: { flexDirection: "row", width: "100%" },

  sosSecondaryBtn: {
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#991b1b",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
  },
  sosSecondaryText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 24, maxHeight: "80%", elevation: 10 },
  modalHeading: { fontSize: 26, fontWeight: "800", color: "#1f2937", marginBottom: 20, textAlign: "center" },
  modalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  modalLabel: { fontSize: 18, color: "#4b5563", fontWeight: "600" },
  modalValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalSectionTitle: { fontSize: 20, fontWeight: "700", color: "#374151", marginTop: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 8 },
  eventsList: { maxHeight: 180 },
  eventRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  eventName: { fontSize: 15, color: "#dc2626", flex: 1 },
  eventCount: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginLeft: 10 },
  modalCloseButton: { backgroundColor: "#16a34a", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "white", fontSize: 17, fontWeight: "600" }
});