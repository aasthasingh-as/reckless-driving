import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, ScrollView, Dimensions, Switch } from 'react-native';
import { useAuth, API_BASE_URL } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import { PieChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function ProfileScreen() {
  const { user, token, logout } = useAuth(); 
  const [contacts, setContacts] = useState<any[]>(user?.emergencyContacts || []);
  const [loadingContact, setLoadingContact] = useState(false);
  
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {}
    setLoadingStats(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [])
  );

  const addContact = () => {
    setContacts([...contacts, { name: '', phone: '', notifyOnCrash: true, notifyOnLowScore: false, notifyOnRiskZone: false }]);
  };

  const removeContact = (idx: number) => {
    const fresh = [...contacts];
    fresh.splice(idx, 1);
    setContacts(fresh);
  };

  const updateContactNode = (idx: number, key: string, value: any) => {
    const fresh = [...contacts];
    fresh[idx][key] = value;
    setContacts(fresh);
  };

  const saveContacts = async () => {
    setLoadingContact(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ emergencyContacts: contacts })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Emergency Security Policies saved!");
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error updating profile.");
    }
    setLoadingContact(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Driver Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || "Driver"}</Text>

        <Text style={styles.label}>Email Address</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      <Text style={styles.sectionHeading}>Driving Analytics</Text>
      
      {loadingStats ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 20 }} />
      ) : stats ? (
        <View style={styles.analyticsCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Lifetime Safety Score</Text>
            <Text style={[styles.scoreValue, { color: stats.avgSafetyScore >= 70 ? '#16a34a' : '#dc2626' }]}>
              {stats.avgSafetyScore}/100
            </Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{stats.totalTrips}</Text>
              <Text style={styles.statBoxLabel}>Trips</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{stats.totalDrivingMinutes}m</Text>
              <Text style={styles.statBoxLabel}>Drive Time</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{stats.highestSpeed}</Text>
              <Text style={styles.statBoxLabel}>Top Speed (km/h)</Text>
            </View>
          </View>

          <View style={styles.rowList}>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Harsh Braking Events</Text>
              <Text style={styles.listValue}>{stats.totalBrakingEvents}</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Rapid Acceleration Events</Text>
              <Text style={styles.listValue}>{stats.totalAccelEvents}</Text>
            </View>
            <View style={styles.listItem}>
              <Text style={styles.listLabel}>Risky Trips</Text>
              <Text style={[styles.listValue, { color: stats.riskyTripsCount > 0 ? '#dc2626' : '#1f2937' }]}>
                {stats.riskyTripsCount}
              </Text>
            </View>
          </View>

          {stats.charts && stats.charts.eventsByType && stats.charts.eventsByType.length > 0 && (
            <View style={styles.chartBlock}>
              <Text style={styles.chartTitle}>Event Distribution</Text>
              <PieChart
                data={stats.charts.eventsByType}
                width={screenWidth - 88}
                height={120}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"0"}
                hasLegend={true}
                absolute
              />
            </View>
          )}

          {stats.charts && stats.charts.topSpeedTrend && stats.charts.topSpeedTrend.length > 0 && (
            <View style={styles.chartBlock}>
              <Text style={styles.chartTitle}>Top Speed Trend (km/h)</Text>
              <LineChart
                data={{
                  labels: stats.charts.trendLabels.slice(-4),
                  datasets: [{ data: stats.charts.topSpeedTrend.slice(-4) }] // Just showing recent
                }}
                width={screenWidth - 88}
                height={120}
                withDots={true}
                withInnerLines={false}
                yAxisSuffix=""
                yAxisLabel=""
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                }}
                bezier
                style={{ borderRadius: 12, marginTop: 10, alignSelf: 'center', marginLeft: -20 }}
              />
            </View>
          )}

          <View style={styles.insightsBox}>
            <Text style={styles.insightsHeader}>✨ AI Driving Insights</Text>
            {stats.insights && stats.insights.length > 0 ? (
              stats.insights.map((insight: string, idx: number) => (
                <Text key={idx} style={styles.insightText}>• {insight}</Text>
              ))
            ) : (
              <Text style={styles.insightText}>Not enough data to generate insights yet.</Text>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.description}>Analytics unavailable.</Text>
      )}

      <Text style={styles.sectionHeading}>Emergency Automation Policies</Text>
      <Text style={styles.description}>Establish trusted contacts and automatic SOS parameters</Text>

      {contacts.map((contact, idx) => (
        <View key={idx} style={[styles.card, { borderColor: '#e5e7eb', borderWidth: 1 }]}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={styles.label}>Identity Node #{idx + 1}</Text>
            <Pressable onPress={() => removeContact(idx)}>
              <Text style={{color: '#ef4444', fontWeight: 'bold'}}>Remove</Text>
            </Pressable>
          </View>

          <TextInput style={styles.input} value={contact.name} onChangeText={(val) => updateContactNode(idx, 'name', val)} placeholder="Name (e.g. John Doe)" placeholderTextColor="#9ca3af" />
          <TextInput style={styles.input} value={contact.phone} onChangeText={(val) => updateContactNode(idx, 'phone', val)} placeholder="Phone Number" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-Alert on Major Crash Event</Text>
            <Switch trackColor={{ false: "#d1d5db", true: "#2563eb" }} value={contact.notifyOnCrash} onValueChange={(val) => updateContactNode(idx, 'notifyOnCrash', val)} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-Alert on High Risk Geo-Zone</Text>
            <Switch trackColor={{ false: "#d1d5db", true: "#2563eb" }} value={contact.notifyOnRiskZone} onValueChange={(val) => updateContactNode(idx, 'notifyOnRiskZone', val)} />
          </View>
        </View>
      ))}

      <Pressable style={styles.addBtn} onPress={addContact}>
        <Text style={styles.addBtnText}>+ Add Security Contact</Text>
      </Pressable>

      <Pressable style={styles.saveBtn} onPress={saveContacts} disabled={loadingContact}>
        {loadingContact ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Export Configurations</Text>}
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb', padding: 24, paddingTop: 60 },
  heading: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 24, textAlign: 'center' },
  sectionHeading: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 12 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8 },
  analyticsCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.08, shadowRadius: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
  value: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  description: { fontSize: 14, color: '#4b5563', marginBottom: 16, lineHeight: 20 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', padding: 14, borderRadius: 12, fontSize: 16, color: '#111827', marginBottom: 12 },
  addBtn: { padding: 14, borderRadius: 12, alignItems: 'center', borderColor: '#d1d5db', borderWidth: 1, borderStyle: 'dashed', marginBottom: 16 },
  addBtnText: { color: '#4b5563', fontWeight: '700', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  logoutBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  logoutBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 18 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  switchLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },

  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 16 },
  scoreLabel: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  scoreValue: { fontSize: 28, fontWeight: '800' },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginHorizontal: 4 },
  statBoxValue: { fontSize: 20, fontWeight: '800', color: '#2563eb', marginBottom: 4 },
  statBoxLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center' },

  rowList: { marginBottom: 16 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listLabel: { fontSize: 15, color: '#4b5563', fontWeight: '500' },
  listValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },

  chartBlock: { marginTop: 16, marginBottom: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#4b5563', marginBottom: 12 },

  insightsBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginTop: 16 },
  insightsHeader: { fontSize: 15, fontWeight: '800', color: '#1e3a8a', marginBottom: 8 },
  insightText: { fontSize: 14, color: '#1e40af', marginBottom: 6, lineHeight: 20, fontWeight: '500' },
});
