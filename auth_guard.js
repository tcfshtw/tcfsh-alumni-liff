/**
 * 檔案：auth_guard.js
 * 說明：【核心獨立模組】專職負責管理員通道解鎖、密碼驗證、彩蛋觸發與離線通行證記憶。
 * 警告：此檔案已完全解耦獨立，未來修改任何業務邏輯 (會員/活動/桌次/投票) 皆無須更動此檔案！
 */

// 1. 獨立彩蛋計數器与密碼設定
let guardSecretTapCount = 0;
let guardSecretTapTimer = null;
const GUARD_ADMIN_PWD = "tcfsh01";

// 2. 連點 5 下 Logo 觸發器 (手機、平板、電腦全平台通用)
function handleSecretDoor() {
  guardSecretTapCount++;
  clearTimeout(guardSecretTapTimer);
  guardSecretTapTimer = setTimeout(() => { guardSecretTapCount = 0; }, 2000); 
  
  if (guardSecretTapCount >= 5) {
    guardSecretTapCount = 0;
    promptAdminModal();
  }
}

// 3. 喚醒密碼輸入視窗
function promptAdminModal() {
  const pwdInput = document.getElementById('adminPwd');
  const errMsg = document.getElementById('pwdErrorMsg');
  const modal = document.getElementById('adminModal');
  
  if (pwdInput) pwdInput.value = '';
  if (errMsg) errMsg.classList.add('hidden');
  if (modal) modal.classList.remove('hidden');
}

// 4. 關閉密碼輸入視窗
function skipAdmin() { 
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('hidden'); 
}

// 5. 核心驗證與獨立強制跳轉引擎 (絕對不依賴外部易壞變數)
function verifyAdminPwd() { 
  const pwdInput = document.getElementById('adminPwd');
  const errMsg = document.getElementById('pwdErrorMsg');
  const modal = document.getElementById('adminModal');
  
  const inputVal = pwdInput ? pwdInput.value.trim() : "";

  if (inputVal === GUARD_ADMIN_PWD) { 
    // A. 關閉密碼視窗
    if (modal) modal.classList.add('hidden'); 
    
    // B. 寫入永久通行證到設備記憶體 (Local Storage)，讓所有驗證過的管理員擁有斷線保命符
    localStorage.setItem('tcfsh_is_admin', 'true');
    window.isVerifiedAdminSession = true;

    // C. 安全顯示首頁的管理員按鈕 (若有該元素的話)
    const entryBtn = document.getElementById('adminEntryBtn');
    if (entryBtn) entryBtn.classList.remove('hidden');

    // D. 獨立強制切換視圖至 view-admin (就算外部 switchTab 壞掉也能進後台)
    try {
      document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
      const adminView = document.getElementById('view-admin');
      if (adminView) adminView.classList.remove('hidden');
      
      // 更新底部導覽列顏色狀態
      ['profile', 'checkin', 'events'].forEach(id => { 
        const btn = document.getElementById(`tab-${id}`); 
        if (btn) {
          if (id === 'profile') {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-blue-700');
          } else {
            btn.classList.remove('text-blue-700');
            btn.classList.add('text-gray-400');
          }
        }
      });

      // E. 嘗試呼叫後台活動載入函式 (用 try 包覆，就算活動模組壞掉也不影響進入後台)
      if (typeof loadAdminEvents === 'function') {
        loadAdminEvents();
      }
    } catch (e) {
      console.error("切換後台視圖時發生非致命警告:", e);
    }
  } else { 
    if (errMsg) errMsg.classList.remove('hidden'); 
  } 
}

// 6. 統一管理首頁「管理員按鈕」的顯示狀態 (供 main.js 呼叫)
function applyAdminGuardStatus(serverResult, lineId) {
  const claimBtn = document.getElementById('claimAdminBtn');
  const adminBtn = document.getElementById('adminEntryBtn');
  const isCachedAdmin = localStorage.getItem('tcfsh_is_admin') === 'true';
  const isOwner = (typeof OWNER_LINE_ID !== 'undefined' && lineId === OWNER_LINE_ID);

  // 處理首位管理員註冊按鈕
  if (claimBtn) {
    if (serverResult && !serverResult.hasAdmin) {
      claimBtn.classList.remove('hidden');
    } else {
      claimBtn.classList.add('hidden');
    }
  }

  // 處理進入管理後台按鈕：後端認證通過、或是創始人、或是已有設備通行證，皆放行顯示！
  if (adminBtn) {
    if ((serverResult && serverResult.status === 'success' && serverResult.isAdmin) || isOwner || isCachedAdmin) {
      adminBtn.classList.remove('hidden');
      localStorage.setItem('tcfsh_is_admin', 'true');
    } else {
      adminBtn.classList.add('hidden');
    }
  }
}
