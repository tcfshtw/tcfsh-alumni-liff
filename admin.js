// 檔案：admin.js

function verifyAdminPwd() { 
  if (document.getElementById('adminPwd').value === "tcfsh01") { 
    document.getElementById('adminModal').classList.add('hidden'); 
    switchTab('admin'); 
    document.getElementById('adminEntryBtn').classList.remove('hidden'); 
  } else { 
    document.getElementById('pwdErrorMsg').classList.remove('hidden'); 
  } 
}
function skipAdmin() { document.getElementById('adminModal').classList.add('hidden'); switchTab('profile'); }

async function claimSuperAdmin() {
  if(!confirm("確定綁定為『初始超級管理員』嗎？")) return;
  document.getElementById('loadingView').classList.remove('hidden');
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'claimSuperAdmin', lineUserId: currentUserLineId }) });
    const result = await response.json();
    if (result.status === 'success') { alert("👑 恭喜成為超級管理員。"); location.reload(); } 
    else { alert("❌ 註冊失敗：" + result.message); document.getElementById('loadingView').classList.add('hidden'); }
  } catch(err) { alert("❌ 發生錯誤"); document.getElementById('loadingView').classList.add('hidden'); }
}

async function searchMemberBtn() {
  const keyword = document.getElementById('searchKeyword').value;
  if (!keyword) return;
  const resDiv = document.getElementById('searchResults');
  resDiv.innerHTML = '<p class="text-sm text-gray-500 text-center">搜尋中...</p>';
  resDiv.classList.remove('hidden');
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'searchMember', callerId: currentUserLineId, keyword: keyword }) });
    const result = await response.json();
    if (result.status === 'success') {
      if(result.results.length === 0) { resDiv.innerHTML = '<p class="text-sm text-red-500 text-center">找不到會員</p>'; return; }
      resDiv.innerHTML = '';
      result.results.forEach(m => {
        const roleOptions = ['一般會員(校友)', '理事長', '副理事長', '常務監事', '常務理事', '監事', '理事', '顧問', '幹部(管理員)'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${r}</option>`).join('');
        const grantBtnHtml = isSuperAdminUser ? `<button onclick="grantAdminAction('${m.lineUserId}', '${m.name}')" class="mt-2 w-full bg-purple-100 text-purple-800 border border-purple-300 font-bold py-2 rounded shadow-sm text-sm">👑 授予系統後台權限</button>` : '';
        resDiv.innerHTML += `
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-blue-900">${m.name}</span><span class="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">${m.uniqueId}</span></div>
            <div class="flex gap-2"><select id="roleSelect_${m.uniqueId}" class="flex-1 border border-gray-300 p-2 rounded text-sm outline-none">${roleOptions}</select><button onclick="updateRoleAction('${m.lineUserId}', '${m.uniqueId}')" class="bg-slate-700 text-white px-3 py-2 rounded text-sm font-bold">更新身分</button></div>
            ${grantBtnHtml}
          </div>`;
      });
    }
  } catch(err) { resDiv.innerHTML = '<p class="text-sm text-red-500 text-center">搜尋發生錯誤</p>'; }
}

async function updateRoleAction(targetLineId, uniqueId) {
  const newRole = document.getElementById(`roleSelect_${uniqueId}`).value;
  if(!confirm(`變更身分標籤為「${newRole}」嗎？`)) return;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateMemberRole', callerId: currentUserLineId, targetLineId: targetLineId, newRole: newRole }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 更新成功！"); else alert("❌ 失敗：" + result.message);
  } catch(err) { alert("❌ 發生錯誤"); }
}

async function grantAdminAction(targetLineId, name) {
  if(!confirm(`授予「${name}」後台權限嗎？`)) return;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'grantAdmin', callerId: currentUserLineId, targetLineId: targetLineId }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 授權成功！"); else alert("❌ 失敗：" + result.message);
  } catch(err) { alert("❌ 發生錯誤"); }
}
