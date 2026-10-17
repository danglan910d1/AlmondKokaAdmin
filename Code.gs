/**
 * Code.gs — Google Apps Script Backend cho Glico Almond Koka
 * Interdist / Glico Campaign
 *
 * Hướng dẫn triển khai (Deployment Guide):
 * 1. Mở Google Sheets mới -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Dán toàn bộ nội dung file này vào Code.gs.
 * 3. Nhấn "Triển khai" (Deploy) -> "Quản lý bản triển khai mới" (New deployment).
 *    - Chọn loại: Ứng dụng web (Web app).
 *    - Thực thi dưới dạng: Tôi (Me).
 *    - Ai có quyền truy cập: Bất kỳ ai (Anyone).
 * 4. Copy URL Web App nhận được và dán vào:
 *    - `AlmondKokaAdmin/config.js`
 *    - `shared/env.js`
 */

const DEFAULT_STORES = [
  // TP. Hồ Chí Minh
  { id: "STORE_HCM_01", region: "HCM", name: "Mê Linh Point" },
  // Hà Nội
  { id: "STORE_HN_01", region: "HN", name: "Lancaster" },
];

const DEFAULT_GIFTS = [
  { id: "1", name: "Almond Koka Unsweetened 180ml", defaultStock: 100 },
  { id: "2", name: "Almond Koka Original 180ml", defaultStock: 100 },
  { id: "3", name: "Pretz Nori Seaweed", defaultStock: 100 },
  { id: "4", name: "Pretz Truffle Cheese", defaultStock: 100 },
  { id: "5", name: "Pocky Chocolate flavour 40g", defaultStock: 100 },
  { id: "6", name: "Pocky Cookies & Cream flavour 40g", defaultStock: 100 },
  { id: "7", name: "Pocky Strawberry flavour 39g", defaultStock: 100 },
  { id: "8", name: "Pocky Milky Matcha flavour 40g", defaultStock: 100 },
  { id: "9", name: "Pejoy Belgium Chocolate", defaultStock: 100 },
  { id: "10", name: "Pejoy Hokkaido Milk", defaultStock: 100 },
];

// Tên các Sheets
const SHEET_STORES = "Danh Sách Cửa Hàng";
const SHEET_GIFTS = "Danh Mục Quà Tặng";
const SHEET_STOCK = "Tồn Kho Hiện Tại";
const SHEET_NHAP = "Lịch Sử Nhập Kho";
const SHEET_DIEU_CHINH = "Lịch Sử Điều Chỉnh";
const SHEET_RESULTS = "Kết Quả Vòng Quay";

