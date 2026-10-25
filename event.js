// 檔案：event.js

function toggleRoleInput() {
  const role = document.getElementById('evRole').value;
  const cohortDiv = document.getElementById('cohortInputDiv');
  if (role === '限定屆數') cohortDiv.classList.remove('hidden'); 
  else { cohortDiv.classList.add('hidden'); document.getElementById('evCohort').value = ""; }
}

let selectedImages = [];
let pendingUploads = 0; 

function getDriveThumbnailUrl(url) {
  if (!url) return '';
  const match = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}

function compressImageTo1080p(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        
        canvas.width = width; 
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg', dataUrl: dataUrl });
      };
      img.src = event.target.result;
    };
    reader.onerror = error => reject(error);
  });
}

function getSafeFilenamePrefix() {
  const title = document.getElementById('evTitle').value || '未命名活動';
  const dateStr = document.getElementById('evDate').value ? document.getElementById('evDate').value.split('T')[0] : '未定日期';
  return `${title.replace(/[:\\/?*\[\]]/g, '')}_${dateStr}`;
}

async function handleImagePreview(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  const container = document.getElementById('imagePreviewContainer');
  container.classList.remove('hidden');

  for (let file of files) {
    pendingUploads++; 
    const placeholderId = 'img_' + Date.now() + Math.floor(Math.random() * 100);
    const imgDiv = document.createElement('div');
    imgDiv.id = placeholderId;
    imgDiv.className = "relative min-w-[80px] h-20 bg-gray-200 bg-cover bg-center rounded border border-gray-300 snap-start shrink-0 flex items-center justify-center p-2 text-center";
    imgDiv.innerHTML = `<span class="text-[10px] text-gray-500 font-bold loading-text animate-pulse">壓縮上傳中...</span>`;
    container.appendChild(imgDiv);

    try {
      const baseData = await compressImageTo1080p(file);
      imgDiv.style.backgroundImage = `url('${baseData.dataUrl}')`;
      imgDiv.innerHTML = `<span class="bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold absolute bottom-1">上傳中...</span>`;

      const filename = `${getSafeFilenamePrefix()}_宣傳圖_${Date.now().toString().slice(-4)}.jpg`;
      const payload = { action: 'uploadImage', base64: baseData.base64, mime: baseData.mime, filename: filename };
      
      const res = await fetch(GAS_API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: JSON.stringify(payload) 
      });
      const result = await res.json();

      if (result.status === 'success') {
        selectedImages.push(result.url); 
        renderImagePreviews(); 
      } else {
        document.getElementById(placeholderId).innerHTML = `<span class="bg-red-500 text-white px-1 text-[10px] font-bold">上傳失敗</span>`;
      }
    } catch(e) {
      document.getElementById(placeholderId).innerHTML = `<span class="bg-red-500 text-white px-1 text-[10px] font-bold">網路超時</span>`;
    } finally {
      pendingUploads--; 
    }
  }
}

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
    
    const thumbUrl = getDriveThumbnailUrl(url);
    imgDiv.style.backgroundImage = `url('${thumbUrl}')`;
    imgDiv.onclick = () => window.open(url, '_blank'); 
    
    const delBtn = document.createElement('button');
    delBtn.innerHTML = "&times;";
    delBtn.className = "absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-700";
    delBtn.onclick = (e) => { 
      e.stopPropagation(); 
      selectedImages.splice(idx, 1); 
      renderImagePreviews(); 
    };
    imgDiv.appendChild(delBtn);
    container.appendChild(imgDiv);
  });
}

async function handleVotingImageUpload(inputEl, optId) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  pendingUploads++; 
  const file = inputEl.files[0];
  const previewEl = document.getElementById(`preview_${optId}`);
  const hiddenUrlEl = document.querySelector(`#${optId} .vote-opt-img-url`);

  try {
    const baseData = await compressImageTo1080p(file);
    previewEl.style.backgroundImage = `url('${baseData.dataUrl}')`;
    previewEl.innerHTML = `<span class="bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold absolute top-1 left-1">上傳中...</span>`;
    previewEl.classList.remove('hidden');
    previewEl.classList.add('relative');

    const optDivs = document.getElementById('votingOptionsContainer').querySelectorAll('.question-block');
    let orderNum = "01";
    optDivs.forEach((div, index) => {
      if (div.id === optId) orderNum = String(index + 1).padStart(2, '0');
    });

    const filename = `${getSafeFilenamePrefix()}_Q${orderNum}.jpg`;
    
    const payload = { action: 'uploadImage', base64: baseData.base64, mime: baseData.mime, filename: filename };
    const response = await fetch(GAS_API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(payload) 
    });
    const result = await response.json();
    
    if (result.status === 'success') {
      previewEl.innerHTML = `<span class="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold absolute top-1 left-1">✅ 完成</span>`;
      hiddenUrlEl.value = result.url;
    } else {
      previewEl.innerHTML = `<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold absolute top-1 left-1">❌ 失敗</span>`;
    }
  } catch(e) {
    previewEl.innerHTML = `<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold absolute top-1 left-1">❌ 網路異常</span>`;
  } finally {
    pendingUploads--; 
  }
}

