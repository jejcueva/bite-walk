import * as SQLite from 'expo-sqlite';

import { calculatePointsForWalk } from '@/lib/points';

const DATABASE_NAME = 'bitewalk.db';

type UserRow = {
  id: number;
  email: string;
  points: number;
  createdAt: string;
};

export type User = UserRow;

type DiscountRow = {
  id: number;
  title: string;
  description: string;
  pointsRequired: number;
};

export type Discount = DiscountRow;

type SeedDiscount = Omit<Discount, 'id'>;

const SEED_DISCOUNTS: SeedDiscount[] = [
  {
    title: '10% Off Coffee',
    description: 'Redeem at any partner cafe.',
    pointsRequired: 50,
  },
  {
    title: 'Free Protein Bar',
    description: 'One free protein bar from partner markets.',
    pointsRequired: 120,
  },
  {
    title: '20% Off Meal',
    description: 'Discount valid once per week at partner restaurants.',
    pointsRequired: 220,
  },
];

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS walks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      distance_miles REAL NOT NULL,
      points_earned INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      points_required INTEGER NOT NULL
    );
  `);

  const count = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(1) AS count FROM discounts'
  );

  if ((count?.count ?? 0) > 0) {
    return;
  }

  for (const discount of SEED_DISCOUNTS) {
    await database.runAsync(
      'INSERT INTO discounts (title, description, points_required) VALUES (?, ?, ?)',
      discount.title,
      discount.description,
      discount.pointsRequired
    );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmailUniqueConstraint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('UNIQUE constraint failed: users.email');
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await initializeDatabase(database);
      return database;
    });
  }

  return databasePromise;
}

export async function createUser(email: string, password: string): Promise<User> {
  const database = await getDatabase();
  const normalizedEmail = normalizeEmail(email);

  try {
    await database.runAsync(
      'INSERT INTO users (email, password, points) VALUES (?, ?, 0)',
      normalizedEmail,
      password
    );
  } catch (error) {
    if (isEmailUniqueConstraint(error)) {
      throw new Error('An account already exists for this email.');
    }

    throw error;
  }

  const user = await database.getFirstAsync<UserRow>(
    'SELECT id, email, points, created_at AS createdAt FROM users WHERE email = ?',
    normalizedEmail
  );

  if (!user) {
    throw new Error('Failed to create user.');
  }

  return user;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const database = await getDatabase();
  const normalizedEmail = normalizeEmail(email);
  const user = await database.getFirstAsync<UserRow & { password: string }>(
    'SELECT id, email, password, points, created_at AS createdAt FROM users WHERE email = ?',
    normalizedEmail
  );

  if (!user || user.password !== password) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    points: user.points,
    createdAt: user.createdAt,
  };
}

export async function getUserById(userId: number): Promise<User | null> {
  const database = await getDatabase();
  const user = await database.getFirstAsync<UserRow>(
    'SELECT id, email, points, created_at AS createdAt FROM users WHERE id = ?',
    userId
  );

  return user;
}

export async function addWalkForUser(
  userId: number,
  distanceMiles: number
): Promise<{ user: User; pointsEarned: number }> {
  const pointsEarned = calculatePointsForWalk(distanceMiles);

  if (pointsEarned <= 0) {
    throw new Error('Distance must be greater than zero.');
  }

  const database = await getDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'INSERT INTO walks (user_id, distance_miles, points_earned) VALUES (?, ?, ?)',
      userId,
      distanceMiles,
      pointsEarned
    );

    await transaction.runAsync('UPDATE users SET points = points + ? WHERE id = ?', pointsEarned, userId);
  });

  const user = await getUserById(userId);

  if (!user) {
    throw new Error('Unable to load updated user.');
  }

  return { user, pointsEarned };
}

export async function getDiscounts(): Promise<Discount[]> {
  const database = await getDatabase();
  return database.getAllAsync<DiscountRow>(
    'SELECT id, title, description, points_required AS pointsRequired FROM discounts ORDER BY points_required ASC'
  );
}
