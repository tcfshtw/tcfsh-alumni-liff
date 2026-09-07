// 檔案：admin.js

function promptAdminModal() {
  document.getElementById('adminPwd').value = '';
  document.getElementById('pwdErrorMsg').classList.add('hidden');
  document.getElementById('adminModal').classList.remove('hidden');
}

function verifyAdminPwd() { 
  if (document.getElementById('adminPwd').value === "tcfsh01") { 
    document.getElementById('adminModal').classList.add('hidden'); 
    switchTab('admin'); 
  } else { document.getElementById('pwdErrorMsg').classList.remove('hidden'); } 
}
function skipAdmin() { document.getElementById('adminModal').classList.add('hidden'); }

async function claimAdmin() {
  if(!confirm("確定綁定為首位系統管理員嗎？\n(請確認上方基本資料已經儲存完畢)")) return;
  document.getElementById('loadingView').classList.remove('hidden');
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'claimAdmin', lineUserId: currentUserLineId }) });
    const result = await response.json();
    if (result.status === 'success') { alert("👑 恭喜成為系統管理員。"); location.reload(); } else { alert("❌ 失敗: " + result.message); document.getElementById('loadingView').classList.add('hidden'); }
  } catch(err) { alert("❌ 錯誤"); document.getElementById('loadingView').classList.add('hidden'); }
}

async function searchMemberBtn() {
  const keyword = document.getElementById('searchKeyword').value;
  if (!keyword) return;
  await executeSearch('searchMember', { keyword: keyword });
}

async function searchByCohortBtn() {
  const cohort = document.getElementById('searchCohort').value;
  if (!cohort) return;
  await executeSearch('searchByCohort', { cohort: cohort });
}

