// Payroll-specific variables and functions
let employees = [
  { id: 1, name: "A", position: "Staff", hourlyRate: 50.00, isClockedIn: false },
  { id: 2, name: "B", position: "Staff", hourlyRate: 50.00, isClockedIn: false },
  { id: 3, name: "Eomma", position: "Manager", hourlyRate: 50.00, isClockedIn: false },
];
let timeRecords = [];
let editingEmployeeId = null;

function initializePayroll() {
  if (localStorage.getItem('employees')) {
    employees = JSON.parse(localStorage.getItem('employees'));
  }
  if (localStorage.getItem('timeRecords')) {
    timeRecords = JSON.parse(localStorage.getItem('timeRecords')).map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
  }
  updateClock();
  setInterval(updateClock, 1000);
  populateEmployeeDropdown();
  updateEmployeeTable();
  updateActivityTable();
  updateDashboardStats();
  updateTodayStatus();
  const printBtn = document.getElementById('print-payroll-btn');
  printBtn.disabled = true;
  printBtn.classList.add('opacity-50', 'cursor-not-allowed');
  document.getElementById('clock-in-btn').addEventListener('click', clockInEmployee);
  document.getElementById('clock-out-btn').addEventListener('click', clockOutEmployee);
  document.getElementById('calculate-payroll-btn').addEventListener('click', calculatePayroll);
  printBtn.addEventListener('click', printPayroll);
  document.getElementById('add-employee-btn').addEventListener('click', () => {
    document.getElementById('add-employee-modal').classList.remove('hidden');
  });
  document.getElementById('close-add-modal-btn').addEventListener('click', closeAddEmployeeModal);
  document.getElementById('cancel-add-btn').addEventListener('click', closeAddEmployeeModal);
  document.getElementById('save-add-employee-btn').addEventListener('click', saveEmployee);
  document.getElementById('close-edit-modal-btn').addEventListener('click', closeEditEmployeeModal);
  document.getElementById('cancel-edit-btn').addEventListener('click', closeEditEmployeeModal);
  document.getElementById('save-edit-employee-btn').addEventListener('click', saveEmployee);
  document.getElementById('employee-select').addEventListener('change', updateTodayStatus);
  document.querySelectorAll('.edit-employee-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const employeeId = parseInt(this.getAttribute('data-id'));
      editEmployee(employeeId);
    });
  });
  document.querySelectorAll('.delete-employee-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const employeeId = parseInt(this.getAttribute('data-id'));
      deleteEmployee(employeeId);
    });
  });
}

function populateEmployeeDropdown() {
  const select = document.getElementById('employee-select');
  select.innerHTML = '<option value="">-- Select Employee --</option>';
  employees.forEach(employee => {
    const option = document.createElement('option');
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.position})`;
    select.appendChild(option);
  });
}

function updateEmployeeTable() {
  const tbody = document.getElementById('employee-table-body');
  tbody.innerHTML = '';
  employees.forEach(employee => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">${employee.name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${employee.position}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">PHP ${employee.hourlyRate.toFixed(2)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 rounded-full text-xs ${employee.isClockedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
          ${employee.isClockedIn ? 'Clocked In' : 'Clocked Out'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        <button class="text-indigo-600 hover:text-indigo-900 mr-3 edit-employee-btn" data-id="${employee.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button class="text-red-600 hover:text-red-900 delete-employee-btn" data-id="${employee.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  document.querySelectorAll('.edit-employee-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const employeeId = parseInt(this.getAttribute('data-id'));
      editEmployee(employeeId);
    });
  });
  document.querySelectorAll('.delete-employee-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const employeeId = parseInt(this.getAttribute('data-id'));
      deleteEmployee(employeeId);
    });
  });
}

function updateActivityTable() {
  const tbody = document.getElementById('activity-table-body');
  tbody.innerHTML = '';
  const recentRecords = [...timeRecords].sort((a, b) => b.timestamp - a.timestamp);
  recentRecords.forEach(record => {
    const employee = employees.find(e => e.id === record.employeeId);
    if (!employee) return;
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    const formattedDate = record.timestamp.toLocaleDateString();
    const formattedTime = record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formattedDate}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">${employee.name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        <span class="px-2 py-1 rounded-full text-xs ${record.action === 'clock-in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${record.action === 'clock-in' ? 'CLOCK IN' : 'CLOCK OUT'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formattedTime}</td>
    `;
    tbody.appendChild(row);
  });
}

