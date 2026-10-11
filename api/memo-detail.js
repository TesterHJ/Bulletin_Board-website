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

    // 3. 공감 처리 (PATCH)
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, isAdmin } = body || {};

      if (!username) {
        return res.status(401).json({ error: '로그인 후 공감할 수 있습니다.' });
      }

      const existingMemo = await memosCollection.findOne({ _id: memoId });
      if (!existingMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      if (!isAdmin) {
        const likedUsers = existingMemo.likedUsers || [];
        if (likedUsers.includes(username)) {
          return res.status(409).json({ error: '이미 공감한 메모입니다.' });
        }

        const updated = await memosCollection.findOneAndUpdate(
          { _id: memoId },
          { 
            $inc: { likes: 1 },$addToSet: { likedUsers: username }
          },
          { returnDocument: 'after' }
        );
        return res.status(200).json({ success: true, likes: updated.likes });
      } else {
        const updated = await memosCollection.findOneAndUpdate(
          { _id: memoId },
          { $inc: { likes: 1 } },
          { returnDocument: 'after' }
        );
        return res.status(200).json({ success: true, likes: updated.likes });
      }
    }

    // 4. 메모 수정 (PUT)
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, content, color, author, requester, username, isAdmin } = body || {};

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해 주세요.' });
      }

      const existingMemo = await memosCollection.findOne({ _id: memoId });
      if (!existingMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      // 본인 확인: 관리자이거나, 닉네임 일치하거나, ownerUsername 일치할 때
      const isOwner = (
        (existingMemo.ownerUsername && username && existingMemo.ownerUsername === username) ||
        (existingMemo.author !== '익명' && existingMemo.author === requester)
      );

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: '본인이 작성한 메모만 수정할 수 있습니다.' });
      }

      await memosCollection.updateOne(
        { _id: memoId },
        { 
          $set: { 
            title: title.trim(), 
            content: content.trim(), 
            color: color || '#FEF9C3',
            author: author || existingMemo.author,
            updatedAt: new Date() 
          } 
        }
      );
      return res.status(200).json({ success: true });
    }

    // 5. 메모 삭제 (DELETE)
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { requester, username, isAdmin } = body || {};

      const existingMemo = await memosCollection.findOne({ _id: memoId });
      if (!existingMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      const isOwner = (
        (existingMemo.ownerUsername && username && existingMemo.ownerUsername === username) ||
        (existingMemo.author !== '익명' && existingMemo.author === requester)
      );

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: '본인이 작성한 메모만 삭제할 수 있습니다.' });
      }

      await memosCollection.deleteOne({ _id: memoId });
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}