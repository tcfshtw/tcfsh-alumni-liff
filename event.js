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
  for (let file of files) {
    const base64Data = await fileToBase64(file); 
    selectedImages.push(base64Data);
  }
  renderImagePreviews();
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviewContainer'); 
  container.innerHTML = "";
  if (selectedImages.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  selectedImages.forEach((img, idx) => {
    const imgDiv = document.createElement('div'); 
    imgDiv.className = "relative min-w-[80px] h-20 bg-cover bg-center rounded border border-gray-300 snap-start shrink-0";
    imgDiv.style.backgroundImage = `url('data:${img.mime};base64,${img.base64}')`;
    
    const delBtn = document.createElement('button');
    delBtn.innerHTML = "&times;";
    delBtn.className = "absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow";
    delBtn.onclick = () => { selectedImages.splice(idx, 1); renderImagePreviews(); };
    imgDiv.appendChild(delBtn);
    container.appendChild(imgDiv);
  });
}

// 🌟 智能圖片壓縮引擎：利用 Canvas 壓縮圖片，避免大檔塞爆 GAS
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        // 計算等比例縮放
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 壓縮成 JPEG 格式 (品質 0.8)，讓 5MB 照片變成 150KB
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
      };
      img.src = event.target.result;
    };
    reader.onerror = error => reject(error);
  });
}

async function submitCreateEvent() {
  const title = document.getElementById('evTitle').value; 
  const date = document.getElementById('evDate').value; 
  const type = document.getElementById('evType').value;
  const deadline = document.getElementById('evDeadline').value;

  if (!title || !date) { alert("請填寫主標題與日期！"); return; }
  
  const btn = document.getElementById('createEventBtn'); btn.disabled = true; btn.innerText = "建立中...";
  const targetRole = document.getElementById('evRole').value;

  let votingOptionsData = [];
  if (type.includes('投票') || type.includes('問答')) {
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
    if (votingOptionsData.length === 0) { alert("請至少新增一個設定選項！"); btn.disabled = false; btn.innerText = "建立"; return; }
  }

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
      imgBox.innerHTML += `<div class="w-full h-48 flex-shrink-0 snap-center bg-cover bg-center cursor-pointer" style="background-image: url('${url}')" onclick="window.open('${url}', '_blank')"></div>`; 
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
      const imgHtml = opt.imgUrl ? `<img src="${opt.imgUrl}" class="w-16 h-16 object-cover rounded ml-3 cursor-pointer border border-gray-200" onclick="window.open('${opt.imgUrl}', '_blank'); event.preventDefault();">` : '';
      
      if (evt.type === '投票 (單選)') {
        voteList.innerHTML += `
          <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
            <input type="radio" name="voteOption" value="${opt.title}" class="w-5 h-5 text-purple-600 focus:ring-purple-500">
            <div class="ml-3 flex-1"><div class="font-bold text-purple-900">${opt.title}</div><div class="text-xs text-gray-500">${opt.desc || ''}</div></div>
            ${imgHtml}
          </label>`;
      } else if (evt.type === '投票 (多選)') {
        voteList.innerHTML += `
          <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
            <input type="checkbox" name="voteOption" value="${opt.title}" class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
            <div class="ml-3 flex-1"><div class="font-bold text-purple-900">${opt.title}</div><div class="text-xs text-gray-500">${opt.desc || ''}</div></div>
            ${imgHtml}
          </label>`;
      } else if (evt.type === '問答 (填答)') {
        voteList.innerHTML += `
          <div class="p-3 border border-gray-200 rounded-lg mb-2 bg-white">
            <div class="flex items-start">
              <div class="flex-1">
                <div class="font-bold text-purple-900 mb-1">${opt.title}</div>
                <div class="text-xs text-gray-500 mb-2">${opt.desc || ''}</div>
                <input type="text" data-title="${opt.title}" class="vote-text-input w-full border border-gray-300 p-2 rounded outline-none text-sm focus:border-purple-500" placeholder="請填寫對應答案">
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
