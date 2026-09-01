// 檔案：admin.js
function verifyAdminPwd() { 
  if (document.getElementById('adminPwd').value === "tcfsh01") { 
    document.getElementById('adminModal').classList.add('hidden'); 
    switchTab('admin'); document.getElementById('adminEntryBtn').classList.remove('hidden'); 
  } else { document.getElementById('pwdErrorMsg').classList.remove('hidden'); } 
}
function skipAdmin() { document.getElementById('adminModal').classList.add('hidden'); switchTab('profile'); }

async function claimSuperAdmin() {
  if(!confirm("確定綁定為初始超級管理員嗎？")) return;
  document.getElementById('loadingView').classList.remove('hidden');
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'claimSuperAdmin', lineUserId: currentUserLineId }) });
    const result = await response.json();
    if (result.status === 'success') { alert("👑 恭喜成為超級管理員。"); location.reload(); } else { alert("❌ 失敗"); document.getElementById('loadingView').classList.add('hidden'); }
  } catch(err) { alert("❌ 錯誤"); document.getElementById('loadingView').classList.add('hidden'); }
}

async function searchMemberBtn() {
  const keyword = document.getElementById('searchKeyword').value;
  if (!keyword) return;
  const resDiv = document.getElementById('searchResults');
  resDiv.innerHTML = '<p class="text-sm text-gray-500 text-center">搜尋中...</p>'; resDiv.classList.remove('hidden');
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'searchMember', callerId: currentUserLineId, keyword: keyword }) });
    const result = await response.json();
    if (result.status === 'success') {
      if(result.results.length === 0) { resDiv.innerHTML = '<p class="text-sm text-red-500 text-center">找不到會員</p>'; return; }
      resDiv.innerHTML = '';
      result.results.forEach(m => {
        const roleOptions = ['一般會員(校友)', '理事長', '副理事長', '常務監事', '常務理事', '監事', '理事', '顧問', '幹部(管理員)'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${r}</option>`).join('');
        const grantBtnHtml = isSuperAdminUser ? `<button onclick="grantAdminAction('${m.lineUserId}', '${m.name}')" class="mt-2 w-full bg-purple-100 text-purple-800 border border-purple-300 font-bold py-2 rounded text-sm">👑 授予系統後台權限</button>` : '';
        resDiv.innerHTML += `
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div class="flex justify-between items-center mb-2"><span class="font-bold text-blue-900">${m.name}</span><span class="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">${m.uniqueId}</span></div>
            <div class="flex gap-2"><select id="roleSelect_${m.uniqueId}" class="flex-1 border p-2 rounded text-sm outline-none">${roleOptions}</select><button onclick="updateRoleAction('${m.lineUserId}', '${m.uniqueId}')" class="bg-slate-700 text-white px-3 py-2 rounded text-sm font-bold">更新</button></div>
            ${grantBtnHtml}
          </div>`;
      });
    }
  } catch(err) { resDiv.innerHTML = '<p class="text-sm text-red-500 text-center">搜尋錯誤</p>'; }
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
  if(!confirm(`授予「${name}」後台權限嗎？`)) return;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'grantAdmin', callerId: currentUserLineId, targetLineId: targetLineId }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 授權成功！"); else alert("❌ 失敗");
  } catch(err) { alert("❌ 發生錯誤"); }
}

// ---------------------------------------------
// 管理員後台活動與桌次管理
// ---------------------------------------------
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
        const btnHtml = evt.type === '聚餐' ? `<button onclick="openSeatingManager('${evt.id}', '${evt.title}')" class="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm font-bold shadow-sm mt-3">🍽️ 進入桌次安排系統</button>` : '';
        container.innerHTML += `
          <div class="border border-gray-200 p-4 rounded-lg bg-gray-50 mb-3 shadow-sm">
            <div class="font-bold text-gray-800 text-lg">${evt.title}</div>
            <div class="text-xs text-gray-500 mt-1">📅 ${evt.date.replace('T', ' ')} | 📍 ${evt.location}</div>
            <div class="text-xs text-gray-500 mt-1">🏷️ ${evt.type} | 👥 ${evt.targetRoles}</div>
            ${btnHtml}
          </div>`;
      });
    }
  } catch(e) { container.innerHTML = '載入失敗'; }
}

let currentSeatingEventId = "";
let seatingData = [];

async function openSeatingManager(eventId, title) {
  currentSeatingEventId = eventId;
  document.getElementById('seatingEventTitle').innerText = title + " - 桌次安排";
  document.getElementById('view-seating').classList.remove('hidden'); 

  // 載入搜尋名單
  if (document.getElementById('memberDatalist').options.length === 0) {
    fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAllMembersLite', callerId: currentUserLineId }) })
    .then(res => res.json()).then(res => {
      if (res.status === 'success') {
        const dl = document.getElementById('memberDatalist'); dl.innerHTML = '';
        res.members.forEach(m => dl.innerHTML += `<option value="${m}">`);
      }
    });
  }

  document.getElementById('printableSeating').innerHTML = '<p class="text-center py-10 text-gray-500">讀取桌次中...</p>';
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getSeatingData', eventId: eventId }) });
    const result = await response.json();
    if (result.status === 'success') {
      seatingData = JSON.parse(result.seatingData || '[]');
      renderSeatingGrid();
    }
  } catch(e) { document.getElementById('printableSeating').innerHTML = '讀取失敗'; }
}

function closeSeatingManager() { document.getElementById('view-seating').classList.add('hidden'); }

function addTable(type, seats) {
  let num = seatingData.filter(t => t.type === 'normal').length + 1;
  let name = type === 'main' ? `主桌` : `第 ${num} 桌`;
  if (type === 'main') {
    const mainCount = seatingData.filter(t => t.type === 'main').length;
    if (mainCount > 0) name = `主桌 (${mainCount + 1})`;
  }
  seatingData.push({ id: 'T' + Date.now(), name: name, type: type, seats: seats, guests: new Array(seats).fill("") });
  renderSeatingGrid();
}

function removeTable(tableId) {
  if(!confirm("確定要刪除此桌嗎？")) return;
  seatingData = seatingData.filter(t => t.id !== tableId);
  renderSeatingGrid();
}

function updateGuestName(tableId, seatIndex, value) {
  const t = seatingData.find(t => t.id === tableId);
  if(t) t.guests[seatIndex] = value;
}
function updateTableName(tableId, val) {
  const t = seatingData.find(t => t.id === tableId);
  if(t) t.name = val;
}

function renderSeatingGrid() {
  const container = document.getElementById('printableSeating');
  container.innerHTML = '';
  if (seatingData.length === 0) { container.innerHTML = '<p class="text-center text-gray-400 py-10 font-bold">尚無桌次，請由上方選單新增</p>'; return; }

  seatingData.forEach(table => {
    let seatHtml = '';
    for (let i = 0; i < table.seats; i++) {
      seatHtml += `
        <div class="flex items-center border-b border-gray-200 py-1.5">
          <span class="w-8 text-center text-xs text-gray-500 font-bold">${i+1}</span>
          <input type="text" list="memberDatalist" value="${table.guests[i]}" onchange="updateGuestName('${table.id}', ${i}, this.value)" placeholder="點擊搜尋或輸入" class="flex-1 bg-transparent outline-none p-1 text-sm font-bold text-blue-900 placeholder-gray-300">
        </div>`;
    }
    container.innerHTML += `
      <div class="table-card bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden mb-6 page-break-avoid">
        <div class="bg-gray-200 border-b border-gray-300 px-3 py-2 flex justify-between items-center">
          <input type="text" value="${table.name}" onchange="updateTableName('${table.id}', this.value)" class="font-bold text-gray-800 bg-transparent outline-none w-32 focus:border-b border-gray-400">
          <span class="text-xs text-gray-500 font-bold">${table.seats} 人桌</span>
          <button onclick="removeTable('${table.id}')" class="text-red-500 hover:text-red-700 no-print font-bold text-2xl leading-none">&times;</button>
        </div>
        <div class="p-3 grid grid-cols-2 gap-x-6 gap-y-1">
          ${seatHtml}
        </div>
      </div>`;
  });
}

async function saveSeatingToServer() {
  const btn = document.getElementById('saveSeatingBtn');
  btn.innerText = "儲存中"; btn.disabled = true;
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveSeatingData', eventId: currentSeatingEventId, seatingData: JSON.stringify(seatingData) }) });
    const result = await response.json();
    if (result.status === 'success') alert("✅ 桌次儲存成功！並已自動生成 Excel 報到表。");
    else alert("❌ 儲存失敗");
  } catch(e) { alert("❌ 連線錯誤"); } finally { btn.innerText = "💾 儲存桌次"; btn.disabled = false; }
}
