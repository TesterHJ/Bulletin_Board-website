document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
  if (!currentUser) {
    alert('로그인한 회원만 이용할 수 있습니다.');
    window.location.href = 'index.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const memoId = urlParams.get('id');

  const pageTitle = document.getElementById('pageTitle');
  const memoForm = document.getElementById('memoForm');
  const titleInput = document.getElementById('titleInput');
  const contentInput = document.getElementById('contentInput');
  const titleCounter = document.getElementById('titleCounter');
  const contentCounter = document.getElementById('contentCounter');
  const anonymousCheckbox = document.getElementById('anonymousCheckbox');
  const adminColorOption = document.getElementById('adminColorOption');
  const submitBtnText = document.getElementById('submitBtnText');

  const previewCard = document.getElementById('previewCard');
  const previewTitle = document.getElementById('previewTitle');
  const previewContent = document.getElementById('previewContent');
  const previewAuthor = document.getElementById('previewAuthor');

  const openDeleteModalBtn = document.getElementById('openDeleteModalBtn');
  const deleteModal = document.getElementById('deleteModal');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  const colorInputs = document.querySelectorAll('input[name="memoColor"]');

  // 관리자 전용 색상 토글 (flex 클래스 명시하여 인라인 가로 정렬 보장)
  if (currentUser && currentUser.role === 'admin') {
    if (adminColorOption) {
      adminColorOption.classList.remove('hidden');
      adminColorOption.classList.add('flex');
    }
  }

  // 1. 수정 모드일 때 기존 데이터 불러오기
  if (memoId) {
    pageTitle.textContent = '메모 다듬기';
    if (submitBtnText) submitBtnText.textContent = '메모 수정하기';
    if (openDeleteModalBtn) openDeleteModalBtn.classList.remove('hidden');

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`);
      if (!res.ok) throw new Error('메모를 불러올 수 없습니다.');
      const memo = await res.json();

      // 수정 권한 검증 (소유자 username, 작성자 nickname, 관리자 모두 허용)
      const isOwner = (memo.ownerUsername && memo.ownerUsername === currentUser.username) ||
                      (memo.author && memo.author === currentUser.nickname) ||
                      (memo.author && memo.author === currentUser.username);
      const isAdmin = currentUser.role === 'admin';

      if (!isOwner && !isAdmin) {
        alert('본인이 작성한 메모만 수정할 수 있습니다.');
        window.location.href = `detail.html?id=${memoId}`;
        return;
      }

      titleInput.value = memo.title || '';
      contentInput.value = memo.content || '';

      if (memo.author === '익명') {
        anonymousCheckbox.checked = true;
      }

      // 색상 세팅
      const targetColorRadio = document.querySelector(`input[name="memoColor"][value="${memo.color}"]`);
      if (targetColorRadio) {
        targetColorRadio.checked = true;
      }

      updatePreview();
    } catch (err) {
      alert(err.message);
      window.location.href = 'index.html';
    }
  } else {
    pageTitle.textContent = '새 메모 붙이기';
    if (submitBtnText) submitBtnText.textContent = '메모 붙이기';
    if (openDeleteModalBtn) openDeleteModalBtn.classList.add('hidden');
    updatePreview();
  }

  // 글자 수 카운터 및 실시간 미리보기 동기화
  function updatePreview() {
    const titleVal = titleInput.value.trim();
    const contentVal = contentInput.value.trim();
    const selectedColor = document.querySelector('input[name="memoColor"]:checked')?.value || '#FEF9C3';

    titleCounter.textContent = `${titleInput.value.length} / 40`;
    contentCounter.textContent = `${contentInput.value.length} / 2,000`;

    previewTitle.textContent = titleVal || '제목을 입력해 주세요';
    previewContent.textContent = contentVal || '내용을 입력하면 여기에 실시간으로 표시됩니다.';

    const isAnonymous = anonymousCheckbox.checked;
    previewAuthor.textContent = isAnonymous ? '익명' : (currentUser ? currentUser.nickname : '익명');

    previewCard.style.backgroundColor = selectedColor;
    const isDark = selectedColor === '#2D3436';
    if (isDark) {
      previewTitle.className = 'font-bold text-base text-white mb-2 leading-snug break-words';
      previewContent.className = 'text-xs text-gray-200 leading-relaxed break-words whitespace-pre-line';
      previewAuthor.className = 'text-gray-300';
    } else {
      previewTitle.className = 'font-bold text-base text-gray-900 mb-2 leading-snug break-words';
      previewContent.className = 'text-xs text-gray-700 leading-relaxed break-words whitespace-pre-line';
      previewAuthor.className = 'text-gray-500';
    }
  }

  titleInput.addEventListener('input', updatePreview);
  contentInput.addEventListener('input', updatePreview);
  anonymousCheckbox.addEventListener('change', updatePreview);
  colorInputs.forEach(input => input.addEventListener('change', updatePreview));

  // 2. 폼 제출 (등록 / 수정)
  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const color = document.querySelector('input[name="memoColor"]:checked')?.value || '#FEF9C3';
    const isAnonymous = anonymousCheckbox.checked;

    if (!title || !content) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    const author = isAnonymous ? '익명' : currentUser.nickname;
    const ownerUsername = currentUser.username;

    try {
      const endpoint = memoId ? `/api/memo-detail?id=${memoId}` : '/api/memos';
      const method = memoId ? 'PUT' : 'POST';

      const payload = {
        title,
        content,
        color,
        author,
        ownerUsername,
        requesterUsername: currentUser.username,
        requesterNickname: currentUser.nickname,
        isAdmin: currentUser.role === 'admin'
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.');

      alert(memoId ? '메모가 수정되었습니다!' : '새 메모가 나무판에 붙었습니다!');
      window.location.href = memoId ? `detail.html?id=${memoId}` : 'index.html';
    } catch (err) {
      alert(err.message);
    }
  });

  // 3. 삭제 모달 핸들러
  if (openDeleteModalBtn) {
    openDeleteModalBtn.addEventListener('click', () => {
      deleteModal.classList.remove('hidden');
    });
  }

  if (closeDeleteModalBtn) {
    closeDeleteModalBtn.addEventListener('click', () => {
      deleteModal.classList.add('hidden');
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/memo-detail?id=${memoId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requesterUsername: currentUser.username,
            requesterNickname: currentUser.nickname,
            isAdmin: currentUser.role === 'admin'
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '삭제 처리에 실패했습니다.');

        alert('메모가 삭제되었습니다.');
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message);
      }
    });
  }
});