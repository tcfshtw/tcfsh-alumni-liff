// 檔案：main.js (部分更新)

// 在最上方加入這行，用來儲存當前會員資料
window.currentUserProfile = null;

async function initializeApp() {
  generateCohortOptions(); 
  try {
    await liff.init({ liffId: MY_LIFF_ID });
    if (liff.isLoggedIn()) {
      currentUserLineId = (await liff.getProfile()).userId;
      checkUserData(currentUserLineId);
    } else liff.login();
  } catch (err) { document.getElementById('statusMsg').innerText = "系統初始化失敗：" + err.message; }
}

async function checkUserData(lineId) {
  document.getElementById('statusMsg').innerText = "正在讀取資料...";
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkUser', lineUserId: lineId }) });
    const result = await response.json();
    document.getElementById('loadingView').classList.add('hidden');
    
    if (result.profile) {
      window.currentUserProfile = result.profile; // 🌟 儲存到全域變數，供活動系統判斷資格
      fillMemberForm(result.profile); 
      renderMemberCard(result.profile); 
    }
    
    isSuperAdminUser = result.isSuperAdmin; 

    if (!result.hasSuperAdmin) {
      document.getElementById('claimSuperBtn').classList.remove('hidden');
    }

    if (result.status === 'success' && result.isAdmin) { 
      document.getElementById('adminModal').classList.remove('hidden'); 
    } else { 
      switchTab('profile'); 
    }
  } catch (err) { 
    document.getElementById('loadingView').classList.add('hidden'); 
    switchTab('profile'); 
  }
}

// ... 保留 switchTab 與 toggleAdvanced 等函式 ...
function switchTab(tabName) { 
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden')); 
  document.getElementById(`view-${tabName}`).classList.remove('hidden'); 
  ['profile', 'checkin', 'events'].forEach(id => { 
    const btn = document.getElementById(`tab-${id}`); 
    if(btn) btn.classList.replace(id === tabName || (id === 'profile' && tabName === 'admin') ? 'text-gray-400' : 'text-blue-700', id === tabName || (id === 'profile' && tabName === 'admin') ? 'text-blue-700' : 'text-gray-400'); 
  });
  if (tabName === 'events') loadEvents(); 
}

function toggleAdvanced() {
  const advBox = document.getElementById('advancedFields');
  const icon = document.getElementById('advToggleIcon');
  if (advBox.classList.contains('hidden')) { advBox.classList.remove('hidden'); icon.innerText = "▲"; } 
  else { advBox.classList.add('hidden'); icon.innerText = "▼"; }
}

window.onload = initializeApp;
