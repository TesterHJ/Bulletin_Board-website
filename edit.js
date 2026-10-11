document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const memoId = urlParams.get('id');

  const memoForm = document.getElementById('memoForm');
  const titleInput = document.getElementById('titleInput');
  const contentInput = document.getElementById('contentInput');
  const colorRadios = document.querySelectorAll('input[name="memoColor"]');
  const openDeleteModalBtn = document.getElementById('openDeleteModalBtn');
  const submitBtn = memoForm.querySelector('button[type="submit"]');

  const titleCounter = document.getElementById('titleCounter');
  const contentCounter = document.getElementById('contentCounter');
  const pageTitle = document.getElementById('pageTitle');
  const adminColorOption = document.getElementById('adminColorOption');

  const previewCard = document.getElementById('previewCard');
  const previewTitle = document.getElementById('previewTitle');
  const previewContent = document.getElementById('previewContent');

  const deleteModal = document.getElementById('deleteModal');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteModalDesc = document.getElementById('deleteModalDesc');

  const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

  // 관리자 전용 색상 노출 제어
  if (currentUser && currentUser.role === 'admin' && adminColorOption) {
    adminColorOption.classList.remove('hidden');
    adminColorOption.classList.add('flex');
  }

  // 실시간 미리보기
  titleInput.addEventListener('input', (e) => {
    const val = e.target.value;
    previewTitle.textContent = val || '제목을 입력해 주세요';
    titleCounter.textContent = `${val.length} / 40`;
  });

  contentInput.addEventListener('input', (e) => {
    const val = e.target.value;
    previewContent.textContent = val || '내용을 입력하면 여기에 실시간으로 표시됩니다.';
    contentCounter.textContent = `${val.length} / 2,000`;
  });

  // 모든 색상 라디오 변경 이벤트
  document.querySelectorAll('input[name="memoColor"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      previewCard.style.backgroundColor = e.target.value;
    });
  });

  // 작성 / 수정 모드 분기
  if (memoId) {
    pageTitle.textContent = '내 메모 다듬기';
    if (submitBtn) submitBtn.textContent = '수정 내용 저장';

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`);
      if (!res.ok) throw new Error('메모를 불러올 수 없습니다.');
      const memo = await res.json();
      
      // 본인 작성 검증 (관리자는 다른 사람 글도 편집 허용 가능)
      const isAuthor = currentUser && currentUser.nickname === memo.author;
      const isAdmin = currentUser && currentUser.role === 'admin';

      if (!isAuthor && !isAdmin) {
        alert('본인이 작성한 메모만 수정할 수 있습니다.');
        window.location.href = `detail.html?id=${memoId}`;
        return;
      }

      titleInput.value = memo.title;
      contentInput.value = memo.content;

      // 수정 글의 색상이 관리자 색상인 경우 표시
      if (memo.color === '#FED7AA' && adminColorOption) {
        adminColorOption.classList.remove('hidden');
        adminColorOption.classList.add('flex');
      }

      const targetRadio = document.querySelector(`input[name="memoColor"][value="${memo.color}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
        previewCard.style.backgroundColor = memo.color;
      }

      previewTitle.textContent = memo.title;
      previewContent.textContent = memo.content;
      titleCounter.textContent = `${memo.title.length} / 40`;
      contentCounter.textContent = `${memo.content.length} / 2,000`;
      deleteModalDesc.textContent = `'${memo.title}' 글과 댓글이 게시판에서 사라집니다. 삭제한 글은 복구할 수 없어요.`;
    } catch (err) {
      alert(err.message);
      window.location.href = 'index.html';
    }
  } else {
    pageTitle.textContent = '새 메모 붙이기';
    openDeleteModalBtn.classList.add('hidden');
    if (submitBtn) submitBtn.textContent = '메모 붙이기';
  }

  // 폼 제출
  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedColor = document.querySelector('input[name="memoColor"]:checked')?.value || '#FEF9C3';

    // 일반 유저가 관리자 색상을 요청할 경우 차단
    if (selectedColor === '#FED7AA' && (!currentUser || currentUser.role !== 'admin')) {
      alert('관리자 전용 색상입니다.');
      return;
    }

    const payload = {
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      color: selectedColor,
      author: currentUser ? currentUser.nickname : '익명',
      requester: currentUser ? currentUser.nickname : null,
      isAdmin: currentUser?.role === 'admin'
    };

    if (!payload.title || !payload.content) {
      alert('제목과 내용을 입력해 주세요.');
      return;
    }

    try {
      const endpoint = memoId ? `/api/memo-detail?id=${memoId}` : '/api/memos';
      const method = memoId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || resData.message || `서버 응답 오류 (${res.status})`);
      }

      alert(memoId ? '메모가 수정되었습니다!' : '새 메모가 나무 벽에 붙었습니다!');
      window.location.href = memoId ? `detail.html?id=${memoId}` : 'index.html';
    } catch (err) {
      alert(`저장 실패: ${err.message}`);
    }
  });

  // 삭제 모달 열기/닫기
  openDeleteModalBtn.addEventListener('click', () => deleteModal.classList.remove('hidden'));
  closeDeleteModalBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

  // 삭제 실행
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!memoId) return;

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: currentUser ? currentUser.nickname : null,
          isAdmin: currentUser?.role === 'admin'
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || `삭제 실패 (${res.status})`);
      }

      alert('메모가 삭제되었습니다.');
      window.location.href = 'index.html';
    } catch (err) {
      alert(err.message);
    }
  });
});