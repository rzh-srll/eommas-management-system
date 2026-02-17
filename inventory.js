// Inventory-specific variables and functions
const predefinedCategories = ["Category 1", "Category 2"];
const categoryLabels = {
  "Category 1": "Bar",
  "Category 2": "Kitchen"
};
let customCategories = [];

function initializeInventory() {
  loadData();
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('#inventoryTable tbody input[type="date"]').forEach(input => {
    if (!input.value) input.value = today;
  });

  const datePicker = document.getElementById('datePicker');
  if (!datePicker.value) datePicker.value = today;
  datePicker.addEventListener('change', function() {
    filterInventoryByDate(this.value);
  });
  filterInventoryByDate(datePicker.value);
}

function filterInventoryByDate(selectedDate) {
  const tbody = document.querySelector('#inventoryTable tbody');
  const rows = tbody.querySelectorAll('tr');
  let hasRowForDate = false;
  rows.forEach(row => {
    const dateInput = row.cells[0].querySelector('input[type="date"]');
    if (dateInput) {
      if (selectedDate === '' || dateInput.value === selectedDate) {
        row.style.display = '';
        if (dateInput.value === selectedDate) hasRowForDate = true;
      } else {
        row.style.display = 'none';
      }
    }
  });
  if (selectedDate && !hasRowForDate) {
    addRowForDate(selectedDate);
  }
}

function loadCustomCategories() {
  const data = localStorage.getItem('customCategories');
  if (data) {
    try {
      customCategories = JSON.parse(data);
    } catch (e) {
      console.error('Error loading custom categories:', e);
      customCategories = [];
    }
  }
}

function saveCustomCategories() {
  try {
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
  } catch (e) {
    console.error('Failed to save custom categories:', e);
  }
}

function createCategoryCell(cell, savedValue) {
  cell.innerHTML = '';
  const select = document.createElement('select');
  select.onchange = () => onCategoryChange(select);
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  defaultOption.hidden = true;
  defaultOption.textContent = 'Select';
  select.appendChild(defaultOption);
  predefinedCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = categoryLabels[cat] || cat;
    select.appendChild(option);
  });
  customCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  const othersOption = document.createElement('option');
  othersOption.value = 'Others';
  othersOption.textContent = 'Others';
  select.appendChild(othersOption);
  if (savedValue && savedValue !== '') {
    if (predefinedCategories.includes(savedValue) || customCategories.includes(savedValue)) {
      select.value = savedValue;
      cell.appendChild(select);
    } else {
      cell.innerHTML = `<input type="text" value="${savedValue}" onblur="onCustomInput(this)" placeholder="Enter custom category" autofocus>`;
    }
  } else {
    cell.appendChild(select);
  }
  saveInventoryData();
}

function onCategoryChange(selectElem) {
  const cell = selectElem.parentElement;
  if (selectElem.value === 'Others') {
    cell.innerHTML = `<input type="text" value="" onblur="onCustomInput(this)" placeholder="Enter custom category" autofocus>`;
  } else {
    saveInventoryData();
  }
}

function onCustomInput(inputElem) {
  const value = inputElem.value.trim();
  if (value.length > 2 && !customCategories.some(cat => cat.toLowerCase() === value.toLowerCase())) {
    customCategories.push(value);
    saveCustomCategories();
    const cell = inputElem.parentElement;
    cell.innerHTML = '';
    createCategoryCell(cell, value);
    saveInventoryData();
  } else if (value === '') {
    const cell = inputElem.parentElement;
    cell.innerHTML = '';
    createCategoryCell(cell, '');
  }
  saveInventoryData();
}

function saveInventoryData() {
  const tbody = document.querySelector('#inventoryTable tbody');
  const rows = [];
  tbody.querySelectorAll('tr').forEach(row => {
    const rowData = [];
    row.querySelectorAll('td').forEach((cell, index) => {
      if (index < 10) {
        const input = cell.querySelector('input, select');
        if (input) {
          rowData.push({
            type: input.type || input.tagName.toLowerCase(),
            value: input.value
          });
        }
      }
    });
    rows.push(rowData);
  });
  try {
    localStorage.setItem('inventoryData', JSON.stringify(rows));
  } catch (e) {
    console.error('Failed to save inventory data:', e);
  }
}

function loadData() {
  loadCustomCategories();
  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';
  const data = localStorage.getItem('inventoryData');
  if (data) {
    try {
      const rows = JSON.parse(data);
      rows.forEach(rowData => {
        const newRow = tbody.insertRow();
        rowData.forEach((cellData, index) => {
          const cell = newRow.insertCell(index);
          if (index === 1) {
            createCategoryCell(cell, cellData.value);
          } else if ([5, 7, 8].includes(index)) {
            cell.innerHTML = `<input type="text" readonly value="${cellData.value}">`;
          } else {
            const inputType = [2, 3, 4, 6].includes(index) ? 'number' : 'text';
            cell.innerHTML = `<input type="${inputType}" value="${cellData.value}" oninput="if(this.type==='number') calculateInventory(this); saveInventoryData()">`;
          }
        });
        newRow.insertCell(10).innerHTML = `<button class="deleteBtn" onclick="deleteRow(this)">Delete</button>`;
      });
      document.querySelectorAll('#inventoryTable tbody tr').forEach(row => {
        const quantityStockInput = row.cells[3].querySelector('input');
        if (quantityStockInput) calculateInventory(quantityStockInput);
      });
    } catch (e) {
      console.error('Error loading data:', e);
      addRow();
    }
  } else {
    addRow();
  }
}

