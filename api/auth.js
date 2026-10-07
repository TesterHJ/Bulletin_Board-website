import { connectToDatabase } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { action, username, password, nickname } = req.body || {};

  try {
    const client = await connectToDatabase();
    const db = client.db('namumemo');
    const users = db.collection('users');

    // 1. 회원가입
    if (action === 'signup') {
      if (!username?.trim() || !password?.trim() || !nickname?.trim()) {
        return res.status(400).json({ error: '아이디, 비밀번호, 닉네임을 모두 입력해 주세요.' });
      }

      const existingUser = await users.findOne({ username: username.trim() });
      if (existingUser) {
        return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
      }

      const newUser = {
        username: username.trim(),
        password: password.trim(),
        nickname: nickname.trim(),
        createdAt: new Date()
      };

      await users.insertOne(newUser);
      return res.status(201).json({ 
        success: true, 
        user: { username: newUser.username, nickname: newUser.nickname } 
      });
    }

    // 2. 로그인
    if (action === 'login') {
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
      }

      const user = await users.findOne({ 
        username: username.trim(), 
        password: password.trim() 
      });
      if (!user) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
      }

      return res.status(200).json({ 
        success: true, 
        user: { username: user.username, nickname: user.nickname } 
      });
    }

    return res.status(400).json({ error: '잘못된 요청입니다.' });
  } catch (err) {
    console.error('Auth API Error:', err);
    return res.status(500).json({ error: '인증 처리 중 서버 오류가 발생했습니다.' });
  }
}