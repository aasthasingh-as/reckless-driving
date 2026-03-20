import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppMap({ events, hotspots, initialRegion, filter, onFilterChange }: any) {
  return (
    <View style={styles.webFallback}>
      <Text style={styles.webFallbackText}>Map features are only available on Native Mobile devices.</Text>
      <Text style={styles.webFallbackSub}>Please use an Android/iOS device or emulator to view the heatmap and event pins.</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statVal}>{events.length}</Text><Text style={styles.statLab}>Events</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{hotspots.length}</Text><Text style={styles.statLab}>Risk Zones</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 20 },
  webFallbackText: { fontSize: 18, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  webFallbackSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 20 },
  statCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', minWidth: 100, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  statVal: { fontSize: 24, fontWeight: '800', color: '#2563eb' },
  statLab: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
});