function updateDashboardStats() {
  const activeEmployees = employees.filter(e => e.isClockedIn).length;
  document.getElementById('active-employees').textContent = activeEmployees;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecords = timeRecords.filter(record => {
    return new Date(record.timestamp).setHours(0, 0, 0, 0) === today.getTime();
  });
  let totalHoursToday = 0;
  let totalPayrollDue = 0;
  employees.forEach(employee => {
    const employeeRecords = todayRecords.filter(r => r.employeeId === employee.id).sort((a, b) => a.timestamp - b.timestamp);
    let employeeTotalHours = 0;
    for (let i = 0; i < employeeRecords.length; i += 2) {
      const clockIn = employeeRecords[i];
      const clockOut = employeeRecords[i + 1];
      if (clockIn && clockOut && clockIn.action === 'clock-in' && clockOut.action === 'clock-out') {
        const timeDiff = (clockOut.timestamp - clockIn.timestamp) / (1000 * 60 * 60);
        employeeTotalHours += timeDiff;
      } else if (clockIn && clockIn.action === 'clock-in' && employee.isClockedIn) {
        const timeDiff = (new Date() - clockIn.timestamp) / (1000 * 60 * 60);
        employeeTotalHours += timeDiff;
      }
    }
    totalHoursToday += employeeTotalHours;
    const regularHours = Math.min(employeeTotalHours, 8);
    const overtimeHours = Math.max(employeeTotalHours - 8, 0);
    const regularPay = regularHours * employee.hourlyRate;
    const overtimePay = overtimeHours * employee.hourlyRate * 1.5;
    totalPayrollDue += (regularPay + overtimePay);
  });
  document.getElementById('total-hours').textContent = totalHoursToday.toFixed(1);
  document.getElementById('payroll-due').textContent = `PHP ${totalPayrollDue.toFixed(2)}`;
}

function updateTodayStatus() {
  const select = document.getElementById('employee-select');
  if (!select.value) {
    document.getElementById('today-status').textContent = "No activity recorded yet today.";
    return;
  }
  const employeeId = parseInt(select.value);
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecords = timeRecords.filter(record => {
    return record.employeeId === employeeId && new Date(record.timestamp).setHours(0, 0, 0, 0) === today.getTime();
  }).sort((a, b) => a.timestamp - b.timestamp);
  if (todayRecords.length === 0) {
    document.getElementById('today-status').innerHTML = `${employee.name} has no recorded clock-ins for today yet.`;
    return;
  }
  let statusHTML = `<strong>${employee.name}'s</strong> activity today:<br><br>`;
  let totalHours = 0;
  for (let i = 0; i < todayRecords.length; i += 2) {
    const clockIn = todayRecords[i];
    const clockOut = todayRecords[i + 1];
    if (clockIn && clockOut && clockIn.action === 'clock-in' && clockOut.action === 'clock-out') {
      const timeDiff = (clockOut.timestamp - clockIn.timestamp) / (1000 * 60 * 60);
      totalHours += timeDiff;
      const inTime = clockIn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const outTime = clockOut.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      statusHTML += `⏱ <u>Shift:</u> ${inTime} - ${outTime} (${timeDiff.toFixed(2)} hours)<br>`;
    } else if (clockIn && clockIn.action === 'clock-in' && employee.isClockedIn) {
      const timeDiff = (new Date() - clockIn.timestamp) / (1000 * 60 * 60);
      totalHours += timeDiff;
      const inTime = clockIn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      statusHTML += `⏱ <u>Currently clocked in since:</u> ${inTime} (${timeDiff.toFixed(2)} hours so far)<br>`;
    }
  }
  statusHTML += `<br><strong>Total hours today:</strong> ${totalHours.toFixed(1)}`;
  document.getElementById('today-status').innerHTML = statusHTML;
}

function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  document.getElementById('current-time').textContent = timeString;
  document.getElementById('current-date').textContent = dateString;
}

function clockInEmployee() {
  const select = document.getElementById('employee-select');
  if (!select.value) {
    alert('Please select an employee first');
    return;
  }
  const employeeId = parseInt(select.value);
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return;
  if (employee.isClockedIn) {
    alert('This employee is already clocked in!');
    return;
  }
  employee.isClockedIn = true;
  const timestamp = new Date();
  timeRecords.push({ employeeId, action: 'clock-in', timestamp });
  populateEmployeeDropdown();
  updateEmployeeTable();
  updateActivityTable();
  updateDashboardStats();
  updateTodayStatus();
  const button = document.getElementById('clock-in-btn');
  button.classList.add('punch-animation');
  setTimeout(() => {
    button.classList.remove('punch-animation');
  }, 1500);
  createNotification(`${employee.name} has clocked in`);
  saveData();
}

