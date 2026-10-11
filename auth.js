// auth.js (프로젝트 루트 위치)
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (user) {
    localStorage.setItem('tree_memo_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('tree_memo_user');
  }
}

function renderHeaderNav() {
  const user = getStoredUser();
  const navContainer = document.querySelector('header nav');
  
  if (navContainer) {
    const path = window.location.pathname;
    const isIndex = path.endsWith('index.html') || path === '/' || path === '';
    const isEdit = path.includes('edit.html');
    const isAdmin = path.includes('admin.html');
    const isReport = path.includes('reports.html');

    const activeClass = 'text-[#2D3436] font-bold border-b-2 border-[#D9480F] pb-1';
    const inactiveClass = 'text-[#868E96] hover:text-[#2D3436] transition-colors pb-1';

    let navHtml = `
      <a href="index.html" class="${isIndex ? activeClass : inactiveClass}">게시판</a>
      <a href="edit.html" class="${isEdit ? activeClass : inactiveClass}">새 메모</a>
    `;

    if (user && user.role === 'admin') {
      navHtml += `
        <a href="admin.html" class="${isAdmin ? activeClass : inactiveClass}">관리</a>
        <a href="reports.html" class="${isReport ? activeClass : inactiveClass}">신고</a>
      `;
    }

    navContainer.innerHTML = navHtml;
  }

  const profileContainer = document.getElementById('userProfileContainer');
  if (!profileContainer) return;

  if (user) {
    const isAdmin = user.role === 'admin';
    profileContainer.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full ${isAdmin ? 'bg-red-500 text-white' : 'bg-[#D9480F]/20 text-[#D9480F]'} flex items-center justify-center text-xs font-bold shadow-sm">
          ${user.nickname ? user.nickname[0] : 'U'}
        </div>
        <div class="flex flex-col text-right">
          <div class="flex items-center gap-1 justify-end">
            <span class="text-xs font-bold text-gray-800 leading-none">${escapeHtmlAuth(user.nickname || user.username)}</span>
            ${isAdmin ? `<span class="text-[9px] bg-red-600 text-white px-1 py-0.5 rounded font-black leading-none">관리자</span>` : ''}
          </div>
          <button type="button" id="logoutBtn" class="text-[10px] text-gray-400 hover:text-gray-600 transition text-right leading-tight mt-0.5">
            로그아웃
          </button>
        </div>
      </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  } else {
    profileContainer.innerHTML = `
      <div class="flex items-center gap-2 text-xs">
        <button type="button" id="openLoginBtn" class="text-gray-600 hover:text-gray-900 font-semibold px-2.5 py-1.5 transition">
          로그인
        </button>
        <button type="button" id="openSignupBtn" class="bg-[#B04A36] hover:bg-[#973C2A] text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition">
          회원가입
        </button>
      </div>
    `;

    document.getElementById('openLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('openSignupBtn')?.addEventListener('click', () => openAuthModal('signup'));
  }
}

function handleLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    setStoredUser(null);
    alert('로그아웃되었습니다.');
    window.location.href = 'index.html';
  }
}

function openAuthModal(mode = 'login') {
  let modalEl = document.getElementById('authModal');
  if (!modalEl) {
    modalEl = createAuthModalDOM();
    document.body.appendChild(modalEl);
  }

  const titleEl = document.getElementById('authModalTitle');
  const nicknameGroup = document.getElementById('authNicknameGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const switchText = document.getElementById('authSwitchText');
  const switchBtn = document.getElementById('authSwitchBtn');

  if (mode === 'login') {
    modalEl.dataset.mode = 'login';
    titleEl.textContent = '로그인';
    nicknameGroup.classList.add('hidden');
    submitBtn.textContent = '로그인하기';
    switchText.textContent = '아직 계정이 없으신가요?';
    switchBtn.textContent = '회원가입';
  } else {
    modalEl.dataset.mode = 'signup';
    titleEl.textContent = '새싹 회원가입';
    nicknameGroup.classList.remove('hidden');
    submitBtn.textContent = '가입하기';
    switchText.textContent = '이미 계정이 있으신가요?';
    switchBtn.textContent = '로그인';
  }

  modalEl.classList.remove('hidden');
}

function closeAuthModal() {
  const modalEl = document.getElementById('authModal');
  if (modalEl) modalEl.classList.add('hidden');
}

function createAuthModalDOM() {
  const div = document.createElement('div');
  div.id = 'authModal';
  div.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 hidden';
  div.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative border border-gray-100">
      <button type="button" id="closeAuthModalBtn" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg">✕</button>
      <h3 id="authModalTitle" class="text-xl font-extrabold text-gray-900 mb-5 text-center">로그인</h3>
      
      <form id="authForm" class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">아이디</label>
          <input type="text" id="authUsername" required placeholder="아이디를 입력해 주세요" class="w-full text-xs p-2.5 border rounded-lg border-gray-300 focus:outline-none focus:border-[#B04A36]">
        </div>
        <div id="authNicknameGroup" class="hidden">
          <label class="block text-xs font-bold text-gray-700 mb-1">닉네임</label>
          <input type="text" id="authNickname" placeholder="사용할 닉네임" class="w-full text-xs p-2.5 border rounded-lg border-gray-300 focus:outline-none focus:border-[#B04A36]">
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-1">비밀번호</label>
          <input type="password" id="authPassword" required placeholder="비밀번호를 입력해 주세요" class="w-full text-xs p-2.5 border rounded-lg border-gray-300 focus:outline-none focus:border-[#B04A36]">
        </div>
        <button type="submit" id="authSubmitBtn" class="w-full py-2.5 bg-[#B04A36] hover:bg-[#973C2A] text-white text-xs font-bold rounded-lg shadow transition mt-2">
          로그인하기
        </button>
      </form>

      <div class="mt-4 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
        <span id="authSwitchText">아직 계정이 없으신가요?</span>
        <button type="button" id="authSwitchBtn" class="ml-1 text-[#B04A36] font-bold hover:underline">회원가입</button>
      </div>
    </div>
  `;

  div.querySelector('#closeAuthModalBtn').addEventListener('click', closeAuthModal);
  div.querySelector('#authSwitchBtn').addEventListener('click', () => {
    const curMode = div.dataset.mode;
    openAuthModal(curMode === 'login' ? 'signup' : 'login');
  });

  div.querySelector('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = div.dataset.mode;
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const nickname = document.getElementById('authNickname').value.trim();

    try {
      const endpoint = mode === 'signup' ? '/api/auth?action=signup' : '/api/auth?action=login';
      const body = mode === 'signup' ? { username, password, nickname } : { username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증 처리에 실패했습니다.');

      setStoredUser(data.user);
      alert(mode === 'signup' ? '회원가입이 완료되었습니다!' : '로그인되었습니다!');
      closeAuthModal();
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  });

  return div;
}

function escapeHtmlAuth(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', renderHeaderNav);