/** Khởi tạo database ban đầu */
function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Cửa Hàng
  let sStores = ss.getSheetByName(SHEET_STORES);
  if (!sStores) {
    sStores = ss.insertSheet(SHEET_STORES);
    sStores.appendRow(["Store ID", "Khu Vực", "Tên Cửa Hàng"]);
    sStores
      .getRange(1, 1, 1, 3)
      .setFontWeight("bold")
      .setBackground("#f59e0b")
      .setFontColor("#ffffff");
    DEFAULT_STORES.forEach((s) => sStores.appendRow([s.id, s.region, s.name]));
  }

  // 2. Sheet Quà Tặng
  let sGifts = ss.getSheetByName(SHEET_GIFTS);
  if (!sGifts) {
    sGifts = ss.insertSheet(SHEET_GIFTS);
    sGifts.appendRow(["Mã Quà", "Tên Quà Tặng"]);
    sGifts
      .getRange(1, 1, 1, 2)
      .setFontWeight("bold")
      .setBackground("#b45309")
      .setFontColor("#ffffff");
    DEFAULT_GIFTS.forEach((g) => sGifts.appendRow([g.id, g.name]));
  }

  // 3. Sheet Tồn Kho Hiện Tại (Store ID, Mã Quà, Tồn Kho)
  let sStock = ss.getSheetByName(SHEET_STOCK);
  if (!sStock) {
    sStock = ss.insertSheet(SHEET_STOCK);
    sStock.appendRow(["Store ID", "Mã Quà", "Tên Quà Tặng", "Tồn Kho"]);
    sStock
      .getRange(1, 1, 1, 4)
      .setFontWeight("bold")
      .setBackground("#d97706")
      .setFontColor("#ffffff");
    DEFAULT_STORES.forEach((s) => {
      DEFAULT_GIFTS.forEach((g) => {
        sStock.appendRow([s.id, g.id, g.name, g.defaultStock]);
      });
    });
  }

  // 4. Sheet Lịch Sử Nhập Kho
  let sNhap = ss.getSheetByName(SHEET_NHAP);
  if (!sNhap) {
    sNhap = ss.insertSheet(SHEET_NHAP);
    sNhap.appendRow([
      "Thời Gian",
      "Store ID",
      "Tên Cửa Hàng",
      "Mã Quà",
      "Tên Quà Tặng",
      "Số Lượng Nhập",
      "Ghi Chú",
    ]);
    sNhap
      .getRange(1, 1, 1, 7)
      .setFontWeight("bold")
      .setBackground("#0284c7")
      .setFontColor("#ffffff");
  }

  // 5. Sheet Lịch Sử Điều Chỉnh
  let sDC = ss.getSheetByName(SHEET_DIEU_CHINH);
  if (!sDC) {
    sDC = ss.insertSheet(SHEET_DIEU_CHINH);
    sDC.appendRow([
      "Thời Gian",
      "Store ID",
      "Tên Cửa Hàng",
      "Mã Quà",
      "Tên Quà Tặng",
      "Số Lượng Điều Chỉnh",
      "Lý Do Điều Chỉnh",
    ]);
    sDC
      .getRange(1, 1, 1, 7)
      .setFontWeight("bold")
      .setBackground("#7c3aed")
      .setFontColor("#ffffff");
  }

  // 6. Sheet Kết Quả Vòng Quay
  let sRes = ss.getSheetByName(SHEET_RESULTS);
  if (!sRes) {
    sRes = ss.insertSheet(SHEET_RESULTS);
    sRes.appendRow([
      "Thời Gian",
      "Store ID",
      "Tên Cửa Hàng",
      "Khu Vực",
      "Mã Quà",
      "Tên Quà Tặng",
    ]);
    sRes
      .getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#16a34a")
      .setFontColor("#ffffff");
  }

  return { success: true, message: "Khởi tạo cơ sở dữ liệu thành công!" };
}

/**
 * Xử lý yêu cầu GET
 */
