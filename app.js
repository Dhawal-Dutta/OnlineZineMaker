const canvas = new fabric.Canvas('zineCanvas');

// --- HIGH-PERFORMANCE ENGINE TWEAKS ---
fabric.Object.prototype.objectCaching = true;     
fabric.Object.prototype.statefullCache = false;   
fabric.Object.prototype.noScaleCache = false;     
canvas.renderOnAddRemove = false;                 

// Make controls larger for easier touch interaction
fabric.Object.prototype.cornerSize = 24; 
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#2196f3';

const paperDimensions = {
    'a5': { w: 2480, h: 1748 }, 'a4': { w: 3508, h: 2480 }, 'a3': { w: 4960, h: 3508 },
    'a2': { w: 7016, h: 4960 }, 'a1': { w: 9933, h: 7016 }
};

let currentWidth = 3508; let currentHeight = 2480; let currentScale = 1;
let history = []; let historyIndex = -1; let isHistoryProcessing = false;

// --- CROP STATE VARIABLES ---
let isCropping = false;
let cropRect = null;
let cropTarget = null;

// --- LAYERS PANEL ENGINE ---
function updateLayersPanel() {
    const container = document.getElementById('layersContainer');
    container.innerHTML = ''; 

    const objects = canvas.getObjects().filter(obj => !obj.isGuide);

    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        if (canvas.getActiveObject() === obj) layerDiv.classList.add('active');

        const contentDiv = document.createElement('div');
        contentDiv.className = 'layer-content';
        
        if (obj.type === 'i-text') {
            const icon = document.createElement('span');
            icon.textContent = 'T';
            icon.style.fontWeight = 'bold'; icon.style.fontSize = '16px'; icon.style.width = '24px'; icon.style.textAlign = 'center';
            const textName = document.createElement('span');
            textName.className = 'layer-name';
            textName.textContent = obj.text || 'Empty Text';
            contentDiv.appendChild(icon); contentDiv.appendChild(textName);
        } else if (obj.type === 'image') {
            const thumb = document.createElement('img');
            thumb.className = 'layer-thumb';
            thumb.src = obj.getSrc(); 
            const imgName = document.createElement('span');
            imgName.className = 'layer-name';
            imgName.textContent = obj.zineFileName || 'Photograph'; 
            contentDiv.appendChild(thumb); contentDiv.appendChild(imgName);
        }

        const controls = document.createElement('div');
        controls.className = 'layer-controls';
        const upBtn = document.createElement('button');
        upBtn.innerHTML = '↑';
        upBtn.onclick = (e) => { e.stopPropagation(); canvas.bringForward(obj); updateLayersPanel(); saveHistory(); };
        const downBtn = document.createElement('button'); downBtn.innerHTML = '↓';
        downBtn.onclick = (e) => { e.stopPropagation(); canvas.sendBackwards(obj); updateLayersPanel(); saveHistory(); };
        const delBtn = document.createElement('button'); delBtn.innerHTML = '✕'; delBtn.style.color = 'red';
        delBtn.onclick = (e) => { e.stopPropagation(); canvas.remove(obj); updateLayersPanel(); saveHistory(); };

        controls.appendChild(upBtn); controls.appendChild(downBtn); controls.appendChild(delBtn);
        layerDiv.appendChild(contentDiv); layerDiv.appendChild(controls);
layerDiv.onclick = () => { 
            canvas.setActiveObject(obj); 
            canvas.requestRenderAll(); 
            // We let the canvas automatically trigger the highlight for us!
        };
        
        container.appendChild(layerDiv);    }
}

// Only rebuild the heavy HTML thumbnails when objects are added or deleted
canvas.on('object:added', updateLayersPanel);
canvas.on('object:removed', updateLayersPanel);

// When just clicking around, only change the CSS highlight (Ultra-fast)
function highlightActiveLayer() {
    const activeObj = canvas.getActiveObject();
    const layers = document.querySelectorAll('.layer-item');
    const objects = canvas.getObjects().filter(obj => !obj.isGuide);
    
    layers.forEach((layerDiv, index) => {
        const objIndex = objects.length - 1 - index; // Reverses index to match the UI stack
        if (objects[objIndex] === activeObj) {
            layerDiv.classList.add('active');
        } else {
            layerDiv.classList.remove('active');
        }
    });
}

