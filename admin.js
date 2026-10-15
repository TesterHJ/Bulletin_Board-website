// 1. 관리자 권한 즉시 확인 (화면 렌더링 깜빡임 방지)
const currentUser = JSON.parse(localStorage.getItem('tree_memo_user') || 'null');
if (!currentUser || currentUser.role !== 'admin') {
  alert('관리자만 접근할 수 있는 페이지입니다.');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  const adminMemoList = document.getElementById('adminMemoList');

  async function loadAdminMemos() {
    try {
      const res = await fetch('/api/memos');
      if (!res.ok) throw new Error('메모 목록을 불러오지 못했습니다.');
      const memos = await res.json();

      renderAdminTable(memos);
    } catch (err) {
      adminMemoList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-10 text-red-500">
            ${err.message}
          </td>
        </tr>
      `;
    }
  }

  function renderAdminTable(memos) {
    if (!memos || memos.length === 0) {
      adminMemoList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-12 text-gray-400">
            등록된 메모가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    adminMemoList.innerHTML = memos.map(memo => {
      const createdDate = memo.createdAt 
        ? new Date(memo.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : '-';

      const shortId = `#${memo._id.slice(-4)}`;
      const authorName = memo.author || '익명';
      const isAnonymous = authorName === '익명';

      return `
        <tr class="hover:bg-gray-50/80 transition group">
          <td class="py-3.5 px-4 font-mono text-gray-400 text-[11px]">${shortId}</td>
          <td class="py-3.5 px-4 font-semibold text-gray-800 max-w-xs truncate">
            <a href="detail.html?id=${memo._id}" target="_blank" class="hover:text-[#B04A36] hover:underline" title="새 탭에서 보기">
              ${escapeHtml(memo.title)}
            </a>
          </td>
          <td class="py-3.5 px-4">
            <span class="${isAnonymous ? 'text-gray-400' : 'text-gray-700 font-medium'}">
              ${escapeHtml(authorName)}
            </span>
            ${memo.ownerUsername ? `<span class="text-[10px] text-gray-400 block font-mono">(@${escapeHtml(memo.ownerUsername)})</span>` : ''}
          </td>
          <td class="py-3.5 px-4 text-gray-400">${createdDate}</td>
          <td class="py-3.5 px-4 text-center">
            <button 
              type="button" 
              onclick="deleteMemoByAdmin('${memo._id}', '${escapeHtml(memo.title)}')"
              class="px-2.5 py-1 bg-[#FFF5F5] hover:bg-[#FFE3E3] text-[#E03131] border border-[#FFA8A8] rounded text-[11px] font-bold transition active:scale-95"
            >
              강제 삭제
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 관리자 권한 강제 삭제 (백엔드 파라미터 매칭)
  window.deleteMemoByAdmin = async (memoId, title) => {
    if (!confirm(`'${title}' 메모를 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/memo-detail?id=${memoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdmin: true,
          requesterUsername: currentUser ? currentUser.username : '',
          requesterNickname: currentUser ? currentUser.nickname : ''
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');

      alert('메모가 삭제되었습니다.');
      loadAdminMemos();
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

  loadAdminMemos();
});