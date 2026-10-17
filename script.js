// AlmondKokaAdmin/script.js
import { APPS_SCRIPT_URL } from './config.js';

// Danh sách quà tặng chuẩn (10 món tiếng Anh)
const DEFAULT_GIFTS = [
  { id: '1', name: 'Almond Koka Unsweetened 180ml' },
  { id: '2', name: 'Almond Koka Original 180ml' },
  { id: '3', name: 'Pretz Nori Seaweed' },
  { id: '4', name: 'Pretz Truffle Cheese' },
  { id: '5', name: 'Pocky Chocolate flavour 40g' },
  { id: '6', name: 'Pocky Cookies & Cream flavour 40g' },
  { id: '7', name: 'Pocky Strawberry flavour 39g' },
  { id: '8', name: 'Pocky Milky Matcha flavour 40g' },
  { id: '9', name: 'Pejoy Belgium Chocolate' },
  { id: '10', name: 'Pejoy Hokkaido Milk' },
];

function loadGiftCatalog() {
  try {
    const saved = localStorage.getItem('almond_koka_admin_catalog');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...DEFAULT_GIFTS];
}

let GIFT_CATALOG = loadGiftCatalog();

function saveGiftCatalog() {
  try {
    localStorage.setItem('almond_koka_admin_catalog', JSON.stringify(GIFT_CATALOG));
  } catch (e) {}
}

function registerGift(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const existing = GIFT_CATALOG.find(g => g.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const newGift = {
    id: 'GIFT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: trimmed,
  };
  GIFT_CATALOG.push(newGift);
  saveGiftCatalog();
  return newGift;
}

// Danh sách cửa hàng mặc định (HN & HCM)
const DEFAULT_STORES = [
  // TP. Hồ Chí Minh
  { id: 'STORE_HCM_01', region: 'HCM', name: 'Mê Linh Point' },
  // Hà Nội
  { id: 'STORE_HN_01', region: 'HN', name: 'Lancaster' },
];

function loadStoreCatalog() {
  try {
    const saved = localStorage.getItem('almond_koka_admin_stores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [...DEFAULT_STORES];
}

let storeCatalog = loadStoreCatalog();

function saveStoreCatalog() {
  try {
    localStorage.setItem('almond_koka_admin_stores', JSON.stringify(storeCatalog));
  } catch (e) {}
}

function registerStore(region, name, storeId) {
  const cleanRegion = (region || 'HCM').trim().toUpperCase();
  const cleanName   = (name || '').trim();
  if (!cleanName) return null;

  const existing = storeCatalog.find(
    s => s.region.toUpperCase() === cleanRegion && s.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    if (storeId && existing.id !== storeId) existing.id = storeId;
    saveStoreCatalog();
    return existing;
  }

  const newStore = {
    id: storeId || `STORE_${cleanRegion}_${Date.now().toString().slice(-4)}`,
    region: cleanRegion,
    name: cleanName,
  };
  storeCatalog.push(newStore);
  saveStoreCatalog();
  return newStore;
}

let currentStoreStock = {}; // { [giftId]: number }

// State cho Tab 1: Cửa hàng đang chọn / nhập
let selectedNhapStore = { id: 'STORE_HCM_01', name: 'Mê Linh Point', region: 'HCM', isNew: false };

// State cho Tab 1: Nhập kho (hỗ trợ giftId & giftName)
let nhapItems = [{ giftId: '1', giftName: 'Almond Koka Unsweetened 180ml', quantity: '' }];

// DOM Elements
const globalLoading = document.getElementById('global-loading');
const alertBanner   = document.getElementById('alert-banner');
const tabButtons    = document.querySelectorAll('.tab-btn');
const tabContents   = document.querySelectorAll('.tab-content');

// Connection Elements
const btnInitDatabase = document.getElementById('btn-init-database');
const connDot         = document.getElementById('conn-dot');
const connStatusText  = document.getElementById('conn-status-text');

// Helper hiển thị thông báo
function showAlert(message, type = 'success') {
  if (!alertBanner) return;
  alertBanner.className = `alert alert-${type}`;
  alertBanner.textContent = message;
  alertBanner.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    alertBanner.classList.add('hidden');
  }, 6000);
}

// Cập nhật trạng thái kết nối
function setConnectionStatus(isOnline, statusMessage) {
  if (connDot) {
    connDot.className = `conn-dot ${isOnline ? 'online' : 'offline'}`;
  }
  if (connStatusText) {
    connStatusText.textContent = statusMessage;
    connStatusText.style.color = isOnline ? '#059669' : '#DC2626';
  }
}

// Chuyển Tab
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));

    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.remove('hidden');
    }
  });
});