// --- HISTORY / UNDO (STRICT 3-STEP MEMORY CAP) ---
function saveHistory() {
    if (isHistoryProcessing || isCropping) return; 
    const json = JSON.stringify(canvas.toJSON(['isGuide', 'zineFileName'])); 
    
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(json);
    
    if (history.length > 3) {
        history.shift(); 
    }
    historyIndex = history.length - 1;
}

function undo() {
    if (historyIndex > 0 && !isCropping) {
        isHistoryProcessing = true;
        historyIndex--;
        canvas.loadFromJSON(history[historyIndex], () => {
            canvas.renderAll(); updateLayersPanel(); isHistoryProcessing = false;
        });
    }
}

canvas.on('object:modified', function() {
    saveHistory();
});

// --- WORKSPACE & SCALING ---
function fitToScreen() {
    const workspace = document.getElementById('workspace');
    const availableWidth = workspace.clientWidth - 60;
    const availableHeight = window.innerHeight - 60;
    const scaleX = availableWidth / currentWidth;
    const scaleY = availableHeight / currentHeight;
    currentScale = Math.min(scaleX, scaleY); 
    canvas.setZoom(currentScale);
    canvas.setWidth(currentWidth * currentScale);
    canvas.setHeight(currentHeight * currentScale);
}

function setupWorkspace(sizeKey) {
    isHistoryProcessing = true; 
    canvas.clear(); 
    currentWidth = paperDimensions[sizeKey].w; currentHeight = paperDimensions[sizeKey].h;
    canvas.backgroundColor = document.getElementById('canvasColor').value;
    fitToScreen();
    drawGuides(); drawLabels(); updateLayersPanel();
    history = []; historyIndex = -1;
    setTimeout(() => { isHistoryProcessing = false; saveHistory(); }, 50);
}
window.addEventListener('resize', fitToScreen);

function drawGuides() {
    const guideStyle = { stroke: '#00ccff', strokeWidth: 4, selectable: false, evented: false, strokeDashArray: [15, 15], isGuide: true };
    for (let i = 1; i <= 3; i++) {
        let x = (currentWidth / 4) * i;
        canvas.add(new fabric.Line([x, 0, x, currentHeight], guideStyle));
    }
    canvas.add(new fabric.Line([0, currentHeight / 2, currentWidth / 4, currentHeight / 2], guideStyle));
    canvas.add(new fabric.Line([(currentWidth / 4) * 3, currentHeight / 2, currentWidth, currentHeight / 2], guideStyle));
    canvas.add(new fabric.Line([currentWidth / 4, currentHeight / 2, (currentWidth / 4) * 3, currentHeight / 2], {
        stroke: 'red', strokeWidth: 8, selectable: false, evented: false, isGuide: true
    }));
}

function drawLabels() {
    const labelStyle = { fontSize: 100, fill: 'rgba(0, 0, 0, 0.15)', fontFamily: 'Helvetica', originX: 'center', originY: 'center', selectable: false, evented: false, isGuide: true };
    const w4 = currentWidth / 4; const topY = currentHeight / 4; const botY = (currentHeight / 4) * 3;
    const x1 = w4 * 0.5; const x2 = w4 * 1.5; const x3 = w4 * 2.5; const x4 = w4 * 3.5;
    
    canvas.add(new fabric.Text('Page 4', { ...labelStyle, left: x1, top: topY, angle: 180 }));
    canvas.add(new fabric.Text('Page 3', { ...labelStyle, left: x2, top: topY, angle: 180 }));
    canvas.add(new fabric.Text('Page 2', { ...labelStyle, left: x3, top: topY, angle: 180 }));
    canvas.add(new fabric.Text('Page 1', { ...labelStyle, left: x4, top: topY, angle: 180 }));
    canvas.add(new fabric.Text('Page 5', { ...labelStyle, left: x1, top: botY }));
    canvas.add(new fabric.Text('Page 6', { ...labelStyle, left: x2, top: botY }));
    canvas.add(new fabric.Text('Back Cover', { ...labelStyle, left: x3, top: botY }));
    canvas.add(new fabric.Text('Front Cover', { ...labelStyle, left: x4, top: botY }));
}
setupWorkspace('a4');

// --- EVENT LISTENERS ---
document.getElementById('saveProject').addEventListener('click', () => {
    const json = JSON.stringify(canvas.toJSON(['isGuide', 'zineFileName']));
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'my-zine-project.json'; link.click();
});

