document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');

  // 관리자 권한 확인
  if (!currentUser || currentUser.role !== 'admin') {
    alert('관리자만 접근할 수 있는 페이지입니다.');
    window.location.href = 'index.html';
    return;
  }

  const reportListContainer = document.getElementById('reportListContainer');
  const reportSummaryText = document.getElementById('reportSummaryText');

  async function loadReports() {
    try {
      const res = await fetch(`/api/memo-report?isAdmin=true`);
      if (!res.ok) throw new Error('신고 내역을 불러오지 못했습니다.');
      const reportedMemos = await res.json();

      renderReports(reportedMemos);
    } catch (err) {
      reportListContainer.innerHTML = `
        <div class="text-center py-16 text-red-500 text-xs">
          ${err.message}
        </div>
      `;
    }
  }

  function renderReports(memos) {
    if (reportSummaryText) {
      reportSummaryText.textContent = `현재 총 ${memos.length}건의 신고된 메모가 있습니다.`;
    }

    if (!memos || memos.length === 0) {
      reportListContainer.innerHTML = `
        <div class="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-xs">
          현재 접수된 신고 메모가 없습니다. 깨끗한 나무판입니다! 🌿
        </div>
      `;
      return;
    }

    reportListContainer.innerHTML = memos.map(memo => {
      const reports = memo.reports || [];
      const reportCount = reports.length;

      return `
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between gap-6 items-start">
          <div class="flex-1 space-y-3">
            <div class="flex items-center gap-2">
              <span class="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                🚨 신고 ${reportCount}회
              </span>
              <span class="text-xs text-gray-400">작성자: <b class="text-gray-700">${escapeHtml(memo.author)}</b> ${memo.ownerUsername ? `(@${memo.ownerUsername})` : ''}</span>
              <span class="text-xs text-gray-400">· 메모 ID: #${memo._id.slice(-4)}</span>
            </div>

            <div>
              <a href="detail.html?id=${memo._id}" target="_blank" class="text-base font-bold text-gray-900 hover:underline hover:text-[#B04A36]">
                ${escapeHtml(memo.title)} ↗
              </a>
              <p class="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                ${escapeHtml(memo.content)}
              </p>
            </div>

            <!-- 접수된 사유 목록 -->
            <div class="pt-2 border-t border-gray-100">
              <span class="text-[11px] font-bold text-gray-700 block mb-1">접수된 사유:</span>
              <div class="flex flex-wrap gap-1.5">
                ${reports.map(r => `
                  <span class="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                    <b>${escapeHtml(r.reporter)}</b>:${escapeHtml(r.reason)}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- 조치 버튼 -->
          <div class="flex md:flex-col gap-2 w-full md:w-36 flex-shrink-0 justify-end">
            <button 
              type="button" 
              onclick="dismissReport('${memo._id}')" 
              class="flex-1 md:flex-none px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition"
            >
              신고 반려
            </button>
            <button 
              type="button" 
              onclick="deleteReportedMemo('${memo._id}', '${escapeHtml(memo.title)}')" 
              class="flex-1 md:flex-none px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              강제 삭제
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 신고 반려 처리
  window.dismissReport = async (memoId) => {
    if (!confirm('이 메모의 신고 내역을 반려(초기화)하시겠습니까?')) return;

    try {
      const res = await fetch('/api/memo-report', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoId, isAdmin: true })
      });

      if (!res.ok) throw new Error('반려 처리에 실패했습니다.');
      alert('신고 내역이 반려되었습니다.');
      loadReports();
    } catch (err) {
      alert(err.message);
    }
  };

  // 관리자 권한 강제 삭제
  window.deleteReportedMemo = async (memoId, title) => {
    if (!confirm(`'${title}' 메모를 영구 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: true })
      });

      if (!res.ok) throw new Error('메모 삭제에 실패했습니다.');
      alert('메모가 삭제되었습니다.');
      loadReports();
    } catch (err) {
      alert(err.message);
    }
  };

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  loadReports();
});