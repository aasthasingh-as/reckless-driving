import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return Alert.alert("Error", "Fill all fields");
    }

    setLoading(true);
    const success = await login(trimmedEmail, password);
    setLoading(false);

    if (!success) {
      Alert.alert("Login Failed", "Invalid credentials or network error");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to DriverAnalytics</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log In</Text>}
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.push('/register')}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f4f7fb' },
  title: { fontSize: 32, fontWeight: '800', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 40, textAlign: 'center' },
  input: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#4b5563', fontSize: 15, fontWeight: '600' }
});