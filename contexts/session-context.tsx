import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addWalkForUser,
  authenticateUser,
  createUser,
  getDiscounts,
  getUserById,
  type Discount,
  type User,
} from '@/lib/database';
import { clearStoredSession, readStoredSession, saveStoredSession } from '@/lib/session-storage';

type Credentials = {
  email: string;
  password: string;
};

type SessionContextValue = {
  isReady: boolean;
  user: User | null;
  discounts: Discount[];
  signUp: (credentials: Credentials) => Promise<void>;
  logIn: (credentials: Credentials) => Promise<void>;
  logOut: () => Promise<void>;
  addWalk: (distanceMiles: number) => Promise<number>;
  refreshDiscounts: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const refreshDiscounts = useCallback(async () => {
    const availableDiscounts = await getDiscounts();
    setDiscounts(availableDiscounts);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await refreshDiscounts();
        const session = await readStoredSession();

        if (!session) {
          return;
        }

        const existingUser = await getUserById(session.userId);

        if (!existingUser) {
          await clearStoredSession();
          return;
        }

        if (mounted) {
          setUser(existingUser);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [refreshDiscounts]);

  const signUp = useCallback(async ({ email, password }: Credentials) => {
    const createdUser = await createUser(email, password);
    setUser(createdUser);
    await saveStoredSession({ userId: createdUser.id });
  }, []);

  const logIn = useCallback(async ({ email, password }: Credentials) => {
    const authenticatedUser = await authenticateUser(email, password);

    if (!authenticatedUser) {
      throw new Error('Invalid email or password.');
    }

    setUser(authenticatedUser);
    await saveStoredSession({ userId: authenticatedUser.id });
  }, []);

  const logOut = useCallback(async () => {
    setUser(null);
    await clearStoredSession();
  }, []);

  const addWalk = useCallback(
    async (distanceMiles: number) => {
      if (!user) {
        throw new Error('You must be logged in to add a walk.');
      }

      const result = await addWalkForUser(user.id, distanceMiles);
      setUser(result.user);
      return result.pointsEarned;
    },
    [user]
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      isReady,
      user,
      discounts,
      signUp,
      logIn,
      logOut,
      addWalk,
      refreshDiscounts,
    }),
    [addWalk, discounts, isReady, logIn, logOut, refreshDiscounts, signUp, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within a SessionProvider.');
  }

  return context;
}
