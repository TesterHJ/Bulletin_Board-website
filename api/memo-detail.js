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

    // 3. 공감(좋아요) 처리 (PATCH) - 계정당 1회 제한 (관리자 예외)
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, isAdmin } = body || {};

      if (!username) {
        return res.status(401).json({ error: '로그인 후 공감할 수 있습니다.' });
      }

      const existingMemo = await memosCollection.findOne({ _id: memoId });
      if (!existingMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      // 관리자가 아닌 일반 회원인 경우 중복 체크
      if (!isAdmin) {
        const likedUsers = existingMemo.likedUsers || [];
        if (likedUsers.includes(username)) {
          return res.status(409).json({ error: '이미 공감한 메모입니다.' });
        }

        // 일반 유저: likedUsers에 아이디 추가 및 likes +1
        const updated = await memosCollection.findOneAndUpdate(
          { _id: memoId },
          { 
            $inc: { likes: 1 },$addToSet: { likedUsers: username }
          },
          { returnDocument: 'after' }
        );
        return res.status(200).json({ success: true, likes: updated.likes });
      } else {
        // 관리자: 중복 제한 없이 계속 공감 누적 가능
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
      const { title, content, color, requester } = body || {};

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해 주세요.' });
      }

      const existingMemo = await memosCollection.findOne({ _id: memoId });
      if (!existingMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      if (existingMemo.author === '익명' || existingMemo.author !== requester) {
        return res.status(403).json({ error: '본인이 작성한 메모만 수정할 수 있습니다.' });
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

    // 5. 메모 삭제 (DELETE)
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { requester, isAdmin } = body || {};

      const existingMemo = await memosCollection.findOne({ _id: memoId });
      if (!existingMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      if (!isAdmin && (existingMemo.author === '익명' || existingMemo.author !== requester)) {
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