// 🌟 自動辨識建立模式與編輯模式的遞交引擎
async function submitCreateEvent() {
  if (pendingUploads > 0) {
    alert("⏳ 還有圖片正在上傳中，請等出現「✅ 完成」後再點擊儲存！");
    return;
  }

  const title = document.getElementById('evTitle').value; 
  const date = document.getElementById('evDate').value; 
  const type = document.getElementById('evType').value;
  const deadline = document.getElementById('evDeadline').value;

  if (!title || !date) { alert("請填寫主標題與日期！"); return; }
  
  const btn = document.getElementById('createEventBtn'); btn.disabled = true; btn.innerText = "資料處理中...";
  const targetRole = document.getElementById('evRole').value;

  let votingOptionsData = [];
  if (type.includes('問卷') || type.includes('投票')) {
    const optDivs = document.getElementById('votingOptionsContainer').querySelectorAll('.question-block');
    
    for(let div of optDivs) {
      let vTitle = div.querySelector('.vote-opt-title').value;
      let vDesc = div.querySelector('.vote-opt-desc').value;
      let imgUrl = div.querySelector('.vote-opt-img-url').value; 
      let qType = div.querySelector('.vote-opt-type').value; 
      
      let answers = [];
      if (qType !== 'text') {
        const ansInputs = div.querySelectorAll('.ans-input');
        ansInputs.forEach((input, idx) => {
          if (input.value.trim()) {
            const letter = String.fromCharCode(65 + idx);
            answers.push(`${letter}. ${input.value.trim()}`);
          }
        });
      }

      if(vTitle) {
        votingOptionsData.push({ title: vTitle, desc: vDesc, imgUrl: imgUrl, qType: qType, answers: answers });
      }
    }
    if (votingOptionsData.length === 0) { alert("請至少新增一個題目！"); btn.disabled = false; btn.innerText = window.editingEventId ? "💾 儲存修改" : "極速建立活動"; return; }
  }

  // 判斷是否為編輯模式
  const isEditing = !!window.editingEventId;
  const actionName = isEditing ? 'updateEvent' : 'createEvent';

  const payload = {
    action: actionName, title: title, type: type, date: date, deadline: deadline, location: document.getElementById('evLoc').value,
    targetRoles: targetRole, targetCohorts: targetRole === '限定屆數' ? (document.getElementById('evCohort').value || "全部") : "不適用",
    content: document.getElementById('evContent').value, images: selectedImages, votingOptions: votingOptionsData 
  };
  
  if (isEditing) payload.eventId = window.editingEventId;

  try {
    const response = await fetch(GAS_API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(payload) 
    });
    const result = await response.json();
    if (result.status === 'success') { 
      alert("✅ " + result.message); 
      
      // 表單與狀態重置
      document.getElementById('createEventForm').reset(); 
      selectedImages = []; renderImagePreviews(); 
      toggleRoleInput(); toggleAdminVotingSection(); 
      
      // 取消編輯狀態
      window.editingEventId = null;
      document.getElementById('createEventFormTitle').innerHTML = `<span class="bg-red-100 p-1.5 rounded-lg text-red-700">📅</span> 建立專屬活動`;
      btn.innerText = "極速建立活動";
      btn.className = "w-full bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 text-lg hover:bg-red-800 transition active:scale-95 border-b-4 border-red-900";
      
      loadAdminEvents(); 
      loadEvents();
    } else alert("❌ 失敗：" + result.message);
  } catch (err) { alert("❌ 連線錯誤"); } finally { btn.disabled = false; if(!window.editingEventId) btn.innerText = "極速建立活動"; else btn.innerText = "💾 儲存修改"; }
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
        const coverImgRaw = urlArray.length > 0 && urlArray[0] !== "" ? urlArray[0] : "";
        const coverImg = getDriveThumbnailUrl(coverImgRaw);
        
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
  
  const isSurveyOrVote = evt.type.includes('問卷') || evt.type.includes('投票');
  
  const dlLabel = document.getElementById('modalDeadlineLabel');
  dlLabel.innerText = isSurveyOrVote ? '截止日：' : '報名截止日：';
  document.getElementById('modalDeadline').innerText = evt.deadline ? evt.deadline.replace('T', ' ') : '無限制';
  document.getElementById('modalContent').innerText = evt.content;
  
  const imgBox = document.getElementById('modalImageContainer'); imgBox.innerHTML = "";
  const urlArray = evt.imageUrls ? evt.imageUrls.split(',').filter(u => u !== "") : [];
  if (urlArray.length > 0) {
    imgBox.classList.remove('hidden');
    urlArray.forEach(url => { 
      const thumbUrl = getDriveThumbnailUrl(url); 
      imgBox.innerHTML += `<div class="w-full h-48 flex-shrink-0 snap-center bg-cover bg-center cursor-pointer shadow-sm border border-gray-200 rounded" style="background-image: url('${thumbUrl}')" onclick="window.open('${url}', '_blank')"></div>`; 
    });
  } else { imgBox.classList.add('hidden'); }
  
  const voteSection = document.getElementById('modalVotingSection');
  const voteList = document.getElementById('votingOptionsList');
  const notice = document.getElementById('voteNotice');
  const extraInputs = document.getElementById('eventExtraInputs');
  const voteSectionTitle = document.getElementById('votingSectionTitle');
  
  if (isSurveyOrVote) {
    voteSection.classList.remove('hidden'); notice.classList.remove('hidden'); extraInputs.classList.add('hidden');
    voteList.innerHTML = '';
    
    let options = [];
    try { options = JSON.parse(evt.extraData || '[]'); } catch(e) {}
    
    const isLegacyFormat = options.length > 0 && options[0].qType === undefined;

    if (isLegacyFormat) {
      voteSectionTitle.innerText = "🔘 請選擇您的方案 (舊版相容模式)";
      notice.innerText = "💡 這是早期的單選活動，送出將覆蓋舊選擇。";
      
      let answersHtml = '';
      options.forEach((opt, idx) => {
        const thumbOptUrl = opt.imgUrl ? getDriveThumbnailUrl(opt.imgUrl) : '';
        const imgHtml = thumbOptUrl ? `<img src="${thumbOptUrl}" class="w-16 h-16 object-cover rounded ml-3 cursor-pointer shadow-sm border border-gray-200" onclick="window.open('${opt.imgUrl}', '_blank'); event.preventDefault();">` : '';
        
        answersHtml += `
          <label class="relative block cursor-pointer group mb-3">
            <input type="radio" name="voteOption_legacy" value="${opt.title}" class="peer sr-only">
            <div class="rounded-xl border-2 border-gray-100 bg-white p-3 transition-all peer-checked:border-purple-600 peer-checked:bg-purple-50 flex items-center justify-between shadow-sm hover:border-purple-200">
              <div class="flex items-center">
                  <div class="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3 peer-checked:border-purple-600 peer-checked:bg-purple-600 transition-colors">
                    <svg class="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                      <div class="text-gray-700 font-bold text-sm peer-checked:text-purple-900">${opt.title}</div>
                      <div class="text-xs text-gray-500">${opt.desc || ''}</div>
                  </div>
              </div>
              ${imgHtml}
            </div>
          </label>`;
      });
      voteList.innerHTML = `<div class="p-5 border border-gray-100 rounded-2xl mb-5 bg-white shadow-sm">${answersHtml}</div>`;
      
    } else {
      voteSectionTitle.innerText = "📝 請填寫以下問卷/投票";
      notice.innerText = "💡 再次送出將會覆蓋您的舊答案。";

      options.forEach((opt, idx) => {
        const thumbOptUrl = opt.imgUrl ? getDriveThumbnailUrl(opt.imgUrl) : '';
        const imgHtml = thumbOptUrl ? `<img src="${thumbOptUrl}" class="w-full h-32 object-cover rounded-lg mt-2 mb-4 cursor-pointer shadow-sm border border-gray-200" onclick="window.open('${opt.imgUrl}', '_blank'); event.preventDefault();">` : '';
        
        let answersHtml = '';
        if (opt.qType === 'text') {
          answersHtml = `<input type="text" name="voteOption_${idx}" data-title="${opt.title}" class="w-full border-b-2 border-gray-300 p-2 outline-none text-gray-800 focus:border-purple-600 transition bg-transparent" placeholder="您的回答">`;
        } else {
          const ansArray = opt.answers || [];
          ansArray.forEach(ans => {
             const inputType = (opt.qType === 'checkbox') ? 'checkbox' : 'radio';
             const shape = (opt.qType === 'checkbox') ? 'rounded-md' : 'rounded-full';
             
             answersHtml += `
               <label class="relative block cursor-pointer group mb-3">
                 <input type="${inputType}" name="voteOption_${idx}" value="${ans}" class="peer sr-only">
                 <div class="rounded-xl border-2 border-gray-100 bg-white p-3 transition-all duration-300 peer-checked:border-purple-600 peer-checked:bg-purple-50 peer-checked:shadow-sm hover:border-purple-200 flex items-center">
                   <div class="w-5 h-5 ${shape} border-2 border-gray-300 flex items-center justify-center mr-3 peer-checked:border-purple-600 peer-checked:bg-purple-600 transition-colors">
                     <svg class="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                   </div>
                   <span class="text-gray-700 font-bold text-sm peer-checked:text-purple-900 transition-colors">${ans}</span>
                 </div>
               </label>`;
          });
        }

        voteList.innerHTML += `
          <div class="p-5 border border-gray-100 rounded-2xl mb-5 bg-white shadow-sm">
            <div class="font-bold text-gray-800 text-lg mb-1 leading-tight"><span class="text-purple-600 mr-1">${idx+1}.</span> ${opt.title}</div>
            ${opt.desc ? `<div class="text-xs text-gray-500 mb-3">${opt.desc}</div>` : ''}
            ${imgHtml}
            <div class="mt-4">${answersHtml}</div>
          </div>`;
      });
    }
  } else { 
    voteSection.classList.add('hidden'); notice.classList.add('hidden'); 
    extraInputs.classList.remove('hidden'); 
    document.getElementById('evAttendeeCount').value = 1;
    document.getElementById('evPaymentDigits').value = "";
  }

  const btn = document.getElementById('registerEvtBtn');
  const isPassed = evt.deadline && new Date() > new Date(evt.deadline);

  if (isPassed) {
    btn.disabled = true; btn.className = "w-full bg-red-800 text-gray-300 font-bold py-4 rounded-xl cursor-not-allowed";
    btn.innerText = "🚫 已超過截止日期";
  } else if (isEligible) {
    btn.disabled = false; btn.className = "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-md transition active:scale-95";
    btn.innerText = isSurveyOrVote ? "📤 確定送出" : "🎟️ 確定送出報名";
  } else {
    btn.disabled = true; btn.className = "w-full bg-gray-300 text-gray-500 font-bold py-4 rounded-xl cursor-not-allowed";
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

  if (actionType.includes('問卷') || actionType.includes('投票')) {
    let resultsObj = {}; 
    let options = [];
    try { options = JSON.parse(activeEventContext.extraData || '[]'); } catch(e){}
    let isValid = true;
    
    const isLegacyFormat = options.length > 0 && options[0].qType === undefined;

    if (isLegacyFormat) {
      const checked = document.querySelector(`input[name="voteOption_legacy"]:checked`);
      if (checked) {
         resultsObj['舊版投票選項'] = checked.value;
      } else {
         isValid = false;
      }
    } else {
      options.forEach((opt, idx) => {
        if (opt.qType === 'text') {
          const input = document.querySelector(`input[name="voteOption_${idx}"]`);
          if (input && input.value.trim()) {
             resultsObj[opt.title] = input.value.trim();
          } else {
             isValid = false; 
          }
        } else if (opt.qType === 'checkbox') {
          const checked = document.querySelectorAll(`input[name="voteOption_${idx}"]:checked`);
          if (checked.length > 0) {
             resultsObj[opt.title] = Array.from(checked).map(el => el.value).join(', ');
          } else {
             isValid = false; 
          }
        } else { 
          const checked = document.querySelector(`input[name="voteOption_${idx}"]:checked`);
          if (checked) {
             resultsObj[opt.title] = checked.value;
          } else {
             isValid = false; 
          }
        }
      });
    }

    if (!isValid) {
      alert("請確保每一題都已填寫或選擇！"); return;
    }
    actionValue = JSON.stringify(resultsObj);
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
    const response = await fetch(GAS_API_URL, { 
      method: 'POST', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(payload) 
    });
    const result = await response.json();
    if(result.status === 'success') { alert("✅ " + result.message); closeEventModal(); } else alert("❌ " + result.message);
  } catch(e) { alert("❌ 連線錯誤"); } finally { btn.disabled = false; btn.innerText = "完成"; }
}
