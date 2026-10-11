import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const memosCollection = db.collection('memos');

    // GET: 전체 메모 목록
    if (req.method === 'GET') {
      const memos = await memosCollection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(memos);
    }

    // POST: 신규 메모 생성
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, content, color, author, isAdmin } = body || {};

      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: '제목과 내용을 입력해 주세요.' });
      }

      // 관리자 전용 색상 검증: 관리자가 아니면 기본 노란색으로 변경
      let memoColor = color || '#FEF9C3';
      if (memoColor === '#2D3436' && !isAdmin) {
        memoColor = '#FEF9C3';
      }

      const newMemo = {
        title: title.trim(),
        content: content.trim(),
        color: memoColor,
        author: author || '익명',
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