const API_URL = '/api';
let adminPassword = localStorage.getItem('adminPassword') || '';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': adminPassword ? `Bearer ${adminPassword}` : ''
  };
}

function checkAdminState() {
  if (adminPassword) {
    document.body.classList.add('admin-mode');
    document.getElementById('btn-admin-login').classList.add('hidden');
    document.getElementById('btn-admin-logout').classList.remove('hidden');
  } else {
    document.body.classList.remove('admin-mode');
    document.getElementById('btn-admin-login').classList.remove('hidden');
    document.getElementById('btn-admin-logout').classList.add('hidden');
  }
}

function toggleAdminLogin() { openModal('admin-login-modal'); }

function submitAdminLogin() {
  const pwd = document.getElementById('admin-password-input').value;
  if (!pwd) return alert('Vui lòng nhập mật khẩu');
  adminPassword = pwd;
  localStorage.setItem('adminPassword', adminPassword);
  closeModal('admin-login-modal');
  checkAdminState();
  openTab('tab-match');
}

function logoutAdmin() {
  adminPassword = '';
  localStorage.removeItem('adminPassword');
  checkAdminState();
  // Về tab xem danh sách
  openTab('tab-members');
}

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

function formatInputCurrency(input) {
  let val = input.value.replace(/\D/g, '');
  if (val === '') {
    input.value = '';
    return;
  }
  input.value = new Intl.NumberFormat('vi-VN').format(val);
}

function addDepositAmount(amount) {
  const input = document.getElementById('deposit-amount');
  let current = parseInt(input.value.replace(/\D/g, '')) || 0;
  current += amount;
  input.value = new Intl.NumberFormat('vi-VN').format(current);
}

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
  const debtContainer = document.getElementById('members-debt-list');
  const fundContainer = document.getElementById('members-fund-list');
  
  if(debtContainer) debtContainer.innerHTML = '';
  if(fundContainer) fundContainer.innerHTML = '';
  
  let totalFund = 0;
  let totalDebt = 0;
  let hasDebt = false;

  allMembers.forEach(m => {
    if (m.balance > 0) totalFund += m.balance;
    if (m.balance < 0) {
      totalDebt += Math.abs(m.balance);
      hasDebt = true;
    }
    
    // Determine color based on balance
    let bgColor = 'bg-green-100';
    let textColor = 'text-green-800';
    let borderColor = 'border-green-300';
    
    if (m.balance < 0) {
      bgColor = 'bg-red-50';
      textColor = 'text-red-800';
      borderColor = 'border-red-300';
    } else if (m.balance === 0) {
      bgColor = 'bg-gray-50';
      textColor = 'text-gray-800';
      borderColor = 'border-gray-300';
    } else if (m.balance < 50000) {
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-800';
      borderColor = 'border-yellow-300';
    }

    const cardHTML = `
      <div class="${bgColor} border ${borderColor} rounded-lg p-4 flex justify-between items-center shadow-sm relative group">
        <div>
          <h3 class="font-bold ${textColor}">${m.name}</h3>
          <p class="${textColor} font-medium mt-1">Quỹ: ${formatMoney(m.balance)}</p>
        </div>
        <div class="flex gap-2">
          ${m.balance < 0 ? 
            `<button onclick="openDepositModal('${m._id}', '${m.name}', ${Math.abs(m.balance)})" class="bg-red-600 text-white text-sm font-medium px-3 py-1 rounded shadow hover:bg-red-700 admin-only">Thu nợ</button>` : 
            `<button onclick="openDepositModal('${m._id}', '${m.name}')" class="bg-white text-sm font-medium px-3 py-1 rounded shadow text-gray-700 hover:bg-gray-50 border border-gray-200 admin-only">Nạp tiền</button>`
          }
          <button onclick="deleteMember('${m._id}', '${m.name}')" class="bg-red-50 text-red-600 text-sm font-medium px-2 py-1 rounded shadow-sm border border-red-200 hover:bg-red-100 admin-only" title="Xóa thành viên">
            🗑️
          </button>
        </div>
      </div>
    `;

    if (m.balance < 0 && debtContainer) {
      debtContainer.innerHTML += cardHTML;
    } else if (fundContainer) {
      fundContainer.innerHTML += cardHTML;
    }
  });

  const noDebtMsg = document.getElementById('no-debt-msg');
  if(noDebtMsg) {
    if (hasDebt) noDebtMsg.classList.add('hidden');
    else noDebtMsg.classList.remove('hidden');
  }

  const summaryFund = document.getElementById('summary-total-fund');
  if(summaryFund) summaryFund.innerText = formatMoney(totalFund);
  
  const summaryDebt = document.getElementById('summary-total-debt');
  if(summaryDebt) summaryDebt.innerText = formatMoney(totalDebt);
}

