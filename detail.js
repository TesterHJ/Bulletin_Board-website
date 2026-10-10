document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const memoId = urlParams.get('id');

  if (!memoId) {
    alert('잘못된 접근입니다.');
    window.location.href = 'index.html';
    return;
  }

  const memoNumber = document.getElementById('memoNumber');
  const memoViews = document.getElementById('memoViews');
  const memoTitle = document.getElementById('memoTitle');
  const memoAuthor = document.getElementById('memoAuthor');
  const memoDate = document.getElementById('memoDate');
  const memoContent = document.getElementById('memoContent');
  const authorAvatar = document.getElementById('authorAvatar');
  const likeCount = document.getElementById('likeCount');
  const likeBtn = document.getElementById('likeBtn');
  const editLink = document.getElementById('editLink');

  const commentTotalCount = document.getElementById('commentTotalCount');
  const commentList = document.getElementById('commentList');
  const commentInput = document.getElementById('commentInput');
  const commentCharCount = document.getElementById('commentCharCount');
  const submitCommentBtn = document.getElementById('submitCommentBtn');

  editLink.href = `edit.html?id=${memoId}`;

  // 1. 메모 상세 정보 불러오기
  async function loadMemoDetail() {
    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`);
      if (!res.ok) throw new Error('메모를 불러올 수 없습니다.');
      const memo = await res.json();

      const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

      // 본인 글이 아니거나 비로그인 시 수정 버튼 숨김
      if (!currentUser || currentUser.nickname !== memo.author) {
        if (editLink) editLink.style.display = 'none';
      } else {
        if (editLink) editLink.style.display = 'inline-block';
      }

      if (memoNumber) memoNumber.textContent = `메모 #${memo._id.slice(-4)}`;
      if (memoViews) memoViews.textContent = `조회 ${memo.views || 0}`;
      if (memoTitle) memoTitle.textContent = memo.title;
      if (memoAuthor) memoAuthor.textContent = memo.author || '익명';
      if (authorAvatar) authorAvatar.textContent = (memo.author || '익')[0];
      
      const createdDate = memo.createdAt ? new Date(memo.createdAt) : new Date();
      if (memoDate) {
        memoDate.textContent = createdDate.toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      if (memoContent) memoContent.textContent = memo.content;
      if (likeCount) likeCount.textContent = memo.likes || 0;

      // 이미 공감한 일반 유저일 경우 버튼에 강조 스타일 유지
      const likedUsers = memo.likedUsers || [];
      if (currentUser && currentUser.role !== 'admin' && likedUsers.includes(currentUser.username)) {
        likeBtn.classList.add('bg-[#FFF5F5]', 'border-[#FFA8A8]', 'text-[#E03131]');
      }

      renderComments(memo.comments || []);
    } catch (err) {
      alert(err.message);
      window.location.href = 'index.html';
    }
  }

  // 2. 공감(좋아요) 버튼 클릭 이벤트
  let isLiking = false;
  likeBtn.addEventListener('click', async () => {
    if (isLiking) return;

    const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
    if (!currentUser) {
      alert('로그인한 회원만 공감할 수 있습니다.');
      if (typeof openAuthModal === 'function') {
        openAuthModal('login');
      }
      return;
    }

    isLiking = true;

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          isAdmin: currentUser.role === 'admin'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '공감 처리에 실패했습니다.');
      }

      if (likeCount) {
        likeCount.textContent = data.likes;
      }

      // 애니메이션 효과
      likeBtn.classList.add('scale-105', 'bg-[#FFE3E3]', 'border-[#FFA8A8]');
      setTimeout(() => {
        likeBtn.classList.remove('scale-105', 'bg-[#FFE3E3]');
        likeBtn.classList.add('bg-[#FFF5F5]');
      }, 250);

    } catch (err) {
      alert(err.message);
    } finally {
      isLiking = false;
    }
  });

  // 3. 댓글 렌더링
  function renderComments(comments) {
    if (commentTotalCount) commentTotalCount.textContent = comments.length;

    if (!comments || comments.length === 0) {
      commentList.innerHTML = `<div class="text-center text-xs text-gray-400 py-8">첫 댓글을 남겨보세요!</div>`;
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

    commentList.innerHTML = comments.map(comment => {
      const authorName = comment.author || '익명';
      const initial = authorName[0];
      const isMe = currentUser && currentUser.nickname === authorName;
      const timeStr = comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

      return `
        <div class="flex items-start gap-2.5 text-xs">
          <div class="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
            ${initial}
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1">
                <span class="font-bold text-gray-800">${escapeHtml(authorName)}</span>
                ${isMe ? `<span class="text-[10px] text-[#15AABF] font-semibold bg-[#E3FAFC] px-1 rounded">나</span>` : ''}
              </div>
              <span class="text-[10px] text-gray-400">${timeStr}</span>
            </div>
            <p class="text-gray-600 text-[12px] leading-relaxed whitespace-pre-line">${escapeHtml(comment.text)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  commentInput.addEventListener('input', (e) => {
    commentCharCount.textContent = `${e.target.value.length}/300`;
  });

  // 4. 댓글 등록
  submitCommentBtn.addEventListener('click', async () => {
    const text = commentInput.value.trim();
    if (!text) {
      alert('댓글을 입력해 주세요.');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          author: currentUser ? currentUser.nickname : '익명' 
        })
      });

      if (!res.ok) throw new Error('댓글 등록에 실패했습니다.');

      commentInput.value = '';
      commentCharCount.textContent = '0/300';
      loadMemoDetail();
    } catch (err) {
      alert(err.message);
    }
  });

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  loadMemoDetail();
});