function calculateInventory(input) {
  const row = input.closest("tr");
  const price = parseFloat(row.cells[2].querySelector("input").value) || 0;
  const quantityStock = parseInt(row.cells[3].querySelector("input").value) || 0;
  const quantityReorder = parseInt(row.cells[4].querySelector("input").value) || 0;
  const quantityUsed = parseInt(row.cells[6].querySelector("input").value) || 0;
  const totalStock = quantityStock + quantityReorder;
  const inventoryValue = price * (totalStock - quantityUsed);
  row.cells[5].querySelector("input").value = inventoryValue.toFixed(2);
  row.cells[7].classList.remove('low-stock', 'out-of-stock');
  row.cells[8].classList.remove('need-reorder');
  row.cells[7].querySelector("input").value = '';
  row.cells[8].querySelector("input").value = '';
  if (quantityStock > 0 && totalStock > 0) {
    const ending = totalStock - quantityUsed;
    row.cells[7].querySelector("input").value = ending;
    const endingPercentage = ending / totalStock;
    if (endingPercentage <= 0.5 && endingPercentage > 0.25) {
      row.cells[7].classList.add('low-stock');
      row.cells[8].querySelector("input").value = "No";
    } else if (endingPercentage <= 0.25) {
      row.cells[7].classList.add('out-of-stock');
      row.cells[8].querySelector("input").value = "Yes";
      row.cells[8].classList.add('need-reorder');
    } else {
      row.cells[8].querySelector("input").value = "No";
    }
  }
  saveInventoryData();
}

function addRow() {
  const tbody = document.querySelector('#inventoryTable tbody');
  const newRow = tbody.insertRow();
  const selectedDate = document.getElementById('datePicker').value;
  const defaultDate = selectedDate || new Date().toISOString().split('T')[0];
  for (let i = 0; i < 10; i++) {
    const cell = newRow.insertCell(i);
    if (i === 0) {
      cell.innerHTML = `<input type="date" value="${defaultDate}" oninput="saveInventoryData()">`;
    } else if (i === 1) {
      createCategoryCell(cell, "");
    } else if ([5, 7, 8].includes(i)) {
      cell.innerHTML = `<input type="text" readonly>`;
    } else {
      const inputType = [2, 3, 4, 6].includes(i) ? 'number' : 'text';
      cell.innerHTML = `<input type="${inputType}" oninput="if(this.type==='number') calculateInventory(this); saveInventoryData()">`;
    }
  }
  newRow.insertCell(10).innerHTML = `<button class="deleteBtn" onclick="deleteRow(this)">Delete</button>`;
  saveInventoryData();
}

function addRowForDate(date) {
  const tbody = document.querySelector('#inventoryTable tbody');
  const newRow = tbody.insertRow();
  for (let i = 0; i < 10; i++) {
    const cell = newRow.insertCell(i);
    if (i === 0) {
      cell.innerHTML = `<input type="date" value="${date}" oninput="saveInventoryData()">`;
    } else if (i === 1) {
      createCategoryCell(cell, "");
    } else if ([5, 7, 8].includes(i)) {
      cell.innerHTML = `<input type="text" readonly>`;
    } else {
      const inputType = [2, 3, 4, 6].includes(i) ? 'number' : 'text';
      cell.innerHTML = `<input type="${inputType}" oninput="if(this.type==='number') calculateInventory(this); saveInventoryData()">`;
    }
  }
  newRow.insertCell(10).innerHTML = `<button class="deleteBtn" onclick="deleteRow(this)">Delete</button>`;
  saveInventoryData();
}

function deleteRow(button) {
  const row = button.closest("tr");
  row.parentNode.removeChild(row);
  saveInventoryData();
}

function generateReport() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const headers = ['Date', 'Category', 'Price (PHP)', 'Quantity Stock', 'Quantity Reorder', 'Inventory Value', 'Quantity Used', 'Ending', 'Need Reorder?', 'Remarks'];
    const tbody = document.querySelector('#inventoryTable tbody');
    const rows = [];
    const rowStyles = [];
    tbody.querySelectorAll('tr').forEach(row => {
      const rowData = [];
      let endingStyle = {};
      const endingCell = row.cells[7];
      if (endingCell.classList.contains('low-stock')) {
        endingStyle = { textColor: [255, 204, 0], fontStyle: 'bold' };
      } else if (endingCell.classList.contains('out-of-stock')) {
        endingStyle = { textColor: [255, 0, 0], fontStyle: 'bold' };
      }
      row.querySelectorAll('td').forEach((cell, idx) => {
        if (idx < 10) {
          const input = cell.querySelector('input, select');
          if (input) {
            if (input.tagName.toLowerCase() === 'select') {
              if (predefinedCategories.includes(input.value)) {
                rowData.push(categoryLabels[input.value] || input.value);
              } else if (customCategories.includes(input.value)) {
                rowData.push(input.value);
              } else if (input.value === 'Others') {
                rowData.push('');
              } else {
                rowData.push(input.value);
              }
            } else {
              rowData.push(input.value);
            }
          } else {
            rowData.push('');
          }
        }
      });
      rows.push(rowData);
      rowStyles.push(endingStyle);
    });
    doc.text('Inventory Report', 10, 10);
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 7) {
          const style = rowStyles[data.row.index];
          if (style) {
            Object.assign(data.cell.styles, style);
          }
        }
      }
    });
    doc.save('inventory_report.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Check console for details.');
  }
}