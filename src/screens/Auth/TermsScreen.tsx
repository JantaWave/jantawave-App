import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getTerms } from "../../api/auth";
import Toast from "react-native-toast-message";

export default function TermsScreen() {
  const router = useRouter();
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const data = await getTerms();
      console.log("User Data: ", data);
      setTerms(data.content || "Terms and Conditions content goes here...");
    } catch (error) {
      console.error("Error fetching terms:", error);
      setTerms("Failed to load terms and conditions. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    router.push("/auth/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>JantaWave</Text>
        <Text style={styles.subtitle}>Terms & Conditions</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2196F3"
            style={styles.loader}
          />
        ) : (
          <Text style={styles.termsText}>{terms}</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>Accept & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#252525",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2196F3",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#ffffff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loader: {
    marginTop: 40,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#cccccc",
  },
  footer: {
    padding: 20,
    backgroundColor: "#252525",
  },
  acceptButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
