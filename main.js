document.addEventListener('DOMContentLoaded', async () => {
  const memoGrid = document.getElementById('memoGrid');
  const memoCountText = document.getElementById('memoCountText');
  const searchInput = document.getElementById('searchInput');

  // 포스트잇 자연스러운 회전 효과용 Tailwind 클래스 배열
  const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2'];

  let allMemos = [];

  // 1. 메모 목록 불러오기 (GET /api/memos)
  async function loadMemos() {
    try {
      const res = await fetch('/api/memos');
      if (!res.ok) throw new Error('메모 목록을 불러오지 못했습니다.');
      
      allMemos = await res.json();
      renderMemos(allMemos);
    } catch (err) {
      console.error(err);
      memoGrid.innerHTML = `
        <div class="col-span-full text-center text-white/90 py-20">
          메모를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      `;
    }
  }

  // 2. 메모 카드 그리드 렌더링 함수
  function renderMemos(memos) {
    if (memoCountText) {
      memoCountText.textContent = `오늘 ${memos.length}개의 이야기가 새로 붙었어요`;
    }

    if (!memos || memos.length === 0) {
      memoGrid.innerHTML = `
        <div class="col-span-full text-center text-white/80 py-20">
          나무 벽이 비어 있습니다. 첫 번째 메모를 붙여보세요!
        </div>
      `;
      return;
    }

    memoGrid.innerHTML = memos.map((memo, idx) => {
      const rot = rotations[idx % rotations.length];
      const commentCount = memo.comments ? memo.comments.length : 0;
      const isTopMemo = idx === 1; // 2번째 메모를 데모 형태의 인기 메모로 표시

      return `
        <article 
          onclick="location.href='detail.html?id=${memo._id}'" 
          style="background-color: ${memo.color || '#FEF9C3'};" 
          class="rounded shadow-lg p-5 relative transform ${rot} hover:rotate-0 hover:scale-[1.02] transition duration-200 cursor-pointer flex flex-col justify-between min-h-[220px]"
        >
          <div class="pin absolute -top-1.5 left-1/2 -translate-x-1/2"></div>
          <div>
            ${isTopMemo ? `
              <span class="inline-block bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                오늘의 인기 메모
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
            <span>댓글 ${commentCount}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  // 3. 실시간 검색 필터링
  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();
    if (!keyword) {
      renderMemos(allMemos);
      return;
    }

    const filtered = allMemos.filter(memo => 
      memo.title.toLowerCase().includes(keyword) ||
      memo.content.toLowerCase().includes(keyword) ||
      (memo.author && memo.author.toLowerCase().includes(keyword))
    );

    renderMemos(filtered);
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

  // 초기 실행
  loadMemos();
});