function openAddMemberModal() { openModal('add-member-modal'); }

async function submitNewMember() {
  const name = document.getElementById('new-member-name').value;
  if (!name) return alert('Vui lòng nhập tên');
  
  const res = await fetch(`${API_URL}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name })
  });
  
  if (!res.ok) {
    const err = await res.json();
    return alert('Lỗi: ' + (err.error || 'Sai mật khẩu Admin'));
  }
  
  closeModal('add-member-modal');
  document.getElementById('new-member-name').value = '';
  loadMembers();
}

async function deleteMember(id, name) {
  if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${name}" không?`)) return;

  const res = await fetch(`${API_URL}/members/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  const data = await res.json();
  if (!res.ok) {
    return alert('Lỗi: ' + (data.error || 'Sai mật khẩu Admin'));
  }

  alert('Đã xóa thành viên!');
  loadMembers();
}

function openDepositModal(id, name, amount = '') {
  document.getElementById('deposit-member-id').value = id;
  document.getElementById('deposit-member-name').innerText = name;
  
  const input = document.getElementById('deposit-amount');
  if (amount) {
    input.value = new Intl.NumberFormat('vi-VN').format(amount);
  } else {
    input.value = '';
  }
  
  openModal('deposit-modal');
}

function copyDebtReminder() {
  const debtors = allMembers.filter(m => m.balance < 0);
  if (debtors.length === 0) return alert('Không có ai nợ quỹ!');
  
  let text = `⚠️ DANH SÁCH CHƯA ĐÓNG QUỸ:\n`;
  debtors.forEach(m => {
    text += `- ${m.name}: đang âm ${formatMoney(Math.abs(m.balance))}\n`;
  });
  text += `\nMọi người nhớ nạp thêm để duy trì quỹ sân nhé! Cảm ơn anh em.`;
  
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  alert('Đã copy danh sách nhắc nợ!');
}

async function submitDeposit() {
  const id = document.getElementById('deposit-member-id').value;
  const rawValue = document.getElementById('deposit-amount').value.replace(/\D/g, '');
  const amount = parseInt(rawValue);
  if (!amount || amount <= 0) return alert('Số tiền không hợp lệ');

  // Confirmation to ensure safety
  const memberName = document.getElementById('deposit-member-name').innerText;
  if (!confirm(`Xác nhận nạp ${formatMoney(amount)} cho thành viên ${memberName}?`)) return;

  const res = await fetch(`${API_URL}/members/${id}/deposit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount })
  });

  if (!res.ok) {
    const err = await res.json();
    return alert('Lỗi: ' + (err.error || 'Sai mật khẩu Admin'));
  }

  closeModal('deposit-modal');
  loadMembers();
  alert('Đã nạp tiền thành công!');
}

// ================= INVENTORY =================
let inventoryBatches = [];

