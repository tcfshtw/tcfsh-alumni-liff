// 檔案：event.js

function toggleRoleInput() {
  const role = document.getElementById('evRole').value;
  const cohortDiv = document.getElementById('cohortInputDiv');
  if (role === '限定屆數') cohortDiv.classList.remove('hidden'); 
  else { cohortDiv.classList.add('hidden'); document.getElementById('evCohort').value = ""; }
}

// 存放即時上傳成功後的公開網址
let selectedImages = []; 

// 🌟 讀取原圖 Base64 (無壓縮)
function fileToBase64Original(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ base64: reader.result.split(',')[1], mime: file.type });
    reader.onerror = error => reject(error);
  });
}

// 🌟 活動主宣傳圖：即時非同步上傳引擎
async function handleImagePreview(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  const container = document.getElementById('imagePreviewContainer');
  container.classList.remove('hidden');

  for (let file of files) {
    const placeholderId = 'img_' + Date.now() + Math.floor(Math.random() * 100);
    const imgDiv = document.createElement('div');
    imgDiv.id = placeholderId;
    imgDiv.className = "relative min-w-[80px] h-20 bg-gray-200 bg-cover bg-center rounded border border-gray-300 snap-start shrink-0 flex items-center justify-center";
    imgDiv.innerHTML = `<span class="text-[10px] text-gray-500 font-bold loading-text animate-pulse">上傳中...</span>`;
    container.appendChild(imgDiv);

    try {
      const baseData = await fileToBase64Original(file);
      const payload = { action: 'uploadImage', base64: baseData.base64, mime: baseData.mime, filename: file.name };
      
      const res = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();

      if (result.status === 'success') {
        selectedImages.push(result.url); 
        renderImagePreviews(); 
      } else {
        document.getElementById(placeholderId).innerHTML = `<span class="text-[10px] text-red-500">上傳失敗</span>`;
      }
    } catch(e) {
      document.getElementById(placeholderId).innerHTML = `<span class="text-[10px] text-red-500">網路錯誤</span>`;
    }
  }
}

// 重新渲染成功上傳的縮圖 (可點擊刪除)
function renderImagePreviews() {
  const container = document.getElementById('imagePreviewContainer'); 
  container.innerHTML = "";
  if (selectedImages.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  selectedImages.forEach((url, idx) => {
    const imgDiv = document.createElement('div'); 
    imgDiv.className = "relative min-w-[80px] h-20 bg-cover bg-center rounded border border-gray-300 snap-start shrink-0 cursor-pointer shadow-sm";
    imgDiv.style.backgroundImage = `url('${url}')`;
    imgDiv.onclick = () => window.open(url, '_blank'); // 點擊放大檢視
    
    const delBtn = document.createElement('button');
    delBtn.innerHTML = "&times;";
    delBtn.className = "absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-700";
    delBtn.onclick = (e) => { 
      e.stopPropagation(); // 避免觸發點擊放大
      selectedImages.splice(idx, 1); 
      renderImagePreviews(); 
    };
    imgDiv.appendChild(delBtn);
    container.appendChild(imgDiv);
  });
}

// 🌟 投票選項圖片：即時非同步上傳引擎
async function handleVotingImageUpload(inputEl, optId) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  const statusEl = document.getElementById(`status_${optId}`);
  const previewEl = document.getElementById(`preview_${optId}`);
  const hiddenUrlEl = document.querySelector(`#${optId} .vote-opt-img-url`);

  statusEl.innerText = "上傳中...";
  statusEl.classList.remove('text-gray-500', 'text-green-600', 'text-red-500');
  statusEl.classList.add('text-blue-600', 'animate-pulse');
  
  try {
    const baseData = await fileToBase64Original(file);
    const payload = { action: 'uploadImage', base64: baseData.base64, mime: baseData.mime, filename: file.name };
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    
    if (result.status === 'success') {
      statusEl.innerText = "✅ 上傳成功";
      statusEl.classList.remove('text-blue-600', 'animate-pulse');
      statusEl.classList.add('text-green-600');
      hiddenUrlEl.value = result.url;
      previewEl.style.backgroundImage = `url('${result.url}')`;
      previewEl.classList.remove('hidden');
    } else {
      statusEl.innerText = "❌ 失敗";
      statusEl.classList.remove('text-blue-600', 'animate-pulse');
      statusEl.classList.add('text-red-500');
    }
  } catch(e) {
    statusEl.innerText = "❌ 網路錯誤";
    statusEl.classList.remove('text-blue-600', 'animate-pulse');
    statusEl.classList.add('text-red-500');
  }
}

