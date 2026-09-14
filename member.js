// 檔案：member.js

function maskPhone(phone) { 
  if (!phone) return "尚未設定";
  let pStr = phone.toString();
  if (pStr.length === 9 && !pStr.startsWith('0')) pStr = '0' + pStr;
  if (pStr.length >= 10) return pStr.substring(0, 2) + "***" + pStr.slice(-5);
  return pStr; 
}

function maskAddress(addr) { 
  return (!addr) ? "未提供" : (addr.length <= 6 ? addr : addr.substring(0, 5) + "***" + addr.substring(addr.length - 3)); 
}

function generateCohortOptions() {
  const select = document.getElementById('userCohort');
  if (!select) return;
  const currentCohort = new Date().getFullYear() - 1939; 
  for (let i = 1; i <= 120; i++) {
    const option = document.createElement('option');
    option.value = i; option.text = `第 ${i} 屆 (民國 ${i+28} 年 / 西元 ${i+1939} 年)`;
    if (i === currentCohort) option.selected = true;
    select.appendChild(option);
  }
  const specialOption = document.createElement('option');
  specialOption.value = "**"; specialOption.text = "顧問/非校友 (**)";
  select.appendChild(specialOption);
  
  const searchSelect = document.getElementById('searchCohort');
  if(searchSelect) {
    searchSelect.innerHTML = '<option value="">依屆次搜尋...</option>';
    for (let i = 1; i <= 120; i++) { searchSelect.innerHTML += `<option value="${i}">第 ${i} 屆</option>`; }
    searchSelect.innerHTML += `<option value="**">顧問/非校友</option>`;
  }
}

function updateUniqueIdPreview() {
  const cohort = document.getElementById('userCohort') ? document.getElementById('userCohort').value : "";
  const phoneInput = document.getElementById('userPhone');
  const phone = phoneInput ? phoneInput.value : "";
  const display = document.getElementById('cardUniqueId');
  if (!display) return;

  if (cohort && phone && phone.length >= 5) {
    display.innerText = `${cohort}-${phone.slice(-5)}`;
    display.classList.replace('text-slate-700', 'text-blue-700');
  } else { 
    display.innerText = "尚未產生"; 
    display.classList.replace('text-blue-700', 'text-slate-700'); 
  }
}

function fillMemberForm(profile) {
  const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
  safeSet('userName', profile.name); 
  safeSet('userGender', profile.gender || "男");
  safeSet('userCohort', profile.cohort); 
  safeSet('userPhone', profile.phone);
  safeSet('userStudentId', profile.studentId || ""); 
  safeSet('userEmail', profile.email || "");
  safeSet('userAddress', profile.address || ""); 
  safeSet('userIndustry', profile.industry || "");
  safeSet('userCompany', profile.company || ""); 
  safeSet('userJobTitle', profile.jobTitle || "");
}

function renderMemberCard(profile) {
  const safeText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
  safeText('cardName', `${profile.name} (${profile.gender || "男"})`); 
  safeText('cardUniqueId', profile.uniqueId || "尚未產生");
  safeText('displayRole', profile.role); 
  safeText('cardPhone', maskPhone(profile.phone));
  safeText('cardStudentId', profile.studentId || "未提供"); 
  safeText('cardAddress', maskAddress(profile.address));
}

async function saveBasicProfile() {
  const name = document.getElementById('userName').value; 
  const cohort = document.getElementById('userCohort').value; 
  const phone = document.getElementById('userPhone').value;
  if (!name || !cohort || !phone) { alert("請填寫姓名、畢業屆數與聯絡電話。"); return; }
  
  const btn = document.getElementById('saveBasicBtn'); 
  btn.disabled = true; btn.innerText = "儲存中...";
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveBasicProfile', lineUserId: currentUserLineId, name: name, gender: document.getElementById('userGender').value, cohort: cohort, phone: phone, studentId: document.getElementById('userStudentId').value }) });
    const result = await response.json();
    if (result.status === 'success') { 
      alert("✅ 基本資料儲存成功！"); 
      checkUserData(currentUserLineId); 
    } else throw new Error(result.message);
  } catch (error) { alert("❌ 儲存失敗"); } finally { btn.disabled = false; btn.innerText = "儲存基本資料"; }
}

async function saveDetailProfile() {
  if (!document.getElementById('userName').value) { alert("請先儲存基本會員資料。"); return; }
  const btn = document.getElementById('saveDetailBtn'); 
  btn.disabled = true; btn.innerText = "儲存中...";
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveDetailProfile', lineUserId: currentUserLineId, email: document.getElementById('userEmail').value, address: document.getElementById('userAddress').value, industry: document.getElementById('userIndustry').value, company: document.getElementById('userCompany').value, jobTitle: document.getElementById('userJobTitle').value }) });
    const result = await response.json();
    if (result.status === 'success') { 
      alert("✅ 進階資料已寫入！"); 
      checkUserData(currentUserLineId); 
    } else throw new Error(result.message);
  } catch (error) { alert("❌ 儲存失敗"); } finally { btn.disabled = false; btn.innerText = "儲存進階詳細資料"; }
}