async function executeSearch(action, params) {
  const resDiv = document.getElementById('searchResults');
  resDiv.innerHTML = '<p class="text-sm text-gray-500 text-center">搜尋中...</p>'; resDiv.classList.remove('hidden');
  try {
    const payload = Object.assign({ action: action, callerId: currentUserLineId }, params);
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if (result.status === 'success') {
      if(result.results.length === 0) { resDiv.innerHTML = '<p class="text-sm text-red-500 text-center">找不到會員</p>'; return; }
      resDiv.innerHTML = '';
      result.results.forEach(m => {
        const roleOptions = ['一般會員(校友)', '理事長', '副理事長', '常務監事', '常務理事', '監事', '理事', '顧問', '幹部(管理員)'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${r}</option>`).join('');
        const grantBtnHtml = `<button onclick="grantAdminAction('${m.lineUserId}', '${m.name}')" class="mt-2 w-full bg-purple-100 text-purple-800 border border-purple-300 font-bold py-2 rounded text-sm">👑 授予系統管理員權限</button>`;
        resDiv.innerHTML += `
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold text-blue-900">${m.name}</span>
              <div>
                <button onclick="viewMemberProfileAdmin('${m.lineUserId}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold mr-2">👁️ 檢視資料</button>
                <span class="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">${m.uniqueId}</span>
              </div>
            </div>
            <div class="flex gap-2"><select id="roleSelect_${m.uniqueId}" class="flex-1 border p-2 rounded text-sm outline-none">${roleOptions}</select><button onclick="updateRoleAction('${m.lineUserId}', '${m.uniqueId}')" class="bg-slate-700 text-white px-3 py-2 rounded text-sm font-bold">更新</button></div>
            ${grantBtnHtml}
          </div>`;
      });
    }
  } catch(err) { resDiv.innerHTML = '<p class="text-sm text-red-500 text-center">搜尋錯誤</p>'; }
}

async function viewMemberProfileAdmin(targetLineId) {
  document.getElementById('loadingView').classList.remove('hidden');
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getMemberDetailsAdmin', callerId: currentUserLineId, targetLineId: targetLineId }) });
    const result = await response.json();
    document.getElementById('loadingView').classList.add('hidden');
    if (result.status === 'success') {
      const p = result.profile;
      document.getElementById('adminProfileContent').innerHTML = `
        <p><b>姓名：</b>${p.name} (${p.gender})</p><p><b>代碼：</b>${p.uniqueId}</p>
        <p><b>電話：</b>${p.phone}</p><p><b>學號：</b>${p.studentId || '無'}</p>
        <hr class="my-2"><p><b>信箱：</b>${p.email || '未提供'}</p><p><b>地址：</b>${p.address || '未提供'}</p>
        <p><b>產業：</b>${p.industry || '未提供'}</p><p><b>單位：</b>${p.company || '未提供'}</p><p><b>職稱：</b>${p.jobTitle || '未提供'}</p>
      `;
      document.getElementById('adminProfileModal').classList.remove('hidden');
    } else { alert("❌ " + result.message); }
  } catch(e) { document.getElementById('loadingView').classList.add('hidden'); alert("❌ 讀取錯誤"); }
}

async function updateRoleAction(targetLineId, uniqueId) {
  const newRole = document.getElementById(`roleSelect_${uniqueId}`).value;
  if(!confirm(`變更身分標籤為「${newRole}」嗎？`)) return;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateMemberRole', callerId: currentUserLineId, targetLineId: targetLineId, newRole: newRole }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 更新成功！"); else alert("❌ 失敗");
  } catch(err) { alert("❌ 發生錯誤"); }
}

async function grantAdminAction(targetLineId, name) {
  if(!confirm(`授予「${name}」管理員權限嗎？`)) return;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'grantAdmin', callerId: currentUserLineId, targetLineId: targetLineId }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 授權成功！"); else alert("❌ 失敗: " + result.message);
  } catch(err) { alert("❌ 發生錯誤"); }
}

async function loadAdminEvents() {
  const container = document.getElementById('adminEventsContainer');
  container.innerHTML = '<p class="text-sm text-gray-500">載入中...</p>';
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEvents' }) });
    const result = await response.json();
    if (result.status === 'success') {
      container.innerHTML = '';
      if(result.events.length === 0) container.innerHTML = '<p class="text-sm text-gray-500">目前無活動</p>';
      result.events.forEach(evt => {
        const seatingBtn = evt.type === '聚餐' ? `<button onclick="openSeatingManager('${evt.id}', '${evt.title}')" class="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm font-bold shadow-sm mt-2">🍽️ 進入桌次安排系統</button>` : '';
        const resultBtn = `<button onclick="viewEventResults('${evt.id}', '${evt.date.substring(0,4)}', '${evt.title}', '${evt.type}')" class="w-full bg-teal-600 text-white px-3 py-2 rounded text-sm font-bold shadow-sm mt-2">📊 檢視參與/投票結果</button>`;
        
        container.innerHTML += `
          <div class="border border-gray-200 p-4 rounded-lg bg-gray-50 mb-3 shadow-sm">
            <div class="font-bold text-gray-800 text-lg">${evt.title}</div>
            <div class="text-xs text-gray-500 mt-1">📅 ${evt.date.replace('T', ' ')} | 📍 ${evt.location}</div>
            <div class="text-xs text-gray-500 mt-1">🏷️ ${evt.type} | 👥 ${evt.targetRoles}</div>
            ${seatingBtn}
            ${resultBtn}
          </div>`;
      });
    }
  } catch(e) { container.innerHTML = '載入失敗'; }
}

async function viewEventResults(eventId, year, title, type) {
  document.getElementById('resultModalTitle').innerText = title + " (" + type + "統計)";
  const content = document.getElementById('resultModalContent');
  content.innerHTML = '<p class="text-center text-gray-500 py-4">載入數據中...</p>';
  document.getElementById('adminEventResultModal').classList.remove('hidden');

  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEventResults', eventId: eventId, year: year }) });
    const result = await response.json();
    if (result.status === 'success') {
      if (result.total === 0) { content.innerHTML = '<p class="text-center text-gray-500 py-4">目前尚無任何紀錄</p>'; return; }
      content.innerHTML = `<p class="text-sm font-bold text-gray-700 mb-4 bg-gray-100 p-2 rounded">總計參與/投票人數：${result.total} 人</p>`;
      let sortedData = Object.entries(result.data).sort((a,b) => b[1] - a[1]);
      sortedData.forEach(item => {
        const optName = item[0];
        const count = item[1];
        const pct = Math.round((count / result.total) * 100);
        content.innerHTML += `
          <div class="mb-3">
            <div class="flex justify-between text-sm font-bold text-slate-700 mb-1">
              <span>${optName}</span><span class="text-blue-700">${count}票 (${pct}%)</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div class="bg-blue-600 h-3 rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>`;
      });
    } else { content.innerHTML = '<p class="text-center text-red-500 py-4">讀取失敗</p>'; }
  } catch(e) { content.innerHTML = '<p class="text-center text-red-500 py-4">發生錯誤</p>'; }
}

let currentSeatingEventId = "";
let seatingData = [];

async function openSeatingManager(eventId, title) {
  currentSeatingEventId = eventId;
  document.getElementById('seatingEventTitle').innerText = title + " - 桌次安排";
  document.getElementById('view-seating').classList.remove('hidden'); 
  if (document.getElementById('memberDatalist').options.length === 0) {
    fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAllMembersLite', callerId: currentUserLineId }) }).then(res => res.json()).then(res => {
      if (res.status === 'success') {
        const dl = document.getElementById('memberDatalist'); dl.innerHTML = '';
        res.members.forEach(m => dl.innerHTML += `<option value="${m}">`);
      }
    });
  }
  document.getElementById('printableSeating').innerHTML = '<p class="text-center py-10 text-gray-500">讀取中...</p>';
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getSeatingData', eventId: eventId }) });
    const result = await response.json();
    if (result.status === 'success') { seatingData = JSON.parse(result.seatingData || '[]'); renderSeatingGrid(); }
  } catch(e) { document.getElementById('printableSeating').innerHTML = '讀取失敗'; }
}

