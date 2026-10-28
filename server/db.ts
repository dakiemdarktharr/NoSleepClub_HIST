import { MongoClient, type Db } from 'mongodb';
let connection: Promise<Db> | undefined;
export function database() {
  if (!connection) connection = (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('DATABASE_NOT_CONFIGURED');
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'nosleepclub_hist');
    await Promise.all([
      db.collection('workspaces').createIndex({ roomId: 1 }, { unique: true }),
      db.collection('footages').createIndex({ footageId: 1 }, { unique: true }),
      db.collection('footages').createIndex({ roomId: 1, createdAt: -1 }),
      db.collection('chunks').createIndex({ footageId: 1, n: 1 }, { unique: true }),
      db.collection('frames').createIndex({ footageId: 1, n: 1 }, { unique: true }),
      db.collection('limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('limits').createIndex({ bucket: 1 }, { unique: true }),
      db.collection('quota').createIndex({ key: 1 }, { unique: true }),
      db.collection('maps_cache').createIndex({ key: 1 }, { unique: true }),
      db.collection('maps_cache').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return db;
  })().catch(error => { connection = undefined; throw error; });
  return connection;
}