function doGet(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const params = e ? e.parameter : {};
    const action = params.action;

    if (action === "initDatabase") {
      const res = initDatabase();
      return jsonResponse(res);
    }

    if (action === "getStores") {
      return jsonResponse({ success: true, stores: getStoresList() });
    }

    if (action === "getGifts") {
      return jsonResponse({ success: true, gifts: DEFAULT_GIFTS });
    }

    if (action === "getStock") {
      const storeId = params.storeId;
      if (!storeId)
        return jsonResponse({ success: false, error: "Thiếu storeId" });
      const stock = getStockByStore(storeId);
      return jsonResponse({ success: true, storeId, stock });
    }

    return jsonResponse({
      success: true,
      message: "Almond Koka Backend API is running",
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Xử lý yêu cầu POST
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    // 1. Nhập kho mới (Hỗ trợ cả chọn cửa hàng có sẵn hoặc nhập tạo cửa hàng mới)
    if (action === "adminAddStock") {
      let { storeId, region, storeName, items, ghiChu } = postData;
      if (!items || !items.length) {
        return jsonResponse({
          success: false,
          error: "Dữ liệu quà nhập kho không hợp lệ",
        });
      }

      // Tự động kiểm tra hoặc tạo cửa hàng mới nếu có storeName và region
      if (storeName && region) {
        storeId = getOrCreateStore(region, storeName);
      }

      if (!storeId) {
        return jsonResponse({
          success: false,
          error: "Vui lòng chọn hoặc nhập tên Cửa Hàng",
        });
      }

      const res = executeAddStock(storeId, items, ghiChu || "");
      res.storeId = storeId;
      return jsonResponse(res);
    }

    // 2. Bù / trừ tồn kho
    if (action === "adminAdjustStock") {
      const { storeId, items, ghiChu } = postData;
      if (!storeId || !items || !items.length) {
        return jsonResponse({
          success: false,
          error: "Dữ liệu điều chỉnh không hợp lệ",
        });
      }
      const res = executeAdjustStock(storeId, items, ghiChu || "");
      return jsonResponse(res);
    }

    // 3. Ghi nhận kết quả quay thưởng & trừ kho tự động
    if (action === "submitResult") {
      const { storeId, giftId, giftName } = postData;
      const res = recordWheelSpin(storeId, giftId, giftName);
      return jsonResponse(res);
    }

    // 4. Reset tồn kho có sẵn 100 cái mỗi món
    if (
      action === "adminResetStock100" ||
      (action === "adminResetStock" && postData.targetQty === 100)
    ) {
      const res = executeResetStock(100);
      return jsonResponse(res);
    }

    // 5. Reset toàn bộ tồn kho về 0 (Trắng kho để nhập mới) VÀ xóa sạch toàn bộ lịch sử vòng quay & lịch sử nhập
    if (
      action === "adminResetStock0" ||
      (action === "adminResetStock" && postData.targetQty === 0)
    ) {
      const res = executeResetAllToZero();
      return jsonResponse(res);
    }

    // Fallback cho adminResetStock thông thường
    if (action === "adminResetStock") {
      const qty =
        typeof postData.targetQty === "number" ? postData.targetQty : 100;
      const res = executeResetStock(qty);
      return jsonResponse(res);
    }

    // 6. Reset sạch toàn bộ kho & Lịch sử
    if (action === "adminResetAll") {
      const res = executeResetAll();
      return jsonResponse(res);
    }

    return jsonResponse({
      success: false,
      error: "Action không hợp lệ: " + action,
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Tự động tìm hoặc tạo mới cửa hàng theo Khu vực & Tên cửa hàng
 * Giống hệt logic Coca-Cola nhưng gọn gàng hơn vì không cần chia Mall / Outside
 */
function getOrCreateStore(region, storeName) {
  if (!region || !storeName) {
    throw new Error('Thiếu thông tin Khu vực hoặc Tên cửa hàng.');
  }
  const cleanRegion = String(region).trim().toUpperCase();
  const cleanName = String(storeName).trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();
  const sStores = ss.getSheetByName(SHEET_STORES);
  const rows = sStores.getDataRange().getValues();

  // 1. Kiểm tra xem cửa hàng đã tồn tại chưa trong khu vực này
  for (let i = 1; i < rows.length; i++) {
    if (
      String(rows[i][1]).trim().toUpperCase() === cleanRegion &&
      String(rows[i][2]).trim().toLowerCase() === cleanName.toLowerCase()
    ) {
      return String(rows[i][0]).trim(); // Trả về storeId đã có
    }
  }

  // 2. Tự động sinh ID cửa hàng mới: STORE_<REGION>_<INDEX> (ví dụ STORE_HCM_02)
  const prefix = 'STORE_' + cleanRegion + '_';
  let maxCounter = 0;
  for (let i = 1; i < rows.length; i++) {
    const existingId = String(rows[i][0]).trim();
    if (existingId.startsWith(prefix)) {
      const suffix = existingId.substring(prefix.length);
      const counterVal = parseInt(suffix, 10);
      if (!isNaN(counterVal) && counterVal > maxCounter) {
        maxCounter = counterVal;
      }
    }
  }
  const nextNum = maxCounter + 1;
  const newStoreId = prefix + (nextNum < 10 ? '0' + nextNum : nextNum);

  // 3. Tự động chèn dòng mới vào Sheet "Danh Sách Cửa Hàng"
  sStores.appendRow([newStoreId, cleanRegion, cleanName]);

  return newStoreId;
}

function getStoresList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SHEET_STORES);
  if (!s) return DEFAULT_STORES;
  const data = s.getDataRange().getValues();
  if (data.length <= 1) return DEFAULT_STORES;

  const stores = [];
  for (let i = 1; i < data.length; i++) {
    stores.push({
      id: String(data[i][0]),
      region: String(data[i][1]),
      name: String(data[i][2]),
    });
  }
  return stores;
}

function getStockByStore(storeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(SHEET_STOCK);
  const stockMap = {};
  DEFAULT_GIFTS.forEach((g) => {
    stockMap[g.id] = 0;
  });

  if (!s) return stockMap;
  const data = s.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === storeId) {
      const giftId = String(data[i][1]);
      const qty = parseInt(data[i][3], 10) || 0;
      stockMap[giftId] = qty;
    }
  }
  return stockMap;
}

function executeAddStock(storeId, items, ghiChu) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();
  const sStock = ss.getSheetByName(SHEET_STOCK);
  const sNhap = ss.getSheetByName(SHEET_NHAP);
  const sGifts = ss.getSheetByName(SHEET_GIFTS);
  const stores = getStoresList();
  const storeObj = stores.find((s) => s.id === storeId);
  const storeName = storeObj ? storeObj.name : storeId;
  const now = new Date().toLocaleString("vi-VN");

  const stockData = sStock.getDataRange().getValues();
  const giftsData = sGifts ? sGifts.getDataRange().getValues() : [];

  items.forEach((it) => {
    const giftId = String(it.giftId);
    const qty = parseInt(it.quantity, 10) || 0;
    if (qty <= 0) return;

    const gift = DEFAULT_GIFTS.find((g) => g.id === giftId);
    const giftName = it.giftName
      ? String(it.giftName).trim()
      : gift
        ? gift.name
        : `Quà #${giftId}`;

    // Tự động thêm quà mới vào Sheet Danh Mục Quà Tặng nếu chưa có
    if (sGifts) {
      let giftExists = false;
      for (let g = 1; g < giftsData.length; g++) {
        if (
          String(giftsData[g][0]) === giftId ||
          String(giftsData[g][1]).toLowerCase() === giftName.toLowerCase()
        ) {
          giftExists = true;
          break;
        }
      }
      if (!giftExists) {
        sGifts.appendRow([giftId, giftName, qty]);
      }
    }

    // Ghi log vào Sheet Nhập Kho
    sNhap.appendRow([now, storeId, storeName, giftId, giftName, qty, ghiChu]);

    // Cập nhật tồn kho hiện tại
    let found = false;
    for (let r = 1; r < stockData.length; r++) {
      if (
        String(stockData[r][0]) === storeId &&
        String(stockData[r][1]) === giftId
      ) {
        const currentQty = parseInt(stockData[r][3], 10) || 0;
        sStock.getRange(r + 1, 4).setValue(currentQty + qty);
        found = true;
        break;
      }
    }
    if (!found) {
      sStock.appendRow([storeId, giftId, giftName, qty]);
    }
  });

  return { success: true, message: "Đã lưu nhập kho thành công!" };
}

