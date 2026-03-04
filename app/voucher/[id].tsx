import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function VoucherScreen() {
  const params = useLocalSearchParams<{
    id: string;
    qr_data?: string;
    expires_at?: string;
    deal_title?: string;
    business_name?: string;
  }>();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  const expiresAt = params.expires_at ? new Date(params.expires_at).getTime() : 0;

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setExpired(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const qrValue = params.qr_data ?? params.id ?? '';
  const displayTime =
    secondsLeft !== null
      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
      : '--:--';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Your voucher</Text>
        {params.deal_title ? (
          <Text style={styles.dealName}>{params.deal_title}</Text>
        ) : null}
        {params.business_name ? (
          <Text style={styles.businessName}>{params.business_name}</Text>
        ) : null}

        <View style={[styles.qrWrap, expired && styles.qrWrapExpired]}>
          {qrValue ? (
            <QRCode value={qrValue} size={200} backgroundColor="#fff" color="#0f4a38" />
          ) : (
            <Text style={styles.qrPlaceholder}>No QR data</Text>
          )}
        </View>

        {expired ? (
          <Text style={styles.expiredText}>This voucher has expired.</Text>
        ) : (
          <Text style={styles.timerText}>Expires in {displayTime}</Text>
        )}

        <Pressable style={styles.doneBtn} onPress={() => router.replace('/(tabs)/discounts')}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d9ece5' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1d4c3e', marginBottom: 8 },
  dealName: { fontSize: 18, fontWeight: '600', color: '#1d4c3e', marginBottom: 4 },
  businessName: { fontSize: 16, color: '#4b6f62', marginBottom: 24 },
  qrWrap: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  qrWrapExpired: { opacity: 0.6 },
  qrPlaceholder: { width: 200, height: 200, textAlign: 'center', lineHeight: 200, color: '#4b6f62' },
  timerText: { fontSize: 16, color: '#366b58', fontWeight: '600', marginBottom: 8 },
  expiredText: { fontSize: 16, color: '#992b2b', fontWeight: '600', marginBottom: 8 },
  doneBtn: {
    marginTop: 24,
    backgroundColor: '#2f7f65',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 26,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
