


const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const results = document.getElementById('results');
const qualitySlider = document.getElementById('quality');
const qualityVal = document.getElementById('qualityVal');
const formatSelect = document.getElementById('format');
const maxWidthSlider = document.getElementById('maxWidth');
const widthVal = document.getElementById('widthVal');
const summaryBar = document.getElementById('summaryBar');
const totalSaved = document.getElementById('totalSaved');
const totalCount = document.getElementById('totalCount');
const dlAll = document.getElementById('dlAll');

let processed = []; // {name, blob, url}

qualitySlider.addEventListener('input', () => {
  qualityVal.textContent = qualitySlider.value + '%';
});
maxWidthSlider.addEventListener('input', () => {
  widthVal.textContent = maxWidthSlider.value == 0 ? 'No limit' : maxWidthSlider.value + 'px';
});

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function formatBytes(bytes){
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}

function handleFiles(files){
  [...files].forEach(file => {
    if (!file.type.startsWith('image/')) return;
    createCard(file);
  });
}

function createCard(file){
  const card = document.createElement('div');
  card.className = 'card';
  const id = 'img_' + Math.random().toString(36).slice(2,9);
  card.id = id;
  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="fname">${file.name}</div>
        <div class="fname-sub">${file.type || 'image'}</div>
      </div>
      <div class="pct-badge" style="display:none">— %</div>
    </div>
    <div class="bar-track"><div class="bar-fill"></div></div>
    <div class="card-actions">
      <div class="status working">compressing</div>
      <button class="dl" disabled>Download</button>
    </div>
  `;
  results.prepend(card);
  compressImage(file, card);
}

function compressImage(file, card){
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const maxW = parseInt(maxWidthSlider.value);
      if (maxW > 0 && w > maxW){
        h = Math.round(h * (maxW / w));
        w = maxW;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      let outType = formatSelect.value;
      if (outType === 'auto') outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outType === 'image/png' ? 1 : parseInt(qualitySlider.value) / 100;

      canvas.toBlob(blob => {
        if (!blob){
          updateCardError(card);
          return;
        }
        finishCard(card, file, blob);
      }, outType, quality);
    };
    img.onerror = () => updateCardError(card);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateCardError(card){
  card.querySelector('.status').textContent = 'failed to process';
  card.querySelector('.status').classList.remove('working');
}

function finishCard(card, file, blob){
  const before = file.size;
  const after = blob.size;
  const saved = Math.max(0, before - after);
  const pct = before > 0 ? Math.round((saved / before) * 100) : 0;
  const url = URL.createObjectURL(blob);

  card.querySelector('.card-top').innerHTML = `
    <div>
      <div class="fname">${file.name}</div>
      <div class="fname-sub scale">
        <span class="before">${formatBytes(before)}</span>
        <span class="arrow">→</span>
        <span class="after">${formatBytes(after)}</span>
      </div>
    </div>
    <div class="pct-badge">${pct > 0 ? '-' + pct + '%' : 'no change'}</div>
  `;
  const fill = card.querySelector('.bar-fill');
  requestAnimationFrame(() => {
    fill.style.width = Math.max(4, 100 - pct) + '%';
  });

  const status = card.querySelector('.status');
  status.textContent = 'ready';
  status.classList.remove('working');

  const btn = card.querySelector('.dl');
  btn.disabled = false;
  btn.textContent = 'Download';
  btn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = url;
    const ext = blob.type.split('/')[1].replace('jpeg','jpg');
    const base = file.name.replace(/\.[^.]+$/, '');
    a.download = `${base}-compressed.${ext}`;
    a.click();
  });

  processed.push({name: file.name, blob, url, saved});
  updateSummary();
}

function updateSummary(){
  if (processed.length === 0) return;
  summaryBar.classList.add('show');
  totalCount.textContent = processed.length;
  const savedBytes = processed.reduce((sum, p) => sum + p.saved, 0);
  totalSaved.textContent = formatBytes(savedBytes);
}

dlAll.addEventListener('click', () => {
  processed.forEach(p => {
    const a = document.createElement('a');
    a.href = p.url;
    const ext = p.blob.type.split('/')[1].replace('jpeg','jpg');
    const base = p.name.replace(/\.[^.]+$/, '');
    a.download = `${base}-compressed.${ext}`;
    a.click();
  });
});
