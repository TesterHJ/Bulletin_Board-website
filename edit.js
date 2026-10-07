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
  const tabNew = document.getElementById('tabNew');
  const tabEdit = document.getElementById('tabEdit');

  const previewCard = document.getElementById('previewCard');
  const previewTitle = document.getElementById('previewTitle');
  const previewContent = document.getElementById('previewContent');

  const deleteModal = document.getElementById('deleteModal');
  const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteModalDesc = document.getElementById('deleteModalDesc');

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

  colorRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      previewCard.style.backgroundColor = e.target.value;
    });
  });

  // 작성/수정 모드 판별
  if (memoId) {
    pageTitle.textContent = '내 메모 다듬기';
    tabEdit.className = 'text-[#B04A36] border-b-2 border-[#B04A36] pb-3 -mb-3';
    tabNew.className = 'text-gray-400 hover:text-gray-600 transition pb-3 -mb-3';
    if (submitBtn) submitBtn.textContent = '수정 내용 저장';

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`);
      if (!res.ok) throw new Error('메모를 불러올 수 없습니다.');
      const memo = await res.json();

      const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
      
      // 본인 글인지 프론트에서 먼저 검증
      if (!currentUser || currentUser.nickname !== memo.author) {
        alert('본인이 작성한 메모만 수정할 수 있습니다.');
        window.location.href = `detail.html?id=${memoId}`;
        return;
      }

      titleInput.value = memo.title;
      contentInput.value = memo.content;

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
    tabNew.className = 'text-[#B04A36] border-b-2 border-[#B04A36] pb-3 -mb-3';
    tabEdit.className = 'text-gray-400 hover:text-gray-600 transition pb-3 -mb-3';
    openDeleteModalBtn.classList.add('hidden');
    if (submitBtn) submitBtn.textContent = '메모 붙이기';
  }

  tabNew.addEventListener('click', () => { window.location.href = 'edit.html'; });

  // 폼 제출 (저장/수정)
  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedColor = document.querySelector('input[name="memoColor"]:checked')?.value || '#FFFFFF';
    const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

    const payload = {
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      color: selectedColor,
      author: currentUser ? currentUser.nickname : '익명',
      requester: currentUser ? currentUser.nickname : null // 수정 요청자 전달
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

  // 모달 제어
  openDeleteModalBtn.addEventListener('click', () => deleteModal.classList.remove('hidden'));
  closeDeleteModalBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

  // 영구 삭제 처리
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!memoId) return;

    const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: currentUser ? currentUser.nickname : null
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