const canvas = new fabric.Canvas('zineCanvas');

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
        const upBtn = document.createElement('button'); upBtn.innerHTML = '↑';
        upBtn.onclick = (e) => { e.stopPropagation(); canvas.bringForward(obj); updateLayersPanel(); saveHistory(); };
        const downBtn = document.createElement('button'); downBtn.innerHTML = '↓';
        downBtn.onclick = (e) => { e.stopPropagation(); canvas.sendBackwards(obj); updateLayersPanel(); saveHistory(); };
        const delBtn = document.createElement('button'); delBtn.innerHTML = '✕'; delBtn.style.color = 'red';
        delBtn.onclick = (e) => { e.stopPropagation(); canvas.remove(obj); updateLayersPanel(); saveHistory(); };

        controls.appendChild(upBtn); controls.appendChild(downBtn); controls.appendChild(delBtn);
        layerDiv.appendChild(contentDiv); layerDiv.appendChild(controls);

        layerDiv.onclick = () => { canvas.setActiveObject(obj); canvas.requestRenderAll(); updateLayersPanel(); };
        container.appendChild(layerDiv);
    }
}

canvas.on('object:added', updateLayersPanel);
canvas.on('object:removed', updateLayersPanel);
canvas.on('selection:created', updateLayersPanel);
canvas.on('selection:cleared', updateLayersPanel);
canvas.on('selection:updated', updateLayersPanel);

// --- HISTORY / UNDO ---
function saveHistory() {
    if (isHistoryProcessing || isCropping) return; // Don't save midway through a crop!
    const json = JSON.stringify(canvas.toJSON(['isGuide', 'zineFileName'])); 
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push(json);
    historyIndex++;
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
canvas.on('object:modified', saveHistory);

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
    fitToScreen(); drawGuides(); drawLabels(); updateLayersPanel();
    history = []; historyIndex = -1;
    setTimeout(() => { isHistoryProcessing = false; saveHistory(); }, 50);
}
window.addEventListener('resize', fitToScreen);

function drawGuides() {
    const guideStyle = { stroke: '#00ccff', strokeWidth: 4, selectable: false, evented: false, strokeDashArray: [15, 15], isGuide: true };
    for (let i = 1; i <= 3; i++) {
        let x = (currentWidth / 4) * i; canvas.add(new fabric.Line([x, 0, x, currentHeight], guideStyle));
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
    canvas.backgroundColor = e.target.value; canvas.requestRenderAll(); saveHistory(); 
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
        // Force the browser to load the font file, THEN update the canvas
        document.fonts.load(`10pt "${selectedFont}"`).then(() => {
            activeObj.set('fontFamily', selectedFont); 
            canvas.requestRenderAll(); 
            saveHistory(); 
        });
    }
});

document.getElementById('fontSize').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') { activeObj.set('fontSize', parseInt(e.target.value, 10)); canvas.requestRenderAll(); saveHistory(); }
});

document.getElementById('textColor').addEventListener('input', (e) => {
    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'i-text') { activeObj.set('fill', e.target.value); canvas.requestRenderAll(); saveHistory(); }
});

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

// --- PHOTOGRAPHY & CROP TOOL ---
document.getElementById('imageLoader').addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const imgObj = new Image(); imgObj.src = event.target.result;
        imgObj.onload = function() {
            const image = new fabric.Image(imgObj);
            image.scaleToWidth(1000); 
            image.set({ left: currentWidth / 2, top: currentHeight / 2, originX: 'center', originY: 'center', zineFileName: file.name });
            canvas.add(image); canvas.setActiveObject(image); saveHistory();
        }
    }
    reader.readAsDataURL(file); 
});

document.getElementById('cropBtn').addEventListener('click', () => {
    const btn = document.getElementById('cropBtn');

    if (!isCropping) {
        cropTarget = canvas.getActiveObject();
        if (!cropTarget || cropTarget.type !== 'image') { alert("Please select a photograph to crop first."); return; }

        isCropping = true;
        btn.textContent = "Apply Crop";
        btn.style.background = "#28a745"; btn.style.color = "white"; btn.style.borderColor = "#28a745";

        // Create the semi-transparent overlay
        cropRect = new fabric.Rect({
            left: cropTarget.left, top: cropTarget.top,
            width: cropTarget.getScaledWidth(), height: cropTarget.getScaledHeight(),
            originX: 'center', originY: 'center',
            fill: 'rgba(0,0,0,0.3)', stroke: '#ff0000', strokeDashArray: [5, 5], strokeWidth: 4,
            cornerColor: 'red', transparentCorners: false,
            isGuide: true
        });
        
        // Lock the image beneath it
        cropTarget.set({ selectable: false, evented: false });
        
        canvas.add(cropRect); canvas.setActiveObject(cropRect);
    } else {
        // Apply the crop math
        if (cropTarget && cropRect) {
            const scaleX = cropTarget.scaleX; const scaleY = cropTarget.scaleY;
            const leftOffset = cropRect.left - cropTarget.left; const topOffset = cropRect.top - cropTarget.top;
            
            const currentCropX = cropTarget.cropX || 0; const currentCropY = cropTarget.cropY || 0;
            const newWidth = cropRect.getScaledWidth() / scaleX; const newHeight = cropRect.getScaledHeight() / scaleY;

            // Shift the visual lens to the new area
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

    // Clean up the file name to use as the CSS font-family name
    const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');

    try {
        // Read the font file data
        const arrayBuffer = await file.arrayBuffer();
        const customFont = new FontFace(fontName, arrayBuffer);
        
        // Load it into the browser
        const loadedFont = await customFont.load();
        document.fonts.add(loadedFont);

        // Add it to our dropdown menu dynamically
        const select = document.getElementById('fontFamily');
        const newOption = document.createElement('option');
        newOption.value = fontName;
        newOption.textContent = fontName + " (Custom)";
        newOption.style.fontFamily = fontName; // Renders the live preview in the dropdown!
        select.appendChild(newOption);
        
        // Automatically select the new font in the dropdown
        select.value = fontName;

        // If you already have a text box selected on the canvas, apply it immediately
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
    
    // Reset the input so you can upload another font if needed
    e.target.value = ''; 
});