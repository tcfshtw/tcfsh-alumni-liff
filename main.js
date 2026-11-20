// 檔案：main.js
// 說明：負責系統初始化與分頁切換，管理員驗證已完全交由 auth_guard.js 獨立處理 (v23.0 支援網址參數直達分頁)

// 🌟 讀取網址參數，決定進入系統時要打開哪一個分頁
function getInitialTab() {
  const urlParams = new URLSearchParams(window.location.search);
  let tabParam = urlParams.get('tab');

  // 雙重防護：若 LINE LIFF 登入跳轉將參數包在 liff.state 內，也能精準抓出
  if (!tabParam && urlParams.get('liff.state')) {
    const liffState = urlParams.get('liff.state');
    const stateQuery = liffState.includes('?') ? liffState.split('?')[1] : liffState;
    const stateParams = new URLSearchParams(stateQuery);
    tabParam = stateParams.get('tab');
  }

  // 只允許跳轉到合法的公開分頁，若無參數則預設回 'profile'
  const allowedTabs = ['profile', 'checkin', 'events'];
  if (tabParam && allowedTabs.includes(tabParam)) {
    return tabParam;
  }
  return 'profile';
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
    
    // 🌟 依據網址參數自動切換分頁（預設為 profile，帶 ?tab=events 則直達活動總覽）
    switchTab(getInitialTab()); 
    
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
