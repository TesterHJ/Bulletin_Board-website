// 현재 로그인된 유저 가져오기
function getCurrentUser() {
  const data = localStorage.getItem('tree_memo_user');
  return data ? JSON.parse(data) : null;
}

// 로그아웃
function logout() {
  localStorage.removeItem('tree_memo_user');
  alert('로그아웃되었습니다.');
  window.location.reload();
}

// 상단 헤더 프로필/로그인 버튼 렌더링
function renderHeaderAuth() {
  const profileContainer = document.getElementById('userProfileContainer');
  if (!profileContainer) return;

  const user = getCurrentUser();

  if (user) {
    profileContainer.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-[#82C91E]/20 text-[#5C940D] flex items-center justify-center font-bold text-xs">
          ${user.nickname[0]}
        </div>
        <div class="text-xs text-right leading-tight">
          <p class="font-semibold text-gray-800">${user.nickname}</p>
          <button type="button" onclick="logout()" class="text-red-500 hover:underline text-[10px]">로그아웃</button>
        </div>
      </div>
    `;
  } else {
    profileContainer.innerHTML = `
      <div class="flex items-center gap-2">
        <button type="button" onclick="openAuthModal('login')" class="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 px-2.5 py-1 rounded">로그인</button>
        <button type="button" onclick="openAuthModal('signup')" class="text-xs font-semibold text-white bg-[#B04A36] hover:bg-[#973C2A] px-2.5 py-1 rounded">회원가입</button>
      </div>
    `;
  }
}

let currentAuthMode = 'login';

function openAuthModal(mode = 'login') {
  let modal = document.getElementById('authModal');
  if (!modal) {
    const modalHtml = `
      <div id="authModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden">
        <div class="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
          <button type="button" onclick="closeAuthModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
          <h2 id="authModalTitle" class="text-lg font-bold text-gray-900 mb-4">로그인</h2>
          
          <form id="authModalForm" class="space-y-3">
            <div id="nicknameField" class="hidden">
              <label class="block text-xs font-semibold text-gray-600 mb-1">닉네임</label>
              <input type="text" id="authNickname" class="w-full text-xs p-2 border rounded border-gray-300 focus:outline-none focus:border-[#B04A36]" placeholder="사용할 닉네임" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">아이디</label>
              <input type="text" id="authUsername" class="w-full text-xs p-2 border rounded border-gray-300 focus:outline-none focus:border-[#B04A36]" placeholder="아이디 입력" required />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">비밀번호</label>
              <input type="password" id="authPassword" class="w-full text-xs p-2 border rounded border-gray-300 focus:outline-none focus:border-[#B04A36]" placeholder="비밀번호 입력" required />
            </div>
            <button type="submit" id="authSubmitBtn" class="w-full bg-[#B04A36] hover:bg-[#973C2A] text-white text-xs font-bold py-2 rounded transition mt-2">로그인</button>
          </form>

          <div class="mt-4 text-center">
            <button type="button" id="authToggleBtn" class="text-xs text-gray-500 hover:underline">회원가입 하러가기</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('authModal');
    setupModalEvents();
  }

  setModalMode(mode);
  modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

function setModalMode(mode) {
  currentAuthMode = mode;
  const title = document.getElementById('authModalTitle');
  const nicknameField = document.getElementById('nicknameField');
  const submitBtn = document.getElementById('authSubmitBtn');
  const toggleBtn = document.getElementById('authToggleBtn');

  if (mode === 'signup') {
    title.textContent = '회원가입';
    nicknameField.classList.remove('hidden');
    submitBtn.textContent = '가입하기';
    toggleBtn.textContent = '이미 계정이 있으신가요? 로그인';
  } else {
    title.textContent = '로그인';
    nicknameField.classList.add('hidden');
    submitBtn.textContent = '로그인';
    toggleBtn.textContent = '계정이 없으신가요? 회원가입';
  }
}

function setupModalEvents() {
  const form = document.getElementById('authModalForm');
  const toggleBtn = document.getElementById('authToggleBtn');

  toggleBtn.addEventListener('click', () => {
    setModalMode(currentAuthMode === 'login' ? 'signup' : 'login');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const nickname = document.getElementById('authNickname').value.trim();

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentAuthMode,
          username,
          password,
          nickname: currentAuthMode === 'signup' ? nickname : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '처리 실패');

      alert(currentAuthMode === 'signup' ? '가입이 완료되었습니다! 로그인되었습니다.' : '로그인되었습니다!');
      localStorage.setItem('tree_memo_user', JSON.stringify(data.user));
      closeAuthModal();
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', renderHeaderAuth);