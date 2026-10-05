document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('adminMemoTableBody');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const deleteSelectedText = document.getElementById('deleteSelectedText');
  const memoCountInfo = document.getElementById('memoCountInfo');
  const searchInput = document.getElementById('adminSearchInput');

  // 모달 관련 요소
  const modal = document.getElementById('adminDeleteModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const modalTargetTitle = document.getElementById('modalTargetTitle');
  const modalTargetSub = document.getElementById('modalTargetSub');

  let memos = [];
  let selectedIds = new Set();

  // 1. 메모 목록 가져오기
  async function fetchMemos() {
    try {
      const res = await fetch('/api/memos');
      memos = await res.json();
      renderTable(memos);
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-500">목록을 불러오지 못했습니다.</td></tr>`;
    }
  }

  // 2. 테이블 렌더링
  function renderTable(list) {
    if (!list || list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-400">등록된 게시물이 없습니다.</td></tr>`;
      updateSelectionUI();
      return;
    }

    tableBody.innerHTML = list.map(item => {
      const isChecked = selectedIds.has(item._id);
      const isReported = item.reports && item.reports > 0;
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : '-';
      const commentCount = item.comments ? item.comments.length : 0;

      return `
        <tr class="hover:bg-gray-50/50 transition ${isReported ? 'bg-[#FFF5F5]' : ''}">
          <td class="py-3 px-3">
            <input type="checkbox" data-id="${item._id}" class="row-checkbox rounded border-gray-300 w-3.5 h-3.5 cursor-pointer" ${isChecked ? 'checked' : ''} />
          </td>
          <td class="py-3 px-2">
            <div class="flex items-center gap-1.5">
              <p class="font-bold text-gray-800">${item.title}</p>
              ${isReported ? `<span class="bg-[#FFE3E3] text-[#E03131] text-[9px] font-bold px-1.5 py-0.5 rounded">신고 ${item.reports}</span>` : ''}
            </div>
            <p class="text-[11px] text-gray-400">${item.author || '익명'}</p>
          </td>
          <td class="py-3 px-2 text-center text-gray-400 text-[11px]">${dateStr}</td>
          <td class="py-3 px-2 text-center text-gray-500 text-[11px]">댓글 ${commentCount}</td>
          <td class="py-3 px-3 text-right space-x-1.5 text-[11px]">
            <a href="detail.html?id=${item._id}" class="text-gray-500 hover:text-gray-800">보기</a>
            <button onclick="openSingleDelete('${item._id}', '${item.title.replace(/'/g, "\\'")}')" class="text-red-500 hover:underline">삭제</button>
          </td>
        </tr>
      `;
    }).join('');

    bindCheckboxEvents();
    updateSelectionUI();
  }

  // 3. 체크박스 이벤트 바인딩
  function bindCheckboxEvents() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateSelectionUI();
      });
    });
  }

  // 4. 선택 카운트 및 UI 업데이트
  function updateSelectionUI() {
    const total = memos.length;
    const selectedCount = selectedIds.size;

    memoCountInfo.textContent = `전체 ${total}개 · 선택 ${selectedCount}개`;
    deleteSelectedText.textContent = `선택 삭제 (${selectedCount})`;

    if (selectedCount > 0) {
      deleteSelectedBtn.disabled = false;
      deleteSelectedBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      deleteSelectedBtn.disabled = true;
      deleteSelectedBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    selectAllCheckbox.checked = total > 0 && selectedCount === total;
  }

  // 전체 선택 체크박스
  selectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      memos.forEach(m => selectedIds.add(m._id));
    } else {
      selectedIds.clear();
    }
    renderTable(memos);
  });

  // 검색 필터링
  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = memos.filter(m => 
      m.title.toLowerCase().includes(keyword) || 
      (m.author && m.author.toLowerCase().includes(keyword))
    );
    renderTable(filtered);
  });

  // 모달 열기 (선택 삭제)
  deleteSelectedBtn.addEventListener('click', () => {
    if (selectedIds.size === 0) return;
    modalTargetTitle.textContent = `선택한 ${selectedIds.size}개 게시물`;
    modalTargetSub.textContent = `ID: ${Array.from(selectedIds).slice(0, 2).join(', ')}${selectedIds.size > 2 ? ' 외' : ''}`;
    modal.classList.remove('hidden');
  });

  // 단일 삭제 헬퍼 (전역 연결)
  window.openSingleDelete = function(id, title) {
    selectedIds.clear();
    selectedIds.add(id);
    modalTargetTitle.textContent = title;
    modalTargetSub.textContent = `ID: ${id}`;
    modal.classList.remove('hidden');
  };

  // 모달 닫기
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));

  // 삭제 확정 처리 (추후 DELETE API 연결)
  confirmDeleteBtn.addEventListener('click', async () => {
    alert(`선택된 ${selectedIds.size}건 삭제 처리가 완료되었습니다.`);
    modal.classList.add('hidden');
    selectedIds.clear();
    fetchMemos();
  });

  // 초기 로드
  fetchMemos();
});