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
}

function updateUniqueIdPreview() {
  const cohort = document.getElementById('userCohort').value;
  let phone = document.getElementById('userPhone').value;
  const display = document.getElementById('cardUniqueId');
  if (cohort && phone && phone.length >= 5) {
    display.innerText = `${cohort}-${phone.slice(-5)}`;
    display.classList.replace('text-slate-700', 'text-blue-700');
  } else {
    display.innerText = "尚未產生";
    display.classList.replace('text-blue-700', 'text-slate-700');
  }
}

function fillMemberForm(profile) {
  document.getElementById('userName').value = profile.name;
  document.getElementById('userGender').value = profile.gender || "男";
  document.getElementById('userCohort').value = profile.cohort;
  document.getElementById('userPhone').value = profile.phone;
  document.getElementById('userStudentId').value = profile.studentId || "";
  document.getElementById('userEmail').value = profile.email || "";
  document.getElementById('userAddress').value = profile.address || "";
  document.getElementById('userIndustry').value = profile.industry || "";
  document.getElementById('userCompany').value = profile.company || "";
  document.getElementById('userJobTitle').value = profile.jobTitle || "";
}

function renderMemberCard(profile) {
  document.getElementById('cardName').innerText = `${profile.name} (${profile.gender || "男"})`;
  document.getElementById('cardUniqueId').innerText = profile.uniqueId || "尚未產生";
  document.getElementById('displayRole').innerText = profile.role;
  document.getElementById('cardPhone').innerText = maskPhone(profile.phone);
  document.getElementById('cardStudentId').innerText = profile.studentId || "未提供";
  document.getElementById('cardAddress').innerText = maskAddress(profile.address);
}

async function saveBasicProfile() {
  const name = document.getElementById('userName').value;
  const cohort = document.getElementById('userCohort').value;
  const phone = document.getElementById('userPhone').value;
  if (!name || !cohort || !phone) { alert("請填寫姓名、畢業屆數與聯絡電話。"); return; }
  const btn = document.getElementById('saveBasicBtn');
  btn.disabled = true; btn.innerText = "資料儲存中...";
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveBasicProfile', lineUserId: currentUserLineId, name: name, gender: document.getElementById('userGender').value, cohort: cohort, phone: phone, studentId: document.getElementById('userStudentId').value }) });
    const result = await response.json();
    if (result.status === 'success') { alert("✅ 基本資料儲存成功！"); checkUserData(currentUserLineId); } 
    else throw new Error(result.message);
  } catch (error) { alert("❌ 儲存失敗：" + error.message); } finally { btn.disabled = false; btn.innerText = "儲存基本資料"; }
}

async function saveDetailProfile() {
  if (!document.getElementById('userName').value) { alert("請先儲存基本會員資料。"); return; }
  const btn = document.getElementById('saveDetailBtn');
  btn.disabled = true; btn.innerText = "進階資料儲存中...";
  try {
    const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'saveDetailProfile', lineUserId: currentUserLineId, email: document.getElementById('userEmail').value, address: document.getElementById('userAddress').value, industry: document.getElementById('userIndustry').value, company: document.getElementById('userCompany').value, jobTitle: document.getElementById('userJobTitle').value }) });
    const result = await response.json();
    if (result.status === 'success') { alert("✅ 進階詳細資料已寫入！"); checkUserData(currentUserLineId); } 
    else throw new Error(result.message);
  } catch (error) { alert("❌ 儲存失敗：" + error.message); } finally { btn.disabled = false; btn.innerText = "儲存進階詳細資料"; }
}