let votingOptionsCount = 0;
function toggleAdminVotingSection() {
  const type = document.getElementById('evType').value;
  const section = document.getElementById('adminVotingSection');
  
  if (type.includes('投票') || type.includes('問答')) { 
    section.classList.remove('hidden'); 
    if(votingOptionsCount === 0) addVotingOptionUI(); 
  } else { 
    section.classList.add('hidden'); 
    document.getElementById('votingOptionsContainer').innerHTML = ""; 
    votingOptionsCount = 0; 
  }
}

function addVotingOptionUI() {
  votingOptionsCount++;
  const id = `voteOpt_${Date.now()}`;
  const html = `
    <div id="${id}" class="bg-white p-3 rounded border border-purple-200 relative shadow-sm">
      <button type="button" onclick="document.getElementById('${id}').remove()" class="absolute top-2 right-2 text-red-500 font-bold hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
      <input type="text" placeholder="選項標題 (例: 方案A 或 問題標題)" class="vote-opt-title w-full border-b border-gray-300 p-1 outline-none mb-2 font-bold text-purple-900 focus:border-purple-600 transition" required>
      <textarea placeholder="選項說明 (選填)" class="vote-opt-desc w-full border border-gray-200 p-2 rounded text-sm outline-none mb-2 focus:border-purple-600 transition" rows="2"></textarea>
      
      <div class="mt-2 flex items-center gap-2">
        <label class="bg-purple-100 text-purple-700 px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-purple-200 transition shadow-sm">
          📷 上傳專屬圖片
          <input type="file" accept="image/*" class="hidden" onchange="handleVotingImageUpload(this, '${id}')">
        </label>
        <span id="status_${id}" class="text-xs text-gray-500 font-bold"></span>
      </div>
      <input type="hidden" class="vote-opt-img-url" value="">
      <div id="preview_${id}" class="mt-3 hidden h-24 w-24 bg-cover bg-center rounded border border-gray-300 shadow-sm cursor-pointer" onclick="window.open(this.style.backgroundImage.slice(5, -2), '_blank')"></div>
    </div>`;
  document.getElementById('votingOptionsContainer').insertAdjacentHTML('beforeend', html);
}

async function submitCreateEvent() {
  const title = document.getElementById('evTitle').value; 
  const date = document.getElementById('evDate').value; 
  const type = document.getElementById('evType').value;
  const deadline = document.getElementById('evDeadline').value;

  if (!title || !date) { alert("請填寫主標題與日期！"); return; }
  
  const btn = document.getElementById('createEventBtn'); btn.disabled = true; btn.innerText = "極速建立中...";
  const targetRole = document.getElementById('evRole').value;

  let votingOptionsData = [];
  if (type.includes('投票') || type.includes('問答')) {
    const optDivs = document.getElementById('votingOptionsContainer').children;
    for(let div of optDivs) {
      let vTitle = div.querySelector('.vote-opt-title').value;
      let vDesc = div.querySelector('.vote-opt-desc').value;
      let imgUrl = div.querySelector('.vote-opt-img-url').value; // 直接取用已經上傳好的 URL
      
      if(vTitle) {
        votingOptionsData.push({ title: vTitle, desc: vDesc, imgUrl: imgUrl });
      }
    }
    if (votingOptionsData.length === 0) { alert("請至少新增一個設定選項！"); btn.disabled = false; btn.innerText = "建立"; return; }
  }

  // 💡 極速上傳 Payload：因為圖片已經變成網址，現在傳送的資料不到 1KB，絕不崩潰！
  const payload = {
    action: 'createEvent', title: title, type: type, date: date, deadline: deadline, location: document.getElementById('evLoc').value,
    targetRoles: targetRole, targetCohorts: targetRole === '限定屆數' ? (document.getElementById('evCohort').value || "全部") : "不適用",
    content: document.getElementById('evContent').value, images: selectedImages, votingOptions: votingOptionsData 
  };

  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if (result.status === 'success') { 
      alert("✅ " + result.message); document.getElementById('createEventForm').reset(); 
      selectedImages = []; renderImagePreviews(); toggleRoleInput(); toggleAdminVotingSection(); loadAdminEvents();
    } else alert("❌ 失敗：" + result.message);
  } catch (err) { alert("❌ 連線錯誤"); } finally { btn.disabled = false; btn.innerText = "建立"; }
}