function clockOutEmployee() {
  const select = document.getElementById('employee-select');
  if (!select.value) {
    alert('Please select an employee first');
    return;
  }
  const employeeId = parseInt(select.value);
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return;
  if (!employee.isClockedIn) {
    alert('This employee is not clocked in!');
    return;
  }
  employee.isClockedIn = false;
  const timestamp = new Date();
  timeRecords.push({ employeeId, action: 'clock-out', timestamp });
  populateEmployeeDropdown();
  updateEmployeeTable();
  updateActivityTable();
  updateDashboardStats();
  updateTodayStatus();
  const button = document.getElementById('clock-out-btn');
  button.classList.add('punch-animation');
  setTimeout(() => {
    button.classList.remove('punch-animation');
  }, 1500);
  createNotification(`${employee.name} has clocked out`);
  saveData();
}

function calculatePayroll() {
  const startDateInput = document.getElementById('pay-period-start').value;
  const endDateInput = document.getElementById('pay-period-end').value;
  if (!startDateInput || !endDateInput) {
    alert('Please select valid pay period dates.');
    return;
  }
  const startDate = new Date(startDateInput);
  let endDate = new Date(endDateInput);
  if (startDate > endDate) {
    alert('Pay Period Start must be before Pay Period End.');
    return;
  }
  endDate.setHours(23, 59, 59, 999);
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalRegularPay = 0;
  let totalOvertimePay = 0;
  employees.forEach(employee => {
    const empRecords = timeRecords.filter(r => r.employeeId === employee.id && r.timestamp >= startDate && r.timestamp <= endDate).sort((a, b) => a.timestamp - b.timestamp);
    let recordsByDay = {};
    empRecords.forEach(r => {
      const dateKey = r.timestamp.toISOString().split('T')[0];
      if (!recordsByDay[dateKey]) recordsByDay[dateKey] = [];
      recordsByDay[dateKey].push(r);
    });
    Object.values(recordsByDay).forEach(dayRecords => {
      dayRecords.sort((a, b) => a.timestamp - b.timestamp);
      let dailyHours = 0;
      for (let i = 0; i < dayRecords.length; i += 2) {
        const clockIn = dayRecords[i];
        const clockOut = dayRecords[i + 1];
        if (clockIn && clockOut && clockIn.action === 'clock-in' && clockOut.action === 'clock-out') {
          const hours = (clockOut.timestamp - clockIn.timestamp) / (1000 * 60 * 60);
          dailyHours += hours;
        }
      }
      const regularHours = Math.min(dailyHours, 8);
      const overtimeHours = Math.max(dailyHours - 8, 0);
      totalRegularHours += regularHours;
      totalOvertimeHours += overtimeHours;
      totalRegularPay += regularHours * employee.hourlyRate;
      totalOvertimePay += overtimeHours * employee.hourlyRate * 1.5;
    });
  });
  document.getElementById('regular-hours').textContent = totalRegularHours.toFixed(1);
  document.getElementById('overtime-hours').textContent = totalOvertimeHours.toFixed(1);
  document.getElementById('total-employees-payroll').textContent = employees.length;
    document.getElementById('regular-pay').textContent = `PHP ${totalRegularPay.toFixed(2)}`;
  document.getElementById('overtime-pay').textContent = `PHP ${totalOvertimePay.toFixed(2)}`;
  document.getElementById('total-pay').textContent = `PHP ${(totalRegularPay + totalOvertimePay).toFixed(2)}`;
  const results = document.getElementById('payroll-results');
  if (results.classList.contains('hidden')) results.classList.remove('hidden');
  const printBtn = document.getElementById('print-payroll-btn');
  printBtn.disabled = false;
  printBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  createNotification(`Payroll calculated for ${employees.length} employees.`);
}

