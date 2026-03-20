import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Modal, ActivityIndicator } from "react-native";

const API_BASE_URL = "http://localhost:5000/api"; // Adjust to IP for physical device

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [tripEvents, setTripEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Fetch all trips using GET /api/trips
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/trips`);
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips);
      }
    } catch (err) {
      console.log("Failed to fetch trips", err);
    }
    setLoading(false);
  };

  // Run on mount
  useEffect(() => {
    fetchTrips();
  }, []);

  // Fetch events on press
  const openTripDetails = async (trip: any) => {
    setSelectedTrip(trip);
    setEventsLoading(true);
    setTripEvents([]); // Clear previous events
    try {
      const res = await fetch(`${API_BASE_URL}/trips/${trip._id}/events`);
      const data = await res.json();
      if (data.success) {
        setTripEvents(data.events);
      }
    } catch (err) {
      console.log("Failed to fetch events", err);
    }
    setEventsLoading(false);
  };

  const closeDetails = () => {
    setSelectedTrip(null);
    setTripEvents([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Trip History</Text>
      <Text style={styles.subheading}>Review your past drives</Text>

      <Pressable onPress={fetchTrips} style={styles.refreshBtn}>
        <Text style={styles.refreshText}>↻ Refresh Trips</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>No trips logged yet. Start driving!</Text>
          ) : (
            trips.map((trip) => (
              <Pressable key={trip._id} style={styles.card} onPress={() => openTripDetails(trip)}>
                <Text style={styles.dateText}>{new Date(trip.startTime).toLocaleString()}</Text>
                
                <View style={styles.row}>
                  <Text style={styles.statLabel}>Score:</Text>
                  <Text style={[styles.statValue, { color: trip.finalSafetyScore >= 70 ? "#16a34a" : "#dc2626" }]}>
                    {trip.finalSafetyScore}/100
                  </Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.statLabel}>Top Speed:</Text>
                  <Text style={styles.statValue}>{trip.topSpeed.toFixed(1)} km/h</Text>
                </View>

                <Text style={styles.tapText}>Tap to view events →</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Deep-Dive Trip Details Modal */}
      <Modal visible={!!selectedTrip} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>Trip Details</Text>
            
            {selectedTrip && (
              <>
                <Text style={styles.modalDate}>{new Date(selectedTrip.startTime).toLocaleString()}</Text>
                <View style={styles.row}>
                  <Text style={styles.statLabel}>Final Score:</Text>
                  <Text style={[styles.statValue, { color: selectedTrip.finalSafetyScore >= 70 ? "#16a34a" : "#dc2626" }]}>
                    {selectedTrip.finalSafetyScore}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.statLabel}>Top Speed:</Text>
                  <Text style={[styles.statValue]}>{selectedTrip.topSpeed.toFixed(1)} km/h</Text>
                </View>
                
                <Text style={styles.eventsHeading}>Timeline of Events ({tripEvents.length})</Text>
                
                <ScrollView style={styles.eventsList}>
                  {eventsLoading ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : tripEvents.length === 0 ? (
                    <Text style={styles.perfectTrip}>Perfect Trip! No unsafe events.</Text>
                  ) : (
                    tripEvents.map((evt: any, idx) => (
                      <View key={evt._id || idx} style={styles.eventRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.eventName}>{evt.eventType}</Text>
                          {evt.speed !== undefined && (
                            <Text style={styles.eventMeta}>{evt.speed.toFixed(1)} km/h</Text>
                          )}
                        </View>
                        <Text style={styles.eventTime}>{new Date(evt.timestamp).toLocaleTimeString()}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
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
    elevation: 3,
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
});
