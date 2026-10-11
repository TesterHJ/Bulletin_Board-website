// api/auth.js (서버 백엔드 API 위치)
import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action } = req.query;
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { username, password, nickname } = body || {};

  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 모두 입력해 주세요.' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const usersCollection = db.collection('users');

    // 1. 회원가입
    if (action === 'signup') {
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });
      }

      // 'admin' 아이디인 경우 자동으로 관리자 권한 부여, 그 외는 'user'
      const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';

      const newUser = {
        username: username.trim(),
        password: password.trim(),
        nickname: (nickname && nickname.trim()) || username.trim(),
        role: role,
        createdAt: new Date()
      };

      await usersCollection.insertOne(newUser);

      return res.status(201).json({
        success: true,
        user: {
          username: newUser.username,
          nickname: newUser.nickname,
          role: newUser.role
        }
      });
    }

    // 2. 로그인
    if (action === 'login') {
      const user = await usersCollection.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
      }

      return res.status(200).json({
        success: true,
        user: {
          username: user.username,
          nickname: user.nickname || user.username,
          role: user.role || 'user'
        }
      });
    }

    return res.status(400).json({ error: '유효하지 않은 요청(action)입니다.' });
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}