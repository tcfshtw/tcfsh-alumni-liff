// 檔案：event.js
function toggleRoleInput() {
  const role = document.getElementById('evRole').value;
  const cohortDiv = document.getElementById('cohortInputDiv');
  if (role === '限定屆數') cohortDiv.classList.remove('hidden'); 
  else { cohortDiv.classList.add('hidden'); document.getElementById('evCohort').value = ""; }
}

let selectedImages = [];
async function handleImagePreview(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  const container = document.getElementById('imagePreviewContainer'); container.classList.remove('hidden');
  for (let file of files) {
    const base64Data = await fileToBase64(file); selectedImages.push(base64Data);
    const imgDiv = document.createElement('div'); imgDiv.className = "min-w-[80px] h-20 bg-cover bg-center rounded border border-gray-300 snap-start shrink-0";
    imgDiv.style.backgroundImage = `url('data:${base64Data.mime};base64,${base64Data.base64}')`;
    container.appendChild(imgDiv);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve({ base64: reader.result.split(',')[1], mime: file.type });
    reader.onerror = error => reject(error);
  });
}

async function submitCreateEvent() {
  const title = document.getElementById('evTitle').value; const date = document.getElementById('evDate').value; const type = document.getElementById('evType').value;
  if (!title || !date) { alert("請填寫主標題與日期！"); return; }
  
  const btn = document.getElementById('createEventBtn'); btn.disabled = true; btn.innerText = "建立中...";
  const targetRole = document.getElementById('evRole').value;

  let votingOptionsData = [];
  if (type === '投票') {
    const optDivs = document.getElementById('votingOptionsContainer').children;
    for(let div of optDivs) {
      let vTitle = div.querySelector('.vote-opt-title').value;
      let vDesc = div.querySelector('.vote-opt-desc').value;
      let fileInput = div.querySelector('.vote-opt-img');
      let baseData = { imgBase64: "", imgMime: "" };
      if (fileInput.files.length > 0) {
        let res = await fileToBase64(fileInput.files[0]);
        baseData.imgBase64 = res.base64; baseData.imgMime = res.mime;
      }
      if(vTitle) votingOptionsData.push({ title: vTitle, desc: vDesc, imgBase64: baseData.imgBase64, imgMime: baseData.imgMime });
    }
    if (votingOptionsData.length === 0) { alert("請至少新增一個投票選項！"); btn.disabled = false; btn.innerText = "建立"; return; }
  }

  const payload = {
    action: 'createEvent', title: title, type: type, date: date, location: document.getElementById('evLoc').value,
    targetRoles: targetRole, targetCohorts: targetRole === '限定屆數' ? (document.getElementById('evCohort').value || "全部") : "不適用",
    content: document.getElementById('evContent').value, images: selectedImages, votingOptions: votingOptionsData 
  };

  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if (result.status === 'success') { 
      alert("✅ " + result.message); document.getElementById('createEventForm').reset(); 
      document.getElementById('imagePreviewContainer').innerHTML = ""; document.getElementById('imagePreviewContainer').classList.add('hidden');
      selectedImages = []; toggleRoleInput(); toggleAdminVotingSection(); loadAdminEvents();
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
        const isEligible = checkEligibility(evt.targetRoles, evt.targetCohorts);
        const statusHtml = isEligible ? `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">✅ 您可參與</span>` : `<span class="bg-gray-200 text-gray-500 text-xs font-bold px-2 py-1 rounded">🚫 資格不符</span>`;

        container.innerHTML += `
          <div onclick="openEventDetail('${evt.id}', ${isEligible})" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transform transition active:scale-95 mb-4">
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
  document.getElementById('modalCohorts').innerText = evt.targetRoles === '限定屆數' ? evt.targetCohorts : "全部"; document.getElementById('modalContent').innerText = evt.content;
  
  const imgBox = document.getElementById('modalImageContainer'); imgBox.innerHTML = "";
  const urlArray = evt.imageUrls ? evt.imageUrls.split(',').filter(u => u !== "") : [];
  if (urlArray.length > 0) {
    imgBox.classList.remove('hidden');
    urlArray.forEach(url => { imgBox.innerHTML += `<div class="w-full h-48 flex-shrink-0 snap-center bg-cover bg-center" style="background-image: url('${url}')"></div>`; });
  } else { imgBox.classList.add('hidden'); }
  
  // 處理投票 UI 渲染
  const voteSection = document.getElementById('modalVotingSection');
  const voteList = document.getElementById('votingOptionsList');
  const notice = document.getElementById('voteNotice');
  
  if (evt.type === '投票' && evt.extraData) {
    voteSection.classList.remove('hidden'); notice.classList.remove('hidden'); voteList.innerHTML = '';
    const options = JSON.parse(evt.extraData);
    options.forEach((opt, idx) => {
      const imgHtml = opt.imgUrl ? `<img src="${opt.imgUrl}" class="w-16 h-16 object-cover rounded ml-3">` : '';
      voteList.innerHTML += `
        <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
          <input type="radio" name="voteOption" value="${opt.title}" class="w-5 h-5 text-purple-600 focus:ring-purple-500">
          <div class="ml-3 flex-1">
            <div class="font-bold text-purple-900">${opt.title}</div>
            <div class="text-xs text-gray-500">${opt.desc || ''}</div>
          </div>
          ${imgHtml}
        </label>`;
    });
  } else {
    voteSection.classList.add('hidden'); notice.classList.add('hidden');
  }

  const btn = document.getElementById('registerEvtBtn');
  if (isEligible) {
    btn.disabled = false; btn.className = "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md transition";
    btn.innerText = evt.type === '投票' ? "🗳️ 送出我的投票" : "🎟️ 我要報名參與";
  } else {
    btn.disabled = true; btn.className = "w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed";
    btn.innerText = "🚫 您的身分/屆數不符";
  }

  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); activeEventContext = null; }

async function submitUserAction() {
  if(!activeEventContext) return;
  let actionType = '報名';
  let actionValue = '已報名';

  if (activeEventContext.type === '投票') {
    actionType = '投票';
    const selected = document.querySelector('input[name="voteOption"]:checked');
    if (!selected) { alert("請先選擇一個方案！"); return; }
    actionValue = selected.value;
  }

  const btn = document.getElementById('registerEvtBtn');
  btn.disabled = true; btn.innerText = "資料送出中...";

  try {
    const payload = {
      action: 'submitEventAction', eventId: activeEventContext.id, eventTitle: activeEventContext.title,
      eventDate: activeEventContext.date, lineUserId: currentUserLineId, actionType: actionType, actionValue: actionValue
    };
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if(result.status === 'success') { alert("✅ " + result.message); closeEventModal(); }
    else alert("❌ " + result.message);
  } catch(e) { alert("❌ 連線錯誤"); } finally { btn.disabled = false; btn.innerText = "完成"; }
}
