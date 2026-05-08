const API_URL = '/api';

// Tab logic
function openTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('[id^="btn-tab-"]').forEach(el => {
    el.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    el.classList.add('text-gray-500');
  });

  document.getElementById(tabId).classList.add('active');
  const btn = document.getElementById(`btn-${tabId}`);
  btn.classList.remove('text-gray-500');
  btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');

  // Refresh data based on tab
  if(tabId === 'tab-members' || tabId === 'tab-match') loadMembers();
  if(tabId === 'tab-inventory' || tabId === 'tab-match') loadInventory();
  if(tabId === 'tab-history') loadTransactions();
}

// Format currency
const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

// Modals
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ================= MEMBERS =================
let allMembers = [];

async function loadMembers() {
  try {
    const res = await fetch(`${API_URL}/members`);
    allMembers = await res.json();
    renderMembersTab();
    renderAttendanceList();
  } catch (err) {
    console.error(err);
  }
}

function renderMembersTab() {
  const container = document.getElementById('members-list');
  container.innerHTML = '';
  
  allMembers.forEach(m => {
    // Determine color based on balance
    let bgColor = 'bg-green-100';
    let textColor = 'text-green-800';
    let borderColor = 'border-green-300';
    
    if (m.balance <= 0) {
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      borderColor = 'border-red-300';
    } else if (m.balance < 50000) {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      borderColor = 'border-yellow-300';
    }

    container.innerHTML += `
      <div class="${bgColor} border ${borderColor} rounded-lg p-4 flex justify-between items-center shadow-sm">
        <div>
          <h3 class="font-bold ${textColor}">${m.name}</h3>
          <p class="${textColor} font-medium mt-1">Quỹ: ${formatMoney(m.balance)}</p>
        </div>
        <button onclick="openDepositModal('${m._id}', '${m.name}')" class="bg-white text-sm font-medium px-3 py-1 rounded shadow text-gray-700 hover:bg-gray-50 border border-gray-200">
          Nạp tiền
        </button>
      </div>
    `;
  });
}

function openAddMemberModal() { openModal('add-member-modal'); }

async function submitNewMember() {
  const name = document.getElementById('new-member-name').value;
  if (!name) return alert('Vui lòng nhập tên');
  
  await fetch(`${API_URL}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  closeModal('add-member-modal');
  document.getElementById('new-member-name').value = '';
  loadMembers();
}

function openDepositModal(id, name) {
  document.getElementById('deposit-member-id').value = id;
  document.getElementById('deposit-member-name').innerText = name;
  document.getElementById('deposit-amount').value = '';
  openModal('deposit-modal');
}

async function submitDeposit() {
  const id = document.getElementById('deposit-member-id').value;
  const amount = parseInt(document.getElementById('deposit-amount').value);
  if (!amount || amount <= 0) return alert('Số tiền không hợp lệ');

  await fetch(`${API_URL}/members/${id}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });

  closeModal('deposit-modal');
  loadMembers();
  alert('Đã nạp tiền thành công!');
}

// ================= INVENTORY =================
async function loadInventory() {
  try {
    const res = await fetch(`${API_URL}/inventory`);
    const data = await res.json();
    
    document.getElementById('inventory-total').innerText = data.totalShuttles;
    document.getElementById('preview-inventory').innerText = data.totalShuttles;
    document.getElementById('inventory-total-tubes').innerText = (data.totalShuttles / 12).toFixed(1);

    const tbody = document.getElementById('inventory-batches');
    tbody.innerHTML = '';
    data.batches.forEach(b => {
      tbody.innerHTML += `
        <tr class="border-b">
          <td class="py-2 px-3">${new Date(b.importDate).toLocaleDateString('vi-VN')}</td>
          <td class="py-2 px-3">${formatMoney(b.pricePerTube)}</td>
          <td class="py-2 px-3 font-medium">${b.remainingShuttles} quả</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function openAddInventoryModal() { openModal('add-inventory-modal'); }

async function submitInventory() {
  const tubes = parseInt(document.getElementById('new-inventory-tubes').value);
  const price = parseInt(document.getElementById('new-inventory-price').value);
  if (!tubes || !price) return alert('Vui lòng nhập đầy đủ thông tin');

  await fetch(`${API_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalTubes: tubes, pricePerTube: price })
  });

  closeModal('add-inventory-modal');
  document.getElementById('new-inventory-tubes').value = '';
  document.getElementById('new-inventory-price').value = '';
  loadInventory();
  alert('Nhập kho thành công!');
}

// ================= MATCH =================
function renderAttendanceList() {
  const container = document.getElementById('attendance-list');
  container.innerHTML = '';
  allMembers.forEach(m => {
    container.innerHTML += `
      <label class="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200 cursor-pointer hover:bg-blue-50">
        <input type="checkbox" value="${m._id}" data-name="${m.name}" class="attendance-cb w-4 h-4 text-blue-600 rounded" onchange="updateAttendanceCount(); calculatePreview();">
        <span class="text-sm font-medium text-gray-700">${m.name}</span>
      </label>
    `;
  });
}

