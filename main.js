// 檔案：main.js
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
    
    // 無論是不是管理員，登入後一律只顯示這三個區塊
    switchTab('profile'); 
    
    const claimBtn = document.getElementById('claimAdminBtn');
    const adminBtn = document.getElementById('adminEntryBtn');

    // 強制重置按鈕狀態，避免快取錯誤
    if (claimBtn) {
      if (!result.hasAdmin) claimBtn.classList.remove('hidden');
      else claimBtn.classList.add('hidden');
    }
    
    if (adminBtn) {
      if (result.status === 'success' && result.isAdmin) adminBtn.classList.remove('hidden');
      else adminBtn.classList.add('hidden');
    }

  } catch (err) { document.getElementById('loadingView').classList.add('hidden'); switchTab('profile'); }
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