async function loadInventory() {
  try {
    const res = await fetch(`${API_URL}/inventory`);
    const data = await res.json();
    
    inventoryBatches = data.batches;

    document.getElementById('inventory-total').innerText = data.totalShuttles;
    document.getElementById('preview-inventory').innerText = data.totalShuttles;

    let totalRemainingTubes = 0;
    data.batches.forEach(b => {
      const perTube = b.shuttlesPerTube || 12;
      totalRemainingTubes += b.remainingShuttles / perTube;
    });
    document.getElementById('inventory-total-tubes').innerText = totalRemainingTubes.toFixed(1);

    const tbody = document.getElementById('inventory-batches');
    tbody.innerHTML = '';
    data.batches.forEach(b => {
      const perTube = b.shuttlesPerTube || 12;
      const tubesLeft = (b.remainingShuttles / perTube).toFixed(1);
      tbody.innerHTML += `
        <tr class="border-b hover:bg-gray-50">
          <td class="py-2 px-3">${new Date(b.importDate).toLocaleDateString('vi-VN')}</td>
          <td class="py-2 px-3 font-medium text-gray-700">${b.brand || 'Chưa rõ'}</td>
          <td class="py-2 px-3">${perTube} quả/ống</td>
          <td class="py-2 px-3">${formatMoney(b.pricePerTube)}</td>
          <td class="py-2 px-3 font-medium">${b.remainingShuttles} quả (${tubesLeft} ống)</td>
          <td class="py-2 px-3 text-right admin-only-cell">
            <button onclick="openEditInventoryModal('${b._id}')" class="text-blue-600 hover:text-blue-800 font-medium text-sm mr-3">Sửa</button>
            <button onclick="deleteInventory('${b._id}')" class="text-red-600 hover:text-red-800 font-medium text-sm">Xóa</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function openAddInventoryModal() { openModal('add-inventory-modal'); }

async function submitInventory() {
  const brand = document.getElementById('new-inventory-brand').value;
  const tubes = parseInt(document.getElementById('new-inventory-tubes').value);
  const shuttlesPerTube = parseInt(document.getElementById('new-inventory-shuttles-per-tube').value) || 12;
  const priceRaw = document.getElementById('new-inventory-price').value.replace(/\D/g, '');
  const price = parseInt(priceRaw);
  if (!tubes || !price) return alert('Vui lòng nhập đầy đủ thông tin');

  const res = await fetch(`${API_URL}/inventory`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ brand, totalTubes: tubes, pricePerTube: price, shuttlesPerTube })
  });

  if (!res.ok) {
    const err = await res.json();
    return alert('Lỗi: ' + (err.error || 'Sai mật khẩu Admin'));
  }

  closeModal('add-inventory-modal');
  document.getElementById('new-inventory-brand').value = '';
  document.getElementById('new-inventory-tubes').value = '';
  document.getElementById('new-inventory-shuttles-per-tube').value = '12';
  document.getElementById('new-inventory-price').value = '';
  loadInventory();
  alert('Nhập kho thành công!');
}

function openEditInventoryModal(id) {
  const batch = inventoryBatches.find(b => b._id === id);
  if (!batch) return;

  document.getElementById('edit-inventory-id').value = batch._id;
  
  const d = new Date(batch.importDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  document.getElementById('edit-inventory-date').value = `${year}-${month}-${day}`;

  document.getElementById('edit-inventory-brand').value = batch.brand || '';
  document.getElementById('edit-inventory-tubes').value = batch.totalTubes;
  document.getElementById('edit-inventory-shuttles-per-tube').value = batch.shuttlesPerTube || 12;
  document.getElementById('edit-inventory-price').value = batch.pricePerTube;
  document.getElementById('edit-inventory-remaining').value = batch.remainingShuttles;

  openModal('edit-inventory-modal');
}

async function submitEditInventory() {
  const id = document.getElementById('edit-inventory-id').value;
  const importDate = document.getElementById('edit-inventory-date').value;
  const brand = document.getElementById('edit-inventory-brand').value;
  const tubes = parseInt(document.getElementById('edit-inventory-tubes').value);
  const shuttlesPerTube = parseInt(document.getElementById('edit-inventory-shuttles-per-tube').value) || 12;
  const priceRaw = document.getElementById('edit-inventory-price').value.replace(/\D/g, '');
  const price = parseInt(priceRaw);
  const remainingShuttles = parseInt(document.getElementById('edit-inventory-remaining').value);

  if (!tubes || !price || isNaN(remainingShuttles)) return alert('Vui lòng nhập đầy đủ thông tin');

  const res = await fetch(`${API_URL}/inventory/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      brand,
      totalTubes: tubes, 
      pricePerTube: price, 
      shuttlesPerTube, 
      remainingShuttles,
      importDate: importDate ? new Date(importDate).toISOString() : undefined
    })
  });

  if (!res.ok) {
    const err = await res.json();
    return alert('Lỗi: ' + (err.error || 'Sai mật khẩu Admin'));
  }

  closeModal('edit-inventory-modal');
  loadInventory();
  alert('Cập nhật thành công!');
}

