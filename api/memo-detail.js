import { ObjectId } from 'mongodb';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: '올바른 메모 ID가 아닙니다.' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const memosCollection = db.collection('memos');

    // 1. 메모 상세 조회 (GET) & 조회수 1 증가
    if (req.method === 'GET') {
      const result = await memosCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { views: 1 } },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      }

      return res.status(200).json(result);
    }

    // 2. 메모 수정 (PUT)
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, content, color, author, ownerUsername, requesterUsername, requesterNickname, isAdmin } = body || {};

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 모두 입력해 주세요.' });
      }

      const existingMemo = await memosCollection.findOne({ _id: new ObjectId(id) });
      if (!existingMemo) {
        return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      }

      // 본인 여부 확인
      const checkUsername = requesterUsername || ownerUsername;
      const isOwner = (existingMemo.ownerUsername && existingMemo.ownerUsername === checkUsername) ||
                      (existingMemo.author && requesterNickname && existingMemo.author === requesterNickname) ||
                      (existingMemo.author && checkUsername && existingMemo.author === checkUsername);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: '본인이 작성한 메모만 수정할 수 있습니다.' });
      }

      const updateFields = {
        title: title.trim(),
        content: content.trim(),
        color: color || '#FEF9C3',
        author: (author || existingMemo.author || '익명').trim(),
        updatedAt: new Date()
      };

      // 만약 기존 메모에 ownerUsername이 없었다면 이번 수정 시 채워줌
      if (!existingMemo.ownerUsername && checkUsername) {
        updateFields.ownerUsername = checkUsername;
      }

      await memosCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );

      return res.status(200).json({ success: true, message: '메모가 성공적으로 수정되었습니다.' });
    }

    // 3. 메모 삭제 (DELETE)
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { requesterUsername, requesterNickname, isAdmin } = body || {};

      const existingMemo = await memosCollection.findOne({ _id: new ObjectId(id) });
      if (!existingMemo) {
        return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      }

      const isOwner = (existingMemo.ownerUsername && existingMemo.ownerUsername === requesterUsername) ||
                      (existingMemo.author && requesterNickname && existingMemo.author === requesterNickname) ||
                      (existingMemo.author && requesterUsername && existingMemo.author === requesterUsername);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: '본인이 작성한 메모만 삭제할 수 있습니다.' });
      }

      await memosCollection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true, message: '메모가 삭제되었습니다.' });
    }

    // 4. 댓글 작성 (POST) - ownerUsername 저장 추가
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { text, author, ownerUsername } = body || {};

      if (!text || !text.trim()) {
        return res.status(400).json({ error: '댓글 내용을 입력해 주세요.' });
      }

      const newComment = {
        _id: new ObjectId(),
        text: text.trim(),
        author: (author || '익명').trim(),
        ownerUsername: (ownerUsername || '').trim(), // 익명이어도 소유자 식별값 보관
        createdAt: new Date()
      };

      await memosCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { comments: newComment } }
      );

      return res.status(201).json(newComment);
    }

    // 5. 공감(좋아요) 토글 (PATCH)
    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { username, isAdmin } = body || {};

      const memo = await memosCollection.findOne({ _id: new ObjectId(id) });
      if (!memo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      if (isAdmin) {
        const updated = await memosCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { likes: 1 } },
          { returnDocument: 'after' }
        );
        return res.status(200).json({ likes: updated.likes });
      }

      const likedUsers = memo.likedUsers || [];
      if (likedUsers.includes(username)) {
        return res.status(400).json({ error: '이미 공감한 메모입니다.' });
      }

      const updated = await memosCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { 
          $inc: { likes: 1 },$push: { likedUsers: username }
        },
        { returnDocument: 'after' }
      );

      return res.status(200).json({ likes: updated.likes });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'POST', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}