function executeAdjustStock(storeId, items, ghiChu) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();
  const sStock = ss.getSheetByName(SHEET_STOCK);
  const sDC = ss.getSheetByName(SHEET_DIEU_CHINH);
  const stores = getStoresList();
  const storeObj = stores.find((s) => s.id === storeId);
  const storeName = storeObj ? storeObj.name : storeId;
  const now = new Date().toLocaleString("vi-VN");

  const stockData = sStock.getDataRange().getValues();

  items.forEach((it) => {
    const giftId = String(it.giftId);
    const adjQty = parseInt(it.adjustQty, 10) || 0;
    if (adjQty === 0) return;

    const gift = DEFAULT_GIFTS.find((g) => g.id === giftId);
    const giftName = gift ? gift.name : `Quà #${giftId}`;

    sDC.appendRow([now, storeId, storeName, giftId, giftName, adjQty, ghiChu]);

    for (let r = 1; r < stockData.length; r++) {
      if (
        String(stockData[r][0]) === storeId &&
        String(stockData[r][1]) === giftId
      ) {
        const currentQty = parseInt(stockData[r][3], 10) || 0;
        const newQty = Math.max(0, currentQty + adjQty);
        sStock.getRange(r + 1, 4).setValue(newQty);
        break;
      }
    }
  });

  return { success: true, message: "Đã cập nhật bù/trừ tồn kho thành công!" };
}

