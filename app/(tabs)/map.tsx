import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Platform } from 'react-native';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import AppMap from '../../components/AppMap';

export default function GlobalMapScreen() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, hotspotsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/events`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/events/hotspots`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const eventsData = await eventsRes.json();
        const hotspotsData = await hotspotsRes.json();

        if (eventsData.success) {
          setEvents(eventsData.events.filter((e: any) => e.location && e.location.latitude && e.location.latitude !== 0));
        }
        if (hotspotsData.success) {
          setHotspots(hotspotsData.hotspots);
        }
      } catch (err) { }
      setLoading(false);
    };

    fetchData();
  }, [token]);

  const filteredEvents = useMemo(() => {
    if (filter === 'All') return events;
    return events.filter(e => e.eventType.toLowerCase().includes(filter.toLowerCase()));
  }, [events, filter]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  let initialRegion = { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  if (events.length > 0) {
    initialRegion = {
      latitude: events[0].location.latitude,
      longitude: events[0].location.longitude,
      latitudeDelta: 0.2, 
      longitudeDelta: 0.2,
    };
  }

  const getPinColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('braking')) return '#f59e0b';
    if (t.includes('accel')) return '#ef4444';
    if (t.includes('speed')) return '#3b82f6';
    if (t.includes('turn')) return '#8b5cf6';
    return '#6b7280';
  };

  const mapFilters = ['All', 'Braking', 'Acceleration', 'Speed', 'Turn'];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Driving Risk Map</Text>
      <Text style={styles.subheading}>Analyzing inferred accident-prone networks</Text>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {mapFilters.map(f => (
            <Pressable 
              key={f} 
              style={[styles.filterBtn, filter === f && styles.activeFilterBtn]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.mapContainer}>
        <AppMap 
          events={filteredEvents}
          hotspots={hotspots}
          initialRegion={initialRegion}
          filter={filter}
          getPinColor={getPinColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fb' },
  container: { flex: 1, backgroundColor: '#f4f7fb', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  heading: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subheading: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  
  filterWrapper: { marginBottom: 16 },
  filterRow: { gap: 10, paddingRight: 20 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeFilterBtn: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563'
  },
  activeFilterText: {
    color: '#ffffff'
  },

  mapContainer: { flex: 1, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, backgroundColor: 'white' },
  map: { width: '100%', height: '100%' },
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 20 },
  webFallbackText: { fontSize: 18, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  webFallbackSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 20 },
  statCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', minWidth: 100, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  statVal: { fontSize: 24, fontWeight: '800', color: '#2563eb' },
  statLab: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
});
