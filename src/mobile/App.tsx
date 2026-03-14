import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function App() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [serverVersion, setServerVersion] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    checkApiConnection();
    getDeviceInfo();
  }, []);

  const checkApiConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      const data = await response.json();
      setApiStatus('connected');
      setServerVersion(data.timestamp);
    } catch (error) {
      console.error('API connection failed:', error);
      setApiStatus('error');
    }
  };

  const getDeviceInfo = () => {
    setDeviceInfo({
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      osName: Device.osName,
      osVersion: Device.osVersion,
      modelName: Device.modelName,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Travel Expense Tracker</Text>
        <Text style={styles.subtitle}>Mobile Testing</Text>
      </View>

      {/* API Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend Status</Text>
        <View style={styles.statusCard}>
          <Text style={styles.label}>API URL:</Text>
          <Text style={styles.value}>{API_URL}</Text>

          <Text style={[styles.label, { marginTop: 10 }]}>Status:</Text>
          <View style={styles.statusRow}>
            {apiStatus === 'loading' && (
              <>
                <ActivityIndicator size="small" color="#FFA500" />
                <Text style={styles.statusText}>Connecting...</Text>
              </>
            )}
            {apiStatus === 'connected' && (
              <>
                <View style={styles.statusDot('green')} />
                <Text style={styles.statusText}>✓ Connected</Text>
              </>
            )}
            {apiStatus === 'error' && (
              <>
                <View style={styles.statusDot('red')} />
                <Text style={styles.statusText}>✗ Disconnected</Text>
              </>
            )}
          </View>

          {serverVersion && (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Last Sync:</Text>
              <Text style={styles.value}>{serverVersion}</Text>
            </>
          )}
        </View>
      </View>

      {/* Device Info */}
      {deviceInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.label}>Device:</Text>
            <Text style={styles.value}>{deviceInfo.brand || 'Unknown'} {deviceInfo.modelName || ''}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Manufacturer:</Text>
            <Text style={styles.value}>{deviceInfo.manufacturer || 'Unknown'}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>OS:</Text>
            <Text style={styles.value}>{deviceInfo.osName} {deviceInfo.osVersion}</Text>

            <Text style={[styles.label, { marginTop: 8 }]}>Expo Version:</Text>
            <Text style={styles.value}>{Constants.expoVersion}</Text>
          </View>
        </View>
      )}

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Features</Text>
        <View style={styles.featuresList}>
          <FeatureItem title="Trip Management" icon="✓" />
          <FeatureItem title="Expense Logging" icon="✓" />
          <FeatureItem title="Receipt Scanning (OCR)" icon="✓" />
          <FeatureItem title="Distance Tracking" icon="✓" />
          <FeatureItem title="Analytics Dashboard" icon="✓" />
        </View>
      </View>

      {/* Testing Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing Instructions</Text>
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionText}>
            1. Create a new trip from the Trips section{'\n'}
            {'\n'}
            2. Add expenses using the Expense form{'\n'}
            {'\n'}
            3. Test Receipt Scanner by uploading an image{'\n'}
            {'\n'}
            4. View trip analytics in the Dashboard{'\n'}
            {'\n'}
            5. Track distances and see cost per mile metrics
          </Text>
        </View>
      </View>

      {/* Support */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Travel Expense Tracker v0.1.0</Text>
        <Text style={styles.footerText}>Powered by React Native + Expo</Text>
      </View>
    </ScrollView>
  );
}

function FeatureItem({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: (color: string) => ({
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color,
    marginRight: 8,
  }),
  statusText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  featuresList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#27ae60',
  },
  featureTitle: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  instructionText: {
    fontSize: 13,
    color: '#34495e',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#2c3e50',
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
    marginVertical: 3,
  },
});