document.getElementById('loadProject').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = function(event) {
        isHistoryProcessing = true;
        canvas.loadFromJSON(event.target.result, () => {
            canvas.renderAll(); fitToScreen(); updateLayersPanel();
            history = []; historyIndex = -1; isHistoryProcessing = false; saveHistory();
        });
    };
    reader.readAsText(e.target.files[0]);
});

document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') { event.preventDefault(); undo(); }
});
document.getElementById('undoBtn').addEventListener('click', undo);

document.getElementById('paperSize').addEventListener('change', (e) => {
    if(confirm("Changing size clears the design. Continue?")) { setupWorkspace(e.target.value); } 
    else { e.target.value = Object.keys(paperDimensions).find(key => paperDimensions[key].w === currentWidth); }
});

document.getElementById('canvasColor').addEventListener('input', (e) => {
    canvas.backgroundColor = e.target.value; 
    canvas.requestRenderAll(); 
});
document.getElementById('canvasColor').addEventListener('change', () => {
    saveHistory(); 
});

// --- TYPOGRAPHY ---
document.getElementById('addText').addEventListener('click', () => {
    const text = new fabric.IText('Double Click to Edit', {
        left: currentWidth / 2, top: currentHeight / 2, 
        fontFamily: document.getElementById('fontFamily').value, 
        fill: document.getElementById('textColor').value, 
        fontSize: parseInt(document.getElementById('fontSize').value, 10), 
        originX: 'center', originY: 'center'
    });
    canvas.add(text); canvas.setActiveObject(text); saveHistory();
});

document.getElementById('fontFamily').addEventListener('change', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') { 
        const selectedFont = e.target.value;
        document.fonts.load(`10pt "${selectedFont}"`).then(() => {
            activeObj.set('fontFamily', selectedFont); 
            canvas.requestRenderAll(); 
            saveHistory(); 
        });
    }
});

document.getElementById('fontSize').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') { 
        activeObj.set('fontSize', parseInt(e.target.value, 10)); 
        canvas.requestRenderAll(); 
    }
});
document.getElementById('fontSize').addEventListener('change', () => { saveHistory(); });

document.getElementById('textColor').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') { 
        activeObj.set('fill', e.target.value); 
        canvas.requestRenderAll(); 
    }
});
document.getElementById('textColor').addEventListener('change', () => { saveHistory(); });

canvas.on('selection:updated', updateUI);
canvas.on('selection:created', updateUI);

function updateUI(e) {
    const activeObj = e.selected[0];
    if (activeObj && activeObj.type === 'i-text') {
        document.getElementById('fontFamily').value = activeObj.fontFamily;
        document.getElementById('fontSize').value = activeObj.fontSize;
        document.getElementById('textColor').value = activeObj.fill;
    }
}

// --- PHOTOGRAPHY UPLOAD (NON-DESTRUCTIVE & MEMORY SAFE) ---
document.getElementById('imageLoader').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach((file, index) => {
        const objectUrl = URL.createObjectURL(file);
        
        fabric.Image.fromURL(objectUrl, function(image) {
            image.scaleToWidth(800); 
            const offset = index * 40; 
            image.set({ 
                left: (currentWidth / 2) + offset, 
                top: (currentHeight / 2) + offset, 
                originX: 'center', 
                originY: 'center',
                zineFileName: file.name 
            });
            
            canvas.add(image);
            
            if (index === files.length - 1) {
                canvas.setActiveObject(image);
                canvas.requestRenderAll(); 
                saveHistory();
            }
        });
    });
    
    e.target.value = ''; 
});

