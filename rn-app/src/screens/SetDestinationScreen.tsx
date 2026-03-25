import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { updateDestination } from '../services/meetingService';

type Props = NativeStackScreenProps<RootStackParamList, 'SetDestination'>;

export default function SetDestinationScreen({ route, navigation }: Props) {
  const { sessionId, role, currentLocation } = route.params;

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);

  const handleMapPress = (e: MapPressEvent) => {
    setSelectedLocation(e.nativeEvent.coordinate);
  };

  const handleConfirm = async () => {
    if (!selectedLocation) {
      Alert.alert('目的地未選択', 'マップをタップして目的地を選択してください。');
      return;
    }
    setSaving(true);
    try {
      await updateDestination(sessionId, role, {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        timestamp: Date.now(),
      });
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={18} color="#1976D2" />
        <Text style={styles.hintText}>マップをタップして目的地を選択してください</Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={handleMapPress}
      >
        {/* 現在地 */}
        <Marker
          coordinate={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          }}
          title="現在地"
          pinColor="#4CAF50"
        />

        {/* 選択した目的地 */}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="目的地"
            pinColor="#2196F3"
            draggable
            onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
          />
        )}
      </MapView>

      {/* 確定ボタン */}
      <View style={styles.footer}>
        {selectedLocation && (
          <Text style={styles.coordText}>
            目的地: {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.confirmButton, (!selectedLocation || saving) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedLocation || saving}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.confirmButtonText}>{saving ? '保存中...' : '目的地を確定'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    gap: 6,
  },
  hintText: { fontSize: 13, color: '#1976D2', flex: 1 },
  map: { flex: 1 },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  coordText: { fontSize: 12, color: '#888', textAlign: 'center' },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
