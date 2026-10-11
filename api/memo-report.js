import { ObjectId } from 'mongodb';
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const memosCollection = db.collection('memos');

    // 1. 신고 목록 조회 (GET) - 관리자 전용
    if (req.method === 'GET') {
      const { isAdmin } = req.query;
      if (isAdmin !== 'true') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
      }

      // reports 필드가 존재하고 신고 내역이 1건 이상인 메모 조회
      const reportedMemos = await memosCollection
        .find({ 'reports.0': { $exists: true } })
        .sort({ 'reports.length': -1, createdAt: -1 })
        .toArray();

      return res.status(200).json(reportedMemos);
    }

    // 2. 메모 신고 접수 (POST)
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { memoId, username, reason } = body || {};

      if (!memoId) return res.status(400).json({ error: '메모 ID가 필요합니다.' });
      if (!username) return res.status(401).json({ error: '로그인 후 신고할 수 있습니다.' });

      const targetMemo = await memosCollection.findOne({ _id: new ObjectId(memoId) });
      if (!targetMemo) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });

      // 동일 유저 중복 신고 방지
      const existingReports = targetMemo.reports || [];
      if (existingReports.some(r => r.reporter === username)) {
        return res.status(409).json({ error: '이미 신고 접수한 메모입니다.' });
      }

      const reportItem = {
        reporter: username,
        reason: (reason || '부적절한 내용').trim(),
        createdAt: new Date()
      };

      await memosCollection.updateOne(
        { _id: new ObjectId(memoId) },
        { 
          $push: { reports: reportItem },$inc: { reportCount: 1 }
        }
      );

      return res.status(200).json({ success: true, message: '신고가 정상 접수되었습니다.' });
    }

    // 3. 신고 반려/초기화 (DELETE) - 관리자 전용
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { memoId, isAdmin } = body || {};

      if (!isAdmin) {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
      }

      await memosCollection.updateOne(
        { _id: new ObjectId(memoId) },
        { $unset: { reports: "", reportCount: "" } }
      );

      return res.status(200).json({ success: true, message: '신고 내역이 반려(초기화)되었습니다.' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}