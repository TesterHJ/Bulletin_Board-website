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
      const trimmedUsername = username?.trim();
      const trimmedPassword = password?.trim();
      const trimmedNickname = nickname?.trim();

      if (!trimmedUsername || !trimmedPassword || !trimmedNickname) {
        return res.status(400).json({ error: '아이디, 비밀번호, 닉네임을 모두 입력해 주세요.' });
      }

      // (1) 아이디 중복 확인
      const existingUser = await users.findOne({ username: trimmedUsername });
      if (existingUser) {
        return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
      }

      // (2) 닉네임 중복 확인
      const existingNickname = await users.findOne({ nickname: trimmedNickname });
      if (existingNickname) {
        return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
      }

      // 아이디가 admin이면 관리자 role 부여
      const role = trimmedUsername.toLowerCase() === 'admin' ? 'admin' : 'user';

      const newUser = {
        username: trimmedUsername,
        password: trimmedPassword,
        nickname: trimmedNickname,
        role,
        createdAt: new Date()
      };

      await users.insertOne(newUser);
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
      const trimmedUsername = username?.trim();
      const trimmedPassword = password?.trim();

      if (!trimmedUsername || !trimmedPassword) {
        return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
      }

      const user = await users.findOne({ 
        username: trimmedUsername, 
        password: trimmedPassword 
      });
      if (!user) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
      }

      // 아이디가 admin이거나 role이 admin이면 관리자 처리
      const role = user.role || (user.username.toLowerCase() === 'admin' ? 'admin' : 'user');

      return res.status(200).json({ 
        success: true, 
        user: { 
          username: user.username, 
          nickname: user.nickname,
          role
        } 
      });
    }

    return res.status(400).json({ error: '잘못된 요청입니다.' });
  } catch (err) {
    console.error('Auth API Error:', err);
    return res.status(500).json({ error: '인증 처리 중 서버 오류가 발생했습니다.' });
  }
}