function checkEligibility(targetRole, targetCohortStr) {
  if (!window.currentUserProfile) return false; 
  const myRole = window.currentUserProfile.role; const myCohortStr = window.currentUserProfile.cohort;
  if (targetRole === '全體') return true;
  if (targetRole === '校友會成員') return (myRole !== '一般會員(校友)' && myCohortStr !== '**');
  if (targetRole === '限定屆數') {
    if (!targetCohortStr || targetCohortStr === "全部" || targetCohortStr === "不適用") return true;
    if (targetCohortStr.includes('-')) {
      const parts = targetCohortStr.split('-'); const min = parseInt(parts[0], 10), max = parseInt(parts[1], 10), myC = parseInt(myCohortStr, 10);
      if(!isNaN(min) && !isNaN(max) && !isNaN(myC)) return myC >= min && myC <= max;
    }
    return targetCohortStr.includes(myCohortStr);
  }
  return false;
}

async function loadEvents() {
  const container = document.getElementById('eventsListContainer'); container.innerHTML = '<p class="text-center text-gray-500 py-4">同步中...</p>';
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEvents' }) });
    const result = await response.json();
    if (result.status === 'success') {
      window.allEvents = result.events;
      if (result.events.length === 0) { container.innerHTML = '<p class="text-center text-gray-500 py-4">目前沒有活動</p>'; return; }
      container.innerHTML = '';
      result.events.forEach(evt => {
        const urlArray = evt.imageUrls ? evt.imageUrls.split(',') : [];
        const coverImg = urlArray.length > 0 && urlArray[0] !== "" ? urlArray[0] : "";
        const bgImage = coverImg ? `style="background-image: url('${coverImg}')"` : 'style="background-color: #f3f4f6;"';
        
        let statusHtml = '';
        const isPassed = evt.deadline && new Date() > new Date(evt.deadline);
        
        if (isPassed) {
          statusHtml = `<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">已截止</span>`;
        } else {
          const isEligible = checkEligibility(evt.targetRoles, evt.targetCohorts);
          statusHtml = isEligible ? `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">✅ 可參與</span>` : `<span class="bg-gray-200 text-gray-500 text-xs font-bold px-2 py-1 rounded">🚫 資格不符</span>`;
        }

        container.innerHTML += `
          <div onclick="openEventDetail('${evt.id}', ${checkEligibility(evt.targetRoles, evt.targetCohorts)})" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transform transition active:scale-95 mb-4">
            <div class="h-32 w-full bg-cover bg-center flex flex-col justify-end p-3 relative" ${bgImage}>
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <span class="relative z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full w-max mb-1">${evt.type} | 限：${evt.targetRoles}</span>
              <h3 class="relative z-10 text-white font-bold text-lg truncate drop-shadow-md">${evt.title}</h3>
            </div>
            <div class="p-3 border-t border-gray-50"><div class="flex justify-between items-center"><span class="text-xs text-gray-500">🕒 ${evt.date.replace('T', ' ')}</span>${statusHtml}</div></div>
          </div>`;
      });
    }
  } catch(err) { container.innerHTML = '<p class="text-center text-red-500">載入失敗</p>'; }
}

