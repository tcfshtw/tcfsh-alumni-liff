// 檔案：event.js

// 當下拉選單切換時，控制屆數輸入框顯示/隱藏
function toggleCohortInput() {
  const role = document.getElementById('evRole').value;
  const cohortDiv = document.getElementById('cohortInputDiv');
  if (role === '限定屆數') {
    cohortDiv.classList.remove('hidden');
  } else {
    cohortDiv.classList.add('hidden');
    document.getElementById('evCohort').value = ""; // 清空
  }
}

// 處理多張圖片選取預覽 (隱藏檔名)
let selectedImages = [];
async function handleImagePreview(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  const container = document.getElementById('imagePreviewContainer');
  container.classList.remove('hidden');
  
  for (let file of files) {
    // 取得 base64 與預覽圖
    const base64Data = await fileToBase64(file);
    selectedImages.push(base64Data);
    
    // 建立正方形縮圖
    const imgDiv = document.createElement('div');
    imgDiv.className = "min-w-[80px] h-20 bg-cover bg-center rounded border border-gray-300 snap-start shrink-0";
    imgDiv.style.backgroundImage = `url('data:${base64Data.mime};base64,${base64Data.base64}')`;
    container.appendChild(imgDiv);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ base64: reader.result.split(',')[1], mime: file.type });
    reader.onerror = error => reject(error);
  });
}

// 建立活動
async function submitCreateEvent() {
  const title = document.getElementById('evTitle').value;
  const date = document.getElementById('evDate').value;
  if (!title || !date) { alert("請填寫主標題與日期！"); return; }
  
  const btn = document.getElementById('createEventBtn');
  btn.disabled = true; btn.innerText = "資料夾與圖片建立中 (若圖多需較久時間)...";

  const targetRole = document.getElementById('evRole').value;
  const targetCohort = document.getElementById('evCohort').value || "全部";

  const payload = {
    action: 'createEvent', 
    title: title, 
    date: date, 
    location: document.getElementById('evLoc').value,
    targetRoles: targetRole, 
    targetCohorts: targetRole === '限定屆數' ? targetCohort : "不適用",
    content: document.getElementById('evContent').value, 
    images: selectedImages // 傳送圖片陣列
  };

  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if (result.status === 'success') { 
      alert("✅ " + result.message); 
      document.getElementById('createEventForm').reset(); 
      document.getElementById('imagePreviewContainer').innerHTML = ""; // 清空預覽
      document.getElementById('imagePreviewContainer').classList.add('hidden');
      selectedImages = [];
      toggleCohortInput(); // 重設選單狀態
    } 
    else alert("❌ 失敗：" + result.message);
  } catch (err) { alert("❌ 連線錯誤"); } 
  finally { btn.disabled = false; btn.innerText = "建立活動與專屬報到表"; }
}

// 判斷當前使用者是否符合活動資格
function checkEligibility(targetRole, targetCohortStr) {
  if (!window.currentUserProfile) return false; // 若無會員資料則擋下
  
  const myRole = window.currentUserProfile.role;
  const myCohortStr = window.currentUserProfile.cohort; // 例如 "75" 或 "**"

  if (targetRole === '全體') return true;
  
  if (targetRole === '校友會成員') {
    // 排除「一般會員」與「非校友」
    if (myRole === '一般會員(校友)') return false;
    if (myCohortStr === '**') return false;
    return true; // 其他理監事或幹部可參加
  }

  if (targetRole === '限定屆數') {
    // 屆數判定邏輯
    if (!targetCohortStr || targetCohortStr === "全部" || targetCohortStr === "不適用") return true;
    
    // 如果有區間 (如 70-75)
    if (targetCohortStr.includes('-')) {
      const parts = targetCohortStr.split('-');
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      const myC = parseInt(myCohortStr, 10);
      if(!isNaN(min) && !isNaN(max) && !isNaN(myC)) {
        return myC >= min && myC <= max;
      }
    }
    // 完全比對 (如 75)
    return targetCohortStr.includes(myCohortStr);
  }
  
  return false;
}