// --- CROP TOOL ---
document.getElementById('cropBtn').addEventListener('click', () => {
    const btn = document.getElementById('cropBtn');

    if (!isCropping) {
        cropTarget = canvas.getActiveObject();
        if (!cropTarget || cropTarget.type !== 'image') { alert("Please select a photograph to crop first."); return; }

        isCropping = true;
        btn.textContent = "Apply Crop";
        btn.style.background = "#28a745"; btn.style.color = "white"; btn.style.borderColor = "#28a745";

        cropRect = new fabric.Rect({
            left: cropTarget.left, top: cropTarget.top,
            width: cropTarget.getScaledWidth(), height: cropTarget.getScaledHeight(),
            originX: 'center', originY: 'center',
            fill: 'rgba(0,0,0,0.3)', stroke: '#ff0000', strokeDashArray: [5, 5], strokeWidth: 4,
            cornerColor: 'red', transparentCorners: false,
            isGuide: true
        });
        
        cropTarget.set({ selectable: false, evented: false });
        canvas.add(cropRect); canvas.setActiveObject(cropRect);
    } else {
        if (cropTarget && cropRect) {
            const scaleX = cropTarget.scaleX;
            const scaleY = cropTarget.scaleY;
            const leftOffset = cropRect.left - cropTarget.left; const topOffset = cropRect.top - cropTarget.top;
            const currentCropX = cropTarget.cropX || 0; const currentCropY = cropTarget.cropY || 0;
            const newWidth = cropRect.getScaledWidth() / scaleX;
            const newHeight = cropRect.getScaledHeight() / scaleY;

            const newCropX = currentCropX + (leftOffset / scaleX) + ((cropTarget.width - newWidth) / 2);
            const newCropY = currentCropY + (topOffset / scaleY) + ((cropTarget.height - newHeight) / 2);
            
            cropTarget.set({
                cropX: newCropX, cropY: newCropY, width: newWidth, height: newHeight,
                left: cropRect.left, top: cropRect.top,
                selectable: true, evented: true
            });
            canvas.remove(cropRect);
        }

        isCropping = false; cropRect = null; cropTarget = null;
        btn.textContent = "Crop Image"; btn.style.background = "#e9ecef"; btn.style.color = "#333"; btn.style.borderColor = "#ccc";
        canvas.requestRenderAll(); saveHistory();
    }
});

document.getElementById('rotateObj').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) { activeObj.rotate(activeObj.angle + 180); canvas.requestRenderAll(); saveHistory(); }
});

// --- EXPORT PDF ---
document.getElementById('exportPdf').addEventListener('click', () => {
    alert("Generating your print-ready PDF...");
    canvas.getObjects().forEach(obj => { if(obj.isGuide) obj.set('opacity', 0); });
    canvas.renderAll();

    const width_mm = currentWidth / 300 * 25.4; const height_mm = currentHeight / 300 * 25.4;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', [width_mm, height_mm]); 
    const imgData = canvas.toDataURL({ format: 'jpeg', quality: 1.0, multiplier: 1 / currentScale }); 
    
    pdf.addImage(imgData, 'JPEG', 0, 0, width_mm, height_mm); pdf.save('my-zine.pdf');

    canvas.getObjects().forEach(obj => { if(obj.isGuide) obj.set('opacity', 1); });
    canvas.renderAll();
});

// --- CUSTOM FONT UPLOAD ---
document.getElementById('fontLoader').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const customFont = new FontFace(fontName, arrayBuffer);
        const loadedFont = await customFont.load();
        document.fonts.add(loadedFont);

        const select = document.getElementById('fontFamily');
        const newOption = document.createElement('option');
        newOption.value = fontName;
        newOption.textContent = fontName + " (Custom)";
        newOption.style.fontFamily = fontName; 
        select.appendChild(newOption);
        select.value = fontName;
        
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontFamily', fontName);
            canvas.requestRenderAll();
            saveHistory();
        }

    } catch (error) {
        console.error(error);
        alert("Oops! There was an error loading that font file. Make sure it's a valid .ttf or .otf file.");
    }
    
    e.target.value = '';
});

