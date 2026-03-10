import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';

import { useAuthSession } from '@/hooks/use-auth-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  business_name: string;
  category: string | null;
  latitude: number;
  longitude: number;
  dist_meters?: number | null;
};

const SF_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#2e8b57',
  drinks: '#3a7bd5',
  retail: '#d4832f',
  other: '#808080',
};

function markerColor(category: string | null): string {
  return CATEGORY_COLORS[(category ?? 'other').toLowerCase()] ?? CATEGORY_COLORS.other;
}

export default function MapScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const mapRef = useRef<MapView>(null);

  const [deals, setDeals] = useState<DealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<Region>(SF_REGION);

  const loadDeals = useCallback(async () => {
    if (!session?.user.id) {
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let coords: { lng: number; lat: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = { lng: loc.coords.longitude, lat: loc.coords.latitude };
          setUserRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          });
        }
      } catch {
        // Location unavailable -- use default region
      }

      const lng = coords?.lng ?? SF_REGION.longitude;
      const lat = coords?.lat ?? SF_REGION.latitude;

      const { data, error: rpcError } = await supabase.rpc('get_nearby_deals', {
        p_lng: lng,
        p_lat: lat,
        p_radius_m: 50000,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const rows: DealRow[] = data
          .filter((row: any) => row.latitude != null && row.longitude != null)
          .map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            points_cost: Number(row.points_cost),
            business_name: row.business_name,
            category: row.category,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            dist_meters: row.dist_meters != null ? Number(row.dist_meters) : null,
          }));
        setDeals(rows);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f7f65" />
        <Text style={styles.loadingText}>Finding deals nearby...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9d2f2f" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
        toolbarEnabled={false}>
        {deals.map((deal) => (
          <Marker
            key={deal.id}
            coordinate={{ latitude: deal.latitude, longitude: deal.longitude }}
            pinColor={markerColor(deal.category)}>
            <Callout
              tooltip={false}
              onPress={() => {
                router.push({ pathname: '/deal/[id]', params: { id: deal.id } });
              }}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={1}>
                  {deal.title}
                </Text>
                <Text style={styles.calloutBusiness} numberOfLines={1}>
                  {deal.business_name}
                </Text>
                <Text style={styles.calloutPoints}>{deal.points_cost} pts</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.legend}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <View key={cat} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{cat[0].toUpperCase() + cat.slice(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d9ece5',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d9ece5',
    gap: 12,
  },
  loadingText: {
    color: '#366b58',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#9d2f2f',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  callout: {
    minWidth: 160,
    maxWidth: 220,
    padding: 8,
    gap: 2,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  calloutBusiness: {
    fontSize: 13,
    color: '#366b58',
  },
  calloutPoints: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2f7f65',
    marginTop: 2,
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(238, 247, 242, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4c3e',
  },
});