async function deleteInventory(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa lô cầu này?')) return;

  const res = await fetch(`${API_URL}/inventory/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const err = await res.json();
    return alert('Lỗi: ' + (err.error || 'Sai mật khẩu Admin'));
  }

  loadInventory();
  alert('Đã xóa lô cầu!');
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
  const courtFeeRaw = document.getElementById('court-fee').value.replace(/\D/g, '');
  const courtFee = parseInt(courtFeeRaw) || 0;
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
  
  const courtFeeRaw = document.getElementById('court-fee').value.replace(/\D/g, '');
  const courtFee = parseInt(courtFeeRaw);
  const shuttlesUsed = parseInt(document.getElementById('shuttles-used').value);

  if (participantIds.length === 0) return alert('Vui lòng chọn người đi đánh!');
  if (isNaN(courtFee) || isNaN(shuttlesUsed)) return alert('Vui lòng nhập tiền sân và số cầu!');

  const btn = document.getElementById('btn-submit-match');
  btn.disabled = true;
  btn.innerText = 'Đang xử lý...';

  try {
    const res = await fetch(`${API_URL}/matches`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
          <td class="py-2 px-3 text-right admin-only-cell">
            ${t.type === 'DEPOSIT' ? `
              <button onclick="openEditTransactionModal('${t._id}', '${t.member ? t.member.name : '?'}', ${t.amount}, '${t.description}')" class="text-blue-600 hover:text-blue-800 font-medium text-sm mr-3">Sửa</button>
              <button onclick="deleteTransaction('${t._id}')" class="text-red-600 hover:text-red-800 font-medium text-sm">Xóa</button>
            ` : ''}
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function openEditTransactionModal(id, memberName, currentAmount, description) {
  document.getElementById('edit-tx-id').value = id;
  document.getElementById('edit-tx-member-name').innerText = memberName;
  const input = document.getElementById('edit-tx-amount');
  input.value = new Intl.NumberFormat('vi-VN').format(currentAmount);
  document.getElementById('edit-tx-description').value = description;
  openModal('edit-transaction-modal');
}

async function submitEditTransaction() {
  const id = document.getElementById('edit-tx-id').value;
  const rawValue = document.getElementById('edit-tx-amount').value.replace(/\D/g, '');
  const amount = parseInt(rawValue);
  const description = document.getElementById('edit-tx-description').value;

  if (!amount || amount <= 0) return alert('Số tiền không hợp lệ');

  if (!confirm(`Bạn chắc chắn muốn sửa thành ${formatMoney(amount)} không? Quỹ sẽ tự động bù trừ phần chênh lệch.`)) return;

  try {
    const res = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi hệ thống');
    }
    closeModal('edit-transaction-modal');
    loadTransactions();
    loadMembers(); // Cập nhật lại quỹ bên tab thành viên
    alert('Sửa giao dịch thành công!');
  } catch (err) {
    alert('Lỗi: ' + err.message);
  }
}

async function deleteTransaction(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa giao dịch này? Số tiền đã nạp sẽ bị trừ lại khỏi quỹ của người đó.')) return;
  
  try {
    const res = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi hệ thống');
    }
    loadTransactions();
    loadMembers(); // Cập nhật lại quỹ
    alert('Xóa giao dịch thành công!');
  } catch (err) {
    alert('Lỗi: ' + err.message);
  }
}

// Init
window.onload = () => {
  checkAdminState();
  loadMembers();
  loadInventory();
};
