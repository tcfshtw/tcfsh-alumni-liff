// 檔案：main.js
// 說明：負責系統初始化與分頁切換，管理員驗證已完全交由 auth_guard.js 獨立處理

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
    
    // 🌟 交由獨立守衛模組 auth_guard.js 處理管理員入口顯示狀態
    if (typeof applyAdminGuardStatus === 'function') {
      applyAdminGuardStatus(result, lineId);
    }

  } catch (err) { 
    document.getElementById('loadingView').classList.add('hidden'); 
    switchTab('profile'); 
    
    // 🌟 離線/異常時，依然交由獨立守衛模組維持管理員通道開啟
    if (typeof applyAdminGuardStatus === 'function') {
      applyAdminGuardStatus(null, lineId);
    }
    
    alert(`資料連線異常 (${err.message})。\n\n💡 提示：若您是系統管理員，可點擊下方後台按鈕，或連續點擊左上角 Logo 5次強制開啟管理員通道。`);
  }
}

function switchTab(tabName) { 
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden')); 
  const targetView = document.getElementById(`view-${tabName}`);
  if (targetView) targetView.classList.remove('hidden'); 
  
  ['profile', 'checkin', 'events'].forEach(id => { 
    const btn = document.getElementById(`tab-${id}`); 
    if(btn) btn.classList.replace(id === tabName || (id === 'profile' && tabName === 'admin') ? 'text-gray-400' : 'text-blue-700', id === tabName || (id === 'profile' && tabName === 'admin') ? 'text-blue-700' : 'text-gray-400'); 
  });
  if (tabName === 'events' && typeof loadEvents === 'function') loadEvents(); 
  if (tabName === 'admin' && typeof loadAdminEvents === 'function') loadAdminEvents(); 
}

function toggleAdvanced() {
  const advBox = document.getElementById('advancedFields');
  const icon = document.getElementById('advToggleIcon');
  if (advBox.classList.contains('hidden')) { advBox.classList.remove('hidden'); icon.innerText = "▲"; } 
  else { advBox.classList.add('hidden'); icon.innerText = "▼"; }
}

window.onload = initializeApp;
