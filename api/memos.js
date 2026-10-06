import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const memosCollection = db.collection('memos');

    // 1. 메모 목록 조회 (GET)
    if (req.method === 'GET') {
      const memos = await memosCollection
        .find({})
        .sort({ createdAt: -1 }) // 최신순 정렬
        .toArray();

      return res.status(200).json(memos);
    }

    // 2. 새 메모 등록 (POST)
    if (req.method === 'POST') {
      const { title, content, color, author } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 모두 입력해 주세요.' });
      }

      const newMemo = {
        title: title.trim(),
        content: content.trim(),
        color: color || '#FEF9C3', // 기본값: 노랑
        author: author || '익명',
        createdAt: new Date(),
        views: 0,
        likes: 0,
        comments: []
      };

      const result = await memosCollection.insertOne(newMemo);
      return res.status(201).json({ success: true, insertedId: result.insertedId });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}