function recordWheelSpin(storeId, giftId, giftName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();
  const sStock = ss.getSheetByName(SHEET_STOCK);
  const sRes = ss.getSheetByName(SHEET_RESULTS);
  const stores = getStoresList();

  // Tìm thông tin cửa hàng theo id hoặc tên
  const storeObj = stores.find(
    (s) =>
      s.id === storeId ||
      s.name.toLowerCase() === String(storeId).toLowerCase()
  );
  const finalStoreId = storeObj ? storeObj.id : storeId || "STORE_HCM_01";
  const storeName = storeObj ? storeObj.name : storeId || "Mê Linh Point";
  const region = storeObj ? storeObj.region : "HCM";
  const now = new Date().toLocaleString("vi-VN");

  // Xử lý chuẩn hóa và tách Mã Quà / Tên Quà Tặng chính xác 100%
  let cleanGiftId = giftId !== undefined && giftId !== null ? String(giftId).trim() : "";
  let cleanGiftName = giftName ? String(giftName).trim() : "";

  // Nếu giftId bị trống mà giftName bắt đầu bằng số (ví dụ: "8 Pocky Milky Matcha...")
  if (!cleanGiftId && cleanGiftName) {
    const match = cleanGiftName.match(/^(\d+)\s+(.+)$/);
    if (match) {
      cleanGiftId = match[1];
      cleanGiftName = match[2];
    }
  } else if (cleanGiftId && cleanGiftName) {
    // Nếu cleanGiftName bị thừa số id ở đầu trùng với cleanGiftId thì cắt bỏ
    const prefix = cleanGiftId + " ";
    if (cleanGiftName.startsWith(prefix)) {
      cleanGiftName = cleanGiftName.substring(prefix.length).trim();
    }
  }

  // 1. Ghi nhận lượt trúng vào Sheet "Kết Quả Vòng Quay"
  // Đảm bảo: Cột E = Mã Quà, Cột F = Tên Quà Tặng
  sRes.appendRow([now, finalStoreId, storeName, region, cleanGiftId, cleanGiftName]);

  // 2. Trừ 1 tồn kho trong Sheet "Tồn Kho Hiện Tại"
  let updatedQty = 0;
  let found = false;
  if (sStock) {
    const stockData = sStock.getDataRange().getValues();
    for (let r = 1; r < stockData.length; r++) {
      const rowStoreId = String(stockData[r][0]).trim();
      const rowGiftId = String(stockData[r][1]).trim();
      const rowGiftName = String(stockData[r][2]).trim();

      // So khớp theo store VÀ (giftId hoặc tên quà)
      if (
        (rowStoreId === finalStoreId || rowStoreId === storeId) &&
        (rowGiftId === cleanGiftId || rowGiftName.toLowerCase() === cleanGiftName.toLowerCase())
      ) {
        const currentQty = parseInt(stockData[r][3], 10) || 0;
        updatedQty = Math.max(0, currentQty - 1);
        sStock.getRange(r + 1, 4).setValue(updatedQty);
        found = true;
        break;
      }
    }

    // Nếu cửa hàng này chưa có dòng quà trong sheet tồn kho, tự động chèn với 99 cái
    if (!found && cleanGiftId && cleanGiftName) {
      sStock.appendRow([finalStoreId, cleanGiftId, cleanGiftName, 99]);
      updatedQty = 99;
    }
  }

  return {
    success: true,
    message: "Đã ghi nhận phần thưởng và trừ tồn kho thành công!",
    storeId: finalStoreId,
    storeName,
    giftId: cleanGiftId,
    giftName: cleanGiftName,
    remainingStock: updatedQty,
  };
}