// 載入活動清單
async function loadEvents() {
  const container = document.getElementById('eventsListContainer');
  container.innerHTML = '<p class="text-center text-gray-500 py-4">正在同步最新活動...</p>';
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEvents' }) });
    const result = await response.json();
    if (result.status === 'success') {
      window.allEvents = result.events;
      if (result.events.length === 0) { container.innerHTML = '<p class="text-center text-gray-500 py-4">目前沒有活動</p>'; return; }
      
      container.innerHTML = '';
      result.events.forEach(evt => {
        // 抓取第一張圖作為封面
        const urlArray = evt.imageUrls ? evt.imageUrls.split(',') : [];
        const coverImg = urlArray.length > 0 && urlArray[0] !== "" ? urlArray[0] : "";
        const bgImage = coverImg ? `style="background-image: url('${coverImg}')"` : 'style="background-color: #f3f4f6;"';
        
        // 判斷資格
        const isEligible = checkEligibility(evt.targetRoles, evt.targetCohorts);
        const statusHtml = isEligible 
          ? `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">✅ 您可參與</span>`
          : `<span class="bg-gray-200 text-gray-500 text-xs font-bold px-2 py-1 rounded">🚫 資格不符</span>`;

        container.innerHTML += `
          <div onclick="openEventDetail('${evt.id}', ${isEligible})" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transform transition active:scale-95 mb-4">
            <div class="h-32 w-full bg-cover bg-center flex flex-col justify-end p-3 relative" ${bgImage}>
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <span class="relative z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full w-max mb-1">
                限：${evt.targetRoles} ${evt.targetRoles === '限定屆數' ? `(${evt.targetCohorts})` : ''}
              </span>
              <h3 class="relative z-10 text-white font-bold text-lg truncate drop-shadow-md">${evt.title}</h3>
            </div>
            <div class="p-3 border-t border-gray-50">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-500">🕒 ${evt.date.replace('T', ' ')}</span>
                ${statusHtml}
              </div>
            </div>
          </div>`;
      });
    }
  } catch(err) { container.innerHTML = '<p class="text-center text-red-500 py-4">載入失敗</p>'; }
}

function openEventDetail(eventId, isEligible) {
  const evt = window.allEvents.find(e => e.id === eventId);
  if(!evt) return;
  
  document.getElementById('modalTitle').innerText = evt.title;
  document.getElementById('modalDate').innerText = evt.date.replace('T', ' ');
  document.getElementById('modalLocation').innerText = evt.location || "未提供";
  document.getElementById('modalTarget').innerText = "限：" + evt.targetRoles;
  document.getElementById('modalCohorts').innerText = evt.targetRoles === '限定屆數' ? evt.targetCohorts : "全部";
  document.getElementById('modalContent').innerText = evt.content;
  
  // 處理多圖橫向滾動顯示
  const imgBox = document.getElementById('modalImageContainer');
  imgBox.innerHTML = "";
  const urlArray = evt.imageUrls ? evt.imageUrls.split(',').filter(u => u !== "") : [];
  
  if (urlArray.length > 0) {
    imgBox.classList.remove('hidden');
    urlArray.forEach(url => {
      imgBox.innerHTML += `<div class="w-full h-48 flex-shrink-0 snap-center bg-cover bg-center" style="background-image: url('${url}')"></div>`;
    });
  } else {
    imgBox.classList.add('hidden');
  }
  
  // 根據資格設定按鈕
  const btn = document.getElementById('registerEvtBtn');
  if (isEligible) {
    btn.disabled = false;
    btn.className = "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md transition";
    btn.innerText = "🎟️ 我要報名參與";
  } else {
    btn.disabled = true;
    btn.className = "w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed";
    btn.innerText = "🚫 您的身分/屆數不符";
  }

  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); }
function registerEvent() { alert("✅ 系統已收到您的報名意願！\n\n(此處將於下一步連接「寫入報到表」邏輯)"); }
