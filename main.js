// 檔案：main.js

// 🌟 彩蛋：連點 5 次計數器
let secretTapCount = 0;
let secretTapTimer = null;

function handleSecretDoor() {
  secretTapCount++;
  clearTimeout(secretTapTimer);
  secretTapTimer = setTimeout(() => { secretTapCount = 0; }, 2000); 
  
  if (secretTapCount >= 5) {
    secretTapCount = 0;
    // 強制打開密碼框 (手機、平板、電腦皆通用)
    promptAdminModal();
  }
}

async function initializeApp() {
  generateCohortOptions(); 
  try {
    await liff.init({ liffId: MY_LIFF_ID, withLoginOnExternalBrowser: true });
    if (liff.isLoggedIn()) {
      currentUserLineId = (await liff.getProfile()).userId;
      checkUserData(currentUserLineId);
    } else liff.login();
  } catch (err) { document.getElementById('statusMsg').innerText = "初始化失敗：" + err.message; }
}

async function checkUserData(lineId) {
  document.getElementById('statusMsg').innerText = "正在讀取資料...";
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkUser', lineUserId: lineId }) });
    const result = await response.json();
    document.getElementById('loadingView').classList.add('hidden');
    
    if (result.profile) {
      window.currentUserProfile = result.profile;
      fillMemberForm(result.profile); 
      renderMemberCard(result.profile); 
    }
    
    // 無論任何權限，登入後一律先顯示一般首頁
    switchTab('profile'); 
    
    const claimBtn = document.getElementById('claimAdminBtn');
    const adminBtn = document.getElementById('adminEntryBtn');

    if (claimBtn) {
      if (!result.hasAdmin) claimBtn.classList.remove('hidden');
      else claimBtn.classList.add('hidden');
    }
    
    // 🌟 智慧驗證：後端判定為管理員，或前端判定為創始人，皆顯示入口
    if (adminBtn) {
      if ((result.status === 'success' && result.isAdmin) || lineId === OWNER_LINE_ID) {
        adminBtn.classList.remove('hidden');
        // 💡 核心升級：核發設備通行證，記憶在手機/瀏覽器中
        localStorage.setItem('tcfsh_is_admin', 'true');
      } else {
        adminBtn.classList.add('hidden');
        // 💡 權限撤銷：若不再是管理員，清除設備通行證
        localStorage.removeItem('tcfsh_is_admin');
      }
    }

  } catch (err) { 
    document.getElementById('loadingView').classList.add('hidden'); 
    switchTab('profile'); 
    
    // 🌟 離線/異常防護網：讀取設備通行證 (適用所有管理員) 或是 創始人 ID
    const isCachedAdmin = localStorage.getItem('tcfsh_is_admin') === 'true';
    
    if (lineId === OWNER_LINE_ID || isCachedAdmin) {
      document.getElementById('adminEntryBtn').classList.remove('hidden');
    }
    
    alert(`資料連線異常 (${err.message})。\n\n💡 提示：若您是系統管理員，您的專屬入口將自動保留。您也可連續點擊左上角 Logo 5次，輸入密碼強制開啟通道。`);
  }
}

function switchTab(tabName) { 
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden')); 
  document.getElementById(`view-${tabName}`).classList.remove('hidden'); 
  ['profile', 'checkin', 'events'].forEach(id => { 
    const btn = document.getElementById(`tab-${id}`); 
    if(btn) btn.classList.replace(id === tabName || (id === 'profile' && tabName === 'admin') ? 'text-gray-400' : 'text-blue-700', id === tabName || (id === 'profile' && tabName === 'admin') ? 'text-blue-700' : 'text-gray-400'); 
  });
  if (tabName === 'events') loadEvents(); 
  if (tabName === 'admin') loadAdminEvents(); 
}

function toggleAdvanced() {
  const advBox = document.getElementById('advancedFields');
  const icon = document.getElementById('advToggleIcon');
  if (advBox.classList.contains('hidden')) { advBox.classList.remove('hidden'); icon.innerText = "▲"; } 
  else { advBox.classList.add('hidden'); icon.innerText = "▼"; }
}

window.onload = initializeApp;