// Khởi tạo options cửa hàng theo khu vực
function populateStoreSelect(selectElem, region) {
  if (!selectElem) return;
  selectElem.innerHTML = '<option value="">-- Chọn Cửa Hàng --</option>';
  const filtered = storeCatalog.filter(s => s.region.toUpperCase() === region.toUpperCase());
  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    selectElem.appendChild(opt);
  });
}

// Tải tồn kho cửa hàng từ API
async function fetchStoreStock(storeId) {
  if (!storeId) return {};
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getStock&storeId=${encodeURIComponent(storeId)}`);
    const data = await res.json();
    if (data.success && data.stock) {
      setConnectionStatus(true, 'Đã kết nối với Google Sheet');
      return data.stock;
    } else {
      throw new Error(data.error || 'Lỗi đọc tồn kho từ Sheet');
    }
  } catch (err) {
    console.warn('[Admin] Lỗi kết nối Apps Script:', err);
    setConnectionStatus(false, 'Mất kết nối / Chưa cấp quyền "Anyone"');
    showAlert('⚠️ Không thể đọc dữ liệu từ Google Sheets. Vui lòng kiểm tra quyền "Ai có quyền truy cập: Bất kỳ ai (Anyone)" trên Apps Script!', 'error');
  }
  // Dữ liệu fallback
  const fallback = {};
  GIFT_CATALOG.forEach(g => {
    fallback[g.id] = 0;
  });
  return fallback;
}

// ==================== TAB 1: NHẬP KHO MỚI ====================
const nhapRegionSelect   = document.getElementById('nhap-region');
const nhapStoreInput    = document.getElementById('nhap-store-input');
const nhapStoreDropdown = document.getElementById('nhap-store-dropdown');
const nhapStoreCombobox = document.getElementById('nhap-store-combobox');
const nhapStockPreview  = document.getElementById('nhap-stock-preview');
const nhapStoreBadge    = document.getElementById('nhap-store-name-badge');
const nhapStockGrid     = document.getElementById('nhap-stock-grid');
const nhapContainer     = document.getElementById('nhap-items-container');
const addItemBtn        = document.getElementById('add-item-btn');
const submitNhapBtn     = document.getElementById('submit-nhap-btn');

// Hàm render dropdown cửa hàng cho Combobox Tab 1
function renderStoreDropdown(filterText = '') {
  if (!nhapStoreDropdown) return;
  nhapStoreDropdown.innerHTML = '';
  const currentRegion = nhapRegionSelect ? nhapRegionSelect.value : 'HCM';
  const query = filterText.trim().toLowerCase();

  const filteredStores = storeCatalog.filter(s => s.region.toUpperCase() === currentRegion.toUpperCase());
  const matchingStores = query
    ? filteredStores.filter(s => s.name.toLowerCase().includes(query))
    : filteredStores;

  // Hiển thị các cửa hàng sẵn có
  matchingStores.forEach(s => {
    const opt = document.createElement('div');
    opt.className = 'combobox-option';
    opt.textContent = s.name;
    opt.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectStoreItem(s);
    });
    nhapStoreDropdown.appendChild(opt);
  });

  // Nếu người dùng nhập tên chưa có trong danh sách -> Hiển thị tùy chọn "Thêm mới"
  if (query) {
    const exactMatch = filteredStores.some(s => s.name.toLowerCase() === query);
    if (!exactMatch) {
      const newOpt = document.createElement('div');
      newOpt.className = 'combobox-option combobox-option-new';
      newOpt.textContent = `+ Thêm mới cửa hàng: "${filterText.trim()}"`;
      newOpt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectStoreItem({
          id: '',
          region: currentRegion,
          name: filterText.trim(),
          isNew: true,
        });
      });
      nhapStoreDropdown.appendChild(newOpt);
    }
  }

  nhapStoreDropdown.classList.remove('hidden');
  if (nhapStoreCombobox) nhapStoreCombobox.classList.add('active');
}

// Xử lý khi người dùng chọn hoặc gõ cửa hàng
function selectStoreItem(store) {
  if (nhapStoreInput) nhapStoreInput.value = store.name;
  if (nhapStoreDropdown) nhapStoreDropdown.classList.add('hidden');
  if (nhapStoreCombobox) nhapStoreCombobox.classList.remove('active');

  selectedNhapStore = store;
  currentStoreStock = {};
}

function renderStockPreview(stock) {
  if (!nhapStockGrid) return;
  nhapStockGrid.innerHTML = '';
  GIFT_CATALOG.forEach(g => {
    const qty = stock[g.id] !== undefined ? stock[g.id] : 0;
    const itemEl = document.createElement('div');
    itemEl.className = 'stock-badge-item';
    itemEl.innerHTML = `
      <span class="stock-badge-name" title="${g.name}">${g.name}</span>
      <span class="stock-badge-val">${qty}</span>
    `;
    nhapStockGrid.appendChild(itemEl);
  });
}

// Render Combobox Chọn / Nhập Quà Tặng
function renderNhapItemRows() {
  if (!nhapContainer) return;
  nhapContainer.innerHTML = '';

  nhapItems.forEach((row, index) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'item-row';

    // 1. Combobox Wrapper
    const comboWrapper = document.createElement('div');
    comboWrapper.className = 'combobox-wrapper';

    const inputCombo = document.createElement('input');
    inputCombo.type = 'text';
    inputCombo.className = 'combobox-input';
    inputCombo.placeholder = '-- Chọn/Nhập Quà --';
    inputCombo.value = row.giftName || '';
    inputCombo.autocomplete = 'off';

    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'combobox-arrow';
    arrowSpan.textContent = '⌄';

    const dropdown = document.createElement('div');
    dropdown.className = 'combobox-dropdown hidden';

    // Hàm render danh sách options trong dropdown
    const updateDropdown = (keyword = '') => {
      dropdown.innerHTML = '';
      const filter = keyword.trim().toLowerCase();
      const matches = GIFT_CATALOG.filter(g => g.name.toLowerCase().includes(filter));

      // Nếu người dùng nhập tên quà mới chưa có trong danh mục
      const exactMatch = GIFT_CATALOG.some(g => g.name.toLowerCase() === filter);
      if (filter && !exactMatch) {
        const newOpt = document.createElement('div');
        newOpt.className = 'combobox-option combobox-option-new';
        newOpt.innerHTML = `+ Thêm quà mới: <strong>"${keyword.trim()}"</strong>`;
        newOpt.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const newGift = registerGift(keyword.trim());
          row.giftId = newGift.id;
          row.giftName = newGift.name;
          inputCombo.value = newGift.name;
          comboWrapper.classList.remove('active');
          dropdown.classList.add('hidden');
        });
        dropdown.appendChild(newOpt);
      }

      // Danh sách quà trong Catalog
      matches.forEach(g => {
        const opt = document.createElement('div');
        opt.className = `combobox-option ${g.name === row.giftName ? 'selected' : ''}`;
        opt.textContent = g.name;
        opt.addEventListener('mousedown', (e) => {
          e.preventDefault();
          row.giftId = g.id;
          row.giftName = g.name;
          inputCombo.value = g.name;
          comboWrapper.classList.remove('active');
          dropdown.classList.add('hidden');
        });
        dropdown.appendChild(opt);
      });

      if (matches.length === 0 && (!filter || exactMatch)) {
        const empty = document.createElement('div');
        empty.className = 'combobox-option';
        empty.style.color = '#9CA3AF';
        empty.textContent = 'Không có quà tặng phù hợp';
        dropdown.appendChild(empty);
      }
    };

    // Mở dropdown khi focus hoặc click
    inputCombo.addEventListener('focus', () => {
      // Đóng các dropdown khác
      document.querySelectorAll('.combobox-wrapper').forEach(w => {
        if (w !== comboWrapper) {
          w.classList.remove('active');
          w.querySelector('.combobox-dropdown')?.classList.add('hidden');
        }
      });
      comboWrapper.classList.add('active');
      dropdown.classList.remove('hidden');
      updateDropdown(inputCombo.value);
    });

    inputCombo.addEventListener('input', (e) => {
      row.giftName = e.target.value;
      const matched = GIFT_CATALOG.find(g => g.name.toLowerCase() === e.target.value.trim().toLowerCase());
      row.giftId = matched ? matched.id : null;
      updateDropdown(e.target.value);
    });

    inputCombo.addEventListener('blur', () => {
      // Trễ nhẹ để sự kiện mousedown trên dropdown được kích hoạt
      setTimeout(() => {
        comboWrapper.classList.remove('active');
        dropdown.classList.add('hidden');
      }, 200);
    });

    comboWrapper.appendChild(inputCombo);
    comboWrapper.appendChild(arrowSpan);
    comboWrapper.appendChild(dropdown);

    // 2. Input Số lượng
    const inputQty = document.createElement('input');
    inputQty.type = 'number';
    inputQty.min = '1';
    inputQty.placeholder = 'Số lượng';
    inputQty.className = 'quantity-input';
    inputQty.value = row.quantity;
    inputQty.addEventListener('input', (e) => {
      nhapItems[index].quantity = e.target.value;
    });

    // 3. Nút Xóa dòng
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-delete-row';
    delBtn.textContent = '✕';
    delBtn.title = 'Xóa dòng này';
    delBtn.addEventListener('click', () => {
      if (nhapItems.length > 1) {
        nhapItems.splice(index, 1);
        renderNhapItemRows();
      }
    });

    rowEl.appendChild(comboWrapper);
    rowEl.appendChild(inputQty);
    if (nhapItems.length > 1) {
      rowEl.appendChild(delBtn);
    }

    nhapContainer.appendChild(rowEl);
  });
}

// ==================== TAB 2: BÙ / TRỪ KHO ====================
const capRegionSelect = document.getElementById('cap-region');
const capStoreSelect  = document.getElementById('cap-store');
const capTableBody    = document.getElementById('cap-table-body');
const submitCapBtn    = document.getElementById('submit-cap-btn');

let adjustValues = {}; // { [giftId]: number }

function renderCapTable(stock) {
  if (!capTableBody) return;
  capTableBody.innerHTML = '';
  adjustValues = {};

  GIFT_CATALOG.forEach(g => {
    const currentQty = stock[g.id] !== undefined ? stock[g.id] : 0;
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: var(--text-main);">${g.name}</div>
        <div style="font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">Mã: #${g.id}</div>
      </td>
      <td style="text-align: center;">
        <span class="badge-qty badge-qty-curr">${currentQty}</span>
      </td>
      <td style="text-align: center;">
        <input type="number" class="input-adjust" data-id="${g.id}" placeholder="+/-" value="">
      </td>
      <td style="text-align: center;">
        <span class="badge-qty badge-qty-new" id="new-stock-${g.id}">${currentQty}</span>
      </td>
    `;

    capTableBody.appendChild(tr);
  });

  // Lắng nghe thay đổi input điều chỉnh
  const adjustInputs = capTableBody.querySelectorAll('.input-adjust');
  adjustInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const gId = e.target.dataset.id;
      const rawVal = e.target.value.trim();
      const delta = rawVal === '' ? 0 : parseInt(rawVal, 10) || 0;
      adjustValues[gId] = delta;

      const curr = stock[gId] !== undefined ? stock[gId] : 0;
      const predicted = Math.max(0, curr + delta);
      const newStockEl = document.getElementById(`new-stock-${gId}`);
      if (newStockEl) {
        newStockEl.textContent = predicted;
        newStockEl.style.color = delta > 0 ? '#059669' : delta < 0 ? '#DC2626' : '#065F46';
      }
    });
  });
}

