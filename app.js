import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { Accelerometer } from "expo-sensors";

export default function App() {

  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [subscription, setSubscription] = useState(null);
  const [event, setEvent] = useState("No Event");
  const [monitoring, setMonitoring] = useState(false);

  const THRESHOLD = 1.5;

  const subscribe = () => {
    const sub = Accelerometer.addListener(accelerometerData => {
      setData(accelerometerData);

      const magnitude = Math.sqrt(
        accelerometerData.x ** 2 +
        accelerometerData.y ** 2 +
        accelerometerData.z ** 2
      );

      if (magnitude > THRESHOLD) {
        setEvent("⚠️ Harsh Driving Detected");
      } else {
        setEvent("Safe Driving");
      }
    });

    setSubscription(sub);
  };

  const unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const startMonitoring = () => {
    setMonitoring(true);
    subscribe();
  };

  const stopMonitoring = () => {
    setMonitoring(false);
    unsubscribe();
    setEvent("No Event");
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Smart Driving Monitor
      </Text>

      <Text style={styles.event}>
        {event}
      </Text>

      <Text>X: {data.x.toFixed(2)}</Text>
      <Text>Y: {data.y.toFixed(2)}</Text>
      <Text>Z: {data.z.toFixed(2)}</Text>

      <View style={{ marginTop: 20 }}>

        {!monitoring ? (
          <Button
            title="Start Driving"
            onPress={startMonitoring}
          />
        ) : (
          <Button
            title="Stop Driving"
            onPress={stopMonitoring}
          />
        )}

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center"
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30
  },

  event: {
    fontSize: 20,
    marginBottom: 20,
    color: "red"
  }

});