import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const memosCollection = db.collection('memos');

    // 1. 전체 메모 조회 (GET)
    if (req.method === 'GET') {
      const memos = await memosCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(memos);
    }

    // 2. 새 메모 등록 (POST) - 로그인 필수
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, content, color, author, ownerUsername } = body || {};

      if (!ownerUsername) {
        return res.status(401).json({ error: '로그인한 회원만 메모를 작성할 수 있습니다.' });
      }

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 모두 입력해 주세요.' });
      }

      const newMemo = {
        title: title.trim(),
        content: content.trim(),
        color: color || '#FEF9C3',
        author: (author || '익명').trim(),
        ownerUsername: ownerUsername.trim(),
        views: 0,
        likes: 0,
        likedUsers: [],
        comments: [],
        createdAt: new Date()
      };

      const result = await memosCollection.insertOne(newMemo);
      return res.status(201).json({ success: true, insertedId: result.insertedId });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}