function executeResetAllToZero() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();

  // 1. Xóa sạch sheet kết quả vòng quay (Toàn bộ lượt quay thưởng từ trước đến nay)
  const sRes = ss.getSheetByName(SHEET_RESULTS);
  if (sRes && sRes.getLastRow() > 1) {
    sRes.deleteRows(2, sRes.getLastRow() - 1);
  }

  // 2. Xóa sạch sheet lịch sử nhập kho
  const sNhap = ss.getSheetByName(SHEET_NHAP);
  if (sNhap && sNhap.getLastRow() > 1) {
    sNhap.deleteRows(2, sNhap.getLastRow() - 1);
  }

  // 3. Xóa sạch sheet lịch sử điều chỉnh
  const sDC = ss.getSheetByName(SHEET_DIEU_CHINH);
  if (sDC && sDC.getLastRow() > 1) {
    sDC.deleteRows(2, sDC.getLastRow() - 1);
  }

  // 4. Thiết lập lại Sheet tồn kho: Đưa tất cả phần quà tại TẤT CẢ các cửa hàng về 0
  const sStock = ss.getSheetByName(SHEET_STOCK);
  if (sStock) {
    if (sStock.getLastRow() > 1) {
      sStock.deleteRows(2, sStock.getLastRow() - 1);
    }
    const stores = getStoresList();
    const sGifts = ss.getSheetByName(SHEET_GIFTS);
    let gifts = DEFAULT_GIFTS;
    if (sGifts && sGifts.getLastRow() > 1) {
      const gData = sGifts.getDataRange().getValues();
      const customGifts = [];
      for (let i = 1; i < gData.length; i++) {
        const gid = String(gData[i][0]).trim();
        const gname = String(gData[i][1]).trim();
        if (gid && gname) {
          customGifts.push({ id: gid, name: gname });
        }
      }
      if (customGifts.length > 0) gifts = customGifts;
    }

    stores.forEach((st) => {
      gifts.forEach((g) => {
        sStock.appendRow([st.id, g.id, g.name, 0]);
      });
    });
  }

  return {
    success: true,
    message: "Đã reset toàn bộ vòng quay (xóa sạch kết quả) và đưa tồn kho tất cả phần quà về 0!",
  };
}

function executeResetStock(targetQty) {
  const qty = typeof targetQty === "number" ? targetQty : 100;
  if (qty === 0) {
    return executeResetAllToZero();
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initDatabase();
  const sStock = ss.getSheetByName(SHEET_STOCK);
  if (!sStock) return { success: false, error: "Không tìm thấy Sheet tồn kho" };

  const data = sStock.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    sStock.getRange(r + 1, 4).setValue(qty);
  }
  return {
    success: true,
    message: "Đã đặt lại tồn kho tất cả các món về " + qty + " cái!",
  };
}

function executeResetAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Xóa sạch sheet lịch sử nhập kho
  const sNhap = ss.getSheetByName(SHEET_NHAP);
  if (sNhap && sNhap.getLastRow() > 1) {
    sNhap.deleteRows(2, sNhap.getLastRow() - 1);
  }

  // 2. Xóa sạch sheet lịch sử điều chỉnh
  const sDC = ss.getSheetByName(SHEET_DIEU_CHINH);
  if (sDC && sDC.getLastRow() > 1) {
    sDC.deleteRows(2, sDC.getLastRow() - 1);
  }

  // 3. Xóa sạch sheet kết quả vòng quay
  const sRes = ss.getSheetByName(SHEET_RESULTS);
  if (sRes && sRes.getLastRow() > 1) {
    sRes.deleteRows(2, sRes.getLastRow() - 1);
  }

  // 4. Thiết lập lại Sheet tồn kho về 50 cái cho 10 món quà chuẩn
  const sStock = ss.getSheetByName(SHEET_STOCK);
  if (sStock) {
    if (sStock.getLastRow() > 1) {
      sStock.deleteRows(2, sStock.getLastRow() - 1);
    }
    const stores = getStoresList();
    stores.forEach((st) => {
      DEFAULT_GIFTS.forEach((g) => {
        sStock.appendRow([st.id, g.id, g.name, 50]);
      });
    });
  }

  return {
    success: true,
    message:
      "Đã làm sạch toàn bộ dữ liệu kho và lịch sử trên Google Sheets thành công!",
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