// --- 3D FLIP PREVIEW ENGINE ---
let currentPreviewPage = 0;
document.getElementById('previewBtn').addEventListener('click', () => {
    const modal = document.getElementById('previewModal');
    const book = document.getElementById('zine-book');
    
    currentPreviewPage = 0;
    book.innerHTML = '';
    
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';

    canvas.getObjects().forEach(obj => { if(obj.isGuide) obj.set('opacity', 0); });
    canvas.renderAll();
    
    // Reversing the zoom scale to capture the true 300dpi (3508x2480) print resolution
    const truePrintResolution = 1 / currentScale;
    
    // Quality 0.8 compresses the file size in RAM, but keeps the physical pixels razor sharp
    const fullImg = canvas.toDataURL({ format: 'jpeg', quality: 0.8, multiplier: truePrintResolution });
    
    canvas.getObjects().forEach(obj => { if(obj.isGuide) obj.set('opacity', 1); });
    canvas.renderAll();

    const pages = [
        { name: 'Front', x: 0.75, y: 0.5, flip: false },
        { name: 'Page 1', x: 0.75, y: 0, flip: true },
        { name: 'Page 2', x: 0.5, y: 0, flip: true },
        { name: 'Page 3', x: 0.25, y: 0, flip: true },
        { name: 'Page 4', x: 0, y: 0, flip: true },
        { name: 'Page 5', x: 0, y: 0.5, flip: false },
        { name: 'Page 6', x: 0.25, y: 0.5, flip: false },
        { name: 'Back', x: 0.5, y: 0.5, flip: false }
    ];

    pages.forEach((p, i) => {
        const pageTurnLayer = document.createElement('div');
        pageTurnLayer.style.cssText = `
            position: absolute; width: 100%; height: 100%;
            transform-origin: left; transition: transform 0.6s ease-in-out;
            z-index: ${pages.length - i};
            transform-style: preserve-3d;
        `;
        pageTurnLayer.id = `p${i}`;

        const imageLayer = document.createElement('div');
        imageLayer.style.cssText = `
            position: absolute; width: 100%; height: 100%;
            background: white url(${fullImg});
            background-size: 400% 200%;
            background-position: ${p.x * 100 / 0.75}% ${p.y * 100 / 0.5}%;
            border: 1px solid #ccc; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
            backface-visibility: hidden;
            ${p.flip ? 'transform: rotate(180deg);' : ''}
        `;
        
        pageTurnLayer.appendChild(imageLayer);
        book.appendChild(pageTurnLayer);
    });
});

window.nextPage = function() {
    if (currentPreviewPage < 7) {
        document.getElementById(`p${currentPreviewPage}`).style.transform = 'rotateY(-180deg)';
        currentPreviewPage++;
    }
};

window.prevPage = function() {
    if (currentPreviewPage > 0) {
        currentPreviewPage--;
        document.getElementById(`p${currentPreviewPage}`).style.transform = 'rotateY(0deg)';
    }
};

document.getElementById('closePreview').addEventListener('click', () => {
    document.getElementById('previewModal').style.display = 'none';
});

// --- AUTO-LOAD HELP MODAL & LOGIC ---
window.addEventListener('load', () => {
    
    // 1. Auto-show on first visit
    if (!localStorage.getItem('zineGuideSeen')) {
        document.getElementById('helpModal').style.display = 'flex';
    }

    // 2. Close button logic (safely wrapped inside the load event)
    document.getElementById('closeHelp').addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'none';
        localStorage.setItem('zineGuideSeen', 'true'); 
    });

    // 3. Top-left Guide button logic
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            document.getElementById('helpModal').style.display = 'flex';
        });
    }
});

// --- MAGNETIC SNAPPING ENGINE ---
const snapZone = 50; // The distance in pixels before the magnet "grabs" the object

canvas.on('object:moving', function(e) {
    // 1. Check if the user has the feature turned on in the bottom left
    if (!document.getElementById('snapToggle').checked) return;

    const obj = e.target;
    const w = currentWidth;
    const h = currentHeight;
    
    // 2. Define the exact X coordinates for an 8-page fold
    // (Edges, Fold Lines, and the exact Center of every single page)
    const snapX = [
        0,              // Left Edge
        w / 8,          // Center of Page 4 / 5
        w / 4,          // 1st Vertical Fold
        (w / 8) * 3,    // Center of Page 3 / 6
        w / 2,          // Middle Vertical Fold
        (w / 8) * 5,    // Center of Page 2 / Back Cover
        (w / 4) * 3,    // 3rd Vertical Fold
        (w / 8) * 7,    // Center of Page 1 / Front Cover
        w               // Right Edge
    ];
    
    // 3. Define the exact Y coordinates
    // (Top/Bottom Edges, Horizontal Fold, and Vertical Centers)
    const snapY = [
        0,              // Top Edge
        h / 4,          // Center of the Top Row
        h / 2,          // Horizontal Middle Fold
        (h / 4) * 3,    // Center of the Bottom Row
        h               // Bottom Edge
    ];

    // 4. Test X positions and snap if close enough
    for (let x of snapX) {
        if (Math.abs(obj.left - x) < snapZone) {
            obj.set({ left: x });
            break; // Stop checking once it locks in
        }
    }

    // 5. Test Y positions and snap if close enough
    for (let y of snapY) {
        if (Math.abs(obj.top - y) < snapZone) {
            obj.set({ top: y });
            break;
        }
    }
});