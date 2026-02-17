// Income/Expense-specific variables and functions
const incomeCategories = ['Sales', 'Others'];
const expenseCategories = [
  'Rent',
  'Electric',
  'Supplies',
  'Wages',
  'Marketing',
  'Maintenance',
  'Miscellaneous',
  'Others',
];
let records = [];
const STORAGE_KEY = 'financialRecords';

function loadRecords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      records = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading records from localStorage:', error);
    records = [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving records to localStorage:', error);
    alert('Failed to save records. Storage might be full or disabled.');
  }
}

function formatCurrency(num) {
  return '₱' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      date = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
    } else {
      date = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
    }
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

function isDateInPeriod(recordDate, filterDate, period) {
  if (!(recordDate instanceof Date) || !(filterDate instanceof Date)) return false;
  switch (period) {
    case 'daily':
      return recordDate.toDateString() === filterDate.toDateString();
    case 'weekly':
      return recordDate.getFullYear() === filterDate.getFullYear() && getWeekNumber(recordDate) === getWeekNumber(filterDate);
    case 'monthly':
      return recordDate.getFullYear() === filterDate.getFullYear() && recordDate.getMonth() === filterDate.getMonth();
    case 'yearly':
      return recordDate.getFullYear() === filterDate.getFullYear();
    default:
      return false;
  }
}

function updateInputsBasedOnPeriod() {
  const period = periodSelect.value;
  if (period === 'daily' || period === 'weekly') {
    dateSelect.disabled = false;
    dateSelect.required = true;
    monthSelect.disabled = true;
    monthSelect.required = false;
    yearSelect.disabled = true;
    yearSelect.required = false;
  } else if (period === 'monthly') {
    dateSelect.disabled = true;
    dateSelect.required = false;
    monthSelect.disabled = false;
    monthSelect.required = true;
    yearSelect.disabled = false;
    yearSelect.required = true;
  } else if (period === 'yearly') {
    dateSelect.disabled = true;
    dateSelect.required = false;
    monthSelect.disabled = true;
    monthSelect.required = false;
    yearSelect.disabled = false;
    yearSelect.required = true;
  }
  [dateSelect, monthSelect, yearSelect].forEach((e) => {
    if (e.disabled) {
      e.classList.add('opacity-50', 'cursor-not-allowed');
      e.setAttribute('aria-disabled', 'true');
    } else {
      e.classList.remove('opacity-50', 'cursor-not-allowed');
      e.removeAttribute('aria-disabled');
    }
  });
}

function getFilterDate() {
  const period = periodSelect.value;
  if (period === 'daily' || period === 'weekly') {
    if (!dateSelect.value) return null;
    return new Date(dateSelect.value + 'T00:00:00');
  }
  if (period === 'monthly') {
    const y = parseInt(yearSelect.value);
    const m = parseInt(monthSelect.value) - 1;
    if (isNaN(y) || isNaN(m) || m < 0) return null;
    return new Date(y, m, 1);
  }
  if (period === 'yearly') {
    const y = parseInt(yearSelect.value);
    if (isNaN(y)) return null;
    return new Date(y, 0, 1);
  }
  return null;
}

function updateCategoryOptions() {
  const type = entryType.value;
  let categories = [];
  if (type === 'income') categories = incomeCategories;
  else if (type === 'expense') categories = expenseCategories;
  entryCategorySelect.innerHTML = '';
  if (categories.length === 0) {
    entryCategorySelect.disabled = true;
    return;
  }
  const placeOpt = document.createElement('option');
  placeOpt.value = '';
  placeOpt.textContent = 'Select';
  placeOpt.disabled = true;
  placeOpt.selected = true;
  entryCategorySelect.appendChild(placeOpt);
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    entryCategorySelect.appendChild(opt);
  });
  entryCategorySelect.disabled = false;
  toggleCustomCategoryInput();
}

function toggleCustomCategoryInput() {
  if (entryCategorySelect.value === 'Others') {
    categoryInputWrapper.classList.remove('hidden');
    entryCategoryInput.required = true;
    entryCategorySelect.required = false;
    entryCategoryInput.value = '';
    entryCategoryInput.focus();
  } else {
    categoryInputWrapper.classList.add('hidden');
    entryCategoryInput.required = false;
    entryCategorySelect.required = true;
    entryCategoryInput.value = '';
  }
}

function renderRecords() {
  const filterDate = getFilterDate();
  const period = periodSelect.value;
  if (!filterDate) {
    recordsBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-500">No records added yet.</td></tr>`;
    updateSummary(0, 0, 0, 0, 0);
    return;
  }
  const filtered = records.filter((r) => {
    const rd = parseDateToISO(r.date);
    return rd && isDateInPeriod(rd, filterDate, period);
  });
  if (filtered.length === 0) {
    recordsBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-500">No records found for the selected filters.</td></tr>`;
  } else {
    recordsBody.innerHTML = filtered.map(({ date, type, category, amount, vatTax }, idx) => {
      const netAmount = amount - vatTax;
      const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      return `<tr class="${rowBg}">
        <td class="border px-4 py-2">${parseDateToISO(date)?.toLocaleDateString() ?? date}</td>
        <td class="border px-4 py-2 capitalize">${type}</td>
        <td class="border px-4 py-2">${category}</td>
        <td class="border px-4 py-2 text-right">${formatCurrency(amount)}</td>
        <td class="border px-4 py-2 text-right">${formatCurrency(vatTax)}</td>
        <td class="border px-4 py-2 text-right">${formatCurrency(netAmount)}</td>
      </tr>`;
    }).join('');
  }
  let totalIncome = 0, totalExpense = 0, totalVat = 0;
  filtered.forEach(({ type, amount, vatTax }) => {
    if (type === 'income') totalIncome += amount;
    else if (type === 'expense') totalExpense += amount;
    totalVat += vatTax;
  });
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome ? (netProfit / totalIncome) * 100 : 0;
  updateSummary(totalIncome, totalExpense, netProfit, profitMargin, totalVat);
}

