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
  const memoArticleCard = document.getElementById('memoArticleCard');

  const shareBtn = document.getElementById('shareBtn');
  const reportBtn = document.getElementById('reportBtn');

  const commentTotalCount = document.getElementById('commentTotalCount');
  const commentList = document.getElementById('commentList');
  const commentInput = document.getElementById('commentInput');
  const commentCharCount = document.getElementById('commentCharCount');
  const submitCommentBtn = document.getElementById('submitCommentBtn');

  let currentLoadedMemo = null; // 메모 정보 캐싱

  editLink.href = `edit.html?id=${memoId}`;

  // 1. 메모 상세 로드
  async function loadMemoDetail() {
    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`);
      if (!res.ok) throw new Error('메모를 불러올 수 없습니다.');
      const memo = await res.json();
      currentLoadedMemo = memo;

      const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

      // 본인 글 판별: ownerUsername 일치 OR author(닉네임/아이디) 일치
      const isAuthor = currentUser && (
        (memo.ownerUsername && currentUser.username === memo.ownerUsername) ||
        (memo.author && currentUser.nickname === memo.author) ||
        (memo.author && currentUser.username === memo.author)
      );
      const isAdmin = currentUser && currentUser.role === 'admin';

      if (!isAuthor && !isAdmin) {
        if (editLink) editLink.style.display = 'none';
      } else {
        if (editLink) editLink.style.display = 'inline-block';
      }

      // 카드 배경색을 메모 고유 색상으로 적용
      const memoColor = memo.color || '#FEF9C3';
      if (memoArticleCard) {
        memoArticleCard.style.backgroundColor = memoColor;
        memoArticleCard.classList.remove('bg-[#FCFBF7]');

        // 검은색(#2D3436) 다크 모드 텍스트 대응
        if (memoColor === '#2D3436') {
          memoTitle.className = 'text-2xl md:text-3xl font-extrabold text-white mb-4 tracking-tight leading-snug';
          memoContent.className = 'space-y-4 text-[15px] leading-relaxed text-gray-200 whitespace-pre-line';
          memoAuthor.className = 'text-sm font-bold text-gray-200';
          if (memoDate) memoDate.className = 'text-xs text-gray-400';
        } else {
          memoTitle.className = 'text-2xl md:text-3xl font-extrabold text-[#212529] mb-4 tracking-tight leading-snug';
          memoContent.className = 'space-y-4 text-[15px] leading-relaxed text-[#343A40] whitespace-pre-line';
          memoAuthor.className = 'text-sm font-bold text-gray-800';
          if (memoDate) memoDate.className = 'text-xs text-gray-500';
        }
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

      const likedUsers = memo.likedUsers || [];
      if (currentUser && currentUser.role !== 'admin' && likedUsers.includes(currentUser.username)) {
        likeBtn.classList.add('border-[#FFA8A8]', 'text-[#E03131]');
      }

      renderComments(memo.comments || []);
    } catch (err) {
      alert(err.message);
      window.location.href = 'index.html';
    }
  }

  // 2. 공유 버튼 핸들러
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href);
      alert('메모 링크가 복사되었습니다!');
    });
  }

  // 3. 신고 버튼 핸들러 (본인 작성 메모 차단)
  if (reportBtn) {
    reportBtn.addEventListener('click', async () => {
      const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
      if (!currentUser) {
        alert('로그인한 회원만 신고할 수 있습니다.');
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
      }

      // 본인 작성 여부 검증 (익명이어도 ownerUsername 대조 포함)
      if (currentLoadedMemo) {
        const isOwner = (currentLoadedMemo.ownerUsername && currentLoadedMemo.ownerUsername === currentUser.username) ||
                        (currentLoadedMemo.author !== '익명' && currentLoadedMemo.author === currentUser.nickname) ||
                        (currentLoadedMemo.author !== '익명' && currentLoadedMemo.author === currentUser.username);
        if (isOwner) {
          alert('본인이 작성한 메모는 신고할 수 없습니다.');
          return;
        }
      }

      const reason = prompt('신고 사유를 작성해 주세요 (예: 욕설, 비방, 음란물, 도배 등):');
      if (reason === null) return; // 취소 클릭

      try {
        const res = await fetch('/api/memo-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memoId: memoId,
            username: currentUser.username,
            reason: reason.trim() || '부적절한 내용'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || '신고 접수에 실패했습니다.');
        }

        alert('신고가 성공적으로 접수되었습니다. 관리자 확인 후 처리됩니다.');
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // 4. 공감 버튼 핸들러 (1회 제한, 관리자 무제한)
  let isLiking = false;
  likeBtn.addEventListener('click', async () => {
    if (isLiking) return;

    const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
    if (!currentUser) {
      alert('로그인한 회원만 공감할 수 있습니다.');
      if (typeof openAuthModal === 'function') openAuthModal('login');
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
      if (!res.ok) throw new Error(data.error || '공감 처리에 실패했습니다.');

      if (likeCount) likeCount.textContent = data.likes;

      likeBtn.classList.add('scale-105', 'bg-stone-300');
      setTimeout(() => {
        likeBtn.classList.remove('scale-105', 'bg-stone-300');
        likeBtn.classList.add('bg-white');
      }, 250);

    } catch (err) {
      alert(err.message);
    } finally {
      isLiking = false;
    }
  });

  // 5. 댓글 렌더링
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

  // 6. 댓글 등록
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