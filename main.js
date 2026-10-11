document.addEventListener('DOMContentLoaded', async () => {
  const memoGrid = document.getElementById('memoGrid');
  const memoCountText = document.getElementById('memoCountText');
  const searchInput = document.getElementById('searchInput');
  const sortPills = document.querySelectorAll('.sort-pill');

  const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2'];

  let allMemos = [];
  let currentSort = 'recent';

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

  function getStartOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  function sortMemos(list, criterion) {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const viewsA = a.views || 0;
      const viewsB = b.views || 0;
      const likesA = a.likes || 0;
      const likesB = b.likes || 0;

      switch (criterion) {
        case 'recent':
          return timeB - timeA;
        case 'oldest':
          return timeA - timeB;
        case 'views':
          return viewsB - viewsA || timeB - timeA;
        case 'likes':
          return likesB - likesA || timeB - timeA;
        default:
          return timeB - timeA;
      }
    });
  }

  function applyFilterAndSort() {
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let result = allMemos;

    if (keyword) {
      result = result.filter(memo => 
        memo.title.toLowerCase().includes(keyword) ||
        memo.content.toLowerCase().includes(keyword) ||
        (memo.author && memo.author.toLowerCase().includes(keyword))
      );
    }

    result = sortMemos(result, currentSort);
    renderMemos(result);
  }

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

      // 블랙/다크 색상일 때 글자색 및 테두리 처리
      const isDark = memo.color === '#2D3436';
      const titleColor = isDark ? 'text-white' : 'text-gray-900';
      const contentColor = isDark ? 'text-gray-200' : 'text-gray-700';
      const authorColor = isDark ? 'text-gray-300' : 'text-gray-700';
      const metaColor = isDark ? 'text-gray-400' : 'text-stone-500';
      const dividerColor = isDark ? 'border-white/10' : 'border-black/5';

      return `
        <article 
          onclick="location.href='detail.html?id=${memo._id}'" 
          style="background-color: ${memo.color || '#FEF9C3'};" 
          class="rounded shadow-xl p-5 relative transform ${rot} hover:rotate-0 hover:scale-[1.02] transition duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] ${isDark ? 'border border-gray-600/40' : ''}"
        >
          <div class="pin absolute -top-1.5 left-1/2 -translate-x-1/2"></div>
          <div>
            ${isDark ? `
              <span class="inline-flex items-center gap-1 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 shadow-sm">
                👑 관리자 메모
              </span>
            ` : ''}
            ${isTopMemo ? `
              <span class="inline-flex items-center gap-1 bg-[#D9480F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 shadow-sm">
                <span>★</span> 오늘의 인기 메모
              </span>
            ` : ''}
            <h3 class="font-bold text-lg ${titleColor} mb-2 leading-snug break-words">
              ${escapeHtml(memo.title)}
            </h3>
            <p class="text-xs ${contentColor} leading-relaxed line-clamp-4 break-words">
              ${escapeHtml(memo.content)}
            </p>
          </div>
          <div class="flex items-center justify-between text-[11px] pt-4 mt-auto border-t ${dividerColor}">
            <span class="font-semibold ${authorColor}">${escapeHtml(memo.author || '익명')}</span>
            <div class="flex items-center gap-2 ${metaColor} text-[10px]">
              <span title="조회수">조회 ${viewsCount}</span>
              <span title="공감수">♡ ${likeCount}</span>
              <span title="댓글수">댓글 ${commentCount}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // 알약 정렬 칩 클릭 이벤트
  sortPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const selectedSort = pill.getAttribute('data-sort');
      if (currentSort === selectedSort) return;

      currentSort = selectedSort;

      sortPills.forEach(p => {
        if (p.getAttribute('data-sort') === currentSort) {
          p.className = 'sort-pill px-3 py-1 rounded-full text-xs font-bold transition duration-150 bg-[#B04A36] text-white shadow-sm';
        } else {
          p.className = 'sort-pill px-3 py-1 rounded-full text-xs font-medium transition duration-150 text-white/80 hover:text-white hover:bg-white/10';
        }
      });

      applyFilterAndSort();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilterAndSort);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  loadMemos();
});