let activeEventContext = null;

function openEventDetail(eventId, isEligible) {
  const evt = window.allEvents.find(e => e.id === eventId);
  if(!evt) return;
  activeEventContext = evt;
  
  document.getElementById('modalTitle').innerText = evt.title; document.getElementById('modalDate').innerText = evt.date.replace('T', ' ');
  document.getElementById('modalLocation').innerText = evt.location || "未提供"; document.getElementById('modalTarget').innerText = "限：" + evt.targetRoles;
  document.getElementById('modalCohorts').innerText = evt.targetRoles === '限定屆數' ? evt.targetCohorts : "全部"; 
  
  const dlLabel = document.getElementById('modalDeadlineLabel');
  dlLabel.innerText = (evt.type.includes('投票') || evt.type.includes('問答')) ? '截止日：' : '報名截止日：';
  document.getElementById('modalDeadline').innerText = evt.deadline ? evt.deadline.replace('T', ' ') : '無限制';
  document.getElementById('modalContent').innerText = evt.content;
  
  const imgBox = document.getElementById('modalImageContainer'); imgBox.innerHTML = "";
  const urlArray = evt.imageUrls ? evt.imageUrls.split(',').filter(u => u !== "") : [];
  if (urlArray.length > 0) {
    imgBox.classList.remove('hidden');
    urlArray.forEach(url => { 
      imgBox.innerHTML += `<div class="w-full h-48 flex-shrink-0 snap-center bg-cover bg-center cursor-pointer shadow-sm border border-gray-200 rounded" style="background-image: url('${url}')" onclick="window.open('${url}', '_blank')"></div>`; 
    });
  } else { imgBox.classList.add('hidden'); }
  
  const voteSection = document.getElementById('modalVotingSection');
  const voteList = document.getElementById('votingOptionsList');
  const notice = document.getElementById('voteNotice');
  const extraInputs = document.getElementById('eventExtraInputs');
  const voteSectionTitle = document.getElementById('votingSectionTitle');
  
  if (evt.type.includes('投票') || evt.type.includes('問答')) {
    voteSection.classList.remove('hidden'); notice.classList.remove('hidden'); extraInputs.classList.add('hidden');
    voteList.innerHTML = '';
    
    if (evt.type === '問答 (填答)') {
      voteSectionTitle.innerText = "📝 請填寫以下問答";
      notice.innerText = "💡 再次送出將會覆蓋您的舊答案。";
    } else if (evt.type === '投票 (多選)') {
      voteSectionTitle.innerText = "☑️ 請勾選您的方案 (可複選)";
      notice.innerText = "💡 再次送出將會覆蓋舊選擇。";
    } else {
      voteSectionTitle.innerText = "🔘 請選擇您的方案 (單選)";
      notice.innerText = "💡 再次送出將會覆蓋舊選擇。";
    }

    const options = JSON.parse(evt.extraData);
    options.forEach((opt, idx) => {
      // 顯示已經非同步上傳好的圖片 URL
      const imgHtml = opt.imgUrl ? `<img src="${opt.imgUrl}" class="w-16 h-16 object-cover rounded ml-3 cursor-pointer border border-gray-200 shadow-sm hover:scale-105 transition" onclick="window.open('${opt.imgUrl}', '_blank'); event.preventDefault();">` : '';
      
      if (evt.type === '投票 (單選)') {
        voteList.innerHTML += `
          <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition bg-white shadow-sm">
            <input type="radio" name="voteOption" value="${opt.title}" class="w-5 h-5 text-purple-600 focus:ring-purple-500">
            <div class="ml-3 flex-1"><div class="font-bold text-purple-900">${opt.title}</div><div class="text-xs text-gray-500 mt-1">${opt.desc || ''}</div></div>
            ${imgHtml}
          </label>`;
      } else if (evt.type === '投票 (多選)') {
        voteList.innerHTML += `
          <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition bg-white shadow-sm">
            <input type="checkbox" name="voteOption" value="${opt.title}" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
            <div class="ml-3 flex-1"><div class="font-bold text-purple-900">${opt.title}</div><div class="text-xs text-gray-500 mt-1">${opt.desc || ''}</div></div>
            ${imgHtml}
          </label>`;
      } else if (evt.type === '問答 (填答)') {
        voteList.innerHTML += `
          <div class="p-3 border border-gray-200 rounded-lg mb-2 bg-white shadow-sm">
            <div class="flex items-start">
              <div class="flex-1 pr-2">
                <div class="font-bold text-purple-900 mb-1">${opt.title}</div>
                <div class="text-xs text-gray-500 mb-2">${opt.desc || ''}</div>
                <input type="text" data-title="${opt.title}" class="vote-text-input w-full border border-gray-300 p-2 rounded outline-none text-sm focus:border-purple-500 transition" placeholder="請填寫對應答案">
              </div>
              ${imgHtml}
            </div>
          </div>`;
      }
    });
  } else { 
    voteSection.classList.add('hidden'); notice.classList.add('hidden'); 
    extraInputs.classList.remove('hidden'); 
    document.getElementById('evAttendeeCount').value = 1;
    document.getElementById('evPaymentDigits').value = "";
  }

  const btn = document.getElementById('registerEvtBtn');
  const isPassed = evt.deadline && new Date() > new Date(evt.deadline);

  if (isPassed) {
    btn.disabled = true; btn.className = "w-full bg-red-800 text-gray-300 font-bold py-3 rounded-lg cursor-not-allowed";
    btn.innerText = "🚫 已超過截止日期";
  } else if (isEligible) {
    btn.disabled = false; btn.className = "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md transition";
    btn.innerText = (evt.type.includes('投票') || evt.type.includes('問答')) ? "📤 確定送出資料" : "🎟️ 確定送出報名";
  } else {
    btn.disabled = true; btn.className = "w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed";
    btn.innerText = "🚫 您的身分/屆數不符";
  }

  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); activeEventContext = null; }

