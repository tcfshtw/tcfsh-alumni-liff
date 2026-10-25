// 檔案：admin.js

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
        const roleOptions = ['一般會員(校友)', '理事長', '副理事長', '常務監事', '常務理事', '監事', '理事', '顧問', '幹部', '幹部(管理員)'].map(r => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${r}</option>`).join('');
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

// 宣告全域變數，供編輯模式使用
window.adminEvents = []; 
window.editingEventId = null;

async function loadAdminEvents() {
  const container = document.getElementById('adminEventsContainer');
  container.innerHTML = '<p class="text-sm text-gray-500">載入中...</p>';
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEvents' }) });
    const result = await response.json();
    if (result.status === 'success') {
      window.adminEvents = result.events; // 儲存供編輯還原使用
      container.innerHTML = '';
      if(result.events.length === 0) container.innerHTML = '<p class="text-sm text-gray-500">目前無活動</p>';
      result.events.forEach(evt => {
        const seatingBtn = evt.type === '聚餐' ? `<button onclick="openSeatingManager('${evt.id}', '${evt.title}')" class="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm font-bold shadow-sm mt-2 hover:bg-purple-700">🍽️ 進入桌次安排系統</button>` : '';
        const resultBtn = `<button onclick="viewEventResults('${evt.id}', '${evt.date.substring(0,4)}', '${evt.title}', '${evt.type}')" class="w-full bg-teal-600 text-white px-3 py-2 rounded text-sm font-bold shadow-sm mt-2 hover:bg-teal-700">📊 檢視參與/結果</button>`;
        
        // 🌟 加入編輯按鈕與刪除按鈕，排版優化
        const actionHtml = `
          <div class="flex gap-2 mt-2">
            <button onclick="editEventAction('${evt.id}')" class="flex-1 bg-amber-100 text-amber-700 px-3 py-2 rounded text-sm font-bold shadow-sm hover:bg-amber-200">✏️ 編輯修改</button>
            <button onclick="deleteEventAction('${evt.id}', '${evt.title}')" class="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-bold shadow-sm hover:bg-red-200">🗑️ 刪除活動</button>
          </div>
        `;
        
        container.innerHTML += `
          <div class="border border-gray-200 p-4 rounded-lg bg-gray-50 mb-3 shadow-sm">
            <div class="font-bold text-gray-800 text-lg">${evt.title}</div>
            <div class="text-xs text-gray-500 mt-1">📅 ${evt.date.replace('T', ' ')} | 📍 ${evt.location}</div>
            <div class="text-xs text-gray-500 mt-1">🏷️ ${evt.type} | 👥 ${evt.targetRoles}</div>
            ${seatingBtn}
            ${resultBtn}
            ${actionHtml}
          </div>`;
      });
    }
  } catch(e) { container.innerHTML = '載入失敗'; }
}

// 🌟 新增：編輯活動還原資料引擎
function editEventAction(eventId) {
  const evt = window.adminEvents.find(e => e.id === eventId);
  if(!evt) return;

  window.editingEventId = eventId;
  
  // 切換按鈕狀態為藍色更新按鈕
  document.getElementById('createEventFormTitle').innerHTML = `<span class="bg-blue-200 p-1.5 rounded-lg text-blue-800">✏️</span> 編輯活動修改 (ID: ${eventId.slice(-4)})`;
  const btn = document.getElementById('createEventBtn');
  btn.innerText = "💾 儲存修改";
  btn.className = "w-full bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 text-lg hover:bg-blue-800 transition active:scale-95 border-b-4 border-blue-900";

  // 基本資料回填
  document.getElementById('evTitle').value = evt.title;
  document.getElementById('evType').value = evt.type;
  // datetime-local 需要 yyyy-MM-ddThh:mm 格式，從回傳的 ISO 截斷即可
  document.getElementById('evDate').value = evt.date ? evt.date.slice(0, 16) : '';
  document.getElementById('evDeadline').value = evt.deadline ? evt.deadline.slice(0, 16) : '';
  document.getElementById('evLoc').value = evt.location;
  document.getElementById('evRole').value = evt.targetRoles;
  toggleRoleInput();
  document.getElementById('evCohort').value = (evt.targetCohorts !== '全部' && evt.targetCohorts !== '不適用') ? evt.targetCohorts : '';
  document.getElementById('evContent').value = evt.content;

  // 宣傳圖片回填
  selectedImages = evt.imageUrls ? evt.imageUrls.split(',').filter(u => u !== "") : [];
  if (typeof renderImagePreviews === 'function') renderImagePreviews();

  // 問卷/投票區塊還原
  document.getElementById('votingOptionsContainer').innerHTML = "";
  votingOptionsCount = 0;
  toggleAdminVotingSection();

  if ((evt.type.includes('問卷') || evt.type.includes('投票')) && evt.extraData) {
    let options = [];
    try { options = JSON.parse(evt.extraData); } catch(e){}
    options.forEach(opt => {
      // 呼叫 addVotingOptionUI 時傳入舊有設定進行重建
      addVotingOptionUI(opt);
    });
  }

  // 畫面平滑捲動至建立表單區
  document.getElementById('createEventForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteEventAction(eventId, title) {
  if(!confirm(`⚠️ 確定要永久刪除活動「${title}」嗎？\n\n這會將活動從前台撤下，但系統會安全保留報名歷史以防萬一。`)) return;
  document.getElementById('loadingView').classList.remove('hidden');
  try {
    const payload = { action: 'deleteEvent', eventId: eventId };
    const response = await fetch(GAS_API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(payload) 
    });
    const result = await response.json();
    document.getElementById('loadingView').classList.add('hidden');
    if (result.status === 'success') {
      alert("✅ 已成功刪除活動！");
      loadAdminEvents();
      if(typeof loadEvents === 'function') loadEvents(); 
    } else {
      alert("❌ 刪除失敗：" + result.message);
    }
  } catch(e) { 
    document.getElementById('loadingView').classList.add('hidden'); 
    alert("❌ 連線錯誤"); 
  }
}

async function viewEventResults(eventId, year, title, type) {
  document.getElementById('resultModalTitle').innerText = title + " (統計)";
  const content = document.getElementById('resultModalContent');
  content.innerHTML = '<p class="text-center text-gray-500 py-4">載入數據中...</p>';
  document.getElementById('adminEventResultModal').classList.remove('hidden');

  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEventResults', eventId: eventId, year: year, type: type }) });
    const result = await response.json();
    if (result.status === 'success') {
      if (result.total === 0) { content.innerHTML = '<p class="text-center text-gray-500 py-4">目前尚無任何紀錄</p>'; return; }
      content.innerHTML = `<p class="text-sm font-bold text-gray-700 mb-4 bg-gray-100 p-2 rounded">總計參與/作答數：${result.total} 筆</p>`;
      
      let sortedData = Object.entries(result.data).sort((a,b) => b[1] - a[1]);
      let currentQuestion = "";

      sortedData.forEach(item => {
        const fullStr = item[0];
        const count = item[1];
        
        if (type.includes('問卷') || type.includes('投票')) {
          let match = fullStr.match(/^\[(.*?)\]\s*(.*)$/);
          if (match) {
            let qTitle = match[1];
            let ansStr = match[2];
            
            if (qTitle !== currentQuestion) {
              content.innerHTML += `<div class="mt-4 mb-2 p-2 bg-purple-100 rounded-lg text-sm text-purple-900 font-black border border-purple-200">📌 Q: ${qTitle}</div>`;
              currentQuestion = qTitle;
            }
            
            if (!ansStr.match(/^[A-Z]\./)) {
              content.innerHTML += `<div class="mb-2 p-2 bg-purple-50 rounded text-sm text-gray-800 font-bold whitespace-pre-wrap ml-2 border-l-4 border-purple-400">${ansStr} <span class="text-blue-700 text-xs">(${count}人)</span></div>`;
            } else {
              const pct = Math.round((count / result.total) * 100);
              content.innerHTML += `
                <div class="mb-3 ml-2">
                  <div class="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>${ansStr}</span><span class="text-blue-700">${count}票 (${pct}%)</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-blue-600 h-3 rounded-full" style="width: ${pct}%"></div>
                  </div>
                </div>`;
            }
          }
        } else {
          const pct = Math.round((count / result.total) * 100);
          content.innerHTML += `
            <div class="mb-3">
              <div class="flex justify-between text-sm font-bold text-slate-700 mb-1">
                <span>${fullStr}</span><span class="text-blue-700">${count}票 (${pct}%)</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-blue-600 h-3 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>`;
        }
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

let votingOptionsCount = 0;

function toggleAdminVotingSection() {
  const type = document.getElementById('evType').value;
  const section = document.getElementById('adminVotingSection');
  
  if (type.includes('問卷') || type.includes('投票')) { 
    section.classList.remove('hidden'); 
    if(votingOptionsCount === 0) addVotingOptionUI(); 
  } else { 
    section.classList.add('hidden'); 
    document.getElementById('votingOptionsContainer').innerHTML = ""; 
    votingOptionsCount = 0; 
  }
}

function handleQuestionTypeChange(selectEl, questionId) {
  const ansContainer = document.getElementById(`ansBlock_${questionId}`);
  if (selectEl.value === 'text') {
    ansContainer.classList.add('hidden');
  } else {
    ansContainer.classList.remove('hidden');
  }
}

// 🌟 升級：支援編輯模式初值傳入的動態渲染器
function addVotingOptionUI(initialData = null) {
  votingOptionsCount++;
  const id = `voteOpt_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  
  const titleVal = initialData ? initialData.title : '';
  const descVal = initialData && initialData.desc ? initialData.desc : '';
  const typeVal = initialData && initialData.qType ? initialData.qType : 'radio';
  const imgUrlVal = initialData && initialData.imgUrl ? initialData.imgUrl : '';
  
  let thumbUrl = '';
  if (imgUrlVal && typeof getDriveThumbnailUrl === 'function') {
    thumbUrl = getDriveThumbnailUrl(imgUrlVal);
  }
  
  const html = `
    <div id="${id}" class="bg-white p-5 rounded-xl border border-gray-200 border-t-8 border-t-purple-600 relative shadow-md question-block mb-6">
      <button type="button" onclick="document.getElementById('${id}').remove()" class="absolute top-3 right-3 text-red-400 hover:text-red-600 font-bold rounded-full w-6 h-6 flex items-center justify-center text-2xl">&times;</button>
      
      <div class="flex gap-4 mb-4 items-start">
        <div class="flex-1">
          <input type="text" placeholder="📝 題目 (例如：您的衣服尺寸？)" value="${titleVal}" class="vote-opt-title w-full border-b-2 border-gray-200 p-2 outline-none font-bold text-gray-800 text-lg focus:border-purple-600 transition" required>
        </div>
        <div class="w-1/3">
          <select class="vote-opt-type w-full border p-2 rounded-lg bg-gray-50 text-gray-700 outline-none focus:ring-2 ring-purple-300 font-bold" onchange="handleQuestionTypeChange(this, '${id}')">
            <option value="radio" ${typeVal === 'radio' ? 'selected' : ''}>🔘 單選題</option>
            <option value="checkbox" ${typeVal === 'checkbox' ? 'selected' : ''}>☑️ 多選題</option>
            <option value="text" ${typeVal === 'text' ? 'selected' : ''}>✍️ 簡答題</option>
          </select>
        </div>
      </div>
      
      <textarea placeholder="題目說明 (選填)" class="vote-opt-desc w-full border-b border-gray-200 p-2 text-sm outline-none mb-3 text-gray-500 focus:border-purple-600 transition resize-none" rows="1">${descVal}</textarea>
      
      <div class="flex items-center gap-2 mb-4">
        <label class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-gray-200 transition">
          📷 插入/修改圖片
          <input type="file" accept="image/*" class="hidden" onchange="handleVotingImageUpload(this, '${id}')">
        </label>
      </div>
      <input type="hidden" class="vote-opt-img-url" value="${imgUrlVal}">
      <div id="preview_${id}" class="${thumbUrl ? '' : 'hidden'} mb-4 h-32 w-32 bg-cover bg-center rounded-lg border border-gray-200 shadow-sm cursor-pointer" style="background-image: url('${thumbUrl}')" onclick="window.open(document.querySelector('#${id} .vote-opt-img-url').value, '_blank')"></div>

      <div id="ansBlock_${id}" class="${typeVal === 'text' ? 'hidden' : ''}">
        <div id="ansList_${id}" class="space-y-2 mb-3"></div>
        <button type="button" onclick="addAnswerOption('${id}')" class="text-purple-600 font-bold text-sm hover:underline px-2">+ 新增選項</button>
      </div>
    </div>`;
  document.getElementById('votingOptionsContainer').insertAdjacentHTML('beforeend', html);
  
  // 處理舊答案還原
  if (initialData && initialData.answers && typeVal !== 'text') {
    initialData.answers.forEach(ans => {
      let cleanAns = ans.replace(/^[A-Z]\.\s*/, '');
      addAnswerOption(id, cleanAns);
    });
  } else if (!initialData) {
    addAnswerOption(id);
    addAnswerOption(id);
  }
}

function addAnswerOption(questionId, initialText = '') {
  const container = document.getElementById(`ansList_${questionId}`);
  const count = container.children.length;
  const letter = String.fromCharCode(65 + count); 
  
  const html = `
    <div class="flex items-center gap-3 ans-item group">
       <div class="w-5 h-5 rounded-full border-2 border-gray-300"></div>
       <span class="font-bold text-gray-500 text-sm ans-letter w-4">${letter}.</span>
       <input type="text" placeholder="選項內容" value="${initialText}" class="ans-input flex-1 border-b border-gray-200 p-1 text-sm outline-none text-gray-700 focus:border-purple-600 transition">
       <button type="button" onclick="this.parentElement.remove(); updateAnswerLetters('${questionId}');" class="text-gray-300 hover:text-red-500 font-bold text-xl px-2 opacity-0 group-hover:opacity-100 transition">&times;</button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
}

function updateAnswerLetters(questionId) {
  const container = document.getElementById(`ansList_${questionId}`);
  Array.from(container.children).forEach((item, idx) => {
    const letter = String.fromCharCode(65 + idx);
    item.querySelector('.ans-letter').innerText = `${letter}.`;
  });
}
