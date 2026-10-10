document.addEventListener('DOMContentLoaded', async () => {
  const memoGrid = document.getElementById('memoGrid');
  const memoCountText = document.getElementById('memoCountText');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  // 포스트잇 자연스러운 회전 효과용 Tailwind 클래스 배열
  const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2'];

  let allMemos = [];
  let currentSort = 'recent'; // 기본 정렬: 최근 작성순

  // 1. 메모 목록 불러오기 (GET /api/memos)
  async function loadMemos() {
    try {
      const res = await fetch('/api/memos');
      if (!res.ok) throw new Error('메모 목록을 불러오지 못했습니다.');
      
      allMemos = await res.json();
      applyFilterAndSort();
    } catch (err) {
      console.error(err);
      memoGrid.innerHTML = `
        <div class="col-span-full text-center text-white/90 py-20">
          메모를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      `;
    }
  }

  // 오늘 날짜 자정(00:00:00) 기준 타임스탬프 계산
  function getStartOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  // 정렬 알고리즘 함수
  function sortMemos(list, criterion) {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const viewsA = a.views || 0;
      const viewsB = b.views || 0;
      const likesA = a.likes || 0;
      const likesB = b.likes || 0;

      switch (criterion) {
        case 'recent': // 최근 작성순 (최신순)
          return timeB - timeA;
        case 'oldest': // 가장 오래된순 (과거순)
          return timeA - timeB;
        case 'views': // 조회수순
          return viewsB - viewsA || timeB - timeA;
        case 'likes': // 공감수순
          return likesB - likesA || timeB - timeA;
        default:
          return timeB - timeA;
      }
    });
  }

  // 필터링 및 정렬 통합 처리 함수
  function applyFilterAndSort() {
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let result = allMemos;

    // 검색어 필터링
    if (keyword) {
      result = result.filter(memo => 
        memo.title.toLowerCase().includes(keyword) ||
        memo.content.toLowerCase().includes(keyword) ||
        (memo.author && memo.author.toLowerCase().includes(keyword))
      );
    }

    // 정렬 적용
    result = sortMemos(result, currentSort);
    renderMemos(result);
  }

  // 2. 메모 카드 그리드 렌더링 함수
  function renderMemos(memos) {
    if (memoCountText) {
      memoCountText.textContent = `오늘 ${allMemos.length}개의 이야기가 새로 붙었어요`;
    }

    if (!memos || memos.length === 0) {
      memoGrid.innerHTML = `
        <div class="col-span-full text-center text-white/80 py-20">
          표시할 메모가 없습니다.
        </div>
      `;
      return;
    }

    // --- 당일 최다 공감(likes) 메모 선정 ---
    const startOfToday = getStartOfToday();
    const todayMemosWithLikes = allMemos.filter(memo => {
      const created = memo.createdAt ? new Date(memo.createdAt).getTime() : 0;
      return created >= startOfToday && (memo.likes || 0) > 0;
    });

    let topMemoId = null;

    if (todayMemosWithLikes.length > 0) {
      todayMemosWithLikes.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      topMemoId = todayMemosWithLikes[0]._id;
    } else {
      const overallWithLikes = allMemos
        .filter(memo => (memo.likes || 0) > 0)
        .sort((a, b) => (b.likes || 0) - (a.likes || 0));

      if (overallWithLikes.length > 0) {
        topMemoId = overallWithLikes[0]._id;
      }
    }

    memoGrid.innerHTML = memos.map((memo, idx) => {
      const rot = rotations[idx % rotations.length];
      const commentCount = memo.comments ? memo.comments.length : 0;
      const likeCount = memo.likes || 0;
      const viewsCount = memo.views || 0;
      const isTopMemo = topMemoId && memo._id === topMemoId;

      return `
        <article 
          onclick="location.href='detail.html?id=${memo._id}'" 
          style="background-color: ${memo.color || '#FEF9C3'};" 
          class="rounded shadow-lg p-5 relative transform ${rot} hover:rotate-0 hover:scale-[1.02] transition duration-200 cursor-pointer flex flex-col justify-between min-h-[220px]"
        >
          <div class="pin absolute -top-1.5 left-1/2 -translate-x-1/2"></div>
          <div>
            ${isTopMemo ? `
              <span class="inline-flex items-center gap-1 bg-[#D9480F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 shadow-sm">
                <span>★</span> 오늘의 인기 메모
              </span>
            ` : ''}
            <h3 class="font-bold text-lg text-gray-900 mb-2 leading-snug break-words">
              ${escapeHtml(memo.title)}
            </h3>
            <p class="text-xs text-gray-700 leading-relaxed line-clamp-4 break-words">
              ${escapeHtml(memo.content)}
            </p>
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-500 pt-4 mt-auto border-t border-black/5">
            <span class="font-semibold text-gray-700">${escapeHtml(memo.author || '익명')}</span>
            <div class="flex items-center gap-2 text-stone-500 text-[10px]">
              <span title="조회수">조회 ${viewsCount}</span>
              <span title="공감수">♡ ${likeCount}</span>
              <span title="댓글수">댓글 ${commentCount}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // 3. 정렬 옵션 변경 이벤트
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFilterAndSort();
    });
  }

  // 4. 실시간 검색 필터링 이벤트
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilterAndSort();
    });
  }

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

  // 초기 실행
  loadMemos();
});