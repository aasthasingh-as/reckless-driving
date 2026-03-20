import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "http://192.168.58.165:5001/api";

type AuthContextType = {
  user: any;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (
    email: string,
    pass: string,
    name: string,
    familyContact?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.log("Error loading auth from storage:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStorage();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass,
        }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);

        try {
          await AsyncStorage.setItem("token", data.token);
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        } catch (storageErr) {
          console.log("Error saving login to storage:", storageErr);
        }

        return true;
      }

      console.log("Login failed:", data.message || data);
      return false;
    } catch (error) {
      console.log("LOGIN FETCH ERROR:", error);
      return false;
    }
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    familyContact?: string
  ) => {
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password: pass,
        name: name.trim(),
        familyContact: familyContact?.trim() || "",
      };

      console.log("REGISTER REQUEST:", payload);

      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      console.log("REGISTER RAW RESPONSE:", rawText);

      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        console.log("REGISTER JSON PARSE ERROR:", parseError);
      }

      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);

        try {
          await AsyncStorage.setItem("token", data.token);
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        } catch (storageErr) {
          console.log("Error saving registration to storage:", storageErr);
        }

        return true;
      }

      console.log("Register failed:", {
        status: res.status,
        statusText: res.statusText,
        data,
      });

      return false;
    } catch (error) {
      console.log("REGISTER FETCH ERROR:", error);
      return false;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);

    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (err) {
      console.log("Error clearing auth storage:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};