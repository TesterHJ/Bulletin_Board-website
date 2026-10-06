document.addEventListener('DOMContentLoaded', async () => {
  // URL에서 id 파라미터 추출
  const urlParams = new URLSearchParams(window.location.search);
  const memoId = urlParams.get('id');

  if (!memoId) {
    alert('잘못된 접근입니다.');
    window.location.href = 'index.html';
    return;
  }

  // DOM 요소 선택
  const memoNumber = document.getElementById('memoNumber');
  const memoViews = document.getElementById('memoViews');
  const memoTitle = document.getElementById('memoTitle');
  const memoAuthor = document.getElementById('memoAuthor');
  const memoDate = document.getElementById('memoDate');
  const memoContent = document.getElementById('memoContent');
  const authorAvatar = document.getElementById('authorAvatar');
  const likeCount = document.getElementById('likeCount');
  const editLink = document.getElementById('editLink');

  // 댓글 관련 DOM
  const commentTotalCount = document.getElementById('commentTotalCount');
  const commentList = document.getElementById('commentList');
  const commentInput = document.getElementById('commentInput');
  const commentCharCount = document.getElementById('commentCharCount');
  const submitCommentBtn = document.getElementById('submitCommentBtn');

  // 수정 버튼 링크 연결
  editLink.href = `edit.html?id=${memoId}`;

  // 1. 메모 상세 정보 불러오기
  async function loadMemoDetail() {
    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`);
      if (!res.ok) throw new Error('메모를 불러올 수 없습니다.');
      const memo = await res.json();

      // 화면에 데이터 채우기
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

      // 댓글 리스트 렌더링
      renderComments(memo.comments || []);
    } catch (err) {
      alert(err.message);
      window.location.href = 'index.html';
    }
  }

  // 2. 댓글 렌더링 함수
  function renderComments(comments) {
    if (commentTotalCount) commentTotalCount.textContent = comments.length;

    if (!comments || comments.length === 0) {
      commentList.innerHTML = `<div class="text-center text-xs text-gray-400 py-8">첫 댓글을 남겨보세요!</div>`;
      return;
    }

    commentList.innerHTML = comments.map(comment => {
      const authorName = comment.author || '익명';
      const initial = authorName[0];
      const timeStr = comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

      return `
        <div class="flex items-start gap-2.5 text-xs">
          <div class="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
            ${initial}
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-gray-800">${escapeHtml(authorName)}</span>
              <span class="text-[10px] text-gray-400">${timeStr}</span>
            </div>
            <p class="text-gray-600 text-[12px] leading-relaxed whitespace-pre-line">${escapeHtml(comment.text)}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. 댓글 글자 수 카운터
  commentInput.addEventListener('input', (e) => {
    commentCharCount.textContent = `${e.target.value.length}/300`;
  });

  // 4. 댓글 등록 API 호출
  submitCommentBtn.addEventListener('click', async () => {
    const text = commentInput.value.trim();
    if (!text) {
      alert('댓글을 입력해 주세요.');
      return;
    }

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author: '익명' })
      });

      if (!res.ok) throw new Error('댓글 등록에 실패했습니다.');

      commentInput.value = '';
      commentCharCount.textContent = '0/300';
      loadMemoDetail(); // 댓글 새로고침
    } catch (err) {
      alert(err.message);
    }
  });

  // XSS 방지용 이스케이프 헬퍼
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 최초 로드 실행
  loadMemoDetail();
});