function updateAttendanceCount() {
  const count = document.querySelectorAll('.attendance-cb:checked').length;
  document.getElementById('attendance-count').innerText = count;
}

async function calculatePreview() {
  const shuttlesUsed = parseInt(document.getElementById('shuttles-used').value) || 0;
  const courtFee = parseInt(document.getElementById('court-fee').value) || 0;
  const participantsCount = document.querySelectorAll('.attendance-cb:checked').length;

  if (shuttlesUsed > 0) {
    try {
      const res = await fetch(`${API_URL}/matches/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shuttlesUsed })
      });
      const data = await res.json();
      if (res.ok) {
        const totalCost = courtFee + data.totalShuttleCost;
        const pp = participantsCount > 0 ? Math.round(totalCost / participantsCount) : 0;
        
        document.getElementById('preview-shuttle-cost').innerText = formatMoney(data.totalShuttleCost);
        document.getElementById('preview-total-cost').innerText = formatMoney(totalCost);
        document.getElementById('preview-cost-per-person').innerText = formatMoney(pp);
      } else {
        document.getElementById('preview-shuttle-cost').innerText = data.error;
      }
    } catch(err) { console.error(err); }
  } else {
    document.getElementById('preview-shuttle-cost').innerText = '0đ';
    const pp = participantsCount > 0 ? Math.round(courtFee / participantsCount) : 0;
    document.getElementById('preview-total-cost').innerText = formatMoney(courtFee);
    document.getElementById('preview-cost-per-person').innerText = formatMoney(pp);
  }
}

async function submitMatch() {
  const cbs = document.querySelectorAll('.attendance-cb:checked');
  const participantIds = Array.from(cbs).map(cb => cb.value);
  const participantNames = Array.from(cbs).map(cb => cb.dataset.name);
  
  const courtFee = parseInt(document.getElementById('court-fee').value);
  const shuttlesUsed = parseInt(document.getElementById('shuttles-used').value);

  if (participantIds.length === 0) return alert('Vui lòng chọn người đi đánh!');
  if (isNaN(courtFee) || isNaN(shuttlesUsed)) return alert('Vui lòng nhập tiền sân và số cầu!');

  const btn = document.getElementById('btn-submit-match');
  btn.disabled = true;
  btn.innerText = 'Đang xử lý...';

  try {
    const res = await fetch(`${API_URL}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds, courtFee, shuttlesUsed })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Xử lý báo cáo Zalo
    generateZaloReport(data, participantNames);
    
    // Reset form
    document.getElementById('court-fee').value = '';
    document.getElementById('shuttles-used').value = '';
    document.querySelectorAll('.attendance-cb').forEach(cb => cb.checked = false);
    updateAttendanceCount();
    calculatePreview();
    
    // Refresh data
    loadMembers();
    loadInventory();
    
  } catch (err) {
    alert('Lỗi: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = '✅ CHỐT SỔ & TRỪ TIỀN';
  }
}

function generateZaloReport(matchData, participantNames) {
  const dateStr = new Date(matchData.date).toLocaleDateString('vi-VN');
  const names = participantNames.join(', ');
  
  const text = `🏸 Báo cáo sân ngày ${dateStr}:
Tổng người: ${participantNames.length} (${names})
Tiền sân: ${formatMoney(matchData.courtFee)}
Tiền cầu: ${formatMoney(matchData.totalShuttleCost)} (${matchData.shuttlesUsed} quả)
➡️ Tổng chi: ${formatMoney(matchData.totalCost)} -> Mỗi người ${formatMoney(matchData.costPerPerson)}.
💰 Đã trừ trực tiếp vào quỹ của anh em nhé! Ai màu đỏ nhớ nạp thêm!`;

  document.getElementById('zalo-report-text').value = text;
  document.getElementById('zalo-report-section').classList.remove('hidden');
}

function copyZaloReport() {
  const text = document.getElementById('zalo-report-text');
  text.select();
  document.execCommand('copy');
  alert('Đã copy báo cáo!');
}

// ================= TRANSACTIONS =================
async function loadTransactions() {
  try {
    const res = await fetch(`${API_URL}/transactions`);
    const data = await res.json();
    
    const tbody = document.getElementById('transactions-list');
    tbody.innerHTML = '';
    data.forEach(t => {
      const isDeposit = t.amount > 0;
      const amountClass = isDeposit ? 'text-green-600' : 'text-red-600';
      const amountSign = isDeposit ? '+' : '';
      
      tbody.innerHTML += `
        <tr class="border-b">
          <td class="py-2 px-3 text-xs text-gray-500">${formatDate(t.date)}</td>
          <td class="py-2 px-3 font-medium text-gray-800">${t.member ? t.member.name : '?'}</td>
          <td class="py-2 px-3 font-bold ${amountClass}">${amountSign}${formatMoney(t.amount)}</td>
          <td class="py-2 px-3 text-sm text-gray-600">${t.description}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// Init
window.onload = () => {
  loadMembers();
  loadInventory();
};
