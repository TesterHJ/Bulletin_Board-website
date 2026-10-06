import { ObjectId } from 'mongodb';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: '메모 ID가 필요합니다.' });

  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const memosCollection = db.collection('memos');
    const memoId = new ObjectId(id);

    // 1. 상세 조회 (GET)
    if (req.method === 'GET') {
      const memo = await memosCollection.findOneAndUpdate(
        { _id: memoId },
        { $inc: { views: 1 } },
        { returnDocument: 'after' }
      );
      if (!memo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      return res.status(200).json(memo);
    }

    // 2. 댓글 추가 (POST)
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { text, author } = body || {};
      if (!text?.trim()) return res.status(400).json({ error: '댓글을 입력해 주세요.' });

      const newComment = {
        _id: new ObjectId(),
        author: author || '익명',
        text: text.trim(),
        createdAt: new Date()
      };

      await memosCollection.updateOne({ _id: memoId }, { $push: { comments: newComment } });
      return res.status(201).json({ success: true, comment: newComment });
    }

    // 3. 메모 수정 (PUT)
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, content, color } = body || {};

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해 주세요.' });
      }

      await memosCollection.updateOne(
        { _id: memoId },
        { 
          $set: { 
            title: title.trim(), 
            content: content.trim(), 
            color: color || '#FEF9C3', 
            updatedAt: new Date() 
          } 
        }
      );
      return res.status(200).json({ success: true });
    }

    // 4. 메모 삭제 (DELETE)
    if (req.method === 'DELETE') {
      await memosCollection.deleteOne({ _id: memoId });
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}