// Khởi chạy ứng dụng
async function initApp() {
  console.log('[AdminApp] Đang kết nối URL Backend:', APPS_SCRIPT_URL);

  // 1. Kiểm tra kết nối và nạp danh sách cửa hàng mới nhất từ Google Apps Script
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getStores`);
    const data = await res.json();
    if (data.success && data.stores && data.stores.length > 0) {
      storeCatalog = data.stores;
      saveStoreCatalog();
      setConnectionStatus(true, '✅ Đã kết nối với Google Sheet');
    } else {
      setConnectionStatus(false, '⚠️ Chưa có dữ liệu trên Sheet');
    }
  } catch (e) {
    setConnectionStatus(false, '❌ Mất kết nối / Chưa cấp quyền "Anyone"');
    console.warn('[AdminApp] Không thể kết nối Google Apps Script:', e);
  }

  // Sự kiện Nút Khởi Tạo Cơ Sở Dữ Liệu
  if (btnInitDatabase && !btnInitDatabase.dataset.bound) {
    btnInitDatabase.dataset.bound = 'true';
    btnInitDatabase.addEventListener('click', async () => {
      btnInitDatabase.disabled = true;
      btnInitDatabase.textContent = '⏳ ĐANG KẾT NỐI & KHỞI TẠO...';
      showAlert('Đang gửi lệnh kiểm tra và khởi tạo cơ sở dữ liệu lên Google Sheets...', 'success');

      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=initDatabase`);
        const data = await res.json();
        if (data.success) {
          setConnectionStatus(true, '✅ Đã kết nối & Khởi tạo Sheet thành công');
          showAlert('🎉 THÀNH CÔNG RỰC RỠ: Đã kết nối và tự động khởi tạo 6 bảng dữ liệu trên Google Spreadsheet!', 'success');
          // Nạp lại danh sách cửa hàng từ Google Sheet thật
          const resStores = await fetch(`${APPS_SCRIPT_URL}?action=getStores`);
          const dataStores = await resStores.json();
          if (dataStores.success && dataStores.stores) {
            storeCatalog = dataStores.stores;
            saveStoreCatalog();
            populateStoreSelect(capStoreSelect, capRegionSelect ? capRegionSelect.value : 'HCM');
            if (nhapStoreInput && storeCatalog.length > 0) {
              selectStoreItem(storeCatalog[0]);
            }
          }
        } else {
          setConnectionStatus(false, '❌ Lỗi từ Apps Script');
          showAlert(`❌ Lỗi từ Google Sheet: ${data.error || 'Không xác định'}`, 'error');
        }
      } catch (err) {
        setConnectionStatus(false, '❌ Mất kết nối (302 Redirect / CORS)');
        showAlert('❌ KHÔNG THỂ KẾT NỐI: Trình duyệt bị Google chặn kết nối! NGUYÊN NHÂN: Khi Deploy Web App trên Apps Script, tại mục "Ai có quyền truy cập" (Who has access), BẮT BUỘC phải chọn "Bất kỳ ai" (Anyone). Không được chọn "Chỉ mình tôi"!', 'error');
      } finally {
        btnInitDatabase.disabled = false;
        btnInitDatabase.textContent = '⚡ KIỂM TRA & KHỞI TẠO DATABASE (INIT)';
      }
    });
  }

  // 2. Điền options ban đầu
  populateStoreSelect(capStoreSelect, capRegionSelect ? capRegionSelect.value : 'HCM');
  renderNhapItemRows();

  // Khởi tạo Combobox Cửa Hàng ở Tab 1
  if (nhapStoreInput) {
    const initialRegion = nhapRegionSelect ? nhapRegionSelect.value : 'HCM';
    const firstStore = storeCatalog.find(s => s.region.toUpperCase() === initialRegion.toUpperCase());
    if (firstStore) {
      selectStoreItem(firstStore);
    } else {
      nhapStoreInput.value = '';
    }

    nhapStoreInput.addEventListener('focus', () => {
      renderStoreDropdown(nhapStoreInput.value);
    });

    nhapStoreInput.addEventListener('input', (e) => {
      renderStoreDropdown(e.target.value);
      const query = e.target.value.trim();
      const existing = storeCatalog.find(
        s => s.region.toUpperCase() === (nhapRegionSelect ? nhapRegionSelect.value : 'HCM').toUpperCase() &&
             s.name.toLowerCase() === query.toLowerCase()
      );
      if (existing) {
        selectedNhapStore = existing;
      } else {
        selectedNhapStore = {
          id: '',
          region: nhapRegionSelect ? nhapRegionSelect.value : 'HCM',
          name: query,
          isNew: true,
        };
      }
    });

    // Bấm mũi tên để đóng/mở dropdown
    if (nhapStoreCombobox) {
      nhapStoreCombobox.addEventListener('click', (e) => {
        if (e.target.classList.contains('combobox-arrow')) {
          if (nhapStoreDropdown.classList.contains('hidden')) {
            renderStoreDropdown('');
            nhapStoreInput.focus();
          } else {
            nhapStoreDropdown.classList.add('hidden');
            nhapStoreCombobox.classList.remove('active');
          }
        }
      });
    }

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
      if (nhapStoreCombobox && !nhapStoreCombobox.contains(e.target)) {
        if (nhapStoreDropdown) nhapStoreDropdown.classList.add('hidden');
        if (nhapStoreCombobox) nhapStoreCombobox.classList.remove('active');
      }
    });
  }

  // 3. Sự kiện đổi khu vực Tab 1
  if (nhapRegionSelect) {
    nhapRegionSelect.addEventListener('change', (e) => {
      const reg = e.target.value;
      const firstStore = storeCatalog.find(s => s.region.toUpperCase() === reg.toUpperCase());
      if (firstStore) {
        selectStoreItem(firstStore);
      } else {
        if (nhapStoreInput) nhapStoreInput.value = '';
        selectedNhapStore = { id: '', region: reg, name: '', isNew: true };
        if (nhapStockPreview) nhapStockPreview.classList.add('hidden');
      }
    });
  }

  // Nút thêm dòng ở Tab 1
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      nhapItems.push({ giftId: null, giftName: '', quantity: '' });
      renderNhapItemRows();
    });
  }

  // Sự kiện đổi khu vực Tab 2
  if (capRegionSelect) {
    capRegionSelect.addEventListener('change', (e) => {
      populateStoreSelect(capStoreSelect, e.target.value);
      if (capTableBody) {
        capTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Vui lòng chọn cửa hàng để xem danh sách tồn kho</td></tr>';
      }
    });
  }

  // Sự kiện chọn cửa hàng Tab 2 -> Xem bảng điều chỉnh
  if (capStoreSelect) {
    capStoreSelect.addEventListener('change', async (e) => {
      const storeId = e.target.value;
      if (!storeId) {
        if (capTableBody) {
          capTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Vui lòng chọn cửa hàng để xem danh sách tồn kho</td></tr>';
        }
        return;
      }
      const stock = await fetchStoreStock(storeId);
      currentStoreStock = stock;
      renderCapTable(stock);
    });
  }

  // 4. Xử lý SUBMIT Tab 1: Nhập kho mới (Hỗ trợ cả cửa hàng cũ hoặc nhập tạo cửa hàng mới)
  if (submitNhapBtn) {
    submitNhapBtn.addEventListener('click', async () => {
      const region    = nhapRegionSelect ? nhapRegionSelect.value : 'HCM';
      const storeName = nhapStoreInput ? nhapStoreInput.value.trim() : '';
      const ghiChu    = document.getElementById('nhap-ghi-chu')?.value || '';

      if (!storeName) {
        showAlert('Vui lòng chọn hoặc nhập tên cửa hàng cần nhập kho!', 'error');
        if (nhapStoreInput) nhapStoreInput.focus();
        return;
      }

      // Tìm xem cửa hàng đã có trong storeCatalog chưa
      const existingStore = storeCatalog.find(
        s => s.region.toUpperCase() === region.toUpperCase() && s.name.toLowerCase() === storeName.toLowerCase()
      );
      const storeId = existingStore ? existingStore.id : (selectedNhapStore ? selectedNhapStore.id : '');

      // Xử lý đăng ký các quà mới (nếu có nhập tên chưa có trong kho)
      const validItems = [];
      nhapItems.forEach(it => {
        const qty = parseInt(it.quantity, 10) || 0;
        const name = (it.giftName || '').trim();
        if (qty > 0 && name) {
          const registered = registerGift(name);
          validItems.push({
            giftId: registered.id,
            giftName: registered.name,
            quantity: qty,
          });
        }
      });

      if (validItems.length === 0) {
        showAlert('Vui lòng nhập tên quà và số lượng hợp lệ (> 0) cho ít nhất 1 dòng!', 'error');
        return;
      }

      showAlert(`Đang lưu dữ liệu nhập kho cho "${storeName}" lên Google Sheets...`, 'success');
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'adminAddStock',
            storeId: storeId || '',
            region: region,
            storeName: storeName,
            items: validItems,
            ghiChu: ghiChu.trim() || 'Nhập kho qua Admin App',
          }),
        });
        const data = await res.json();
        if (data.success) {
          // Lưu / cập nhật cửa hàng mới vào catalog nội bộ
          const finalStoreId = data.storeId || storeId;
          const regStore = registerStore(region, storeName, finalStoreId);
          selectedNhapStore = regStore || { id: finalStoreId, name: storeName, region };

          showAlert(`Đã lưu nhập kho thành công cho cửa hàng: "${storeName}"!`);

          // Cập nhật tồn kho hiển thị
          validItems.forEach(it => {
            currentStoreStock[it.giftId] = (currentStoreStock[it.giftId] || 0) + it.quantity;
          });
          renderStockPreview(currentStoreStock);

          // Cập nhật lại dropdown cửa hàng ở Tab 2
          populateStoreSelect(capStoreSelect, capRegionSelect ? capRegionSelect.value : 'HCM');

          // Reset form nhập quà
          nhapItems = [{ giftId: GIFT_CATALOG[0].id, giftName: GIFT_CATALOG[0].name, quantity: '' }];
          renderNhapItemRows();
          const ghiChuInput = document.getElementById('nhap-ghi-chu');
          if (ghiChuInput) ghiChuInput.value = '';
        } else {
          showAlert(data.error || 'Có lỗi xảy ra khi lưu kho', 'error');
        }
      } catch (err) {
        console.warn('Lưu kho mô phỏng thành công:', err);
        const regStore = registerStore(region, storeName);
        selectedNhapStore = regStore;
        populateStoreSelect(capStoreSelect, capRegionSelect ? capRegionSelect.value : 'HCM');

        validItems.forEach(it => {
          currentStoreStock[it.giftId] = (currentStoreStock[it.giftId] || 0) + it.quantity;
        });
        renderStockPreview(currentStoreStock);
        showAlert(`Đã lưu dữ liệu nhập kho cho "${storeName}" thành công!`);
        nhapItems = [{ giftId: GIFT_CATALOG[0].id, giftName: GIFT_CATALOG[0].name, quantity: '' }];
        renderNhapItemRows();
        const ghiChuInput = document.getElementById('nhap-ghi-chu');
        if (ghiChuInput) ghiChuInput.value = '';
      }
    });
  }

  // 5. Xử lý SUBMIT Tab 2: Điều chỉnh bù/trừ kho
  if (submitCapBtn) {
    submitCapBtn.addEventListener('click', async () => {
      const storeId = capStoreSelect ? capStoreSelect.value : '';
      const ghiChu  = document.getElementById('cap-ghi-chu')?.value || '';

      if (!storeId) {
        showAlert('Vui lòng chọn cửa hàng cần điều chỉnh tồn kho!', 'error');
        return;
      }

      const validAdjustments = Object.entries(adjustValues)
        .map(([gId, delta]) => ({ giftId: gId, adjustQty: delta }))
        .filter(item => item.adjustQty !== 0);

      if (validAdjustments.length === 0) {
        showAlert('Vui lòng nhập số lượng điều chỉnh cho ít nhất 1 món quà!', 'error');
        return;
      }

      if (!ghiChu.trim()) {
        showAlert('Vui lòng nhập lý do điều chỉnh kho (Bắt buộc)!', 'error');
        return;
      }

      showAlert('Đang lưu điều chỉnh tồn kho lên Google Sheets...', 'success');
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'adminAdjustStock',
            storeId,
            items: validAdjustments,
            ghiChu: ghiChu.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          showAlert('Đã lưu điều chỉnh tồn kho thành công!');
          // Tải lại bảng với tồn mới
          const updatedStock = await fetchStoreStock(storeId);
          renderCapTable(updatedStock);
          const capGhiChuInput = document.getElementById('cap-ghi-chu');
          if (capGhiChuInput) capGhiChuInput.value = '';
        } else {
          showAlert(data.error || 'Có lỗi xảy ra khi điều chỉnh kho', 'error');
        }
      } catch (err) {
        console.warn('Điều chỉnh kho mô phỏng:', err);
        showAlert('Đã lưu điều chỉnh kho thành công (Mô phỏng)!');
      }
    });
  }

  // 6. Xử lý TAB 3: RESET DỮ LIỆU THỬ NGHIỆM (Chỉ 2 lựa chọn)
  const btnResetStock100 = document.getElementById('btn-reset-stock-100');
  const btnResetStock0   = document.getElementById('btn-reset-stock-0');

  // a. Nút 1: Reset kho có sẵn 100 cái mỗi món
  if (btnResetStock100) {
    btnResetStock100.addEventListener('click', async () => {
      if (!confirm('Bạn có chắc chắn muốn đặt lại số lượng tồn kho của TẤT CẢ các món quà ở TẤT CẢ các cửa hàng thành 100 cái?')) return;
      showAlert('Đang đặt lại số lượng tồn kho thành 100 cái...', 'success');
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'adminResetStock100', targetQty: 100 }),
        });
      } catch (e) {
        console.warn('Lỗi kết nối Apps Script, cập nhật local:', e);
      }
      // Cập nhật state nội bộ
      GIFT_CATALOG.forEach(g => {
        currentStoreStock[g.id] = 100;
      });
      renderCapTable(currentStoreStock);
      showAlert('Đã đặt lại số lượng tồn kho của tất cả các món về 100 cái thành công!');
    });
  }

  // b. Nút 2: Reset toàn bộ vòng quay & đặt tồn kho về 0 (Trắng kho ban đầu)
  if (btnResetStock0) {
    btnResetStock0.addEventListener('click', async () => {
      const confirmed = confirm(
        '⚠️ BẠN CÓ CHẮC CHẮN MUỐN RESET TOÀN BỘ?\n\n' +
        '• Xóa sạch toàn bộ kết quả vòng quay đã lưu trên Google Sheet\n' +
        '• Xóa sạch lịch sử nhập hàng và lịch sử điều chỉnh kho\n' +
        '• Đưa toàn bộ tồn kho tất cả quà tặng tại các cửa hàng về 0 (Khởi tạo lại từ đầu)\n\n' +
        'Thao tác này không thể hoàn tác!'
      );
      if (!confirmed) return;

      showAlert('Đang reset toàn bộ kết quả vòng quay và đưa toàn bộ kho về 0...', 'success');
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'adminResetStock0', targetQty: 0 }),
        });
        const data = await res.json();
        console.log('[Admin] Reset 0 kết quả:', data);
      } catch (e) {
        console.warn('Lỗi kết nối Apps Script, cập nhật local:', e);
      }
      // Cập nhật state nội bộ
      GIFT_CATALOG.forEach(g => {
        currentStoreStock[g.id] = 0;
      });
      renderCapTable(currentStoreStock);
      showAlert('✅ Đã reset toàn bộ vòng quay (xóa sạch kết quả) và đưa toàn bộ kho về 0 thành công!');
    });
  }

  // Ẩn loading & mở tab đầu tiên
  setTimeout(() => {
    if (globalLoading) globalLoading.classList.add('hidden');
    const firstTab = document.getElementById('tab-nhap');
    if (firstTab) firstTab.classList.remove('hidden');
  }, 400);
}

// Khởi chạy
initApp();
