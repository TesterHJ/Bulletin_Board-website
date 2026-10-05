import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

export async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!uri) {
    throw new Error('환경변수 MONGODB_URI가 설정되지 않았습니다.');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}