function updateSummary(income, expense, profit, marginPercent, vat) {
  netIncomeEl.textContent = formatCurrency(income);
  netExpenseEl.textContent = formatCurrency(expense);
  netProfitEl.textContent = formatCurrency(profit);
  profitMarginEl.textContent = marginPercent.toFixed(2) + '%';
  vatCollectedEl.textContent = formatCurrency(vat);
}

function clearEntryForm() {
  entryDate.value = '';
  entryType.value = '';
  updateCategoryOptions();
  entryCategoryInput.value = '';
  entryAmount.value = '';
  entryVatTax.value = '0.00';
}

function initializeIncomeExpense() {
  loadRecords();
  const todayISO = new Date().toISOString().slice(0, 10);
  dateSelect.value = todayISO;
  yearSelect.value = new Date().getFullYear();
  monthSelect.value = '1';
  updateInputsBasedOnPeriod();
  updateCategoryOptions();
  renderRecords();
}

function getIncomeExpenseTodayNetProfit() {
  const todayStr = new Date().toISOString().slice(0, 10);
  let incomeTotal = 0;
  let expenseTotal = 0;
  records.forEach(r => {
    if (r.date === todayStr) {
      if (r.type === 'income') incomeTotal += r.amount || 0;
      else if (r.type === 'expense') expenseTotal += r.amount || 0;
    }
  });
  return incomeTotal - expenseTotal;
}

// Event listeners
entryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const dt = parseDateToISO(entryDate.value);
  if (!dt) {
    alert('Please select a valid date.');
    return;
  }
  if (!entryType.value) {
    alert('Please select a type.');
    return;
  }
  let categoryVal = '';
  if (entryCategorySelect.value === 'Others') {
    categoryVal = entryCategoryInput.value.trim();
    if (!categoryVal) {
      alert('Please enter a custom category.');
      return;
    }
  } else if (entryCategorySelect.value) {
    categoryVal = entryCategorySelect.value;
  } else {
    alert('Please select a category.');
    return;
  }
  const amt = parseFloat(entryAmount.value);
  if (isNaN(amt) || amt < 0) {
    alert('Please enter a valid non-negative amount.');
    return;
  }
  let vatVal = parseFloat(entryVatTax.value);
  if (isNaN(vatVal) || vatVal < 0) vatVal = 0;
    records.push({
    date: entryDate.value,
    type: entryType.value,
    category: categoryVal,
    amount: amt,
    vatTax: vatVal,
  });
  saveRecords();
  clearEntryForm();
  renderRecords();
});

entryType.addEventListener('change', updateCategoryOptions);
entryCategorySelect.addEventListener('change', toggleCustomCategoryInput);
periodSelect.addEventListener('change', () => {
  updateInputsBasedOnPeriod();
  renderRecords();
});
dateSelect.addEventListener('change', renderRecords);
monthSelect.addEventListener('change', renderRecords);
yearSelect.addEventListener('input', renderRecords);

downloadButton.addEventListener('click', () => {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const filterDate = getFilterDate();
    const period = periodSelect.value;
    const filtered = records.filter((r) => {
      const rd = parseDateToISO(r.date);
      return rd && filterDate && isDateInPeriod(rd, filterDate, period);
    });
    doc.setFontSize(18);
    doc.text('Whiplash Financial Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 20, 35);
    if (filterDate) {
      doc.text(`Date: ${filterDate.toLocaleDateString()}`, 20, 45);
    } else {
      doc.text('Date: All', 20, 45);
    }
    const tableColumns = ['Date', 'Type', 'Category', 'Amount', 'VAT / Tax', 'Net Amount'];
    const tableRows = filtered.map((r) => {
      const rd = parseDateToISO(r.date);
      const dateStr = rd ? rd.toLocaleDateString() : r.date;
      const amount = parseFloat(r.amount) || 0;
      const vatTax = parseFloat(r.vatTax) || 0;
      const netAmount = amount - vatTax;
      return [dateStr, r.type, r.category, amount.toFixed(2), vatTax.toFixed(2), netAmount.toFixed(2)];
    });
    if (tableRows.length > 0) {
      doc.autoTable({
        head: [tableColumns],
        body: tableRows,
        startY: 55,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [75, 0, 130] },
      });
    } else {
      doc.text('No records found for the selected filters.', 20, 55);
    }
    const filename = `financial_report_${period}_${filterDate ? filterDate.toISOString().slice(0, 10).replace(/-/g, '') : 'all'}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('An error occurred while generating the report. Please check the console for details.');
  }
});