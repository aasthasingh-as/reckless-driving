import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFamilyContact = familyContact.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      return Alert.alert("Error", "Please fill required fields (Name, Email, Password)");
    }

    setLoading(true);
    const success = await register(trimmedEmail, password, trimmedName, trimmedFamilyContact);
    setLoading(false);

    if (!success) {
      Alert.alert("Registration Failed", "User might already exist or internet error.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Start monitoring your driving habits securely</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name (Required)"
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email (Required)"
        placeholderTextColor="#9ca3af"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password (Required)"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Family Contact # (Optional)"
        placeholderTextColor="#9ca3af"
        keyboardType="phone-pad"
        value={familyContact}
        onChangeText={setFamilyContact}
      />

      <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.push('/login')}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f4f7fb' },
  title: { fontSize: 32, fontWeight: '800', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#16a34a', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#4b5563', fontSize: 15, fontWeight: '600' }
});