function closeSeatingManager() { document.getElementById('view-seating').classList.add('hidden'); }
function addTable(type, seats) {
  let num = seatingData.filter(t => t.type === 'normal').length + 1;
  let name = type === 'main' ? `主桌` : `第 ${num} 桌`;
  if (type === 'main') { const mainCount = seatingData.filter(t => t.type === 'main').length; if (mainCount > 0) name = `主桌 (${mainCount + 1})`; }
  seatingData.push({ id: 'T' + Date.now(), name: name, type: type, seats: seats, guests: new Array(seats).fill("") });
  renderSeatingGrid();
}
function removeTable(tableId) { if(!confirm("刪除此桌？")) return; seatingData = seatingData.filter(t => t.id !== tableId); renderSeatingGrid(); }
function updateGuestName(tableId, seatIndex, value) { const t = seatingData.find(t => t.id === tableId); if(t) t.guests[seatIndex] = value; }
function updateTableName(tableId, val) { const t = seatingData.find(t => t.id === tableId); if(t) t.name = val; }

function renderSeatingGrid() {
  const container = document.getElementById('printableSeating'); container.innerHTML = '';
  if (seatingData.length === 0) { container.innerHTML = '<p class="text-center text-gray-400 py-10 font-bold">尚無桌次，請由上方選單新增</p>'; return; }
  seatingData.forEach(table => {
    let seatHtml = '';
    for (let i = 0; i < table.seats; i++) {
      seatHtml += `<div class="flex items-center border-b border-gray-200 py-1.5"><span class="w-8 text-center text-xs text-gray-500 font-bold">${i+1}</span><input type="text" list="memberDatalist" value="${table.guests[i]}" onchange="updateGuestName('${table.id}', ${i}, this.value)" placeholder="點擊搜尋或輸入" class="flex-1 bg-transparent outline-none p-1 text-sm font-bold text-blue-900 placeholder-gray-300"></div>`;
    }
    container.innerHTML += `<div class="table-card bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden mb-6 page-break-avoid"><div class="bg-gray-200 border-b border-gray-300 px-3 py-2 flex justify-between items-center"><input type="text" value="${table.name}" onchange="updateTableName('${table.id}', this.value)" class="font-bold text-gray-800 bg-transparent outline-none w-32 focus:border-b border-gray-400"><span class="text-xs text-gray-500 font-bold">${table.seats} 人桌</span><button onclick="removeTable('${table.id}')" class="text-red-500 hover:text-red-700 no-print font-bold text-2xl leading-none">&times;</button></div><div class="p-3 grid grid-cols-2 gap-x-6 gap-y-1">${seatHtml}</div></div>`;
  });
}

async function saveSeatingToServer() {
  const btn = document.getElementById('saveSeatingBtn'); btn.innerText = "儲存中"; btn.disabled = true;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveSeatingData', eventId: currentSeatingEventId, seatingData: JSON.stringify(seatingData) }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 桌次儲存成功！"); else alert("❌ 儲存失敗");
  } catch(e) { alert("❌ 連線錯誤"); } finally { btn.innerText = "💾 儲存"; btn.disabled = false; }
}

let votingOptionsCount = 0;
function toggleAdminVotingSection() {
  const type = document.getElementById('evType').value;
  const section = document.getElementById('adminVotingSection');
  if (type === '投票') { section.classList.remove('hidden'); if(votingOptionsCount === 0) addVotingOptionUI(); } 
  else { section.classList.add('hidden'); document.getElementById('votingOptionsContainer').innerHTML = ""; votingOptionsCount = 0; }
}

function addVotingOptionUI() {
  votingOptionsCount++;
  const id = `voteOpt_${Date.now()}`;
  const html = `
    <div id="${id}" class="bg-white p-3 rounded border border-purple-200 relative shadow-sm">
      <button type="button" onclick="document.getElementById('${id}').remove()" class="absolute top-2 right-2 text-red-500 font-bold">&times;</button>
      <input type="text" placeholder="選項標題 (例: 方案A)" class="vote-opt-title w-full border-b border-gray-300 p-1 outline-none mb-2 font-bold text-purple-900" required>
      <textarea placeholder="選項說明 (選填)" class="vote-opt-desc w-full border border-gray-200 p-2 rounded text-sm outline-none mb-2" rows="2"></textarea>
      <input type="file" accept="image/*" class="vote-opt-img text-xs w-full">
    </div>`;
  document.getElementById('votingOptionsContainer').insertAdjacentHTML('beforeend', html);
}
