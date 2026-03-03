import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_STORAGE_KEY = 'bitewalk.session';

export type StoredSession = {
  userId: number;
};

export async function saveStoredSession(session: StoredSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function readStoredSession(): Promise<StoredSession | null> {
  const rawSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawSession);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'userId' in parsed &&
      typeof parsed.userId === 'number'
    ) {
      return { userId: parsed.userId };
    }

    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  } catch {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}
