import React from 'react';
import MapView, { Marker, Circle } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

export default function AppMap({ events, hotspots, initialRegion, filter, getPinColor }: any) {
  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      {/* Overlay Inferred High-Risk Zones */}
      {filter === 'All' && hotspots.map((zone: any, idx: number) => (
        <React.Fragment key={`hotspot-${idx}`}>
          <Circle
            center={{ latitude: zone.centerLatitude, longitude: zone.centerLongitude }}
            radius={zone.radius}
            fillColor={zone.severityScore === 'Critical Risk' ? "rgba(153, 27, 27, 0.3)" : "rgba(220, 38, 38, 0.2)"}
            strokeColor={zone.severityScore === 'Critical Risk' ? "rgba(153, 27, 27, 0.8)" : "rgba(220, 38, 38, 0.6)"}
            strokeWidth={2}
          />
          <Marker
            tracksViewChanges={false}
            coordinate={{ latitude: zone.centerLatitude, longitude: zone.centerLongitude }}
            title={`⚠️ ${zone.severityScore} Zone`}
            description={`${zone.eventCount} Events | Dominant: ${zone.dominantEventType}`}
            pinColor="#000000"
            opacity={0.7}
          />
        </React.Fragment>
      ))}

      {/* Overlay Precise Event Nodes */}
      {events.map((evt: any, idx: number) => (
        <Marker
          key={evt._id || idx}
          coordinate={{ latitude: evt.location.latitude, longitude: evt.location.longitude }}
          title={evt.eventType}
          description={`Recorded: ${new Date(evt.timestamp).toLocaleString(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}`}
          pinColor={getPinColor ? getPinColor(evt.eventType) : '#3b82f6'}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
});
