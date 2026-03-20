import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Share,
} from "react-native";
import { useAuth, API_BASE_URL } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";

// IMPORTANT:
// Uncomment these only after react-native-maps is fully working in your build
// import MapView, { Marker } from "react-native-maps";

export default function ExploreScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripEvents, setTripEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const { token } = useAuth();

  const formatDuration = (start: string, end?: string) => {
    const startMs = new Date(start).getTime();
    const endMs = end ? new Date(end).getTime() : Date.now();
    const durationSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    return durationSec > 60
      ? `${(durationSec / 60).toFixed(1)} mins`
      : `${durationSec} secs`;
  };

  const fetchTrips = async () => {
    // Avoid double loading if already loading
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trips`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips || []);
      }
    } catch (err) {
      console.log("Failed to fetch trips", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const openTripDetails = async (trip: any) => {
    setSelectedTrip(trip);
    setEventsLoading(true);
    setTripEvents([]);

    try {
      const res = await fetch(`${API_BASE_URL}/trips/${trip._id}/events`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json();
      if (data.success) {
        setTripEvents(data.events || []);
      }
    } catch (err) {
      console.log("Failed to fetch events", err);
    } finally {
      setEventsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedTrip(null);
    setTripEvents([]);
  };

  const shareTrip = async (trip: any) => {
    if (!trip) return;

    try {
      const durationStr = formatDuration(trip.startTime, trip.endTime);
      const date = new Date(trip.startTime).toLocaleDateString();

      const message = `🚗 Drive Report (${date})\n\nFinal Safety Score: ${
        trip.finalSafetyScore ?? 100
      }/100\nTop Speed: ${
        trip.topSpeed ? trip.topSpeed.toFixed(1) : 0
      } km/h\nDuration: ${durationStr}\nUnsafe Events: ${
        trip.eventCount || 0
      }\n\nTracked securely by Harsh Driving Detector.`;

      await Share.share({
        message,
        title: "My Driving Report",
      });
    } catch (error) {
      console.log("Error launching OS share component", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Trip History</Text>
      <Text style={styles.subheading}>Review your past drives</Text>

      <Pressable onPress={fetchTrips} style={styles.refreshBtn}>
        <Text style={styles.refreshText}>↻ Refresh Trips</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2563eb"
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>
              No trips logged yet. Start driving!
            </Text>
          ) : (
            trips.map((trip) => {
              const score = trip.finalSafetyScore ?? 100;
              const riskLabel =
                score >= 80 ? "Safe" : score >= 50 ? "Moderate" : "Risky";
              const riskColor =
                riskLabel === "Safe"
                  ? "#16a34a"
                  : riskLabel === "Moderate"
                  ? "#f59e0b"
                  : "#dc2626";

              const durationStr = trip.endTime
                ? formatDuration(trip.startTime, trip.endTime)
                : "Active";

              return (
                <Pressable
                  key={trip._id}
                  style={styles.card}
                  onPress={() => openTripDetails(trip)}
                >
                  <View style={styles.row}>
                    <Text style={styles.dateText}>
                      {new Date(trip.startTime).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>

                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: riskColor + "20" },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: riskColor }]}>
                        {riskLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Score:</Text>
                    <Text style={[styles.statValue, { color: riskColor }]}>
                      {score}/100
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Top Speed:</Text>
                    <Text style={styles.statValue}>
                      {trip.topSpeed ? trip.topSpeed.toFixed(1) : 0} km/h
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Duration:</Text>
                    <Text style={styles.statValue}>{durationStr}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Alerts:</Text>
                    <Text style={styles.statValue}>
                      {trip.eventCount !== undefined ? trip.eventCount : "--"}
                    </Text>
                  </View>

                  <Text style={styles.tapText}>Tap to view details →</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={!!selectedTrip} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Trip Details</Text>

            {selectedTrip && (() => {
              const durationStr = formatDuration(
                selectedTrip.startTime,
                selectedTrip.endTime
              );

              const breakdown: Record<string, number> = {};
              tripEvents.forEach((e) => {
                if (e.eventType !== "Safe Driving") {
                  breakdown[e.eventType] = (breakdown[e.eventType] || 0) + 1;
                }
              });

              const mappedEvents = tripEvents.filter(
                (evt) =>
                  evt.location &&
                  typeof evt.location.latitude === "number" &&
                  typeof evt.location.longitude === "number" &&
                  evt.location.latitude !== 0 &&
                  evt.location.longitude !== 0
              );

              return (
                <>
                  <Text style={styles.modalDate}>
                    {new Date(selectedTrip.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {selectedTrip.endTime
                      ? new Date(selectedTrip.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Active"}
                  </Text>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Final Score:</Text>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color:
                            (selectedTrip.finalSafetyScore ?? 100) >= 70
                              ? "#16a34a"
                              : "#dc2626",
                        },
                      ]}
                    >
                      {selectedTrip.finalSafetyScore ?? 100}/100
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Top Speed:</Text>
                    <Text style={styles.statValue}>
                      {selectedTrip.topSpeed
                        ? selectedTrip.topSpeed.toFixed(1)
                        : 0}{" "}
                      km/h
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.statLabel}>Duration:</Text>
                    <Text style={styles.statValue}>
                      {selectedTrip.endTime ? durationStr : "In Progress"}
                    </Text>
                  </View>

                  <Text style={styles.eventsHeading}>Event Breakdown</Text>
                  {eventsLoading ? (
                    <ActivityIndicator size="small" />
                  ) : Object.keys(breakdown).length > 0 ? (
                    Object.entries(breakdown).map(([name, count]) => (
                      <View key={name} style={styles.row}>
                        <Text
                          style={{
                            color: "#4b5563",
                            fontSize: 15,
                            fontWeight: "500",
                          }}
                        >
                          {name}
                        </Text>
                        <Text
                          style={{
                            fontWeight: "700",
                            fontSize: 16,
                            color: "#1f2937",
                          }}
                        >
                          {count}x
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.perfectTrip}>
                      No Unsafe Events Triggered.
                    </Text>
                  )}

                  <Text style={styles.eventsHeading}>
                    Incident Map ({mappedEvents.length})
                  </Text>

                  <View style={styles.mapPlaceholder}>
                    <Text style={styles.mapPlaceholderTitle}>
                      Map preview disabled in current build
                    </Text>
                    <Text style={styles.mapPlaceholderText}>
                      Events with location: {mappedEvents.length}
                    </Text>
                    {mappedEvents.length > 0 && (
                      <Text style={styles.mapPlaceholderText}>
                        First point: {mappedEvents[0].location.latitude.toFixed(5)}
                        , {mappedEvents[0].location.longitude.toFixed(5)}
                      </Text>
                    )}
                  </View>

                  <ScrollView style={styles.eventsList}>
                    {eventsLoading ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : tripEvents.length === 0 ? (
                      <Text style={styles.noDataText}>
                        No timeline data available.
                      </Text>
                    ) : (
                      tripEvents.map((evt: any, idx) => (
                        <View key={evt._id || idx} style={styles.eventRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventName}>{evt.eventType}</Text>
                            {evt.speed !== undefined ? (
                              <Text style={styles.eventMeta}>
                                {evt.speed.toFixed(1)} km/h
                              </Text>
                            ) : null}
                            {evt.location &&
                            typeof evt.location.latitude === "number" &&
                            typeof evt.location.longitude === "number" ? (
                              <Text style={styles.eventLocation}>
                                {evt.location.latitude.toFixed(5)},{" "}
                                {evt.location.longitude.toFixed(5)}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.eventTime}>
                            {new Date(evt.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </>
              );
            })()}

            <Pressable
              style={styles.shareBtn}
              onPress={() => shareTrip(selectedTrip)}
            >
              <Text style={styles.shareBtnText}>➦ Share Trip Report</Text>
            </Pressable>

            <Pressable style={styles.closeBtn} onPress={closeDetails}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
    padding: 24,
    paddingTop: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  subheading: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  refreshBtn: {
    alignSelf: "center",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  refreshText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
    fontSize: 16,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  tapText: {
    marginTop: 12,
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
    textAlign: "right",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    maxHeight: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHeading: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
  },
  modalDate: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  eventsHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  mapPlaceholder: {
    width: "100%",
    minHeight: 120,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    padding: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
  eventsList: {
    maxHeight: 250,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  eventName: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "700",
  },
  eventMeta: {
    fontSize: 14,
    color: "#2563eb",
    marginTop: 2,
    fontWeight: "600",
  },
  eventLocation: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  eventTime: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  perfectTrip: {
    textAlign: "center",
    color: "#16a34a",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
  },
  noDataText: {
    textAlign: "center",
    marginVertical: 10,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  closeBtn: {
    backgroundColor: "#1f2937",
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    alignItems: "center",
  },
  closeBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  shareBtn: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  shareBtnText: {
    color: "#2563eb",
    fontWeight: "800",
    fontSize: 16,
  },
});