async function submitUserAction() {
  if(!activeEventContext) return;
  let actionType = activeEventContext.type; 
  let actionValue = '已報名';
  let attendeeCount = 1; let paymentDigits = "";

  if (actionType.includes('投票') || actionType.includes('問答')) {
    if (actionType === '投票 (單選)') {
      const selected = document.querySelector('input[name="voteOption"]:checked');
      if (!selected) { alert("請先選擇一個方案！"); return; }
      actionValue = selected.value;
    } else if (actionType === '投票 (多選)') {
      const selected = Array.from(document.querySelectorAll('input[name="voteOption"]:checked'));
      if (selected.length === 0) { alert("請至少勾選一個選項！"); return; }
      actionValue = selected.map(el => el.value).join(', ');
    } else if (actionType === '問答 (填答)') {
      const inputs = Array.from(document.querySelectorAll('.vote-text-input'));
      let emptyCount = 0;
      actionValue = inputs.map(el => {
        if (!el.value.trim()) emptyCount++;
        return `[${el.dataset.title}] ${el.value.trim()}`;
      }).join('\n');
      if (emptyCount === inputs.length) { alert("請至少填寫一個格子的答案！"); return; }
    }
  } else {
    attendeeCount = document.getElementById('evAttendeeCount').value || 1;
    paymentDigits = document.getElementById('evPaymentDigits').value || "";
  }

  const btn = document.getElementById('registerEvtBtn'); btn.disabled = true; btn.innerText = "資料送出中...";
  try {
    const payload = { 
      action: 'submitEventAction', eventId: activeEventContext.id, eventTitle: activeEventContext.title, 
      eventDate: activeEventContext.date, lineUserId: currentUserLineId, actionType: actionType, actionValue: actionValue,
      attendeeCount: attendeeCount, paymentDigits: paymentDigits 
    };
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if(result.status === 'success') { alert("✅ " + result.message); closeEventModal(); } else alert("❌ " + result.message);
  } catch(e) { alert("❌ 連線錯誤"); } finally { btn.disabled = false; btn.innerText = "完成"; }
}
