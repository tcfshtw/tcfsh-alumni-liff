// 檔案：event.js

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ base64: reader.result.split(',')[1], mime: file.type });
    reader.onerror = error => reject(error);
  });
}

async function submitCreateEvent() {
  const title = document.getElementById('evTitle').value;
  const date = document.getElementById('evDate').value;
  if (!title || !date) { alert("請填寫主標題與日期！"); return; }
  const btn = document.getElementById('createEventBtn');
  btn.disabled = true; btn.innerText = "資料夾與圖片建立中...";

  let imgData = { base64: "", mime: "" };
  const fileInput = document.getElementById('evImage');
  if (fileInput.files.length > 0) imgData = await fileToBase64(fileInput.files[0]);

  const payload = {
    action: 'createEvent', title: title, date: date, location: document.getElementById('evLoc').value,
    targetRoles: document.getElementById('evRole').value || "不限", targetCohorts: document.getElementById('evCohort').value || "全部",
    content: document.getElementById('evContent').value, imageBase64: imgData.base64, imageMimeType: imgData.mime
  };

  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json();
    if (result.status === 'success') { alert("✅ " + result.message); document.getElementById('createEventForm').reset(); } 
    else alert("❌ 失敗：" + result.message);
  } catch (err) { alert("❌ 連線錯誤"); } finally { btn.disabled = false; btn.innerText = "建立活動與專屬報到表"; }
}

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
        const bgImage = evt.imageUrl ? `style="background-image: url('${evt.imageUrl}')"` : 'style="background-color: #f3f4f6;"';
        container.innerHTML += `
          <div onclick="openEventDetail('${evt.id}')" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transform transition active:scale-95">
            <div class="h-32 w-full bg-cover bg-center flex flex-col justify-end p-3 relative" ${bgImage}>
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <span class="relative z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full w-max mb-1">身分限定：${evt.targetRoles}</span>
              <h3 class="relative z-10 text-white font-bold text-lg truncate drop-shadow-md">${evt.title}</h3>
            </div>
            <div class="p-3"><div class="text-xs text-gray-500 flex justify-between"><span>🕒 ${evt.date.replace('T', ' ')}</span><span class="text-blue-600 font-bold">查看詳情 ➔</span></div></div>
          </div>`;
      });
    }
  } catch(err) { container.innerHTML = '<p class="text-center text-red-500 py-4">載入失敗</p>'; }
}

function openEventDetail(eventId) {
  const evt = window.allEvents.find(e => e.id === eventId);
  if(!evt) return;
  document.getElementById('modalTitle').innerText = evt.title;
  document.getElementById('modalDate').innerText = evt.date.replace('T', ' ');
  document.getElementById('modalLocation').innerText = evt.location;
  document.getElementById('modalTarget').innerText = "限：" + evt.targetRoles;
  document.getElementById('modalCohorts').innerText = evt.targetCohorts;
  document.getElementById('modalContent').innerText = evt.content;
  const imgBox = document.getElementById('modalImageContainer');
  if (evt.imageUrl) { imgBox.style.backgroundImage = `url('${evt.imageUrl}')`; imgBox.classList.remove('hidden'); } 
  else { imgBox.classList.add('hidden'); }
  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); }
function registerEvent() { alert("✅ 系統已收到您的報名意願！\n\n(此處將於下一步連接「審核與寫入報到表」邏輯)"); }
