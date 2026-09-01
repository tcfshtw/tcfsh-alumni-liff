/**
 * 檔案：Main.gs
 * 說明：系統主路由 (Router)、設定檔與共用工具模組
 */

function getConfig() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    MAIN_SPREADSHEET_ID: props.MAIN_SPREADSHEET_ID,
    ADMIN_SHEET: 'System_Admins',
    BASIC_SHEET: 'System_Members_Basic',
    DETAIL_SHEET: 'System_Members_Detail',
    EVENTS_SHEET: 'System_Events',
    EVENTS_FOLDER_ID: '1Ust0XCERJUskaocV_Yg9mNYknh4wbej1'
  };
}

function doGet(e) { return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  const successResponse = ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  try {
    if (!e || !e.postData || !e.postData.contents) return successResponse;
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    // 會員與權限路由
    if (action === 'checkUser') {
      const adminCheck = checkUserRole(postData.lineUserId);
      const profileData = getMemberProfile(postData.lineUserId);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', isAdmin: adminCheck.isAdmin, isSuperAdmin: adminCheck.isSuperAdmin, hasSuperAdmin: adminCheck.hasSuperAdmin, profile: profileData })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'saveBasicProfile') return ContentService.createTextOutput(JSON.stringify(saveBasicProfile(postData))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'saveDetailProfile') return ContentService.createTextOutput(JSON.stringify(saveDetailProfile(postData))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getAllMembersLite') return ContentService.createTextOutput(JSON.stringify(getAllMembersLite(postData.callerId))).setMimeType(ContentService.MimeType.JSON);
    
    // 後台管理路由
    if (action === 'claimSuperAdmin') return ContentService.createTextOutput(JSON.stringify(claimSuperAdmin(postData.lineUserId))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'searchMember') return ContentService.createTextOutput(JSON.stringify(searchMember(postData.callerId, postData.keyword))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'updateMemberRole') return ContentService.createTextOutput(JSON.stringify(updateMemberRole(postData.callerId, postData.targetLineId, postData.newRole))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'grantAdmin') return ContentService.createTextOutput(JSON.stringify(grantAdmin(postData.callerId, postData.targetLineId))).setMimeType(ContentService.MimeType.JSON);

    // 活動系統路由
    if (action === 'createEvent') return ContentService.createTextOutput(JSON.stringify(createEvent(postData))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getEvents') return ContentService.createTextOutput(JSON.stringify(getEvents())).setMimeType(ContentService.MimeType.JSON);
    
    // 桌次系統路由
    if (action === 'getSeatingData') return ContentService.createTextOutput(JSON.stringify(getSeatingData(postData.eventId))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'saveSeatingData') return ContentService.createTextOutput(JSON.stringify(saveSeatingData(postData.eventId, postData.seatingData))).setMimeType(ContentService.MimeType.JSON);

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "未知的動作" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

function safeText(val) {
  if (val === null || val === undefined) return "";
  let str = val.toString().trim();
  if (str.startsWith('0')) return "'" + str;
  return str;
}

function getDetailSheetName(cohort) {
  if (cohort === '**') return 'Detail_NonAlumni'; 
  const c = parseInt(cohort, 10);
  if (isNaN(c)) return 'Detail_Unknown'; 
  if (c <= 29) return 'Detail_1_29';
  const start = Math.floor((c - 30) / 5) * 5 + 30;
  return `Detail_${start}_${start+4}`;
}