function printPayroll() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Eomma's - Payroll Summary", 14, 20);
  const startDate = document.getElementById('pay-period-start').value || 'N/A';
  const endDate = document.getElementById('pay-period-end').value || 'N/A';
  doc.setFontSize(12);
  doc.text(`Pay Period Start: ${startDate}`, 14, 30);
  doc.text(`Pay Period End: ${endDate}`, 14, 38);
  const payrollDueText = document.getElementById('payroll-due').textContent || 'PHP 0.00';
  const totalHoursText = document.getElementById('total-hours').textContent || '0.0';
  doc.setFontSize(14);
  doc.text("Real-Time Payroll Due:", 14, 50);
  doc.setFontSize(12);
  doc.text(`Total Hours Today: ${totalHoursText}`, 14, 60);
  doc.text(`Payroll Due: ${payrollDueText}`, 14, 68);
  doc.text("Calculated Payroll Summary:", 14, 80);
  doc.text(`Regular Hours: ${document.getElementById('regular-hours').textContent}`, 14, 90);
  doc.text(`Overtime Hours: ${document.getElementById('overtime-hours').textContent}`, 14, 98);
  doc.text(`Total Employees: ${document.getElementById('total-employees-payroll').textContent}`, 14, 106);
  doc.text(`Regular Pay: ${document.getElementById('regular-pay').textContent}`, 14, 114);
  doc.text(`Overtime Pay: ${document.getElementById('overtime-pay').textContent}`, 14, 122);
  doc.text(`Total Pay: ${document.getElementById('total-pay').textContent}`, 14, 130);
  const printDate = new Date().toLocaleString();
  doc.setFontSize(10);
  doc.text(`Generated on: ${printDate}`, 14, 140);
  doc.save("payroll-summary.pdf");
}

function closeAddEmployeeModal() {
  document.getElementById('add-employee-modal').classList.add('hidden');
  document.getElementById('add-employee-name').value = '';
  document.getElementById('add-employee-position').value = '';
  document.getElementById('add-employee-rate').value = '50.00';
}

function closeEditEmployeeModal() {
  document.getElementById('edit-employee-modal').classList.add('hidden');
  editingEmployeeId = null;
}

function saveEmployee() {
  const isEditing = editingEmployeeId !== null;
  const modalId = isEditing ? 'edit-employee-modal' : 'add-employee-modal';
  const nameId = isEditing ? 'edit-employee-name' : 'add-employee-name';
  const positionId = isEditing ? 'edit-employee-position' : 'add-employee-position';
  const rateId = isEditing ? 'edit-employee-rate' : 'add-employee-rate';
  const name = document.getElementById(nameId).value.trim();
  const position = document.getElementById(positionId).value.trim();
  const rate = parseFloat(document.getElementById(rateId).value);
  const MIN_WAGE = 30.00;
  if (!name || !position || isNaN(rate) || rate < MIN_WAGE) {
    alert(`Please fill all fields with valid values (minimum wage is PHP ${MIN_WAGE.toFixed(2)})`);
    return;
  }
  if (isEditing) {
    const employee = employees.find(e => e.id === editingEmployeeId);
    if (employee.isClockedIn) {
      alert('Cannot edit an employee who is currently clocked in.');
      return;
    }
    employee.name = name;
    employee.position = position;
    employee.hourlyRate = rate;
    createNotification(`${name} details updated`);
  } else {
    if (employees.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      alert('An employee with this name already exists.');
      return;
    }
    const newId = (employees.length > 0) ? Math.max(...employees.map(e => e.id)) + 1 : 1;
    const newEmployee = {
      id: newId,
      name,
      position,
      hourlyRate: rate,
      isClockedIn: false
    };
    employees.push(newEmployee);
    createNotification(`${name} added as new ${position}`);
  }
  populateEmployeeDropdown();
  updateEmployeeTable();
  updateDashboardStats();
  document.getElementById(modalId).classList.add('hidden');
  editingEmployeeId = null;
  saveData();
}

function editEmployee(id) {
  const employee = employees.find(e => e.id === id);
  if (!employee) return;
  if (employee.isClockedIn) {
    alert('Cannot edit an employee who is currently clocked in.');
    return;
  }
  editingEmployeeId = id;
  document.getElementById('edit-employee-name').value = employee.name;
  document.getElementById('edit-employee-position').value = employee.position;
  document.getElementById('edit-employee-rate').value = employee.hourlyRate.toFixed(2);
  document.getElementById('edit-employee-modal').classList.remove('hidden');
}

function deleteEmployee(id) {
  if (confirm('Are you sure you want to delete this employee?')) {
    const index = employees.findIndex(e => e.id === id);
    if (index !== -1) {
      const name = employees[index].name;
      employees.splice(index, 1);
      timeRecords = timeRecords.filter(r => r.employeeId !== id);
      populateEmployeeDropdown();
      updateEmployeeTable();
      updateActivityTable();
      updateDashboardStats();
      createNotification(`${name} removed from system`);
      saveData();
    }
  }
}

function createNotification(message) {
  console.log(`Notification: ${message}`);
}

function saveData() {
  try {
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('timeRecords', JSON.stringify(timeRecords));
  } catch (e) {
    console.error('Failed to save data:', e);
    alert('Data could not be saved. Check storage space.');
  }
}