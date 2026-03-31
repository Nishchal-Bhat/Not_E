ISDEBUGGING = false;

class Not_e {
    constructor() {
        this.guiEl = null;
        this.isSketchStarted = false; // to prevent adding files after sketch started
        this.sketch = null;
        this.numberOfFiles = null;
        this.columns = 5;
        this.rows = 3;
        this.fileArr = [];

        this.listener = (e) => {
            if (e.key === "Escape" && e.target.tagName === "INPUT") {
                e.target.blur();
                return;
            }

            if (e.key === "/") {
                const searchBar = document.getElementById('main-search-bar');
                if (searchBar && e.target !== searchBar) {
                    e.preventDefault();
                    searchBar.focus();
                }
                return;
            }

            // Ignore other shortcuts if typing in a text box
            if (e.target.tagName === "INPUT") return;

            const key = e.key.toLowerCase();
            if (key === "arrowdown" || key === "s" || key === "arrowup" || key === "w") {
                e.preventDefault();

                const scrollContainer = document.getElementById('save-grid-container');

                if (scrollContainer) {
                    const isDown = key === "arrowdown" || key === "s";
                    const distance = isDown ? 50 : -50;

                    scrollContainer.scrollBy({ top: distance });
                }
                return;
            }
            if (e.code === "Space") {
                this.startEmptySketch();
            }
        };

        document.addEventListener("keydown", this.listener);
    }

    async getNumberOfFiles() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 700);

            let r = await fetch('http://localhost:4073/numberofsketches', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            r = await r.json();
            this.numberOfFiles = r.number;
            this.update();
        }
        catch (err) {
            this.startEmptySketch();
        }
    }

    addFile(_data) {
        if (this.isSketchStarted == false) {
            this.fileArr.push(_data);
            this.injectNewFileBox(_data, this.fileArr.length - 1);
        }
    }

    async getEachFile(n) {
        if (this.isSketchStarted == false) {
            let r = await fetch('http://localhost:4073/getsketch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ index: n })
            });
            let data = await r.json();
            this.addFile(data);
        }
    }

    async start() {
        this.spawn();
        await this.getNumberOfFiles();
        if (this.numberOfFiles == 0) {
            this.startEmptySketch();
        } else {
            for (let i = 0; i < this.numberOfFiles; i++) {
                await this.getEachFile(i);
            }
        }
    }

    startEmptySketch() {
        if (this.sketch != null) return;
        document.removeEventListener("keydown", this.listener);

        this.isSketchStarted = true;

        this.destroy();
        this.fileArr = null; // clear memory

        this.sketch = new Sketch();
        this.sketch.start();
    }

    loadSketch(_file) {
        this.startEmptySketch();
        this.sketch.loadJSON(_file.jsonContent);
        this.sketch.sketchName = _file.sketchName;
    }

    update() {
        this.destroy();
        this.spawn();
    }

    spawn() {
        if (this.guiEl) this.destroy();

        // The Full Screen Overlay
        this.guiEl = document.createElement('div');
        this.guiEl.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(20, 20, 25, 0.95);
            z-index: 10000; display: flex; flex-direction: column;
            font-family: Arial, sans-serif; box-sizing: border-box;
        `;

        //  Top Bar
        const topBar = document.createElement('div');
        topBar.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 32px; 
            background-color: #1a1a1f; border-bottom: 1.6px solid #333; 
        `;

        // Logo
        const appTitle = document.createElement('h1');
        appTitle.textContent = "NOT_E";
        appTitle.style.cssText = `
            color: white; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 3px;
        `;

        const fileCounter = document.createElement('h2');
        fileCounter.textContent = `${this.fileArr.length}/${this.numberOfFiles}`;
        fileCounter.style.cssText = "color: #bbb; margin: 0; font-size: 19px; font-weight: normal;";

        const searchInput = document.createElement('input');
        searchInput.id = 'main-search-bar';
        searchInput.type = 'text';
        searchInput.placeholder = "Search";
        searchInput.style.cssText = `
            padding: 6px 10px; font-size: 13px; border: 1px solid #555; 
            border-radius: 3px; background: #111; color: white; outline: none;
            flex-grow: 1; max-width: 240px; 
        `;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            const grid = this.guiEl.querySelector('#save-grid-container');
            if (!grid) return;

            Array.from(grid.children).forEach(box => {
                const id = box.dataset.sketchName.toLowerCase();
                if (id.includes(searchTerm)) {
                    box.style.display = 'flex';
                } else {
                    box.style.display = 'none';
                }
            });
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = "Close X";
        closeBtn.style.cssText = `
            background: #d32f2f; color: white; border: none; padding: 8px 16px; 
            border-radius: 3px; cursor: pointer; font-size: 13px; font-weight: bold; 
        `;
        closeBtn.onclick = () => {
            this.destroy();
            this.startEmptySketch();
        };

        // Group the counter, search, and close button together on the right
        const rightControls = document.createElement('div');
        rightControls.style.cssText = "display: flex; align-items: center; gap: 20px;";
        rightControls.appendChild(fileCounter);
        rightControls.appendChild(searchInput);
        rightControls.appendChild(closeBtn);

        // Append to Top Bar
        topBar.appendChild(appTitle);
        topBar.appendChild(rightControls);
        this.guiEl.appendChild(topBar);

        const gridContainer = document.createElement('div');
        gridContainer.id = "save-grid-container";
        // Preserved your custom 10 20 10 20 padding
        gridContainer.style.cssText = `
            flex-grow: 1; padding: 10px 20px 10px 20px; overflow-y: auto; 
            display: grid; gap: 16px; 
            grid-template-columns: repeat(${this.columns}, minmax(0, 1fr));
            grid-template-rows: repeat(${this.rows}, 1fr);
        `;

        // Loop through the array and build the File Boxes
        this.fileArr.forEach((fileData, index) => {
            const fileBox = this.createFileBox(fileData, index);
            gridContainer.appendChild(fileBox);
        });

        this.guiEl.appendChild(gridContainer);
        document.body.appendChild(this.guiEl);
    }

    createFileBox(fileData, index) {
        const box = document.createElement('div');

        box.dataset.sketchName = fileData.sketchName;

        box.style.cssText = `
            background-color: rgb(40, 40, 45); border-radius: 6px; padding: 12px; /* 8px -> 6px, 15px -> 12px */
            display: flex; flex-direction: column; gap: 8px; /* 10px -> 8px */
            box-shadow: 0px 4px 12px rgba(0,0,0,0.3); transition: transform 0.2s; /* 5px 15px -> 4px 12px */
            min-width: 0; 
        `;
        box.onmouseenter = () => box.style.transform = "translateY(-4px)"; /* -5px -> -4px */
        box.onmouseleave = () => box.style.transform = "translateY(0)";

        // Thumbnail 
        const img = document.createElement('img');
        img.src = this.parseImageBuffer(fileData.jpegContent);
        img.style.cssText = `
            width: 100%; height: 96px; object-fit: cover; /* 120px -> 96px */
            background-color: #111; border-radius: 3px; /* 4px -> 3px */
        `;

        // File Name
        const nameLabel = document.createElement('div');
        nameLabel.className = 'sketch-name-label';
        nameLabel.textContent = fileData.sketchName;
        nameLabel.style.cssText = `
            color: white; font-size: 13px; text-align: center; /* 16px -> 13px */
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            width: 100%; display: block; 
        `;

        //  Buttons Container 
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = "display: flex; gap: 4px; justify-content: center; margin-top: auto;"; /* 5px -> 4px */

        // Helper to create uniform buttons
        const makeBtn = (text, color, hoverColor, callback) => {
            const b = document.createElement('button');
            b.textContent = text;
            b.style.cssText = `
                flex: 1; padding: 6px 0; border: none; border-radius: 3px; /* 8px -> 6px, 4px -> 3px */
                background-color: ${color}; color: white; cursor: pointer; font-size: 10px; /* 12px -> 10px */
            `;
            b.onmouseenter = () => b.style.backgroundColor = hoverColor;
            b.onmouseleave = () => b.style.backgroundColor = color;
            b.onclick = callback;
            return b;
        };

        img.onclick = () => {
            this.loadSketch(this.fileArr[index]);
        };

        // filebox buttons
        const renameBtn = makeBtn("Rename", "#28a745", "#218838", () => this.renameSketch(fileData.sketchName, box));
        const delBtn = makeBtn("Delete", "#dc3545", "#c82333", () => this.deleteSketch(fileData.sketchName, box));

        btnContainer.appendChild(renameBtn);
        btnContainer.appendChild(delBtn);

        box.appendChild(img);
        box.appendChild(nameLabel);
        box.appendChild(btnContainer);

        return box;
    }

    // add filebox when each file retrieved
    injectNewFileBox(fileData, index) {
        if (!this.guiEl) return;

        const newBox = this.createFileBox(fileData, index);

        const gridContainer = this.guiEl.children[1];
        if (gridContainer) {
            gridContainer.appendChild(newBox);
        }

        const counterEl = this.guiEl.querySelector('h2');
        if (counterEl) {
            counterEl.textContent = `${this.fileArr.length}/${this.numberOfFiles}`;
        }
    }

    destroy() {
        if (this.guiEl != null && this.guiEl.parentNode) {
            this.guiEl.parentNode.removeChild(this.guiEl);
            this.guiEl = null;
        }
    }

    async deleteSketch(sketchName, htmlBoxElement) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        try {
            const response = await fetch('http://localhost:4073/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sketchName: sketchName }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("SERVER_ERROR");

            const currentIndex = this.fileArr.findIndex(file => file.sketchName === sketchName);
            if (currentIndex !== -1) {
                this.fileArr.splice(currentIndex, 1);
            }

            if (htmlBoxElement && htmlBoxElement.parentNode) {
                htmlBoxElement.parentNode.removeChild(htmlBoxElement);
            }

            this.numberOfFiles--;
            const counterEl = this.guiEl.querySelector('h2');
            if (counterEl) {
                counterEl.textContent = `${this.fileArr.length}/${this.numberOfFiles}`;
            }

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                this.showToast("Connection timed out. Is the server running?", "error");
            } else {
                this.showToast("Server failed to delete the file", "error");
            }
        }
    }

    async renameSketch(sketchName, htmlBoxElement) {
        let newName = window.prompt("Enter new name");

        if (!newName || newName.trim() === "") return;

        const safeChars = /^[a-zA-Z0-9 _-]+$/;

        if (!safeChars.test(newName)) {
            this.showToast("Name can only contain - or _ for special characters", "error");
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        try {
            const response = await fetch('http://localhost:4073/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sketchName: sketchName, newName: newName }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.status === 400) {
                throw new Error("DUPLICATE");
            }

            if (!response.ok) {
                throw new Error("SERVER_ERROR");
            }

            const currentIndex = this.fileArr.findIndex(file => file.sketchName === sketchName);
            if (currentIndex !== -1) {
                this.fileArr[currentIndex].sketchName = newName;
            }

            if (htmlBoxElement) {
                const titleElement = htmlBoxElement.querySelector('.sketch-name-label');
                if (titleElement) {
                    titleElement.textContent = newName;
                }
                htmlBoxElement.dataset.sketchName = newName;
            }

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                this.showToast("Connection timed out. Is the server running?", "error");
            } else if (err.message === 'DUPLICATE') {
                this.showToast("Failed to rename: Name already exists", "error");
            } else {
                this.showToast("Server failed to rename the file", "error");
            }
        }
    }

    //  Image Parser Helper 
    parseImageBuffer(buffer) {
        if (buffer && buffer.type === "Buffer" && Array.isArray(buffer.data)) {
            // Convert the raw number array back into a typed byte array
            const uint8Array = new Uint8Array(buffer.data);
            const blob = new Blob([uint8Array], { type: 'image/jpeg' });
            return URL.createObjectURL(blob);
        }
        return "";
    }

    showToast(message, type = "success") {
        const toast = document.createElement('div');
        toast.textContent = message;

        const bgColor = type === "error" ? "#dc3545" : "#28a745";
        const textColor = "#ffffff";

        toast.style.cssText = `
        position: fixed;
        bottom: 5%;
        right: 16px; /* 20px -> 16px */
        background-color: ${bgColor}; 
        color: ${textColor}; 
        padding: 16px 24px; /* 20px 30px -> 16px 24px */
        border-radius: 6px; /* 8px -> 6px */
        box-shadow: 0px 6px 16px rgba(0, 0, 0, 0.4); /* 8px 20px -> 6px 16px */
        font-family: Arial, sans-serif;
        font-size: 14px; /* 18px -> 14px */
        font-weight: bold;
        z-index: 10005; 
        min-width: 200px; /* 250px -> 200px */
        max-width: 320px; /* 400px -> 320px */
        text-align: center;
        
        /* Animation starting state */
        opacity: 0;
        transform: translateY(8px); /* 10px -> 8px */
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
        document.body.appendChild(toast);

        // fade in
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });
        // fade out
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)"; /* 10px -> 8px */
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);

        }, 2000);
    }
}

class canvasclass {
    constructor(width = 500, height = 300, _top, _left, id = "mycanv") {
        this.canvasEl = document.createElement('canvas');
        this.canvasEl.style.touchAction = "none";
        this.maskcanvas = document.createElement('canvas');

        this.id = id;
        this.width = width;
        this.height = height;
        this.top = _top;
        this.left = _left;

        this.canvasEl.id = id;
        this.canvasEl.width = this.width;
        this.canvasEl.height = this.height;

        this.canvasEl.style.position = 'fixed';
        this.canvasEl.style.top = `${this.top}px`;
        this.canvasEl.style.left = `${this.left}px`;
        this.canvasEl.style.zIndex = '-1';

        this.maskcanvas.width = this.width;
        this.maskcanvas.height = this.height;

        this.mainctx = this.canvasEl.getContext('2d');
        this.maskctx = this.maskcanvas.getContext('2d');

        this.ctx = this.mainctx;

        this.ctx.font = "20px Arial";
        this.fontsize = 20;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.setColor(255, 255, 255);
        this.settextalign("left", "top");
        this.setLineWidth(2);
        this.setMiter(1);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    path(_path2d) {
        this.ctx.stroke(_path2d);
    }

    addCanvas() {
        document.body.appendChild(this.canvasEl);
    }
    showCanvas() {
        this.canvasEl.style.display = '';
    }
    removeCanvas() {
        this.canvasEl.style.display = 'none';
    }
    destroyCanvas() {
        this.canvasEl.remove();
        this.canvasEl.width = 0;
        this.canvasEl.height = 0;
        this.canvasEl = null;
    }

    startsolidmask() {
        this.ctx.save();
        this.ctx.beginPath();
    }
    rectmask(x, y, w, h) {
        this.ctx.rect(x, y, w, h);
    }
    ellipsemask(x, y, rx, ry, rot = 0, a1 = 0, a2 = Math.PI * 2) {
        this.ctx.ellipse(x, y, rx, ry, rot, a1, a2);
    }
    marksolidmask() {
        this.ctx.clip();
    }
    endsolidmask() {
        this.ctx.restore();
    }

    startlinemask() {
        this.ctx = this.maskctx;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    marklinemask() {
        this.ctx.globalCompositeOperation = 'destination-in';
    }

    endlinemask() {
        this.ctx = this.mainctx;
        this.ctx.drawImage(this.maskcanvas, 0, 0);
    }

    setColor(r, g, b, o = 1) {
        this.ctx.fillStyle = `rgba(${r},${g},${b},${o})`;
        this.ctx.strokeStyle = `rgba(${r},${g},${b},${o})`;
    }
    setalpha(o) {
        this.ctx.globalAlpha = o;
    }
    settextalign(hor, ver) {
        this.ctx.textAlign = hor;
        this.ctx.textBaseline = ver;
    }
    setTextSize(n) {
        this.ctx.font = `${n}px Arial`;
        this.fontsize = n;
    }

    setLineWidth(n) {
        this.ctx.lineWidth = n;
    }
    setSolidLine() {
        this.ctx.setLineDash([]);
    }
    setDashLine(length = 10, spacing = 10) {
        this.ctx.setLineDash([length, spacing]);
    }
    setMiter(n) {
        this.ctx.miterLimit = n;
    }

    startpen() {
        this.ctx.save();
    }
    endpen() {
        this.ctx.restore();
        this.fontsize = 20;
    }

    background(r, g, b) {
        this.setColor(r, g, b);
        this.ctx.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }

    stroke(arr, inking = "outline") {
        if (inking == "fill") {
            this.ctx.beginPath();
            this.ctx.moveTo(arr[0].x, arr[0].y);
            let temparr = arr.slice(1);
            for (let _point of temparr) {
                this.ctx.lineTo(_point.x, _point.y);
            }
            this.ctx.fill();
        }
        this.ctx.beginPath();
        this.ctx.moveTo(arr[0].x, arr[0].y);
        let temparr = arr.slice(1);
        for (let _point of temparr) {
            this.ctx.lineTo(_point.x, _point.y);
        }
        this.ctx.stroke();
    }

    rect(x, y, w, h, inking = "outline") {
        if (inking == "fill") {
            this.ctx.fillRect(x, y, w, h);
        }
        this.ctx.strokeRect(x, y, w, h);
    }

    rectcent(x, y, w, h, inking = "outline") {
        if (inking == "fill") {
            this.ctx.fillRect(x - w / 2, y - h / 2, w, h);
        }
        this.ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    }

    roundrect(x, y, w, h, inking = "outline") {
        let r = 10;
        if (inking == "fill") {
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, w, h, r);
            this.ctx.fill();
        }
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, r);
        this.ctx.stroke();
    }

    ellipse(x, y, rx, ry, rot = 0, a1 = 0, a2 = Math.PI * 2, inking = "outline") {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, rx, ry, rot, a1, a2);
        if (inking == "fill") {
            this.ctx.fill();
        }
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, rx, ry, rot, a1, a2);
        this.ctx.stroke();
    }

    circle(x, y, r, a1 = 0, a2 = Math.PI * 2, inking = "outline") {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, a1, a2);
        if (inking == "fill") {
            this.ctx.fill();
        }
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, a1, a2);
        this.ctx.stroke();
    }

    line(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    arrow(x1, y1, x2, y2, iconType = 'arrow') {
        let length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

        let arrowLength = Math.min(40, Math.max(15, length / 20));  // How far back the icon goes from tip to base
        let arrowWidth = Math.min(40, Math.max(15, length / 20));   // How wide the arrow base is
        let arrowPadding = 10;  // Gap between the actual target and the icon tip

        // Find the exact angle of the line
        let angle = Math.atan2(y2 - y1, x2 - x1);

        // Calculate our two stopping points along the line
        let tipX = x2 - Math.cos(angle) * arrowPadding;
        let tipY = y2 - Math.sin(angle) * arrowPadding;

        let baseX = tipX - Math.cos(angle) * arrowLength;
        let baseY = tipY - Math.sin(angle) * arrowLength;

        //. Draw the broken main line!
        this.ctx.beginPath();

        // Start to the back of the icon
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(baseX, baseY);

        // Front of the icon to the target
        this.ctx.moveTo(tipX, tipY);
        this.ctx.lineTo(x2, y2);

        this.ctx.stroke();

        // Draw the Hollow Icon
        this.ctx.save();
        this.ctx.lineWidth = 2;
        this.ctx.translate(tipX, tipY);
        this.ctx.rotate(angle);

        this.ctx.beginPath();

        if (iconType === 'arrow') {
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(-arrowLength, arrowWidth / 2);
            this.ctx.lineTo(-arrowLength, -arrowWidth / 2);
            this.ctx.closePath();
        }
        else if (iconType === 'minus' || iconType === 'plus') {
            // The circle fits perfectly inside the arrowLength space
            let radius = arrowLength / 2;
            let cx = -radius; // Center of the circle

            // Draw the main circle
            this.ctx.arc(cx, 0, radius, 0, Math.PI * 2);

            // Calculate 70% of the radius to leave a 15% gap on both edges
            let innerLine = radius * 0.5;

            if (iconType === 'minus') {
                // Perpendicular to the main line (Local Y axis)
                this.ctx.moveTo(cx, -innerLine);
                this.ctx.lineTo(cx, innerLine);
            }
            else if (iconType === 'plus') {
                // Perpendicular line
                this.ctx.moveTo(cx, -innerLine);
                this.ctx.lineTo(cx, innerLine);

                // Parallel line (Local X axis)
                this.ctx.moveTo(cx - innerLine, 0);
                this.ctx.lineTo(cx + innerLine, 0);
            }
        }

        this.ctx.stroke();

        this.ctx.restore();
    }

    text(text, x, y, cursorpos = -1, _start = 0, _end = 0) {
        let start = Math.min(_start, _end);
        let end = Math.max(_start, _end);

        let lineHeight = this.fontsize * 1.2;

        let lines = text.split('\n');
        let currentIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            let lineStart = currentIndex;
            let lineEnd = currentIndex + line.length;

            if ((start !== 0 || end !== 0) && start < lineEnd && end > lineStart) {

                let localStart = Math.max(0, start - lineStart);
                let localEnd = Math.min(line.length, end - lineStart);

                if (localStart !== localEnd) {
                    let textBeforeHighlight = line.substring(0, localStart);
                    let highlightedSegment = line.substring(localStart, localEnd);

                    let offsetX = this.ctx.measureText(textBeforeHighlight).width;
                    let highlightWidth = this.ctx.measureText(highlightedSegment).width;

                    this.startpen();
                    this.setColor(100, 100, 100);
                    this.ctx.fillRect(x + offsetX, y + (i * lineHeight), highlightWidth, lineHeight);
                    this.endpen();
                }
            }

            this.ctx.fillText(line, x, y + (i * lineHeight));

            if (cursorpos >= lineStart && cursorpos <= lineEnd) {

                let localCursorPos = cursorpos - lineStart;
                let textBeforeCursor = line.substring(0, localCursorPos);
                let cursorOffsetX = this.ctx.measureText(textBeforeCursor).width;

                this.ctx.fillRect(x + cursorOffsetX, y + (i * lineHeight), 2, this.fontsize);
            }

            currentIndex += line.length + 1;
        }
    }

    skewedText(text, x0, y0, x1, y1, x2, y2, w, h, isBoxed = true) {
        if (w === 0) w = 1;
        if (h === 0) h = 1;

        let a = (x1 - x0) / w;
        let b = (y1 - y0) / w;
        let c = (x2 - x0) / h;
        let d = (y2 - y0) / h;
        let e = x0;
        let f = y0;

        this.ctx.save();
        this.ctx.textBaseline = "top";

        this.ctx.transform(a, b, c, d, e, f);

        let lines = text.split('\n');
        let lineHeight = this.fontsize * 1.2;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            this.ctx.fillText(line, 0, i * lineHeight);
        }

        if (isBoxed == true) {
            this.roundrect(-7, -7, w + 14, h + 14);
        }

        this.ctx.restore();
    }

    resetTransform() {
        this.ctx.resetTransform();
    }
    translate(x, y) {
        this.ctx.translate(x, y);
    }
    rotate(a) {
        this.ctx.rotate(a);
    }
    scale(f) {
        this.ctx.scale(f, f);
    }

    image(el, x, y, w, h) {
        this.ctx.drawImage(el, x, y, w, h);
    }

    drawSkewedImage(el, w, h, x1, y1, x4, y4, x3, y3) {
        let a = (x4 - x1) / w; // Horizontal scaling/rotation
        let b = (y4 - y1) / w; // Vertical skewing
        let c = (x3 - x1) / h; // Horizontal skewing
        let d = (y3 - y1) / h; // Vertical scaling/rotation
        let e = x1;            // Horizontal translation (X origin)
        let f = y1;            // Vertical translation (Y origin)

        this.ctx.save();
        this.ctx.transform(a, b, c, d, e, f);
        this.ctx.drawImage(el, 0, 0, w, h);

        this.ctx.restore();
    }

    imagecent(el, x, y, w, h) {
        this.ctx.drawImage(el, x - w / 2, y - h / 2, w, h);
    }

    buffer(_canvas, x, y) {
        this.ctx.drawImage(_canvas.canvasEl, x, y);
    }

    canvasB64() {
        return this.canvasEl.toDataURL();
    }

    canvasB64jpeg() {
        return this.canvasEl.toDataURL("image/jpeg");
    }

    async snapshot() {
        const b64 = this.canvasEl.toDataURL();

        const loadedElement = await new Promise((resolve, reject) => {
            const imgElement = new Image();

            imgElement.onload = () => { resolve(imgElement); };
            imgElement.onerror = (err) => { reject(err); };

            imgElement.src = b64;
        });

        return { b64: b64, el: loadedElement };
    }
}

class Sketch {
    constructor() {
        let now = new Date();
        this.sketchId = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}_${Math.random()}`;
        this.sketchName = this.sketchId; // this will communicate with backend

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.gui = new GUI(this);
        this.fileModal = new FileModal(this);
        this.mainCanvas = new canvasclass(this.width, this.height, this.gui.buttonWidth, this.gui.buttonHeight, "mainCanvas");
        this.bufferCanvas = new canvasclass(this.width, this.height, 0, 0); // for pixelerase masks and board thumbnails

        this.activePointerId = null;

        window.onbeforeunload = () => { return ""; };
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.activeBoard.onMouseWheel(e);
        }, { passive: false });

        this.mainCanvas.canvasEl.addEventListener("pointermove", (e) => {
            // disables multiple touches
            if (this.activePointerId !== null && this.activePointerId !== e.pointerId) return;
            // remove chrome throttling for mouse events...smoother drawn curves
            const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
            for (let evt of events) {
                this.activeBoard.onMouseMove(evt);
            }
        });
        this.mainCanvas.canvasEl.addEventListener("pointerdown", (e) => {
            if (this.activePointerId !== null) return;
            this.activePointerId = e.pointerId;

            // maintains mouse event when mouse leaves canvas
            this.mainCanvas.canvasEl.setPointerCapture(e.pointerId);
            this.activeBoard.onMouseDown(e);
        });
        this.mainCanvas.canvasEl.addEventListener("pointerup", (e) => {
            if (this.activePointerId !== e.pointerId) return;
            this.mainCanvas.canvasEl.releasePointerCapture(e.pointerId);
            this.activePointerId = null;

            this.activeBoard.onMouseUp(e);
        });
        this.mainCanvas.canvasEl.addEventListener("pointercancel", (e) => {
            if (this.activePointerId !== e.pointerId) return;
            this.mainCanvas.canvasEl.releasePointerCapture(e.pointerId);
            this.activePointerId = null;
            this.activeBoard.onMouseUp(e);
        });

        document.addEventListener("keydown", (e) => {
            // prevent default behaviour of shortcut keys
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            if (e.code == 'Space') {
                e.preventDefault();
            }
            if (e.code === 'Home' || ((e.metaKey || e.ctrlKey) && e.code === 'ArrowLeft')) {
                e.preventDefault();
            }
            else if (e.code === 'End' || ((e.metaKey || e.ctrlKey) && e.code === 'ArrowRight')) {
                e.preventDefault();
            }
            if (e.code == 'ArrowLeft') {
                e.preventDefault();
            }
            if (e.code == 'ArrowRight') {
                e.preventDefault();
            }
            if (e.code == 'ArrowUp') {
                e.preventDefault();
            }
            if (e.code == 'ArrowDown') {
                e.preventDefault();
            }
            if (e.key == 'a' && e.ctrlKey == true) {
                e.preventDefault();
            }

            this.activeBoard.onKeyDown(e);
        });
        document.addEventListener("keyup", (e) => {
            this.activeBoard.onKeyUp(e);
        });
        document.addEventListener("paste", (e) => {
            if (this.activeBoard.status == "drawing" || this.activeBoard.status == "placing") {
                e.preventDefault();
                if (this.activeBoard.activeEntity.isType("text")) {
                    try {
                        const item = e.clipboardData.items[0];
                        if (item && item.type.startsWith("text/")) {
                            const str = e.clipboardData.getData("text");
                            this.activeBoard.activeEntity.addText(str);
                            this.activeBoard.setUpdate();
                        }
                    }
                    catch (err) { }
                }
            } else {
                try {
                    let imageFound = false;

                    for (let i = 0; i < e.clipboardData.items.length; i++) {
                        const item = e.clipboardData.items[i];

                        if (item.type.startsWith("image/")) {
                            const file = item.getAsFile();
                            this.activeBoard.drawer.startEntity("image", file);
                            imageFound = true;
                            break;
                        }
                    }

                    if (!imageFound) {
                        const str = e.clipboardData.getData("text");
                        if (str) {
                            this.activeBoard.drawer.startEntity("text", str);
                        }
                    }
                }
                catch (err) { }
            }
        });

        this.currentBoardId = 1;
        this.currentLayerId = 0;
        this.currentEntityId = 0;
        this.boardSet = new Set();
        this.activeBoard = new board(this, 0);
        this.activeBoard.name = "main";
        this.boardSet.add(this.activeBoard);
    }

    toJSON(isJustId = false) {
        if (isJustId == true) {
            return { idStorageType: "sketch", id: this.sketchId };
        }

        let fullDataClasses = ["board"];
        let onlyRefClasses = [];
        let onlyRefKeys = ["activeBoard"];

        const saveObj = { classType: this.constructor.name };

        // define how different fields are handled
        const parseValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (val instanceof Set) {
                return Array.from(val).map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (fullDataClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON() : undefined;
            }
            if (onlyRefClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON(true) : undefined;
            }
            if (val.constructor.name === "Object") {
                let mirroredObj = {};
                for (let _key of Object.keys(val)) {
                    let parsedProp = parseValue(val[_key]);
                    if (parsedProp !== undefined) {
                        mirroredObj[_key] = parsedProp;
                    }
                }
                return mirroredObj;
            }
            return undefined;
        };

        // kick off the recursion
        for (let _key of Object.keys(this)) {
            if (onlyRefKeys.includes(_key)) {
                let finalValue = this[_key].toJSON(true);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            } else {
                let finalValue = parseValue(this[_key]);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            }
        }

        return saveObj;
    }

    fromJSON(_json) {
        const parseLoadedValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseLoadedValue(item));
            }
            if (typeof val === "object") {
                if (val.idStorageType !== undefined) {
                    return new idStorer(val.idStorageType, val.id, this);
                }
                if (val.classType !== undefined) {
                    const ClassBlueprint = ClassRegistry[val.classType];

                    let newInstance = new ClassBlueprint(this);
                    newInstance.fromJSON(val);
                    return newInstance;
                }
                let rebuiltObj = {};
                for (let k of Object.keys(val)) {
                    rebuiltObj[k] = parseLoadedValue(val[k]);
                }
                return rebuiltObj;
            }
        };

        for (let key of Object.keys(_json)) {
            if (key === "classType") continue;

            let parsedValue = parseLoadedValue(_json[key]);
            this[key] = parsedValue;
        }
    }

    // replaces idStorer with the actual instance
    fixRefs() {
        const visited = new Set(); // prevent stuck in circular refs

        const sweep = (target) => {
            // Ignore primitives, null, and HTML DOM elements
            if (target === null || typeof target !== "object" || target instanceof HTMLElement) {
                return;
            }

            // If we have already swept this exact object, STOP and turn back!
            if (visited.has(target)) return;

            // Otherwise, mark it as visited so we never sweep it again.
            visited.add(target);

            // Handle Arrays (and Sets that were converted to Arrays)
            if (Array.isArray(target)) {
                for (let i = 0; i < target.length; i++) {
                    if (target[i] instanceof idStorer) {
                        target[i] = target[i].getRef();
                    } else {
                        sweep(target[i]);
                    }
                }
                return;
            }

            // Handle Objects and Class Instances
            for (let key of Object.keys(target)) {
                let val = target[key];

                if (val instanceof idStorer) {
                    target[key] = val.getRef();
                } else {
                    sweep(val);
                }
            }
        };

        // Kick off 
        sweep(this);
    }

    start() {
        this.mainCanvas.addCanvas();
        this.sketchLoop();
    }

    updateActiveBoard(_board) {
        this.activeBoard.isMouseDown = {
            left: false,
            middle: false,
            right: false
        };
        this.activeBoard.layerModal.destroyModal();
        this.activeBoard.beaconManager.destroyModal();

        this.activeBoard = _board;
        this.activeBoard.setUpdate();
    }

    async goBackABoard() {
        if (this.activeBoard.anchorEntity != null) {
            await this.updateAnchorThumbnail();
            this.updateActiveBoard(this.activeBoard.anchorEntity.parentBoard);
        }
    }

    async updateAnchorThumbnail(_board = this.activeBoard) {
        let thumbnail = await _board.getThumbnail();
        _board.anchorEntity.content.imageB64 = thumbnail.b64;
        _board.anchorEntity.content.imageEl = thumbnail.el;
        _board.anchorEntity.updateContentDimensions();
    }

    async createBoard(_entity) {
        let newBoard = new board(this, this.currentBoardId);
        this.currentBoardId++;
        this.boardSet.add(newBoard);
        newBoard.anchorEntity = _entity;
        _entity.content.boardRef = newBoard;

        await this.updateAnchorThumbnail(newBoard);

    }

    // the main loop of the program
    sketchLoop() {
        this.activeBoard.looper.loop();
        requestAnimationFrame(() => this.sketchLoop());
    }

    makeSaveFile() {
        let _json = this.toJSON();
        let jsonString = JSON.stringify(_json);
        this.downloadJSON(jsonString);
    }

    async loadSavefile() {
        let file = await new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json, application/json';

            input.addEventListener('change', (e) => {
                const selectedFile = e.target.files[0];
                resolve(selectedFile || null);
            });

            input.addEventListener('cancel', () => {
                resolve(null);
            });

            input.click();
        });

        if (!file) {
            return;
        }

        try {
            const jsonString = await file.text();
            const parsedData = JSON.parse(jsonString);
            this.loadJSON(parsedData);
        } catch (error) {
            alert("Failed to read save file");
        }
    }

    async loadJSON(_json) {
        try {
            this.fromJSON(_json); // phase 1 - attach plain vars and store instances in idStorer
            this.fixRefs(); // phase 2 - replace idStorer with actual instance

            // phase 3
            // correct dimensions if loaded in different device
            // convert sets back into sets
            // make tiles in layers
            // make image elements
            // track beacons
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.boardSet = new Set(this.boardSet);
            for (let _board of this.boardSet) {
                _board.initDimensions();
                _board.stickySet = new Set(_board.stickySet);
                for (let _layer of _board.layerArr) {
                    _layer.initTiles();
                    for (let _entity of _layer.entityArr) {
                        _entity.homeTileSet = new Set(_entity.homeTileSet);
                        _entity.arrowSet = new Set(_entity.arrowSet);
                        if (_entity.isType("image") || _entity.isSpecificType("rect-board")) {
                            _entity.content.imageEl = await _entity.makeimgel(_entity.content.imageB64);
                        }
                        if (_entity.isSpecificType("text-beacon")) {
                            _entity.relayToBeaconSet("add");
                        }
                    }
                }
            }

            for (let _board of this.boardSet) {
                _board.updateAllEntityModified();
                _board.updateAllEntityIsInWindow();
            }

            this.activeBoard.setUpdate();
        } catch (error) {
            alert("Failed to read save file");
        }
    }

    downloadJSON(jsonString, fileName = 'not_e-data.json') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url); // clean memory
    }

    downloadImage(b64, fileName = "not_e-screenshot.jpg") {
        const link = document.createElement('a');
        link.href = b64;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    saveScreenshot() {
        let b64 = this.mainCanvas.canvasB64();
        this.downloadImage(b64);
    }

    async saveNot_ely(isNewName = false) {
        let oldSketchName = this.sketchName; // if save fails need to restore old name
        if (isNewName == true) {
            let newName = window.prompt('Enter sketch name');
            if (newName == null) {
                return;
            }
            this.sketchName = newName;
        }
        let _json = this.toJSON();
        let jsonString = JSON.stringify(_json);

        let jpegB64 = this.mainCanvas.canvasB64jpeg();
        jpegB64 = jpegB64.replace(/^data:image\/jpeg;base64,/, "");

        let ip = "http://127.0.0.1:4073/savesketch";
        try {
            let res = await fetch(ip, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    json: jsonString,
                    jpg: jpegB64,
                    sketchName: this.sketchName,
                    isNewName: isNewName
                })
            });
            res = await res.json();
            if (res.status == "ok") {
                this.showToast("Saved sketch");
            }
            if (res.status == "duplicate") {
                this.sketchName = oldSketchName;
                this.showToast("Failed to save : Duplicate name", "error");
            }
        } catch {
            this.sketchName = oldSketchName;
            this.showToast("Failed to save : Not_e server not active", "error");
        }
    }

    showToast(message, type = "success") {
        const toast = document.createElement('div');
        toast.textContent = message;

        const bgColor = type === "error" ? "#dc3545" : "#28a745";
        const textColor = "#ffffff";

        toast.style.cssText = `
        position: fixed;
        bottom: 5%;
        right: 16px; /* 20px -> 16px */
        background-color: ${bgColor}; 
        color: ${textColor}; 
        padding: 16px 24px; /* 20px 30px -> 16px 24px */
        border-radius: 6px; /* 8px -> 6px */
        box-shadow: 0px 6px 16px rgba(0, 0, 0, 0.4); /* 8px 20px -> 6px 16px */
        font-family: Arial, sans-serif;
        font-size: 14px; /* 18px -> 14px */
        font-weight: bold;
        z-index: 10005; 
        min-width: 200px; /* 250px -> 200px */
        max-width: 320px; /* 400px -> 320px */
        text-align: center;
        
        /* Animation starting state */
        opacity: 0;
        transform: translateY(8px); /* 10px -> 8px */
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
        document.body.appendChild(toast);

        // fade in
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });
        // fade out
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(8px)"; /* 10px -> 8px */
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);

        }, 2000);
    }
}

class GUI {
    constructor(_parentsketch) {
        this.parentSketch = _parentsketch;
        this.colorPickerTimeout = null;

        this.injectCSS();

        // Top Bar
        this.topBar = document.createElement('div');
        this.topBar.className = 'gui-topbar';
        document.body.appendChild(this.topBar);

        // Side Bar
        this.sideBar = document.createElement('div');
        this.sideBar.className = 'gui-sidebar';
        document.body.appendChild(this.sideBar);

        // get offset to feed into canvas positioning
        this.buttonWidth = this.topBar.offsetHeight;
        this.buttonHeight = this.sideBar.offsetWidth;

        // corner button
        this.homeButton = document.createElement('button');
        this.homeButton.className = 'gui-btn gui-corner-btn';
        this.homeButton.textContent = "🏠";
        this.homeButton.title = "reset view";
        this.homeButton.addEventListener("click", () => {
            this.parentSketch.activeBoard.windower.resetViewWindow();
        });
        document.body.appendChild(this.homeButton);

        // Top Bar 
        this.makeSeparator(this.topBar, "horizontal");
        this.boardBack = this.makeButton(this.topBar, "⬅", "parent board", () => { this.parentSketch.goBackABoard(); });
        this.boardDisplay = this.makeButton(this.topBar, "main", "rename board", () => {
            let promptoutput = window.prompt('enter canvas name');
            if (promptoutput) {
                this.parentSketch.activeBoard.name = promptoutput;
            }
        }, null, null, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.colorpicker = this.makeColorPicker(this.topBar, "pick color", (e) => { this.changeStyling("color", e); }, true);
        this.bgcolorpicker = this.makeColorPicker(this.topBar, "pick bg color", (e) => { this.parentSketch.activeBoard.currentBgColor = e; }, true);
        this.opacityslider = this.makeSlider(this.topBar, 0, 1, 1, "pick opacity", (e) => { this.changeStyling("opacity", e); }, () => { }, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.decreaseButton = this.makeButton(this.topBar, "—", "decrease size", () => { this.changeStyling("lineWidth", "decr"); }, null, null, false, true);
        this.sizeDisplayButton = this.makeButton(this.topBar, "2", "size", () => { });
        this.increaseButton = this.makeButton(this.topBar, "+", "increase size", () => { this.changeStyling("lineWidth", "incr"); }, null, null, false, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.solidStrokeButton = this.makeButton(this.topBar, "⎯", "solid strokes", () => { this.changeStyling("strokeStyle", "solid"); }, "strokeStyle", "solid", false, true);
        this.dashStrokeButton = this.makeButton(this.topBar, "---", "dash strokes", () => { this.changeStyling("strokeStyle", "dash"); }, "strokeStyle", "dash", false, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.outlineShapeButton = this.makeButton(this.topBar, "⭕", "hollow shapes", () => { this.changeStyling("shapeStyle", "outline"); }, "shapeStyle", "outline", false, true);
        this.fillShapeButton = this.makeButton(this.topBar, "🔴", "solid shaped", () => { this.changeStyling("shapeStyle", "fill"); }, "shapeStyle", "fill", false, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.guideButton = this.makeButton(this.topBar, "🔢", "toggle guides", () => { this.parentSketch.activeBoard.isShowGuide == true ? this.parentSketch.activeBoard.isShowGuide = false : this.parentSketch.activeBoard.isShowGuide = true; }, "isShowGuide", true, false, true);
        this.gridButton = this.makeButton(this.topBar, "🧱", "toggle grid", () => { this.parentSketch.activeBoard.isShowGrid == true ? this.parentSketch.activeBoard.isShowGrid = false : this.parentSketch.activeBoard.isShowGrid = true; }, "isShowGrid", true, false, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.zoomOutButton = this.makeButton(this.topBar, "🔎", "zoom out", () => { this.parentSketch.activeBoard.windower.zoomOut(); });
        this.zoomResetButton = this.makeButton(this.topBar, "↺", "reset zoom", () => { this.parentSketch.activeBoard.windower.setScale(1); });
        this.zoomInButton = this.makeButton(this.topBar, "🔍", "zoom in", () => { this.parentSketch.activeBoard.windower.zoomIn(); });
        this.zoomSlider = this.makeSlider(this.topBar, 0.2, 5, 1, "set zoom", (e) => { this.parentSketch.activeBoard.windower.setScale(e, false); }, () => { this.parentSketch.activeBoard.updateAllEntityAddress(); });
        this.makeSeparator(this.topBar, "horizontal");
        this.undoButton = this.makeButton(this.topBar, "↶", "undo", () => { this.parentSketch.activeBoard.undoer.undo(); }, "undoer.undoArr.length", "0");
        this.redoButton = this.makeButton(this.topBar, "↷", "redo", () => { this.parentSketch.activeBoard.undoer.redo(); }, "undoer.redoArr.length", "0");
        this.makeSeparator(this.topBar, "horizontal");
        this.layerDisplayButton = this.makeButton(this.topBar, "layer 0", "layer menu", () => {
            if (this.parentSketch.activeBoard.layerModal.isShown == true) {
                this.parentSketch.activeBoard.layerModal.destroyModal();
            } else {
                this.parentSketch.activeBoard.layerModal.spawn(this.parentSketch.activeBoard.layerArr);
            }
        }, null, null, true, true);
        this.makeSeparator(this.topBar, "horizontal");
        this.beaconsButton = this.makeButton(this.topBar, "🔖", "beacons menu", () => {
            if (this.parentSketch.activeBoard.beaconManager.isShown == true) {
                this.parentSketch.activeBoard.beaconManager.destroyModal();
            } else {
                this.parentSketch.activeBoard.beaconManager.spawn(this.parentSketch.activeBoard.beaconManager.beaconSet);
            }
        });

        // Side Bar 
        this.makeSeparator(this.sideBar, "vertical");
        this.strokeToolButton = this.makeButton(this.sideBar, "🖊", "stroke tool", () => { this.parentSketch.activeBoard.setTool("stroke"); }, "tool", "stroke");
        this.lineToolButton = this.makeButton(this.sideBar, "📏", "line tool", () => { this.parentSketch.activeBoard.setTool("line"); }, "tool", "line");
        this.textToolButton = this.makeButton(this.sideBar, "[T]", "text tool", () => { this.parentSketch.activeBoard.setTool("text"); }, "tool", "text");
        this.rectToolButton = this.makeButton(this.sideBar, "🟥", "rect tool", () => { this.parentSketch.activeBoard.setTool("rect"); }, "tool", "rect");
        this.boardToolButton = this.makeButton(this.sideBar, "🪧", "board tool", () => { this.parentSketch.activeBoard.setTool("rect-board"); }, "tool", "rect-board");
        this.ellipseToolButton = this.makeButton(this.sideBar, "⬭", "ellipse tool", () => { this.parentSketch.activeBoard.setTool("ellipse"); }, "tool", "ellipse");
        this.circleToolButton = this.makeButton(this.sideBar, "🔵", "circle tool", () => { this.parentSketch.activeBoard.setTool("circle"); }, "tool", "circle");
        this.imageToolButton = this.makeButton(this.sideBar, "🖼️", "image tool", () => { this.parentSketch.activeBoard.setTool("image"); }, "tool", "image");
        this.beaconToolButton = this.makeButton(this.sideBar, "🔖", "beacon tool", () => { this.parentSketch.activeBoard.setTool("text-beacon"); }, "tool", "text-beacon");
        this.makeSeparator(this.sideBar, "vertical");
        this.arrowButton = this.makeButton(this.sideBar, "➡️", "make arrows", () => { this.parentSketch.activeBoard.drawer.makeManyArrows(); }, null, null, false, true);
        this.duplicateButton = this.makeButton(this.sideBar, "🪞", "duplicate", () => { this.parentSketch.activeBoard.editer.duplicateSelections(); }, null, null, false, true);
        this.makeSeparator(this.sideBar, "vertical");
        this.scrollToolButton = this.makeButton(this.sideBar, "🖐", "scroll", () => {
            this.parentSketch.activeBoard.status == "scrolling" ? this.parentSketch.activeBoard.windower.endScroller() : this.parentSketch.activeBoard.windower.startScroller(true);
        }, "tool", "scroller");
        this.selectToolButton = this.makeButton(this.sideBar, "⛶", "select tool", () => {
            if (this.parentSketch.activeBoard == "editing") {
                this.parentSketch.activeBoard.setStatus("extendselecting");
            } else {
                this.parentSketch.activeBoard.setTool("select");
            }
        }, "tool", "select", false, true);
        this.pixelEraserToolButton = this.makeButton(this.sideBar, "p", "pixel eraser tool", () => { this.parentSketch.activeBoard.setTool("pixeleraser"); }, "tool", "pixeleraser");
        this.eraserToolButton = this.makeButton(this.sideBar, "🧽", "eraser tool", () => { this.parentSketch.activeBoard.setTool("eraser"); }, "tool", "eraser");
        this.makeSeparator(this.sideBar, "vertical");
        this.filesButton = this.makeButton(this.sideBar, "💾", "file menu", () => { this.parentSketch.fileModal.spawn(); });
    }

    injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --btn-size: min(30px, calc(100vw / 34), calc(100vh / 18));
                
                /* THESE WERE MISSING! The slider needs these to draw the fill */
                --btn-bg: #eeeeee;             
                --btn-active: #aaaaaa;         
                --border-color: #000000;       
            }
            .gui-topbar {
                position: fixed; top: 0; left: var(--btn-size); right: 0; height: var(--btn-size);
                background-color: rgb(70,70,120);
                display: flex; align-items: center; 
                z-index: 1000;
            }
            .gui-sidebar {
                position: fixed; top: var(--btn-size); left: 0; bottom: 0; width: var(--btn-size);
                background-color: rgb(70,70,120);
                display: flex; flex-direction: column; align-items: center; 
                z-index: 1000;
            }
            .gui-btn {
                width: var(--btn-size);
                height: var(--btn-size);
                font-size: calc(var(--btn-size) * 0.45);
                display: flex; justify-content: center; align-items: center;
                cursor: pointer;
                padding: 0;
                margin: 0;
            }
            .gui-corner-btn {
                position: fixed; top: 0; left: 0; z-index: 1001;
                width: var(--btn-size); height: var(--btn-size);
            }
            .gui-btn.wide { 
                width: calc(var(--btn-size) * 3); 
            }
            .gui-btn.active { 
                background-color: rgb(170,170,170); 
            }
            .gui-color { width: var(--btn-size); height: var(--btn-size); cursor: pointer; padding: 0; margin: 0; }
            .gui-separator.horizontal { width: calc(var(--btn-size) / 4); height: 100%; flex-shrink: 0; }
            .gui-separator.vertical { width: 100%; height: calc(var(--btn-size) / 4); flex-shrink: 0; }

            .gui-slider { 
                -webkit-appearance: none;
                appearance: none;
                width: calc(var(--btn-size) * 3); 
                height: calc(var(--btn-size) * 0.5); 
                
                /* THE FIX: 0px top/bottom margin, 8px left/right margin */
                margin: 0 8px; 
                
                cursor: pointer; 
                border: 1px solid var(--border-color);
                box-sizing: border-box; 
                background-color: var(--btn-bg);
                
                background-image: linear-gradient(to right, #007bff var(--slider-fill, 50%), var(--btn-bg) var(--slider-fill, 50%));
            }

            /* WEBKIT (Chrome/Safari/Edge) */
            .gui-slider::-webkit-slider-runnable-track {
                height: 100%; background: transparent;
            }
            .gui-slider::-webkit-slider-thumb {
                -webkit-appearance: none; appearance: none;
                width: 10px; height: calc(var(--btn-size) * 0.5); 
                background: transparent; border: none; cursor: ew-resize;
            }

            /* FIREFOX */
            .gui-slider::-moz-range-track {
                height: 100%; background: transparent;
            }
            .gui-slider::-moz-range-thumb {
                width: 10px; height: 100%; 
                background: transparent; border: none; cursor: ew-resize;
            }
        `;
        document.head.appendChild(style);
    }

    makeButton(container, title, tooltip, callback, bindProp = null, bindValue = null, isWide = false, isEditorButton = false) {
        let button = document.createElement('button');
        button.className = isWide ? 'gui-btn wide' : 'gui-btn';
        button.textContent = title;
        button.title = tooltip;

        if (bindProp && bindValue) {
            button.dataset.prop = bindProp;
            button.dataset.val = bindValue;
        }

        button.addEventListener("click", (e) => {
            if (this.parentSketch.activeBoard.isButtonAllowed == true || (this.parentSketch.activeBoard.status == "editing" && isEditorButton == true)) {
                callback(e);
                this.parentSketch.activeBoard.setUpdate();
            }
        });

        container.appendChild(button);
        return button;
    }

    makeColorPicker(container, tooltip, callback, isEditorButton = false) {
        let picker = document.createElement('input');
        picker.type = 'color';
        picker.value = "#ffffff";
        picker.title = tooltip;
        picker.className = 'gui-color';

        picker.addEventListener("input", (e) => {
            clearTimeout(this.colorPickerTimeout);

            if (this.parentSketch.activeBoard.isButtonAllowed == true || (this.parentSketch.activeBoard.status == "editing" && isEditorButton == true)) {
                callback(hexToRgb(e.target.value));
                this.parentSketch.activeBoard.setUpdate();
            }

            this.colorPickerTimeout = setTimeout(() => {
                picker.type = "text"; picker.type = "color";
            }, 1000);
        });

        container.appendChild(picker);
        return picker;
    }

    makeSlider(container, minValue, maxValue, initValue, tooltip, callback1, callback2, isEditorButton = false) {
        let slider = document.createElement('input');
        slider.type = 'range';
        slider.min = minValue;
        slider.max = maxValue;
        slider.step = (maxValue - minValue) / 100;
        slider.value = initValue;
        slider.title = tooltip;
        slider.className = 'gui-slider';

        const updateSliderFill = () => {
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const val = parseFloat(slider.value) || 0;
            const percent = ((val - min) / (max - min)) * 100;
            slider.style.setProperty('--slider-fill', `${percent}%`);
        };

        // Run it immediately so it looks correct on load
        updateSliderFill();

        slider.addEventListener("input", (e) => {
            if (this.parentSketch.activeBoard.isButtonAllowed == true || (this.parentSketch.activeBoard.status == "editing" && isEditorButton == true)) {
                updateSliderFill();
                callback1(Number(e.target.value));
                this.parentSketch.activeBoard.setUpdate();
            }
        });

        slider.addEventListener("change", (e) => {
            if (this.parentSketch.activeBoard.isButtonAllowed == true || (this.parentSketch.activeBoard.status == "editing" && isEditorButton == true)) {
                callback2(Number(e.target.value));
                this.parentSketch.mainCanvas.canvasEl.focus();
                this.parentSketch.activeBoard.setUpdate();
            }
        });

        slider.addEventListener("pointerup", () => {
            slider.blur();

            if (this.parentSketch && this.parentSketch.mainCanvas && this.parentSketch.mainCanvas.canvasEl) {
                this.parentSketch.mainCanvas.canvasEl.focus();
            }
        });

        container.appendChild(slider);
        return slider;
    }

    makeSeparator(container, direction) {
        let sep = document.createElement('div');
        sep.className = `gui-separator ${direction}`;
        container.appendChild(sep);
    }

    updateActiveButtons() {
        const board = this.parentSketch.activeBoard;
        if (!board) return;

        const allButtons = document.querySelectorAll('.gui-btn');
        allButtons.forEach(btn => {
            if (!btn.dataset.prop) return;

            const prop = btn.dataset.prop;
            const expectedVal = btn.dataset.val;

            let currentValue = board;
            const propPath = prop.split('.');
            for (let key of propPath) {
                if (currentValue == null) {
                    currentValue = undefined;
                    break;
                }
                currentValue = currentValue[key];
            }

            if (String(currentValue) === expectedVal) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateDisplays() {
        const board = this.parentSketch.activeBoard;
        if (!board) return;

        if (board.status === "erasing") {
            this.sizeDisplayButton.textContent = board.naturalEraserSize;
        } else if (board.status === "pixelerasing") {
            this.sizeDisplayButton.textContent = board.naturalPixelEraserSize;
        } else if (board.getTool() === "text") {
            this.sizeDisplayButton.textContent = board.textSize;
        } else {
            this.sizeDisplayButton.textContent = board.lineWidth;
        }

        this.colorpicker.value = rgbToHex(board.color);
        this.bgcolorpicker.value = rgbToHex(board.currentBgColor);

        this.zoomSlider.value = board.scaleFactor;

        this.layerDisplayButton.textContent = board.activeLayer ? board.activeLayer.name : "";
        this.boardDisplay.textContent = board.name;
    }

    updateGUI() {
        this.updateActiveButtons();
        this.updateDisplays();
    }

    changeStyling(_field, _val) {
        if (this.parentSketch.activeBoard.status == "editing") {
            for (let _entity of this.parentSketch.activeBoard.selectioner.selectionSet) {
                let tempField = _field;
                if (_entity.isType("text") && tempField == "lineWidth") {
                    tempField = "textSize";
                }
                let stylingObject = { ..._entity.styling };

                if (_val == "decr") {
                    stylingObject[tempField] > 1 ? stylingObject[tempField]-- : 0;
                } else if (_val == "incr") {
                    stylingObject[tempField]++;
                } else {
                    stylingObject[tempField] = _val;
                }
                _entity.updateStyling(stylingObject);
            }
            this.parentSketch.activeBoard.editer.isStyleEdited = true;
        } else {
            if (_val == "decr") {
                this.parentSketch.activeBoard[_field] > 1 ? this.parentSketch.activeBoard[_field]-- : 0;
            } else if (_val == "incr") {
                this.parentSketch.activeBoard[_field]++;
            } else {
                this.parentSketch.activeBoard[_field] = _val;
            }
        }
    }
}

class FileModal {
    constructor(_parentsketch) {
        this.parentSketch = _parentsketch;
        this.modalEl = null;
    }

    spawn() {
        if (this.modalEl) {
            this.destroyModal();
        }

        this.modalEl = document.createElement('div');

        this.modalEl.style.cssText = `
            position: fixed;
            bottom: 0;
            background-color: rgb(40, 40, 45);
            color: white;
            padding: 12px;
            border-radius: 6px 6px 0 0; 
            box-shadow: 0px -4px 12px rgba(0, 0, 0, 0.5);
            font-family: Arial, sans-serif;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 160px;
        `;

        const canvas = document.querySelector('canvas');
        if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            this.modalEl.style.left = `${canvasRect.left}px`;
        } else {
            this.modalEl.style.left = '16px';
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = "X";

        closeBtn.style.cssText = `
            background-color: #555; color: white; border: none; 
            padding: 4px 12px; border-radius: 3px; cursor: pointer;
            align-self: center; 
            margin-bottom: 4px; font-size: 10px;
        `;
        closeBtn.onmouseenter = () => closeBtn.style.backgroundColor = "#666";
        closeBtn.onmouseleave = () => closeBtn.style.backgroundColor = "#555";

        closeBtn.onclick = () => {
            this.destroyModal();
        };

        this.modalEl.appendChild(closeBtn);

        const btnLabels = ["Save", "Save as", "Save JSON", "Load JSON", "Save screenshot"];

        btnLabels.forEach((label, index) => {
            const btn = document.createElement('button');
            btn.textContent = label;

            btn.style.cssText = `
                background-color: #222; color: white; border: 1px solid #555; 
                padding: 8px; border-radius: 3px; cursor: pointer;
                width: 100%; font-size: 11px; transition: background 0.2s;
            `;
            btn.onmouseenter = () => btn.style.backgroundColor = "#444";
            btn.onmouseleave = () => btn.style.backgroundColor = "#222";

            btn.onclick = () => {
                this.destroyModal();

                if (index === 0) {
                    this.parentSketch.saveNot_ely();
                } else if (index === 1) {
                    this.parentSketch.saveNot_ely(true);
                } else if (index === 2) {
                    this.parentSketch.makeSaveFile();
                } else if (index === 3) {
                    this.parentSketch.loadSavefile();
                } else if (index === 4) {
                    this.parentSketch.saveScreenshot();
                }
            };
            this.modalEl.appendChild(btn);
        });

        document.body.appendChild(this.modalEl);
    }

    destroyModal() {
        if (this.modalEl && this.modalEl.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
            this.modalEl = null;
        }
    }
}

class board {
    constructor(_parentsketch, _boardId) {
        this.parentSketch = _parentsketch;
        this.mainCanvas = _parentsketch.mainCanvas;
        this.bufferCanvas = _parentsketch.bufferCanvas;

        this.boardId = _boardId;
        this.name = `board ${this.boardId}`;

        this.looper = new Looper(this);
        this.inputer = new Inputer(this);
        this.drawer = new Drawer(this);
        this.shower = new Shower(this);
        this.eraser = new Eraser(this);
        this.pixelEraser = new PixelEraser(this);
        this.selectioner = new Selectioner(this);
        this.contracter = new Contracter(this);
        this.editer = new Editer(this);
        this.undoer = new Undoer(this);
        this.windower = new Windower(this);
        this.layerModal = new LayerModal(this);
        this.beaconManager = new BeaconManager(this);

        this.status = "toDraw";
        this.tool = "stroke";
        this.drawTool = "stroke";

        this.isShowGrid = false;
        this.isShowGuide = true;

        this.canvasMouse = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0 };

        this.mouseWheelX = 0;
        this.mouseWheelY = 0;

        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        this.isMouseDown = {
            left: false,
            middle: false,
            right: false
        };

        this.pressedKey = null;
        this.isCtrlPressed = false;
        this.isShiftPressed = false;
        this.isAltPressed = false;
        this.isMetaPressed = false;
        this.isSpacePressed = false;

        this.offsetX = 0;
        this.offsetY = 0;
        this.scaleFactor = 1;

        this.naturalEraserSize = 20;
        this.naturalPixelEraserSize = 20;

        this.eraserSize = this.naturalEraserSize / this.scaleFactor;
        this.pixelEraserSize = this.naturalPixelEraserSize / this.scaleFactor;

        this.tileXResolution = 50;
        this.tileYResolution = 50;

        this.initDimensions();

        this.selectionColor = [255, 25, 155];

        this.isUpdateNeeded = true;
        this.isButtonAllowed = true;

        this.layerArr = [];
        this.activeLayer = null;
        this.contracter.makeNewLayer(true);

        this.viewWindow = {
            x0: 0,
            y0: 0,
            x1: this.width,
            y1: this.height
        };
        this.viewCenter = {
            x: this.width / 2,
            y: this.height / 2
        };

        this.activeEntity = 0;

        this.currentBgColor = [0, 0, 0];
        this.color = [255, 255, 255];
        this.opacity = 1;
        this.lineWidth = 2;
        this.textSize = 20;
        this.shapeStyle = "outline";
        this.strokeStyle = "solid";

        this.anchorEntity = null;

        this.stickySet = new Set();
    }

    initDimensions() {
        this.width = this.parentSketch.width;
        this.height = this.parentSketch.height;

        this.tileWidth = this.width / this.tileXResolution;
        this.tileHeight = this.height / this.tileYResolution;

        this.eraserTileSpanX = Math.ceil(this.eraserSize / this.tileWidth);
        this.eraserTileSpanY = Math.ceil(this.eraserSize / this.tileHeight);

        this.pixelEraserTileSpanX = Math.ceil(this.pixelEraserSize / this.tileWidth);
        this.pixelEraserTileSpanY = Math.ceil(this.pixelEraserSize / this.tileHeight);

        if (this.viewCenter) { // cant set scale at beginning of prog
            this.windower.setScale(1);
        }
    }

    toJSON(isJustId = false) {
        if (isJustId == true) {
            return { idStorageType: "board", id: this.boardId };
        }

        let fullDataClasses = ["layer"];
        let onlyRefClasses = ["entity"];
        let onlyRefKeys = ["activeLayer"];

        const saveObj = { classType: this.constructor.name };

        const parseValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (val instanceof Set) {
                return Array.from(val).map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (fullDataClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON() : undefined;
            }
            if (onlyRefClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON(true) : undefined;
            }
            if (val.constructor.name === "Object") {
                let mirroredObj = {};
                for (let _key of Object.keys(val)) {
                    let parsedProp = parseValue(val[_key]);
                    if (parsedProp !== undefined) {
                        mirroredObj[_key] = parsedProp;
                    }
                }
                return mirroredObj;
            }
            return undefined;
        };

        for (let _key of Object.keys(this)) {
            if (onlyRefKeys.includes(_key)) {
                let finalValue = this[_key].toJSON(true);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            } else {
                let finalValue = parseValue(this[_key]);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            }
        }

        return saveObj;
    }

    fromJSON(_json) {
        const parseLoadedValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseLoadedValue(item));
            }
            if (typeof val === "object") {
                if (val.idStorageType !== undefined) {
                    return new idStorer(val.idStorageType, val.id, this.parentSketch);
                }
                if (val.classType !== undefined) {
                    const ClassBlueprint = ClassRegistry[val.classType];

                    let newInstance = new ClassBlueprint(this);
                    newInstance.fromJSON(val);
                    return newInstance;
                }
                let rebuiltObj = {};
                for (let k of Object.keys(val)) {
                    rebuiltObj[k] = parseLoadedValue(val[k]);
                }
                return rebuiltObj;
            }
        };

        for (let key of Object.keys(_json)) {
            if (key === "classType") continue;

            let parsedValue = parseLoadedValue(_json[key]);
            this[key] = parsedValue;
        }
    }

    async getThumbnail() {
        this.bufferCanvas.resetTransform();
        this.bufferCanvas.background(this.currentBgColor[0], this.currentBgColor[1], this.currentBgColor[2]);

        this.bufferCanvas.scale(this.scaleFactor);
        this.bufferCanvas.translate(this.offsetX, this.offsetY);

        this.shower.showAllLayer(this.bufferCanvas);
        let thumbnail = await this.bufferCanvas.snapshot();
        this.bufferCanvas.clear();
        return thumbnail;
    }

    updateAllEntityModified() {
        for (let _layer of this.layerArr) {
            _layer.updateEntityModified();
        }
    }

    updateAllEntityAddress() {
        for (let _layer of this.layerArr) {
            _layer.updateEntityAddress();
        }
    }

    updateAllEntityIsInWindow() {
        for (let _layer of this.layerArr) {
            _layer.updateEntityIsInWindow();
        }
    }

    evictLayer(_layer) {
        removeFromArray(this.layerArr, _layer);
    }

    onMouseMove(e) {
        const rect = this.mainCanvas.canvasEl.getBoundingClientRect();

        const newMouseX = (e.clientX - rect.left);
        const newMouseY = (e.clientY - rect.top);

        this.mouseDeltaX = (newMouseX - this.canvasMouse.x) / this.scaleFactor;
        this.mouseDeltaY = (newMouseY - this.canvasMouse.y) / this.scaleFactor;

        this.canvasMouse.x = newMouseX;
        this.canvasMouse.y = newMouseY;

        this.mouse.x = (this.canvasMouse.x / this.scaleFactor) - this.offsetX;
        this.mouse.y = (this.canvasMouse.y / this.scaleFactor) - this.offsetY;

        this.inputer.onMouseMove();
    }

    onMouseDown(e) {
        const rect = this.mainCanvas.canvasEl.getBoundingClientRect();
        this.canvasMouse.x = (e.clientX - rect.left);
        this.canvasMouse.y = (e.clientY - rect.top);

        this.mouse.x = (this.canvasMouse.x / this.scaleFactor) - this.offsetX;
        this.mouse.y = (this.canvasMouse.y / this.scaleFactor) - this.offsetY;

        if (this.isMouseDown.left || this.isMouseDown.middle || this.isMouseDown.right) {
            return;
        }

        if (e.button === 0) this.isMouseDown.left = true;
        if (e.button === 1) this.isMouseDown.middle = true;
        if (e.button === 2) this.isMouseDown.right = true;

        this.inputer.onMouseDown(e);
    }

    onMouseUp(e) {
        if (e.button === 0) this.isMouseDown.left = false;
        if (e.button === 1) this.isMouseDown.middle = false;
        if (e.button === 2) this.isMouseDown.right = false;

        this.inputer.onMouseUp();
    }

    onMouseWheel(e) {
        this.mouseWheelX = e.deltaX;
        this.mouseWheelY = e.deltaY;

        //side scroll with mouse
        if (e.shiftKey && this.mouseWheelX === 0) {
            this.mouseWheelX = this.mouseWheelY;
            this.mouseWheelY = 0;
        }

        this.inputer.onMouseWheel();
    }

    onKeyDown(e) {
        this.isCtrlPressed = e.ctrlKey;
        this.isShiftPressed = e.shiftKey;
        this.isAltPressed = e.altKey;
        this.isMetaPressed = e.metaKey;

        if (e.code == 'Space') {
            this.isSpacePressed = true;
        }

        this.pressedKey = e.key;
        this.inputer.onKeyDown(e);
    }

    onKeyUp(e) {
        this.isCtrlPressed = e.ctrlKey;
        this.isShiftPressed = e.shiftKey;
        this.isAltPressed = e.altKey;
        this.isMetaPressed = e.metaKey;

        if (e.code === 'Space') {
            this.isSpacePressed = false;
        }

        if (this.pressedKey === e.key) {
            this.pressedKey = null;
        }
    }

    getTool(isSpecific = false) {
        if (isSpecific == false) {
            return this.tool.split("-")[0];
        } else {
            return this.tool;
        }
    }

    setTool(tool) {
        this.tool = tool;
        if (this.getTool() == "select") {
            this.setStatus("selecting");
        } else if (this.getTool() == "eraser") {
            this.setStatus("erasing");
        } else if (this.getTool() == "pixeleraser") {
            this.setStatus("pixelerasing");
        } else if (this.getTool() == "scroller") {
            this.setStatus("scrolling");
        } else {
            this.drawTool = tool;
            this.setStatus("toDraw");
        }

    }

    setStatus(s) {
        this.status = s;
    }

    setActiveEntity(_entity) {
        this.activeEntity = _entity;
    }

    setUpdate() {
        this.isUpdateNeeded = true;
    }

    resetUpdate() {
        this.isUpdateNeeded = false;
    }
}

class LayerModal {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.isShown = false;
        this.modal = null;
    }

    updateModal() {
        if (this.isShown == true) {
            this.destroyModal();
            this.spawn(this.parentBoard.layerArr);
        }
    }

    destroyModal() {
        this.isShown = false;

        if (this.modal != null) {
            this.modal.remove(); // Take it off the screen
            this.modal = null;   // clear memory
        }
    }

    spawn(instancesArray) {
        this.isShown = true;

        this.modal = document.createElement("div");
        this.modal.style.position = "fixed";
        this.modal.style.right = "0";
        this.modal.style.top = "50%";
        this.modal.style.transform = "translateY(-50%)";
        this.modal.style.zIndex = "99999";

        const modalBox = document.createElement("div");

        modalBox.style.backgroundColor = "#222";
        modalBox.style.borderLeft = "1.5px solid #555";
        modalBox.style.padding = "14px";
        modalBox.style.display = "flex";
        modalBox.style.flexDirection = "column";
        modalBox.style.gap = "11px";
        modalBox.style.fontFamily = "Arial, sans-serif";
        modalBox.style.boxShadow = "-3.5px 0 11px rgba(0,0,0,0.5)";

        const topRow = document.createElement("div");
        topRow.style.position = "relative";
        topRow.style.display = "flex";
        topRow.style.justifyContent = "center";
        topRow.style.width = "100%";

        const applyButtonStyling = (el, isSquare = false, baseColor = "#444", hoverColor = "#666") => {
            el.style.backgroundColor = baseColor;
            el.style.border = "none";
            el.style.borderRadius = "3px";
            el.style.color = "#fff";
            el.style.fontWeight = "bold";
            el.style.cursor = "pointer";
            el.style.transition = "background-color 0.1s";
            el.style.boxSizing = "border-box";

            if (isSquare) {
                el.style.width = "29px";
                el.style.height = "29px";
                el.style.padding = "0";
                el.style.display = "flex";
                el.style.justifyContent = "center";
                el.style.alignItems = "center";
                el.style.fontSize = "13px";
            } else {
                el.style.padding = "7px 21px";
            }

            el.addEventListener("pointerenter", () => el.style.backgroundColor = hoverColor);
            el.addEventListener("pointerleave", () => el.style.backgroundColor = baseColor);
            el.addEventListener("pointerdown", () => el.style.backgroundColor = "#111");
            el.addEventListener("pointerup", () => el.style.backgroundColor = hoverColor);
        };

        const newBtn = document.createElement("button");
        newBtn.innerText = "new";
        applyButtonStyling(newBtn);
        newBtn.addEventListener("pointerdown", () => {
            this.parentBoard.contracter.makeNewLayer();
            this.parentBoard.setUpdate();
            this.updateModal();
        });
        topRow.appendChild(newBtn);

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "&#10005;";
        applyButtonStyling(closeBtn, true, "#6e2f2f", "#8c3d3d");

        closeBtn.style.position = "absolute";
        closeBtn.style.top = "0";
        closeBtn.style.right = "0";

        closeBtn.addEventListener("pointerdown", (e) => {
            e.stopPropagation(); // Prevents clicking the canvas through the UI
            this.destroyModal();
        });
        topRow.appendChild(closeBtn);

        modalBox.appendChild(topRow);

        const rowsContainer = document.createElement("div");
        rowsContainer.style.display = "flex";
        rowsContainer.style.flexDirection = "column";
        rowsContainer.style.gap = "7px";

        rowsContainer.style.overflowY = "auto";
        rowsContainer.style.maxHeight = "70vh";
        rowsContainer.style.paddingRight = "7px";

        for (let _instance of instancesArray) {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.gap = "7px";
            row.style.alignItems = "center";

            const leftConfigs = [
                { icon: "&#9660;", method: "moveBelow" },
                { icon: "&#9650;", method: "moveAbove" },
            ];

            for (let config of leftConfigs) {
                const btn = document.createElement("button");
                btn.innerHTML = config.icon;
                applyButtonStyling(btn, true);

                btn.addEventListener("pointerdown", (e) => {
                    if (this.parentBoard.isButtonAllowed == true) {
                        e.stopPropagation();
                        if (typeof _instance[config.method] === "function") _instance[config.method]();
                        this.parentBoard.setUpdate();
                        this.updateModal();
                    }
                });
                row.appendChild(btn);
            }

            const longBtn = document.createElement("button");
            longBtn.innerText = _instance.name;
            if (_instance == this.parentBoard.activeLayer) {
                let baseCol = "#2b5278";
                let hoverCol = "#386ba1";
                applyButtonStyling(longBtn, false, baseCol, hoverCol);
            } else {
                applyButtonStyling(longBtn);
            }
            longBtn.style.flexGrow = "1";
            longBtn.style.textAlign = "center";

            longBtn.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
                if (this.parentBoard.status == "editing" && this.parentBoard.selectioner.selectionSet.size > 0) {
                    this.parentBoard.contracter.updateLayer(_instance, this.parentBoard.selectioner.selectionSet);
                } else {
                    this.parentBoard.contracter.updateActiveLayer(_instance);
                }
                this.parentBoard.setUpdate();
                this.updateModal();
            });
            row.appendChild(longBtn);

            const rightConfigs = [
                { icon: "&#9999;", method: "renameLayer" },
                { icon: "&#128065;", method: "toggleIsVisible", stateProp: "isVisible" },
                { icon: "&#129533;", method: "toggleIsErasable", stateProp: "isErasable" },
                { icon: "⛶", method: "toggleIsSelectable", stateProp: "isSelectable" },
                { icon: "&#128465;", method: "deleteLayer" }
            ];
            for (let config of rightConfigs) {
                const btn = document.createElement("button");
                btn.innerHTML = config.icon;

                let baseCol = "#444";
                let hoverCol = "#666";

                // If this button has a stateProp, look inside the instance to see if it's true or false
                if (config.stateProp !== undefined) {
                    const stateValue = _instance[config.stateProp];

                    if (stateValue === true) {
                        baseCol = "#2e5c31";
                        hoverCol = "#3c7a40";
                    } else if (stateValue === false) {
                        baseCol = "#6e2f2f";
                        hoverCol = "#8c3d3d";
                    }
                }

                applyButtonStyling(btn, true, baseCol, hoverCol);

                btn.addEventListener("pointerdown", (e) => {
                    if (this.parentBoard.isButtonAllowed == true) {
                        e.stopPropagation();
                        if (typeof _instance[config.method] === "function") {
                            _instance[config.method]();
                        }

                        this.parentBoard.setUpdate();
                        this.updateModal();
                    }
                });

                row.appendChild(btn);
            }
            rowsContainer.appendChild(row);
        }
        modalBox.appendChild(rowsContainer);
        this.modal.appendChild(modalBox);
        document.body.appendChild(this.modal);
    }
}

class BeaconManager {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.beaconSet = new Set();
        this.isShown = false;
        this.modal = null;
    }

    updateModal() {
        if (this.isShown == true) {
            this.destroyModal();
            this.spawn(this.beaconSet);
        }
    }

    destroyModal() {
        this.isShown = false;

        if (this.modal != null) {
            this.modal.remove();
            this.modal = null;
        }
    }

    spawn(instancesArray) {
        this.isShown = true;

        this.modal = document.createElement("div");
        this.modal.style.position = "fixed";
        this.modal.style.right = "0";
        this.modal.style.top = "50%";
        this.modal.style.transform = "translateY(-50%)";
        this.modal.style.zIndex = "99999";

        const modalBox = document.createElement("div");
        modalBox.style.backgroundColor = "#222";
        modalBox.style.borderLeft = "1.6px solid #555";
        modalBox.style.padding = "16px";
        modalBox.style.display = "flex";
        modalBox.style.flexDirection = "column";
        modalBox.style.gap = "12px";
        modalBox.style.fontFamily = "Arial, sans-serif";
        modalBox.style.boxShadow = "-4px 0 12px rgba(0,0,0,0.5)";

        const applyButtonStyling = (el) => {
            el.style.backgroundColor = "#444";
            el.style.border = "none";
            el.style.borderRadius = "3px";
            el.style.color = "#fff";
            el.style.fontWeight = "bold";
            el.style.padding = "8px 24px";
            el.style.cursor = "pointer";
            el.style.transition = "background-color 0.1s";
            el.style.boxSizing = "border-box";

            el.addEventListener("pointerenter", () => el.style.backgroundColor = "#666");
            el.addEventListener("pointerleave", () => el.style.backgroundColor = "#444");
            el.addEventListener("pointerdown", () => el.style.backgroundColor = "#111");
            el.addEventListener("pointerup", () => el.style.backgroundColor = "#666");
        };

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.justifyContent = "flex-end";
        topRow.style.width = "100%";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "&#10005;";
        applyButtonStyling(closeBtn);

        closeBtn.style.padding = "0";
        closeBtn.style.width = "32px";
        closeBtn.style.height = "32px";
        closeBtn.style.display = "flex";
        closeBtn.style.justifyContent = "center";
        closeBtn.style.alignItems = "center";
        closeBtn.style.fontSize = "14px";

        closeBtn.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            this.destroyModal();
        });
        topRow.appendChild(closeBtn);
        modalBox.appendChild(topRow);

        const rowsContainer = document.createElement("div");
        rowsContainer.style.display = "flex";
        rowsContainer.style.flexDirection = "column";
        rowsContainer.style.gap = "8px";
        rowsContainer.style.overflowY = "auto";
        rowsContainer.style.maxHeight = "70vh";
        rowsContainer.style.paddingRight = "8px";

        for (let _instance of instancesArray) {
            const btn = document.createElement("button");
            btn.innerText = _instance.content.text;
            applyButtonStyling(btn);
            btn.style.width = "100%";

            btn.addEventListener("pointerdown", (e) => {
                e.stopPropagation();
                this.parentBoard.windower.scrollTo(_instance.shape.center.x, _instance.shape.center.y);
                this.destroyModal();
            });

            rowsContainer.appendChild(btn);
        }

        modalBox.appendChild(rowsContainer);
        this.modal.appendChild(modalBox);
        document.body.appendChild(this.modal);
    }
}

class layer {
    constructor(_parentboard, _layerId) {
        this.parentBoard = _parentboard;
        this.layerId = _layerId;
        this.name = `Layer ${this.layerId}`;

        this.isVisible = true;
        this.isErasable = true;
        this.isSelectable = true;

        this.entityArr = [];

        this.tileArr = [];
        this.tileGrid = [];

        this.initTiles();
    }

    initTiles() {
        for (let x = 0; x < this.parentBoard.tileXResolution; x++) {
            this.tileGrid[x] = [];
            for (let y = 0; y < this.parentBoard.tileYResolution; y++) {
                let temptile = new tile({ x: x, y: y }, this);
                this.tileGrid[x].push(temptile);
                this.tileArr.push(temptile);
            }
        }
    }

    toJSON(isJustId = false) {
        if (isJustId == true) {
            return { idStorageType: "layer", id: this.layerId };
        }

        let fullDataClasses = ["entity"];
        let onlyRefClasses = [];
        let onlyRefKeys = [];

        const saveObj = { classType: this.constructor.name };

        const parseValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (val instanceof Set) {
                return Array.from(val).map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (fullDataClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON() : undefined;
            }
            if (onlyRefClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON(true) : undefined;
            }
            if (val.constructor.name === "Object") {
                let mirroredObj = {};
                for (let _key of Object.keys(val)) {
                    let parsedProp = parseValue(val[_key]);
                    if (parsedProp !== undefined) {
                        mirroredObj[_key] = parsedProp;
                    }
                }
                return mirroredObj;
            }
            return undefined;
        };

        for (let _key of Object.keys(this)) {
            if (onlyRefKeys.includes(_key)) {
                let finalValue = this[_key].toJSON(true);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            } else {
                let finalValue = parseValue(this[_key]);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            }
        }

        return saveObj;
    }

    fromJSON(_json) {
        const parseLoadedValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseLoadedValue(item));
            }
            if (typeof val === "object") {
                if (val.idStorageType !== undefined) {
                    return new idStorer(val.idStorageType, val.id, this.parentBoard.parentSketch);
                }
                if (val.classType !== undefined) {
                    const ClassBlueprint = ClassRegistry[val.classType];

                    let newInstance = new ClassBlueprint(this);
                    newInstance.fromJSON(val);
                    return newInstance;
                }
                let rebuiltObj = {};
                for (let k of Object.keys(val)) {
                    rebuiltObj[k] = parseLoadedValue(val[k]);
                }
                return rebuiltObj;
            }
        };

        for (let key of Object.keys(_json)) {
            if (key === "classType") continue;

            let parsedValue = parseLoadedValue(_json[key]);
            this[key] = parsedValue;
        }
    }

    toggleIsErasable() {
        this.isErasable = !this.isErasable;
    }

    toggleIsSelectable() {
        this.isSelectable = !this.isSelectable;
    }

    toggleIsVisible() {
        this.isVisible = !this.isVisible;
    }

    deleteLayer(isSilent = false) {
        if (this.parentBoard.layerArr.length > 1) {
            let currentIndex = this.parentBoard.layerArr.indexOf(this);
            this.parentBoard.evictLayer(this);
            let newIndex = Math.min(currentIndex, this.parentBoard.layerArr.length - 1);
            this.parentBoard.activeLayer = this.parentBoard.layerArr[newIndex];

            if (isSilent == false) {
                this.parentBoard.undoer.makeAction("layerdelete", { actor: this, index: currentIndex });
            }

            this.parentBoard.setUpdate();
            this.parentBoard.layerModal.updateModal();
        }

    }

    async renameLayer() {
        let promptoutput = window.prompt('enter layer name');
        if (promptoutput) {
            this.updateName(promptoutput);
        }
    }

    updateName(newName) {
        this.parentBoard.undoer.makeAction("layerrename", { actor: this, old: this.name, new: newName });
        this.name = newName;
        this.parentBoard.setUpdate();
        this.parentBoard.layerModal.updateModal();
    }

    moveAbove() {
        let currentIndex = this.parentBoard.layerArr.indexOf(this);
        setElementPosition(this.parentBoard.layerArr, this, currentIndex - 1);
        this.parentBoard.setUpdate();
        this.parentBoard.layerModal.updateModal();
    }

    moveBelow() {
        let currentIndex = this.parentBoard.layerArr.indexOf(this);
        setElementPosition(this.parentBoard.layerArr, this, currentIndex + 1);
        this.parentBoard.layerModal.updateModal();
    }

    getTileIndex(_x, _y) {
        // convert board coord into canvas coord
        _x = (_x + this.parentBoard.offsetX) * this.parentBoard.scaleFactor;
        _y = (_y + this.parentBoard.offsetY) * this.parentBoard.scaleFactor;

        // check if outside canvas
        if (_x < 0 || _y < 0 || _x >= this.parentBoard.width || _y >= this.parentBoard.height) {
            return null;
        }

        let coordx = Math.floor(_x / this.parentBoard.tileWidth);
        let coordy = Math.floor(_y / this.parentBoard.tileHeight);

        return { x: coordx, y: coordy };
    }

    getTile(_x, _y) {
        let coord = this.getTileIndex(_x, _y);
        if (coord == null) {
            return null;
        }
        let theTile = this.tileGrid[coord.x][coord.y];
        return theTile;
    }

    lodgeEntity(_entity, index = null) {
        this.entityArr.push(_entity);
        if (index != null) {
            setElementPosition(this.entityArr, _entity, index);
        }
    }

    evictEntity(entity) {
        removeFromArray(this.entityArr, entity);
    }

    updateEntityAddress() {
        for (let _entity of this.entityArr) {
            _entity.updateAddress();
        }
    }

    updateEntityModified() {
        for (let _entity of this.entityArr) {
            _entity.whenModified();
        }
    }

    showLayer(_canvas) {
        for (let _entity of this.entityArr) {
            _entity.show(_canvas);
        }
    }

    updateEntityIsInWindow() {
        for (let _entity of this.entityArr) {
            _entity.updateIsInWindow();
        }
    }
}

class tile {
    constructor(_index, _parentlayer) {
        this.index = _index;
        this.parentLayer = _parentlayer;
        this.parentBoard = this.parentLayer.parentBoard;

        this.width = this.parentBoard.width / 50;
        this.height = this.parentBoard.height / 50;

        this.pointSet = new Set();
        this.entitySet = new Set();
    }

    lodgePoint(_point) {
        this.pointSet.add(_point);
    }

    evictPoint(_point) {
        this.pointSet.delete(_point);
    }

    lodgeEntity(_entity) {
        this.entitySet.add(_entity);
    }

    evictEntity(_entity) {
        this.entitySet.delete(_entity);
    }

    // for debugging
    show() {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setLineWidth(0.5);
        this.parentBoard.mainCanvas.setColor(0, 255, 0);
        this.parentBoard.mainCanvas.rect(((this.parentBoard.tileWidth * this.index.x) / this.parentBoard.scaleFactor) - this.parentBoard.offsetX, ((this.parentBoard.tileHeight * this.index.y) / this.parentBoard.scaleFactor) - this.parentBoard.offsetY, this.parentBoard.tileWidth / this.parentBoard.scaleFactor, this.parentBoard.tileHeight / this.parentBoard.scaleFactor, "outline");
        this.parentBoard.mainCanvas.endpen();
    }
}

class Inputer {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
    }

    onMouseWheel() {
        this.parentBoard.windower.scrollBy(this.parentBoard.mouseWheelX, this.parentBoard.mouseWheelY);
        this.parentBoard.setUpdate();
    }

    onMouseDown(e) {
        if (this.parentBoard.isMouseDown.left == true) {
            if (this.parentBoard.isShiftPressed == true) {
                this.parentBoard.windower.startScroller();
            }
            else if (this.parentBoard.status == "toDraw") {
                this.parentBoard.drawer.handleStart(e);
            }
            else if (this.parentBoard.status == "drawing") { // will only happen for text,image
                this.parentBoard.setStatus("placing");
            }
            else if (this.parentBoard.status == "mobiletyping") {
                this.parentBoard.drawer.destroyFloatingInput();
                this.parentBoard.setStatus("placing");
                this.parentBoard.drawer.drawEntity();
            }
            else if (this.parentBoard.status == "selecting" || this.parentBoard.status == "extendselecting") {
                this.parentBoard.selectioner.startSelectioner();
            }
            else if (this.parentBoard.status == "erasing") {
                this.parentBoard.eraser.startEraser();
            }
            else if (this.parentBoard.status == "pixelerasing") {
                this.parentBoard.pixelEraser.startPixelEraser();
            }
            else if (this.parentBoard.status == "editing") {
                this.parentBoard.editer.startTransform();
            }
        }
        if (this.parentBoard.isMouseDown.right == true) {
            this.parentBoard.setStatus("erasing");
            this.parentBoard.eraser.startEraser();
        }
    }

    onMouseMove() {
        // live cursor update
        if (this.parentBoard.status == "erasing" || this.parentBoard.status == "pixelerasing" || this.parentBoard.status == "selecting") {
            this.parentBoard.setUpdate();
        }
        // text and image should be freely movable even when not clicked
        if (this.parentBoard.status == "drawing" || this.parentBoard.status == "placing") {
            this.parentBoard.drawer.drawEntity();
        }
        if (this.parentBoard.isMouseDown.left == true) {
            if (this.parentBoard.status == "scrolling") {
                this.parentBoard.windower.scrollBy(-1 * this.parentBoard.mouseDeltaX, -1 * this.parentBoard.mouseDeltaY);
            }
            else if (this.parentBoard.status == "selecting" || this.parentBoard.status == "extendselecting") {
                this.parentBoard.selectioner.drawSelectioner();
            }
            else if (this.parentBoard.status == "erasing") {
                this.parentBoard.eraser.erase();
            }
            else if (this.parentBoard.status == "pixelerasing") {
                this.parentBoard.pixelEraser.pixelErase();
            }
            else if (this.parentBoard.status == "editing") {
                this.parentBoard.editer.drawTransform();
            }
        }
        if (this.parentBoard.isMouseDown.right == true) {
            this.parentBoard.eraser.erase();
        }
    }

    onMouseUp() {
        if (this.parentBoard.status == "scrolling") {
            if (this.parentBoard.getTool() != "scroller") {
                this.parentBoard.windower.endScroller();
            }
        }
        else if (this.parentBoard.status == "drawing") {
            if (this.parentBoard.activeEntity.isType("text", "image") == false) {
                this.parentBoard.drawer.finishEntity();
            }
        }
        else if (this.parentBoard.status == "textediting") {
            if (this.parentBoard.drawer.hasMousedUpEditing == true) {
                this.parentBoard.drawer.finishTextEditEntity();
            } else {
                this.parentBoard.drawer.hasMousedUpEditing = true;
            }
        }
        else if (this.parentBoard.status == "mobiletextediting") {
            if (this.parentBoard.drawer.hasMousedUpEditing == true) {
                this.parentBoard.drawer.destroyFloatingInput();
                this.parentBoard.drawer.finishTextEditEntity(true);
            } else {
                this.parentBoard.drawer.hasMousedUpEditing = true;
                setTimeout(() => {
                    this.parentBoard.drawer.activeFloatingInput.selectionStart = this.parentBoard.drawer.babyEntity.content.text.length;
                    this.parentBoard.drawer.activeFloatingInput.selectionEnd = this.parentBoard.drawer.babyEntity.content.text.length;
                }, 0);
            }
        }
        else if (this.parentBoard.status == "placing") {
            this.parentBoard.drawer.finishEntity();
        }
        else if (this.parentBoard.status == "selecting" || this.parentBoard.status == "extendselecting") {
            this.parentBoard.selectioner.finishSelectioner();
            return;
        }
        else if (this.parentBoard.status == "erasing") {
            this.parentBoard.eraser.endEraser();
        }
        else if (this.parentBoard.status == "pixelerasing") {
            this.parentBoard.pixelEraser.endPixelEraser();
        }
        else if (this.parentBoard.status == "editing") {
            this.parentBoard.editer.finishTransform();
        }
    }

    onKeyDown(e) {
        if (this.parentBoard.status == "drawing") {
            if (this.parentBoard.pressedKey == "Enter" && this.parentBoard.isShiftPressed == false) {
                this.parentBoard.drawer.finishEntity();
            } else {
                this.parentBoard.drawer.drawEntity("keyboard");
            }
        }
        else if (this.parentBoard.status == "textediting") {
            if (this.parentBoard.pressedKey == "Enter" && this.parentBoard.isShiftPressed == false) {
                this.parentBoard.drawer.finishTextEditEntity();
            } else {
                this.parentBoard.drawer.drawEntity("keyboard");
            }
        }
        else if (this.parentBoard.status == "editing") {
            this.parentBoard.editer.editingShortcutHandler(e);
        }
        else if (this.parentBoard.isButtonAllowed == true) {
            this.shortcutHandler();
        }
    }

    shortcutHandler() {
        let _key = this.parentBoard.pressedKey;
        let actionperformed = true;
        if (_key == '`') {
            this.parentBoard.color = [255, 255, 255];
        } else if (_key == '1') {
            this.parentBoard.color = [255, 0, 0];
        } else if (_key == '2') {
            this.parentBoard.color = [0, 255, 0];
        } else if (_key == '3') {
            this.parentBoard.color = [0, 0, 255];
        } else if (_key == '4') {
            this.parentBoard.color = [255, 255, 0];
        } else if (_key == '5') {
            this.parentBoard.color = [255, 0, 255];
        } else if (_key == "6") {
            this.parentBoard.color = [255, 165, 0];
        } else if (_key == "7") {
            this.parentBoard.color = [138, 43, 226];
        } else if (_key == "8") {
            this.parentBoard.color = [0, 0, 0];
        } else if (this.parentBoard.isShiftPressed == true && _key.toLowerCase() == 'w') {
            let currindex = this.parentBoard.layerArr.indexOf(this.parentBoard.activeLayer);
            let newindex = Math.min(this.parentBoard.layerArr.length - 1, currindex + 1);
            let thelayer = this.parentBoard.layerArr[newindex];
            this.parentBoard.contracter.updateActiveLayer(thelayer);
        } else if (this.parentBoard.isShiftPressed == true && _key.toLowerCase() == 's') {
            let currindex = this.parentBoard.layerArr.indexOf(this.parentBoard.activeLayer);
            let newindex = Math.max(0, currindex - 1);
            let thelayer = this.parentBoard.layerArr[newindex];
            this.parentBoard.contracter.updateActiveLayer(thelayer);
        } else if (_key == 'q') {
            if (this.parentBoard.status == "erasing") {
                this.parentBoard.naturalEraserSize > 1 ? this.parentBoard.naturalEraserSize-- : 0;
                this.parentBoard.windower.updateBoardEraserVars();
            } else if (this.parentBoard.status == "pixelerasing") {
                this.parentBoard.naturalPixelEraserSize > 1 ? this.parentBoard.naturalPixelEraserSize-- : 0;
                this.parentBoard.windower.updateBoardEraserVars();
            } else if (this.parentBoard.getTool() == "text") {
                this.parentBoard.textSize > 1 ? this.parentBoard.textSize-- : 0;
            } else {
                this.parentBoard.lineWidth > 1 ? this.parentBoard.lineWidth-- : 0;
            }
        } else if (_key == 'w') {
            if (this.parentBoard.status == "erasing") {
                this.parentBoard.naturalEraserSize++;
                this.parentBoard.windower.updateBoardEraserVars();
            } else if (this.parentBoard.status == "pixelerasing") {
                this.parentBoard.naturalPixelEraserSize++;
                this.parentBoard.windower.updateBoardEraserVars();
            } else if (this.parentBoard.getTool() == "text") {
                this.parentBoard.textSize++;
            } else {
                this.parentBoard.lineWidth++;
            }
        } else if (_key == 'e') {
            this.parentBoard.windower.zoomOut();
        } else if (_key == 'r') {
            this.parentBoard.windower.setScale(1);
        } else if (_key == 't') {
            this.parentBoard.windower.zoomIn();
        } else if (_key == 'a') {
            this.parentBoard.setTool("stroke");
        } else if (_key == 's') {
            this.parentBoard.setTool("line");
        } else if (_key == 'd') {
            this.parentBoard.setTool("text");
        } else if (_key == 'f') {
            this.parentBoard.setTool("rect");
        } else if (_key == 'g') {
            this.parentBoard.setTool("ellipse");
        } else if (_key == 'h') {
            this.parentBoard.setTool("circle");
        } else if (_key == 'z') {
            this.parentBoard.undoer.undo();
        } else if (_key == 'x') {
            this.parentBoard.undoer.redo();
        } else if (_key == 'c') {
            if (this.parentBoard.isSpacePressed == true) {
                this.parentBoard.strokeStyle == "dash" ? this.parentBoard.strokeStyle = "solid" : this.parentBoard.strokeStyle = "dash";
            } else {
                this.parentBoard.getTool() == "select" ? this.parentBoard.setTool(this.parentBoard.drawTool) : this.parentBoard.setTool("select");
            }
        } else if (_key == 'v') {
            if (this.parentBoard.isSpacePressed == true) {
                this.parentBoard.shapeStyle == "outline" ? this.parentBoard.shapeStyle = "fill" : this.parentBoard.shapeStyle = "outline";
            } else {
                this.parentBoard.getTool() == "pixeleraser" ? this.parentBoard.setTool(this.parentBoard.drawTool) : this.parentBoard.setTool("pixeleraser");
            }
        } else if (_key == 'b') {
            this.parentBoard.getTool() == "eraser" ? this.parentBoard.setTool(this.parentBoard.drawTool) : this.parentBoard.setTool("eraser");
        } else if (_key == 'o') {
            this.parentBoard.parentSketch.saveNot_ely(true);
        } else if (_key == 'p') {
            this.parentBoard.parentSketch.saveNot_ely();
        } else if (_key == 'i') {
        } else if (_key == 'Escape') {
            this.parentBoard.parentSketch.goBackABoard();
        } else if (_key == ' ') {
            this.parentBoard.windower.resetViewWindow();
        } else {
            actionperformed = false;
        }
        if (actionperformed == true) {
            this.parentBoard.setUpdate();
        }
    }
}

class Looper {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
    }

    // doesnt really need to be in its own organ class could just be in shower...meh let it be
    loop() {
        if (this.parentBoard.isUpdateNeeded == true) {
            this.parentBoard.shower.updateMainCanvas();
            this.parentBoard.parentSketch.gui.updateGUI();
        }
        this.parentBoard.resetUpdate();
    }
}

class Windower {
    constructor(_parentboard) {
        this.scrollTimeout = null;
        this.parentBoard = _parentboard;
        this.prevTool = "";

    }

    updateViewCenter() {
        this.parentBoard.viewCenter.x = (this.parentBoard.viewWindow.x0 + this.parentBoard.viewWindow.x1) / 2;
        this.parentBoard.viewCenter.y = (this.parentBoard.viewWindow.y0 + this.parentBoard.viewWindow.y1) / 2;
    }

    resetViewWindow() {
        this.setScale(1);
        this.scrollBy(-1 * this.parentBoard.viewWindow.x0, -1 * this.parentBoard.viewWindow.y0);
    }

    startScroller(isButton = false) {
        this.prevTool = this.parentBoard.tool;
        if (isButton == true) {
            this.parentBoard.setTool("scroller");
        } else {
            this.parentBoard.setStatus("scrolling");
        }
    }

    endScroller() {
        this.parentBoard.setTool(this.prevTool);
    }

    scrollBy(dx, dy) {
        let oldWindow = { ...this.parentBoard.viewWindow }; // for correcting sticky entities

        this.scrollSwitch = false;
        this.parentBoard.viewWindow.x0 += dx;
        this.parentBoard.viewWindow.x1 += dx;
        this.parentBoard.viewWindow.y0 += dy;
        this.parentBoard.viewWindow.y1 += dy;

        this.correctSticky(oldWindow, this.parentBoard.viewWindow);

        this.updateViewCenter();
        this.updateBoardViewVars();

        this.parentBoard.updateAllEntityIsInWindow();

        if (this.scrollTimeout !== null) {
            clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
            for (let _entity of this.parentBoard.stickySet) {
                _entity.whenModified();
            }
            this.parentBoard.updateAllEntityAddress();
            this.scrollTimeout = null;
        }, 100);
    }

    scrollTo(x, y) {
        let oldWindow = { ...this.parentBoard.viewWindow };

        let thewidth = this.parentBoard.viewWindow.x1 - this.parentBoard.viewWindow.x0;
        let theheight = this.parentBoard.viewWindow.y1 - this.parentBoard.viewWindow.y0;

        this.parentBoard.viewWindow.x0 = x - thewidth / 2;
        this.parentBoard.viewWindow.x1 = x + thewidth / 2;
        this.parentBoard.viewWindow.y0 = y - theheight / 2;
        this.parentBoard.viewWindow.y1 = y + theheight / 2;

        this.correctSticky(oldWindow, this.parentBoard.viewWindow);

        this.updateViewCenter();
        this.updateBoardViewVars();

        for (let _entity of this.parentBoard.stickySet) {
            _entity.whenModified();
        }
        this.parentBoard.updateAllEntityIsInWindow();
        this.parentBoard.updateAllEntityAddress();
    }

    zoomOut() {
        let step = this.parentBoard.scaleFactor * 0.3;
        if (this.parentBoard.scaleFactor > 0.2) {
            let newScale = Math.max(0.2, this.parentBoard.scaleFactor - step);
            this.setScale(newScale);
        }
    }
    zoomIn() {
        let step = this.parentBoard.scaleFactor * 0.3;
        if (this.parentBoard.scaleFactor < 5) {
            let newScale = Math.min(5, this.parentBoard.scaleFactor + step);
            this.setScale(newScale);
        }
    }

    setScale(s, isFinal = true) {
        let oldWindow = { ...this.parentBoard.viewWindow };

        let newWidth = this.parentBoard.width / s;
        let newHeight = this.parentBoard.height / s;
        this.parentBoard.viewWindow = {
            x0: this.parentBoard.viewCenter.x - newWidth / 2,
            y0: this.parentBoard.viewCenter.y - newHeight / 2,
            x1: this.parentBoard.viewCenter.x + newWidth / 2,
            y1: this.parentBoard.viewCenter.y + newHeight / 2,
        };

        this.correctSticky(oldWindow, this.parentBoard.viewWindow);

        this.updateBoardViewVars();
        this.updateBoardEraserVars();

        this.parentBoard.updateAllEntityIsInWindow();

        this.parentBoard.parentSketch.gui.zoomSlider.style.setProperty('--slider-fill', `${100 * ((s - 0.2) / (5 - 0.2))}%`);

        if (isFinal == true) {
            for (let _entity of this.parentBoard.stickySet) {
                _entity.whenModified();
            }
            this.parentBoard.updateAllEntityAddress();
        }
    }

    updateBoardViewVars() {
        this.parentBoard.offsetX = -1 * this.parentBoard.viewWindow.x0;
        this.parentBoard.offsetY = -1 * this.parentBoard.viewWindow.y0;

        this.parentBoard.scaleFactor = this.parentBoard.width / (this.parentBoard.viewWindow.x1 - this.parentBoard.viewWindow.x0);

        this.parentBoard.setUpdate();
    }

    // to maintain same eraser size for all scales
    updateBoardEraserVars() {
        this.parentBoard.eraserSize = this.parentBoard.naturalEraserSize / this.parentBoard.scaleFactor;
        this.parentBoard.pixelEraserSize = this.parentBoard.naturalPixelEraserSize / this.parentBoard.scaleFactor;

        this.parentBoard.eraserTileSpanX = Math.ceil(this.parentBoard.eraserSize / this.parentBoard.tileWidth);
        this.parentBoard.eraserTileSpanY = Math.ceil(this.parentBoard.eraserSize / this.parentBoard.tileHeight);
        this.parentBoard.pixelEraserTileSpanX = Math.ceil(this.parentBoard.pixelEraserSize / this.parentBoard.tileWidth);
        this.parentBoard.pixelEraserTileSpanY = Math.ceil(this.parentBoard.pixelEraserSize / this.parentBoard.tileHeight);

    }

    // scale inverse to current scale...translate to coord mapped from old to new window
    correctSticky(oldWindow, newWindow) {
        for (let _entity of this.parentBoard.stickySet) {
            let newCenterX = remap(_entity.shape.center.x, oldWindow.x0, oldWindow.x1, newWindow.x0, newWindow.x1);
            let newCenterY = remap(_entity.shape.center.y, oldWindow.y0, oldWindow.y1, newWindow.y0, newWindow.y1);
            let translateX = newCenterX - _entity.shape.center.x;
            let translateY = newCenterY - _entity.shape.center.y;

            let scaleFactor = (newWindow.x1 - newWindow.x0) / (oldWindow.x1 - oldWindow.x0);

            _entity.setPointMemory();
            _entity.scale(_entity.shape.center.x, _entity.shape.center.y, scaleFactor, scaleFactor);
            _entity.resetPointMemory();
            _entity.translate(translateX, translateY);
        }
    }
}

class Contracter {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
    }

    updateActiveLayer(_layer) {
        this.parentBoard.activeLayer = _layer;
        this.parentBoard.setUpdate();
        this.parentBoard.layerModal.updateModal();
    }

    addLayer(_layer, index = null) {
        this.parentBoard.layerArr.push(_layer);
        if (index != null) {
            setElementPosition(this.parentBoard.layerArr, _layer, index);
        }
        _layer.updateEntityAddress();

        this.parentBoard.setUpdate();
        this.parentBoard.layerModal.updateModal();
    }

    makeNewLayer(isSilent = false) {
        let newLayer = new layer(this.parentBoard, this.parentBoard.parentSketch.currentLayerId);
        this.parentBoard.parentSketch.currentLayerId++;
        this.parentBoard.activeLayer = newLayer;
        this.parentBoard.layerArr.push(newLayer);
        this.parentBoard.setUpdate();

        if (isSilent == false) {
            this.parentBoard.undoer.makeAction("layercreate", { actor: newLayer });
        }
    }

    updateLayer(_layer, _entityArr) {
        let undoDataArr = [];
        for (let _entity of _entityArr) {
            undoDataArr.push({ actor: _entity, old: _entity.parentLayer, new: _layer });
        }
        for (let _entity of _entityArr) {
            _entity.leaveLayer();
            _entity.joinLayer(_layer);
        }
        if (undoDataArr.some(entry => entry.old != entry.new)) {
            this.parentBoard.undoer.makeAction("layerchange", undoDataArr);
        }

        this.parentBoard.editer.resetTrackerVars();
        this.parentBoard.selectioner.quitSelections();
    }
}

class Drawer {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.babyEntity = null;

        this.undoDataArr = [];

        this.activeFloatingInput = null;

        this.hasMousedUpEditing = false; // to see if mouseup should finishtextedit
    }

    makeNewEntity(_parentLayer, _type) {
        let newEntity = new entity(_parentLayer, _type, this.parentBoard.parentSketch.currentEntityId);
        this.parentBoard.parentSketch.currentEntityId++;
        return newEntity;
    }

    isPointInsidePath(path, pointToCheck) {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.resetTransform();
        let result = this.parentBoard.mainCanvas.ctx.isPointInPath(path, pointToCheck.x, pointToCheck.y);
        this.parentBoard.mainCanvas.endpen();
        return result;
    }

    // to enter boards and edit text
    clickedEntities() {
        let temparr = [];

        for (let _layer of this.parentBoard.layerArr) {
            let theTile = _layer.getTile(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            for (let _entity of theTile.entitySet) {
                if (_entity.isType("stroke", "line") == false) {
                    let point = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };
                    if (this.isPointInsidePath(_entity.shape.outlinePath, point)) {
                        temparr.push(_entity);
                    }
                }
            }
        }

        if (temparr.length == 0) {
            return null;
        } else {
            return temparr;
        }
    }

    // to check if clicked on entity before starting new one
    handleStart(e) {
        let entities = this.clickedEntities();
        if (entities != null) {
            for (let _entity of entities) {
                if (_entity.isSpecificType("rect-board")) {
                    this.parentBoard.parentSketch.updateActiveBoard(_entity.content.boardRef);
                    return;
                } else if (_entity.isType("text")) {
                    if (e.pointerType == "touch") {
                        this.editTextEntity(_entity, true);
                    } else {
                        this.editTextEntity(_entity);
                    }
                    return;
                }
            }
        }
        if (e.pointerType === 'touch') {
            e.preventDefault();
            this.startEntity(this.parentBoard.tool, null, true);
            return;
        }
        this.startEntity();
    }

    editTextEntity(_entity, isTouch = false) {
        this.hasMousedUpEditing = false;

        this.babyEntity = _entity;
        this.parentBoard.setActiveEntity(this.babyEntity);
        this.babyEntity.editText();
        this.undoDataArr.push({
            actor: _entity,
            old: _entity.content.text,
            new: 0
        });
        this.parentBoard.isButtonAllowed = false;
        this.parentBoard.setStatus("textediting");
        if (isTouch == true) {
            this.parentBoard.setStatus("mobiletextediting");
            this.createFloatingInput(this.parentBoard.mainCanvas.canvasEl, this.parentBoard.mouse.x, this.parentBoard.mouse.y, rgbToHex(this.parentBoard.color));
            this.activeFloatingInput.value = this.babyEntity.content.text;
        }
        this.parentBoard.setUpdate();
    }

    makeManyArrows() {
        if (this.parentBoard.selectioner.selectionSet.size > 1) {
            let temparr = Array.from(this.parentBoard.selectioner.selectionSet);
            if (temparr.every(_ent => _ent.isType("stroke") == false)) {
                this.parentBoard.editer.resetTrackerVars();
                this.parentBoard.selectioner.quitSelections();

                let undoDataArr = [];
                for (let i = 0; i < temparr.length - 1; i++) {
                    this.makeArrowEntity(temparr[i], temparr[i + 1]);
                    undoDataArr.push({ actor: this.babyEntity, layer: temparr[i].parentLayer });
                }

                this.parentBoard.undoer.makeAction("created", undoDataArr);

                this.babyEntity = null;
                this.parentBoard.setUpdate();
            }
        }
    }

    makeArrowEntity(_source, _target) {
        this.babyEntity = this.makeNewEntity(_source.parentLayer, "arrow");
        this.babyEntity.makeArrow(_source, _target);
    }

    createFloatingInput(canvasEl, x, y, textColor) {
        if (this.activeFloatingInput) {
            this.destroyFloatingInput();
        }
        this.babyEntity.tags.isTouchTyping = true;

        const rect = canvasEl.getBoundingClientRect();
        const absoluteX = rect.left + window.scrollX + x;
        const absoluteY = rect.top + window.scrollY + y;

        const input = document.createElement('textarea');
        input.style.resize = 'none';
        input.style.overflow = 'hidden';
        input.style.whiteSpace = 'pre';

        input.style.position = 'absolute';
        input.style.left = `${absoluteX}px`;
        input.style.top = `${absoluteY - 10}px`;
        input.style.fontSize = '20px';
        input.style.fontFamily = 'Arial';
        input.style.color = textColor;
        input.style.background = 'transparent';
        input.style.border = '1px dashed #888';
        input.style.outline = 'none';
        input.style.padding = '0';
        input.style.margin = '0';
        input.style.zIndex = '1000';

        // make text area resize as u type
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.width = 'auto';

            input.style.height = `${input.scrollHeight}px`;
            input.style.width = `${input.scrollWidth}px`;
        });

        // Trigger it once manually to ensure the box starts at the exact height of your font size
        setTimeout(() => {
            input.style.height = `${input.scrollHeight}px`;
            input.style.width = `${input.scrollWidth}px`;
        }, 0);

        let isFinished = false;

        const finishTyping = () => {
            if (isFinished) return; // Prevent the double-fire bug!
            isFinished = true;

            const finalText = input.value;
            this.destroyFloatingInput();

            this.babyEntity.content.text = finalText;
            this.babyEntity.content.cursorPos = finalText.length;
            this.parentBoard.setUpdate();
        };

        input.addEventListener('blur', () => {
            finishTyping();
        });

        document.body.appendChild(input);
        input.focus();
        this.activeFloatingInput = input;
    }

    destroyFloatingInput() {
        if (this.activeFloatingInput) {
            this.babyEntity.tags.isTouchTyping = false;
            // 1. Save a temporary reference to the element
            const el = this.activeFloatingInput;
            // 2. IMMEDIATELY set your class variable to null (Before the browser can react!)
            this.activeFloatingInput = null;
            // 3. Now safely remove it. 
            // If this triggers a 'blur' event, your code won't care because activeFloatingInput is already null!
            el.remove();
        }
    }

    async startEntity(_type = this.parentBoard.tool, _content = null, isTouch = false) {
        this.babyEntity = this.makeNewEntity(this.parentBoard.activeLayer, _type);
        this.parentBoard.setActiveEntity(this.babyEntity);
        this.babyEntity.start();
        this.parentBoard.setStatus("drawing");

        this.parentBoard.isButtonAllowed = false;

        if (this.babyEntity.isType("text")) {
            if (isTouch == true) {
                this.parentBoard.setStatus("mobiletyping");
                this.createFloatingInput(this.parentBoard.mainCanvas.canvasEl, this.parentBoard.mouse.x, this.parentBoard.mouse.y, rgbToHex(this.parentBoard.color));
            }
            if (_content != null) { // if pasted
                this.babyEntity.content.text = _content;
                this.babyEntity.content.cursorPos = _content.length;
            }
        }
        if (this.babyEntity.isType("image")) {
            this.parentBoard.isMouseDown.left = false;
            if (_content != null) { // if pasted
                await this.babyEntity.drawImageContent(_content);
            } else {
                await this.babyEntity.drawImageContent();
            }
        }

        this.parentBoard.setUpdate();
    }

    async drawEntity(source = "mouse") {
        if (this.babyEntity == null) return;

        if (source == "keyboard") {
            await this.babyEntity.drawTextContent();
            this.parentBoard.setUpdate();
        } else {
            await this.babyEntity.draw();
            this.parentBoard.setUpdate();
        }
    }

    finishEntity() {
        if (this.babyEntity == null) {
            this.parentBoard.setStatus("toDraw");
            return;
        }

        if (this.babyEntity.isType("text")) {
            if (this.babyEntity.content.text == "") {
                this.abortEntity();
                return;
            }
        }
        this.babyEntity.finish();

        this.parentBoard.undoer.makeAction("created", [{ actor: this.babyEntity, layer: this.parentBoard.activeLayer }]);

        this.babyEntity = null; // prevent memory leaks
        this.parentBoard.isButtonAllowed = true;
        this.parentBoard.setActiveEntity(0);
        this.parentBoard.setStatus("toDraw");
        this.parentBoard.setUpdate();
    }

    finishTextEditEntity() {
        if (this.babyEntity.content.text == "") {
            return;
        }

        this.babyEntity.finishTextEdit();

        this.undoDataArr[0].new = this.babyEntity.content.text;

        this.parentBoard.undoer.makeAction("textedited", this.undoDataArr);

        this.undoDataArr = [];
        this.hasMousedUpEditing = false;

        this.babyEntity = null; // prevent memory leaks
        this.parentBoard.isButtonAllowed = true;
        this.parentBoard.setActiveEntity(0);
        this.parentBoard.setStatus("toDraw");
        this.parentBoard.setUpdate();
    }

    abortEntity() {
        if (this.babyEntity) {
            this.babyEntity.leaveLayer();
            this.babyEntity = null;
        }
        this.parentBoard.isButtonAllowed = true;
        this.parentBoard.setActiveEntity(0);
        this.parentBoard.setStatus("toDraw");
        this.parentBoard.setUpdate();
    }
}

class Shower {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
    }
    updateMainCanvas() {
        this.parentBoard.mainCanvas.resetTransform();
        this.parentBoard.mainCanvas.background(this.parentBoard.currentBgColor[0], this.parentBoard.currentBgColor[1], this.parentBoard.currentBgColor[2]);

        // always scale first then translate
        this.parentBoard.mainCanvas.scale(this.parentBoard.scaleFactor);
        this.parentBoard.mainCanvas.translate(this.parentBoard.offsetX, this.parentBoard.offsetY);

        // show grids guides
        if (this.parentBoard.isShowGrid == true || this.parentBoard.isShowGuide == true) {
            this.showGuideAndGrid();
        }
        // show entities
        this.showAllLayer();

        // show cursors
        if (this.parentBoard.status == "erasing") {
            this.parentBoard.eraser.showEraser();
        }
        if (this.parentBoard.status == "pixelerasing") {
            this.parentBoard.pixelEraser.showPixelEraser();
        }
        if (this.parentBoard.status == "selecting") {
            this.parentBoard.selectioner.showSelectionCursor();
        }
        if (this.parentBoard.status == "selecting" || this.parentBoard.status == "extendselecting") {
            this.parentBoard.selectioner.showSelectioner();
        }
    }

    showAllLayer(_canvas = this.parentBoard.mainCanvas) {
        for (let _layer of this.parentBoard.layerArr) {
            if (_layer.isVisible == true) {
                _layer.showLayer(_canvas);
            }
        }
    }

    showGuideAndGrid() {
        function getMultiples(start, end, step) {
            let multiples = [];
            let firstMultiple = Math.ceil(start / step) * step;
            for (let i = firstMultiple; i <= end; i += step) {
                multiples.push(i);
            }
            return multiples;
        }
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setTextSize(15 / this.parentBoard.scaleFactor);
        this.parentBoard.mainCanvas.setColor(255, 255, 255);
        this.parentBoard.mainCanvas.setLineWidth(1 / this.parentBoard.scaleFactor);

        // along x and vert lines
        let start = this.parentBoard.viewWindow.x0;
        let end = this.parentBoard.viewWindow.x1;
        let visibleRange = end - start;
        let targetLabels = 16;
        let rawStep = visibleRange / targetLabels;
        let step = Math.max(100, Math.ceil(rawStep / 100) * 100);
        let guideNumbers = getMultiples(start, end, step);
        for (let _num of guideNumbers) {
            if (this.parentBoard.isShowGuide == true) {
                if (this.parentBoard.scaleFactor * (_num + this.parentBoard.offsetX) > 20) {
                    this.parentBoard.mainCanvas.text(`${_num / 100}`, _num, (0 / this.parentBoard.scaleFactor) - this.parentBoard.offsetY);
                }
            }
            if (this.parentBoard.isShowGrid == true) {
                this.parentBoard.mainCanvas.line(_num, this.parentBoard.viewWindow.y0, _num, this.parentBoard.viewWindow.y1);
            }
        }

        // along y and hor lines
        start = this.parentBoard.viewWindow.y0;
        end = this.parentBoard.viewWindow.y1;
        visibleRange = end - start;
        targetLabels = 10;
        rawStep = visibleRange / targetLabels;
        step = Math.max(100, Math.ceil(rawStep / 100) * 100);
        guideNumbers = getMultiples(start, end, step);
        for (let _num of guideNumbers) {
            if (this.parentBoard.isShowGuide == true) {
                if (this.parentBoard.scaleFactor * (_num + this.parentBoard.offsetY) > 20) {
                    this.parentBoard.mainCanvas.text(`${_num / 100}`, (0 / this.parentBoard.scaleFactor) - this.parentBoard.offsetX + 5, _num);
                }
            }
            if (this.parentBoard.isShowGrid == true) {
                this.parentBoard.mainCanvas.line(this.parentBoard.viewWindow.x0, _num, this.parentBoard.viewWindow.x1, _num);
            }
        }

        this.parentBoard.mainCanvas.endpen();
    }
}

class Eraser {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;

        this.currentErasedEntitySet = new Set();
        this.undoDataArr = [];
    }

    startEraser() {
        this.parentBoard.isButtonAllowed = false;
        this.erase();
        this.parentBoard.setUpdate();
    }

    erase() {
        let standingIndex = this.parentBoard.activeLayer.getTileIndex(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
        this.parentBoard.mainCanvas.ctx.save();
        this.parentBoard.mainCanvas.ctx.resetTransform();
        for (let _layer of this.parentBoard.layerArr) {
            if (_layer.isErasable == true && _layer.isVisible == true) {
                if (this.parentBoard.eraserSize > 12) { // if eraser big enough then dist will suffice
                    for (let x = Math.max(0, standingIndex.x - Math.ceil(this.parentBoard.eraserTileSpanX / 2)); x < Math.min(this.parentBoard.activeLayer.tileGrid.length, standingIndex.x + Math.ceil(this.parentBoard.eraserTileSpanX / 2) + 1); x++) {
                        for (let y = Math.max(0, standingIndex.y - Math.ceil(this.parentBoard.eraserTileSpanY / 2)); y < Math.min(this.parentBoard.activeLayer.tileGrid[0].length, standingIndex.y + Math.ceil(this.parentBoard.eraserTileSpanY / 2) + 1); y++) {
                            let theTile = _layer.tileGrid[x][y];
                            for (let _point of theTile.pointSet) {
                                if (_point.isPixelErased == false) {
                                    if (_point.distance(this.parentBoard.mouse.x, this.parentBoard.mouse.y) < (_point.parentEntity.styling.lineWidth * this.parentBoard.scaleFactor) / 2 + this.parentBoard.eraserSize / 2) {
                                        this.eraseEntity(_point.parentEntity);
                                    }
                                }
                            }
                        }
                    }
                } else { // if eraser small enough to slip between verts need to check with pixels
                    for (let x = Math.max(0, standingIndex.x - (Math.ceil(this.parentBoard.eraserTileSpanX / 2 * this.parentBoard.scaleFactor))); x < Math.min(this.parentBoard.activeLayer.tileGrid.length, standingIndex.x + (Math.ceil(this.parentBoard.eraserTileSpanX / 2 * this.parentBoard.scaleFactor)) + 1); x++) {
                        for (let y = Math.max(0, standingIndex.y - (Math.ceil(this.parentBoard.eraserTileSpanY / 2 * this.parentBoard.scaleFactor))); y < Math.min(this.parentBoard.activeLayer.tileGrid[0].length, standingIndex.y + (Math.ceil(this.parentBoard.eraserTileSpanY / 2 * this.parentBoard.scaleFactor)) + 1); y++) {
                            let theTile = _layer.tileGrid[x][y];
                            for (let _point of theTile.pointSet) {
                                if (_point.isPixelErased == false) {
                                    let point = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };
                                    if (this.isPointInStroke(_point.parentEntity.shape.outlinePath, point)) {
                                        this.eraseEntity(_point.parentEntity);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        this.parentBoard.mainCanvas.ctx.restore();
        this.parentBoard.setUpdate();
    }

    isPointInStroke(path, pointToCheck) {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.resetTransform();
        this.parentBoard.mainCanvas.ctx.lineWidth = this.parentBoard.eraserSize;
        let result = this.parentBoard.mainCanvas.ctx.isPointInStroke(path, pointToCheck.x, pointToCheck.y);
        this.parentBoard.mainCanvas.endpen();
        return result;
    }

    eraseEntity(_entity) {
        this.currentErasedEntitySet.add(_entity);
        this.undoDataArr.push({
            actor: _entity,
            layer: _entity.parentLayer,
            index: _entity.parentLayer.entityArr.indexOf(_entity)
        });
        _entity.leaveLayer();
    }

    showEraser() {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setColor(255, 182, 193);
        this.parentBoard.mainCanvas.circle(this.parentBoard.mouse.x, this.parentBoard.mouse.y, this.parentBoard.eraserSize / 2, undefined, undefined, "fill");
        this.parentBoard.mainCanvas.endpen();
    }

    endEraser() {
        if (this.undoDataArr.length > 0) {
            this.parentBoard.undoer.makeAction("erased", this.undoDataArr);
        }

        this.currentErasedEntitySet = new Set();
        this.undoDataArr = [];

        this.parentBoard.isButtonAllowed = true;


        if (this.parentBoard.getTool() == "eraser") {
            this.parentBoard.setStatus("erasing");
        } else if (this.parentBoard.getTool() == "select") {
            this.parentBoard.setStatus("selecting");
        } else {
            this.parentBoard.setStatus("toDraw");
        }
        this.parentBoard.setUpdate();

    }
}

class PixelEraser {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.currentPesID = 0;

        this.currentPes = [];

        this.currentPixelErasedEntitySet = new Set();

        this.undoDataArr = [];
    }

    startPixelEraser() {
        this.parentBoard.isButtonAllowed = false;
        this.pixelErase();
        this.parentBoard.setUpdate();
    }

    pixelErase() {
        let obj = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };
        this.currentPes.push(obj);

        let standingTile = this.parentBoard.activeLayer.getTile(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
        let standingIndex = standingTile.index;
        for (let _layer of this.parentBoard.layerArr) {
            if (_layer.isErasable == true && _layer.isVisible == true) {
                for (let x = Math.max(0, standingIndex.x - Math.ceil(this.parentBoard.pixelEraserTileSpanX / 2)); x < Math.min(this.parentBoard.activeLayer.tileGrid.length, standingIndex.x + Math.ceil(this.parentBoard.pixelEraserTileSpanX / 2) + 1); x++) {
                    for (let y = Math.max(0, standingIndex.y - Math.ceil(this.parentBoard.pixelEraserTileSpanY / 2)); y < Math.min(this.parentBoard.activeLayer.tileGrid[0].length, standingIndex.y + Math.ceil(this.parentBoard.pixelEraserTileSpanY / 2) + 1); y++) {
                        let theTile = _layer.tileGrid[x][y];
                        for (let _point of theTile.pointSet) {
                            if (_point.distance(this.parentBoard.mouse.x, this.parentBoard.mouse.y) < _point.parentEntity.styling.lineWidth / 2 + this.parentBoard.pixelEraserSize / 2) {
                                _point.isPixelErased = true;
                                this.markEntity(_point.parentEntity);
                            }
                        }
                        // handle interiors
                        for (let _entity of theTile.entitySet) {
                            if (_entity.isType("stroke", "line") == false) {
                                if (this.currentPixelErasedEntitySet.has(_entity) == false) {
                                    let point = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };
                                    if (this.isPointInsidePath(_entity.shape.outlinePath, point)) {
                                        this.markEntity(_entity);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        this.parentBoard.setUpdate();
    }

    markEntity(_entity) {
        this.undoDataArr.push({
            actor: _entity,
            pesId: this.currentPesID
        });

        this.currentPixelErasedEntitySet.add(_entity);
    }

    isPointInsidePath(path, pointToCheck) {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.resetTransform();
        let result = this.parentBoard.mainCanvas.ctx.isPointInPath(path, pointToCheck.x, pointToCheck.y);
        this.parentBoard.mainCanvas.endpen();
        return result;
    }

    showPixelEraser() {
        if (this.currentPes.length > 0) {
            this.parentBoard.mainCanvas.startpen();
            this.parentBoard.mainCanvas.setLineWidth(this.parentBoard.pixelEraserSize);
            this.parentBoard.mainCanvas.setColor(this.parentBoard.currentBgColor[0], this.parentBoard.currentBgColor[1], this.parentBoard.currentBgColor[2]);
            this.parentBoard.mainCanvas.stroke(this.currentPes);
            this.parentBoard.mainCanvas.endpen();
        }

        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setColor(255, 0, 0);
        this.parentBoard.mainCanvas.circle(this.parentBoard.mouse.x, this.parentBoard.mouse.y, this.parentBoard.pixelEraserSize / 2, undefined, undefined, "fill");
        this.parentBoard.mainCanvas.endpen();
    }

    endPixelEraser() {
        if (this.undoDataArr.length > 0) {
            this.parentBoard.undoer.makeAction("pixelerased", this.undoDataArr);
        }

        for (let _entity of this.currentPixelErasedEntitySet) {
            let p = new pixelEraseStroke(_entity, this.currentPesID, this.parentBoard.pixelEraserSize, this.currentPes);
            _entity.shape.pesArr.push(p);
        }

        this.currentPesID++;
        this.currentPes = [];
        this.currentPixelErasedEntitySet = new Set();
        this.undoDataArr = [];

        this.parentBoard.isButtonAllowed = true;

        if (this.parentBoard.getTool() == "pixeleraser") {
            this.parentBoard.setStatus("pixelerasing");
        } else if (this.parentBoard.getTool() == "eraser") {
            this.parentBoard.setStatus("erasing");
        } else if (this.parentBoard.getTool() == "select") {
            this.parentBoard.setStatus("selecting");
        } else {
            this.parentBoard.setStatus("toDraw");
        }
        this.parentBoard.setUpdate();
    }
}

class Selectioner {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.d1 = { x: 0, y: 0 };
        this.d2 = { x: 0, y: 0 };

        this.selectionSet = new Set();

        this.extendingMode = "add";

        this.isHighlightActive = false;

    }

    startSelectioner() {
        this.parentBoard.isButtonAllowed = false;
        this.d1 = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };
        this.d2 = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };

        this.parentBoard.setUpdate();

    }

    drawSelectioner() {
        this.d2 = { x: this.parentBoard.mouse.x, y: this.parentBoard.mouse.y };

        this.parentBoard.setUpdate();
    }

    finishSelectioner() {
        this.makeSelections();
        this.extendingMode = "add";

        if (this.selectionSet.size == 0) {
            this.quitSelections();
        } else {
            this.resetSelectioner();
            this.startEditing();
        }
        this.parentBoard.setUpdate();
    }

    showSelectioner() {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setColor(255, 0, 0);
        this.parentBoard.mainCanvas.setDashLine(10 / this.parentBoard.scaleFactor, 10 / this.parentBoard.scaleFactor);
        this.parentBoard.mainCanvas.setLineWidth(2 / this.parentBoard.scaleFactor);
        this.parentBoard.mainCanvas.rect(this.d1.x, this.d1.y, this.d2.x - this.d1.x, this.d2.y - this.d1.y);
        this.parentBoard.mainCanvas.endpen();
    }

    showSelectionCursor() {
        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setColor(255, 182, 193);
        this.parentBoard.mainCanvas.setLineWidth(2 / this.parentBoard.scaleFactor);
        this.parentBoard.mainCanvas.line(this.parentBoard.mouse.x - (20 / this.parentBoard.scaleFactor), this.parentBoard.mouse.y, this.parentBoard.mouse.x + (20 / this.parentBoard.scaleFactor), this.parentBoard.mouse.y);
        this.parentBoard.mainCanvas.line(this.parentBoard.mouse.x, this.parentBoard.mouse.y - (20 / this.parentBoard.scaleFactor), this.parentBoard.mouse.x, this.parentBoard.mouse.y + (20 / this.parentBoard.scaleFactor));
        this.parentBoard.mainCanvas.endpen();
    }

    quitSelections() {
        this.clearSelections();
        this.resetSelectioner();

        this.parentBoard.isButtonAllowed = true;

        this.parentBoard.setStatus("selecting");
        this.parentBoard.setUpdate();
    }

    resetSelectioner() {
        this.d1 = { x: 0, y: 0 };
        this.d2 = { x: 0, y: 0 };
    }

    clearSelections() {
        for (let _entity of this.selectionSet) {
            _entity.tags.isSelected = false;
        }
        this.selectionSet = new Set();
    }

    makeSelections() {
        let d1index = this.parentBoard.activeLayer.getTile(this.d1.x, this.d1.y).index;
        let d2index = this.parentBoard.activeLayer.getTile(this.d2.x, this.d2.y).index;

        let startIndexX = Math.min(d1index.x, d2index.x);
        let endIndexX = Math.max(d1index.x, d2index.x);
        let startIndexY = Math.min(d1index.y, d2index.y);
        let endIndexY = Math.max(d1index.y, d2index.y);

        for (let _layer of this.parentBoard.layerArr) {
            if (_layer.isSelectable == true && _layer.isVisible == true) {
                for (let x = startIndexX; x < endIndexX + 1; x++) {
                    for (let y = startIndexY; y < endIndexY + 1; y++) {
                        let thetile = _layer.tileGrid[x][y];

                        let isBoundary =
                            x === startIndexX || x === endIndexX ||
                            y === startIndexY || y === endIndexY;


                        if (isBoundary == false) { // if in the interior then just push it, no need for boundary checks
                            for (let _point of thetile.pointSet) {
                                if (_point.isPixelErased == false) {
                                    if (this.extendingMode == "remove") {
                                        this.removeFromSelection(_point.parentEntity);
                                    } else {
                                        this.addToSelection(_point.parentEntity);
                                    }
                                }
                            }
                        } else {
                            for (let _point of thetile.pointSet) {
                                if (_point.isPixelErased == false && this.selectionSet.has(_point.parentEntity) == false) {
                                    const minX = Math.min(this.d1.x, this.d2.x);
                                    const maxX = Math.max(this.d1.x, this.d2.x);
                                    const minY = Math.min(this.d1.y, this.d2.y);
                                    const maxY = Math.max(this.d1.y, this.d2.y);

                                    if (_point.x >= minX && _point.x <= maxX && _point.y >= minY && _point.y <= maxY) {
                                        if (this.extendingMode == "remove") {
                                            this.removeFromSelection(_point.parentEntity);
                                        } else {
                                            this.addToSelection(_point.parentEntity);
                                        }
                                    }
                                }
                            }
                        }

                    }
                }
            }
        }

        for (let _entity of this.selectionSet) {
            _entity.tags.isSelected = true;
        }
    }

    highlightSelection() {
        setTimeout(() => {
            if (this.selectionSet.size > 0) {
                this.isHighlightActive = true;
                const newcolor = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)];
                this.parentBoard.selectionColor = newcolor;
                this.parentBoard.setUpdate();
                this.highlightSelection();
            } else {
                this.isHighlightActive = false;
            }
        }, 300);
    }

    startEditing() {
        this.parentBoard.setStatus("editing");
        this.parentBoard.editer.saveOldStylings();
        if (this.isHighlightActive == false) {
            this.highlightSelection();
        }
    }

    addToSelection(_entity) {
        this.selectionSet.add(_entity);
        _entity.tags.isSelected = true;
    }
    removeFromSelection(_entity) {
        this.selectionSet.delete(_entity);
        _entity.tags.isSelected = false;
    }
}

class Editer {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.isTransformStarted = false;
        this.transformType = "translate";
        this.transformCenter = null;

        this.isStyleEdited = false;

        this.deltas = {
            scaleFactorX: 1,
            scaleFactorY: 1,
            rot: 0,
            dx: 0,
            dy: 0,
        };

        this.undoDataArr = [];
    }

    // for undoing styling edits...runs at beginning always
    saveOldStylings() {
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            this.undoDataArr.push({
                actor: _entity,
                old: structuredClone(_entity.styling),
                new: 0
            });
        }
    }

    startTransform() {
        let isAllArrow = Array.from(this.parentBoard.selectioner.selectionSet).every(_ent => _ent.isType("arrow") == true);
        if (isAllArrow == true) return;

        if (this.isStyleEdited == true) {
            this.pushStylingAction();
        }

        this.undoDataArr = [];

        this.isTransformStarted = true;
        if (this.transformType == "rotate") {
            this.computeTransformCenter();
        }
        if (this.transformType == "scale") {
            this.computeTransformCenter();
            // save initial position from which points will scale on each mousemove
            // multiplying hundred of scalings would be inaccurate..so add up scalefactors and set scale wrt initial position
            for (let _entity of this.parentBoard.selectioner.selectionSet) {
                _entity.setPointMemory();
            }
        }
    }

    drawTransform() {
        if (this.isTransformStarted == false) return;
        if (this.transformType == "translate") {
            this.translateSelection();
        }
        if (this.transformType == "rotate") {
            this.rotateSelection();
        }
        if (this.transformType == "scale") {
            this.scaleSelection();
        }
        this.parentBoard.setUpdate();
    }

    finishTransform() {
        if (this.isTransformStarted == false) return;

        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            this.undoDataArr.push({
                actor: _entity,
                deltas: this.deltas,
                center: this.transformCenter
            });
        }

        this.parentBoard.undoer.makeAction(this.transformType, this.undoDataArr);

        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            _entity.whenModified();
        }
        if (this.transformType == "scale") {
            for (let _entity of this.parentBoard.selectioner.selectionSet) {
                _entity.resetPointMemory();
            }
        }
        this.parentBoard.selectioner.quitSelections();
        this.resetTrackerVars();
        this.parentBoard.isButtonAllowed = true;
        this.parentBoard.setUpdate();
    }

    pushStylingAction() {
        let i = 0;
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            this.undoDataArr[i].new = structuredClone(_entity.styling);
            i++;
        }

        this.parentBoard.undoer.makeAction("styled", this.undoDataArr);

        this.isStyleEdited = false;
    }

    resetTrackerVars() {
        this.transformType = "translate";

        this.isStyleEdited = false;
        this.isTransformStarted = false;

        this.undoDataArr = [];

        this.transformCenter = null;

        this.deltas = {
            scaleFactorX: 1,
            scaleFactorY: 1,
            rot: 0,
            dx: 0,
            dy: 0,
        };
    }

    updateDeltas(d1 = 0, d2 = 0) {
        if (this.transformType == "translate") {
            this.deltas.dx += d1;
            this.deltas.dy += d2;
        }
        if (this.transformType == "rotate") {
            this.deltas.rot += d1;
        }
        if (this.transformType == "scale") {
            this.deltas.scaleFactorX = Math.max(0.1, this.deltas.scaleFactorX + d1);
            this.deltas.scaleFactorY = Math.max(0.1, this.deltas.scaleFactorY + d2);
        }
    }

    changeStyling(_field, _val) {
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            let tempField = _field;
            if (_entity.isType("text") && tempField == "lineWidth") {
                tempField = "textSize";
            }
            if (tempField == "arrowIcon") {
                if (_entity.isType("arrow") == false) {
                    continue;
                }
            }

            let stylingObject = { ..._entity.styling };

            if (_val == "decr") {
                stylingObject[tempField] > 1 ? stylingObject[tempField]-- : 0;
            } else if (_val == "incr") {
                stylingObject[tempField]++;
            } else if (_val == "toggle") {
                if (stylingObject[tempField] == "dash") {
                    stylingObject[tempField] = "solid";
                } else if (stylingObject[tempField] == "solid") {
                    stylingObject[tempField] = "dash";
                } else if (stylingObject[tempField] == "outline") {
                    stylingObject[tempField] = "fill";
                } else if (stylingObject[tempField] == "fill") {
                    stylingObject[tempField] = "outline";
                } else if (stylingObject[tempField] == true) {
                    stylingObject[tempField] = false;
                } else if (stylingObject[tempField] == false) {
                    stylingObject[tempField] = true;
                }
            } else {
                stylingObject[tempField] = _val;
            }

            _entity.updateStyling(stylingObject);
        }

        this.isStyleEdited = true;
    }

    editingShortcutHandler(e) {
        let _key = this.parentBoard.pressedKey;
        if (this.isTransformStarted == false) {
            if (_key == '`') {
                this.changeStyling("color", [255, 255, 255]);
            } else if (_key == '1') {
                if (this.parentBoard.isCtrlPressed == true) {
                    e.preventDefault();
                    this.changeStyling("arrowIcon", "arrow");
                } else {
                    console.log('red');
                    this.changeStyling("color", [255, 0, 0]);
                }
            } else if (_key == '2') {
                if (this.parentBoard.isCtrlPressed == true) {
                    e.preventDefault()
                    this.changeStyling("arrowIcon", "minus");
                } else {
                    this.changeStyling("color", [0, 255, 0]);
                }
            } else if (_key == '3') {
                if (this.parentBoard.isCtrlPressed == true) {
                    e.preventDefault();
                    this.changeStyling("arrowIcon", "plus");
                } else {
                    this.changeStyling("color", [0, 0, 255]);
                }
            } else if (_key == '4') {
                this.changeStyling("color", [255, 255, 0]);
            } else if (_key == '5') {
                this.changeStyling("color", [255, 0, 255]);
            } else if (_key == "6") {
                this.changeStyling("color", [255, 165, 0]);
            } else if (_key == "7") {
                this.changeStyling("color", [138, 43, 226]);
            } else if (_key == "8") {
                this.changeStyling("color", [0, 0, 0]);
            } else if (_key == 'q') {
                this.changeStyling("lineWidth", "decr");
            } else if (_key == 'w') {
                this.changeStyling("lineWidth", "incr");
            } else if (_key == 'c' && this.parentBoard.isSpacePressed == true) {
                this.changeStyling("strokeStyle", "toggle");
            } else if (_key == 'v' && this.parentBoard.isSpacePressed == true) {
                this.changeStyling("shapeStyle", "toggle");
            } else if (_key == "t") {
                this.transformType = "translate";
            } else if (_key == "r") {
                this.transformType = "rotate";
            } else if (_key == "s") {
                this.transformType = "scale";
            } else if (_key == "c") {
                this.parentBoard.setStatus("extendselecting");
            } else if (_key == "x") {
                this.parentBoard.selectioner.extendingMode = "remove";
                this.parentBoard.setStatus("extendselecting");
            } else if (_key == "d") {
                this.duplicateSelections();
            } else if (_key == "a") {
                this.parentBoard.drawer.makeManyArrows();
            } else if (_key == "l") {
                for (let _entity of this.parentBoard.selectioner.selectionSet) {
                    _entity.tags.isSticky = !_entity.tags.isSticky;
                    _entity.relayToStickySet();
                }
            }
            else if (_key == "Escape") {
                if (this.isStyleEdited == true) {
                    this.pushStylingAction();
                }
                this.resetTrackerVars();
                this.parentBoard.selectioner.quitSelections();
            }
        }
        if (this.isTransformStarted == true) {
            if (this.parentBoard.pressedKey == "Escape") {
                this.finishTransform();
                this.parentBoard.undoer.undo(true);
                this.parentBoard.isMouseDown.left = false;
            }
        }
    }

    translateSelection() {
        let dx = this.parentBoard.mouseDeltaX;
        let dy = this.parentBoard.mouseDeltaY;
        if (this.parentBoard.isCtrlPressed == true) {
            dy = 0;
        }
        if (this.parentBoard.isAltPressed == true) {
            dx = 0;
        }
        this.updateDeltas(dx, dy);
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            _entity.translate(dx, dy);
        }
    }

    computeTransformCenter() {
        let cx = 0;
        let cy = 0;
        let temparr = Array.from(this.parentBoard.selectioner.selectionSet).filter(_ent => _ent.isType("arrow") == false);
        for (let _entity of temparr) {
            if (_entity.isType("arrow") == false) {
                cx += _entity.shape.center.x;
                cy += _entity.shape.center.y;
            }
        }
        cx /= temparr.length;
        cy /= temparr.length;

        this.transformCenter = { x: cx, y: cy };
    }

    rotateSelection() {
        let da = this.parentBoard.mouseDeltaY / 20;
        this.updateDeltas(da);
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            _entity.rotate(this.transformCenter.x, this.transformCenter.y, da);
        }
    }

    scaleSelection() {
        let rawx = this.parentBoard.mouseDeltaX / 100;
        let rawy = this.parentBoard.mouseDeltaY / 100;
        if (this.parentBoard.isAltPressed == true && this.parentBoard.isCtrlPressed == true) {
            let common = Math.abs(rawx) > Math.abs(rawy) ? rawx : rawy;
            rawx = common;
            rawy = common;
        } else if (this.parentBoard.isCtrlPressed == true) {
            rawy = 0;
        } else if (this.parentBoard.isAltPressed == true) {
            rawx = 0;
        }
        this.updateDeltas(rawx, rawy);
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            _entity.scale(this.transformCenter.x, this.transformCenter.y, this.deltas.scaleFactorX, this.deltas.scaleFactorY);
        }
    }

    duplicateSelections() {
        // push styling action
        if (this.isStyleEdited == true) {
            this.pushStylingAction();
        }

        this.undoDataArr = [];

        // duplicate each selection
        let temparr = [];
        for (let _entity of this.parentBoard.selectioner.selectionSet) {
            if (_entity.isType("arrow") == false && _entity.isSpecificType("rect-board") == false) {
                let babyEntity = this.parentBoard.drawer.makeNewEntity(_entity.parentLayer, _entity.type);
                temparr.push(babyEntity);
                babyEntity.copyFromEntity(_entity);
                babyEntity.translate(5, 5);
                babyEntity.whenModified();
            }
        }

        // replace selection set
        if (temparr.length == 0) return;

        this.parentBoard.selectioner.clearSelections();
        for (let _babyEntity of temparr) {
            this.parentBoard.selectioner.addToSelection(_babyEntity);
            this.undoDataArr.push({
                actor: _babyEntity,
                layer: _babyEntity.parentLayer
            });
        }

        // push created action
        this.parentBoard.undoer.makeAction("created", this.undoDataArr);
        this.undoDataArr = [];

        // init editing
        this.parentBoard.selectioner.startEditing();

        this.parentBoard.setUpdate();
    }
}

class Undoer {
    constructor(_parentboard) {
        this.parentBoard = _parentboard;
        this.undoArr = [];
        this.redoArr = [];
    }

    makeAction(_type, _data = {}) {
        let newact = new Action(_type, _data);

        let isLegit = true;
        // to check if style or text is indeed changed
        if (_type == "styled" || _type == "textedited") {
            isLegit = newact.checkIfLegit();
        }

        if (isLegit == true) {
            this.undoArr.push(newact);
            if (this.undoArr.length > 100) {
                this.undoArr.shift();
            }

            this.redoArr = [];
        }
    }

    undo(isSilent = false) {
        if (this.undoArr.length == 0) {
            return;
        }
        let _action = this.undoArr.pop();
        if (_action.type == "created") {
            for (let _entry of _action.data) {
                _entry.actor.leaveLayer();
            }
        }
        if (_action.type == "erased") {
            for (let i = _action.data.length - 1; i >= 0; i--) {
                let _entry = _action.data[i];
                _entry.actor.joinLayer(_entry.layer, false, true, _entry.index);
            }
        }

        if (_action.type == "pixelerased") {
            for (let _entry of _action.data) {
                _entry.actor.shape.pesArr.find(pes => pes.pesId === _entry.pesId).isActive = false;
            }
        }

        if (_action.type == "styled") {
            for (let _entry of _action.data) {
                _entry.actor.updateStyling(_entry.old);
            }
        }

        if (_action.type == "translate") {
            for (let _entry of _action.data) {
                _entry.actor.translate(-1 * _entry.deltas.dx, -1 * _entry.deltas.dy);
                _entry.actor.whenModified();
            }
        }

        if (_action.type == "rotate") {
            for (let _entry of _action.data) {
                _entry.actor.rotate(_entry.center.x, _entry.center.y, -1 * _entry.deltas.rot);
                _entry.actor.whenModified();
            }
        }

        if (_action.type == "scale") {
            for (let _entry of _action.data) {
                _entry.actor.setPointMemory();
                _entry.actor.scale(_entry.center.x, _entry.center.y, 1 / _entry.deltas.scaleFactorX, 1 / _entry.deltas.scaleFactorY);
                _entry.actor.resetPointMemory();
                _entry.actor.whenModified();
            }
        }

        if (_action.type == "textedited") {
            for (let _entry of _action.data) {
                _entry.actor.content.text = _entry.old;
                _entry.actor.whenTextModified();
            }
        }

        if (_action.type == "layerchange") {
            for (let _entry of _action.data) {
                this.parentBoard.contracter.updateLayer(_entry.old, [_entry.actor]);
            }
        }

        if (_action.type == "layerrename") {
            _action.data.actor.updateName(_action.data.old);
        }

        if (_action.type == "layerdelete") {
            this.parentBoard.contracter.addLayer(_action.data.actor, _action.data.index);
        }

        if (_action.type == "layercreate") {
            _action.data.actor.deleteLayer(true);
        }

        if (isSilent == false) {
            this.redoArr.push(_action);
        }

    }

    redo() {
        if (this.redoArr.length == 0) {
            return;
        }
        let _action = this.redoArr.pop();
        if (_action.type == "created") {
            for (let _entry of _action.data) {
                _entry.actor.joinLayer(_entry.layer);
            }
        }
        if (_action.type == "erased") {
            for (let _entry of _action.data) {
                _entry.actor.leaveLayer();
            }
        }
        if (_action.type == "pixelerased") {
            for (let _entry of _action.data) {
                _entry.actor.shape.pesArr.find(pes => pes.pesId === _entry.pesId).isActive = true;
            }
        }
        if (_action.type == "styled") {
            for (let _entry of _action.data) {
                _entry.actor.updateStyling(_entry.new);
            }
        }

        if (_action.type == "translate") {
            for (let _entry of _action.data) {
                _entry.actor.translate(_entry.deltas.dx, _entry.deltas.dy);
                _entry.actor.whenModified();
            }
        }

        if (_action.type == "rotate") {
            for (let _entry of _action.data) {
                _entry.actor.rotate(_entry.center.x, _entry.center.y, _entry.deltas.rot);
                _entry.actor.whenModified();
            }
        }

        if (_action.type == "scale") {
            for (let _entry of _action.data) {
                _entry.actor.setPointMemory();
                _entry.actor.scale(_entry.center.x, _entry.center.y, _entry.deltas.scaleFactorX, _entry.deltas.scaleFactorY);
                _entry.actor.resetPointMemory();
                _entry.actor.whenModified();
            }
        }

        if (_action.type == "textedited") {
            for (let _entry of _action.data) {
                _entry.actor.content.text = _entry.new;
                _entry.actor.whenTextModified();
            }
        }

        if (_action.type == "layerchange") {
            for (let _entry of _action.data) {
                this.parentBoard.contracter.updateLayer(_entry.new, [_entry.actor]);
            }
        }

        if (_action.type == "layerrename") {
            _action.data.actor.updateName(_action.data.new);
        }
        if (_action.type == "layerdelete") {
            _action.data.actor.deleteLayer(true);
        }

        if (_action.type == "layercreate") {
            this.parentBoard.contracter.addLayer(_action.data.actor);
        }

        this.undoArr.push(_action);
    }

    setNestedProperty(obj, path, value) {
        let keys = path.split('.');
        let lastKey = keys.pop();

        let deepObject = keys.reduce((currentObject, key) => {
            return currentObject[key];
        }, obj);

        if (deepObject) {
            deepObject[lastKey] = value;
        }
    }
}

class Action {
    constructor(_type, _data) {
        this.type = _type;
        this.data = _data;
    }

    checkIfLegit() {
        for (let _entry of this.data) {
            if (areObjectsEqual(_entry.old, _entry.new) == false) {
                return true;
            }
        }
        return false;
    }
}

class entity {
    constructor(_parentlayer, _type = "stroke", _entityId) {
        this.parentLayer = null;
        this.parentBoard = _parentlayer.parentBoard;
        this.type = _type;
        this.entityId = _entityId;

        this.shape = {
            diagonal: {
                d1: new point(this, 0, 0),
                d2: new point(this, 0, 0),
            },
            center: new point(this, 0, 0),
            verts: [],
            pesArr: [],

            outlinePath: null,
            bounds: { mixX: 0, maxX: 0, mixY: 0, maxY: 0 },

            ends: { source: null, target: null },
        };

        this.homeTileSet = new Set();

        this.arrowSet = new Set();

        this.content = {
            text: "",
            cursorPos: 0,
            selectStart: 0,
            selectEnd: 0,
            imageEl: null,
            imageB64: null,
            width: 0,
            height: 0,
            arrowIcon: null,
            boardRef: null
        };

        this.tags = {
            status: "drawing",
            isInWindow: true,
            isSelected: false,
            isAnimated: false,
            isTouchTyping: false,
            isSticky: false
        };

        this.styling = {
            color: this.parentBoard.color,
            opacity: this.parentBoard.opacity,
            lineWidth: this.parentBoard.lineWidth,
            textSize: this.parentBoard.textSize,
            strokeStyle: this.parentBoard.strokeStyle,
            shapeStyle: this.parentBoard.shapeStyle,
        };

        this.joinLayer(_parentlayer, true);
    }

    toJSON(isJustId = false) {
        if (isJustId == true) {
            return { idStorageType: "entity", id: this.entityId };
        }

        let fullDataClasses = ["point", "pixelEraseStroke"];
        let onlyRefClasses = ["entity", "board"];
        let onlyRefKeys = [];

        const saveObj = { classType: this.constructor.name };

        const parseValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (val instanceof Set) {
                return Array.from(val).map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (fullDataClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON() : undefined;
            }
            if (onlyRefClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON(true) : undefined;
            }
            if (val.constructor.name === "Object") {
                let mirroredObj = {};
                for (let _key of Object.keys(val)) {
                    let parsedProp = parseValue(val[_key]);
                    if (parsedProp !== undefined) {
                        mirroredObj[_key] = parsedProp;
                    }
                }
                return mirroredObj;
            }
            return undefined;
        };

        for (let _key of Object.keys(this)) {
            if (onlyRefKeys.includes(_key)) {
                let finalValue = this[_key].toJSON(true);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            } else {
                let finalValue = parseValue(this[_key]);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            }
        }

        return saveObj;
    }

    fromJSON(_json) {
        const parseLoadedValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseLoadedValue(item));
            }
            if (typeof val === "object") {
                if (val.idStorageType !== undefined) {
                    return new idStorer(val.idStorageType, val.id, this.parentBoard.parentSketch);
                }
                if (val.classType !== undefined) {
                    const ClassBlueprint = ClassRegistry[val.classType];

                    let newInstance = new ClassBlueprint(this);
                    newInstance.fromJSON(val);
                    return newInstance;
                }
                let rebuiltObj = {};
                for (let k of Object.keys(val)) {
                    rebuiltObj[k] = parseLoadedValue(val[k]);
                }
                return rebuiltObj;
            }
        };

        for (let key of Object.keys(_json)) {
            if (key === "classType") continue;

            let parsedValue = parseLoadedValue(_json[key]);
            this[key] = parsedValue;
        }
    }

    // for duplication ....from entity instance...different from json
    copyFromEntity(_entity) {
        this.parentBoard = this.parentLayer.parentBoard;
        this.type = _entity.type;

        this.tags = structuredClone(_entity.tags);
        this.tags.isSelected = false;
        this.styling = structuredClone(_entity.styling);

        this.content = { ..._entity.content };

        for (let _dField in _entity.shape.diagonal) {
            let _dPoint = _entity.shape.diagonal[_dField];
            this.shape.diagonal[_dField] = new point(this, _dPoint.x, _dPoint.y, _dPoint.isPixelErased);
        }
        for (let _point of _entity.shape.verts) {
            this.shape.verts.push(new point(this, _point.x, _point.y, _point.isPixelErased));
        }
        this.shape.center = new point(this, _entity.shape.center.x, _entity.shape.center.y, _entity.shape.center.isPixelErased);

        for (let _pes of _entity.shape.pesArr) {
            this.shape.pesArr.push(new pixelEraseStroke(this, _pes.pesId, _pes.lineWidth, _pes.rawVerts));
        }

        this.parentBoard.contracter.updateLayer(this.parentLayer, [this]);
        this.whenModified();
    }

    isType(...args) {
        for (let arg of args) {
            if (this.type.split("-")[0] === arg) {
                return true;
            }
        }
        return false;
    }

    start() {
        if (this.isType("line", "rect", "text", "image", "ellipse")) {
            this.shape.diagonal.d1.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.diagonal.d2.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
        }
        if (this.isType("stroke")) {
            let newvert = new point(this, this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.verts.push(newvert);
        }
        if (this.isType("circle")) {
            this.shape.diagonal.d1.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.diagonal.d2.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.center.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
        }
        if (this.isType("arrow")) {
            this.shape.diagonal.d1.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.diagonal.d2.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.center.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
        }
    }

    async draw() {
        if (this.isType("line")) {
            if (this.parentBoard.isCtrlPressed == true) {
                this.shape.diagonal.d2.moveTo(this.parentBoard.mouse.x, this.shape.diagonal.d1.y);
            } else if (this.parentBoard.isAltPressed == true) {
                this.shape.diagonal.d2.moveTo(this.shape.diagonal.d1.x, this.parentBoard.mouse.y);
            } else {
                this.shape.diagonal.d2.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            }
            this.updateCenter();
        }
        if (this.isType("rect", "ellipse")) {
            this.shape.diagonal.d2.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.updateCenter();
        }
        if (this.isType("stroke")) {
            let newvert = new point(this, this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            if (this.parentBoard.isCtrlPressed == true) {
                newvert.moveTo(this.parentBoard.mouse.x, this.shape.verts[this.shape.verts.length - 1].y);
            } else if (this.parentBoard.isAltPressed == true) {
                newvert.moveTo(this.shape.verts[this.shape.verts.length - 1].x, this.parentBoard.mouse.y);
            }
            this.shape.verts.push(newvert);
        }
        if (this.isType("circle")) {
            let r = this.shape.center.distance(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.diagonal.d2.moveTo(this.shape.center.x + (r), this.shape.center.y + (r));
            let v = this.shape.diagonal.d2.vectorTo(this.shape.center);
            this.shape.diagonal.d1.moveTo(this.shape.center.x + v.x, this.shape.center.y + v.y);
            this.updateCenter();
        }
        if (this.isType("text")) {
            this.shape.diagonal.d1.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.updateTextSize();
        }
        if (this.isType("image")) {
            this.shape.diagonal.d1.moveTo(this.parentBoard.mouse.x, this.parentBoard.mouse.y);
            this.shape.diagonal.d2.moveTo(this.shape.diagonal.d1.x + this.content.width, this.shape.diagonal.d1.y + this.content.height);
        }
    }

    makeArrow(_source, _target) {
        this.shape.ends.source = _source;
        this.shape.ends.target = _target;
        this.tags.status = "drawn";

        this.deOrphanizeArrow();

        this.updateArrowPorts();
    }

    // if arrow erased..need to let parents know its gone
    orphanizeArrow() {
        if (this.isType("arrow") == true) {
            if (this.shape.ends.source != null) {
                this.shape.ends.source.arrowSet.delete(this);
                this.shape.ends.target.arrowSet.delete(this);
            }
        }
    }

    // if arrow un-erased..need to let parents know its back
    deOrphanizeArrow() {
        if (this.isType("arrow") == true) {
            if (this.shape.ends.source != null) {
                this.shape.ends.source.arrowSet.add(this);
                this.shape.ends.target.arrowSet.add(this);
            }
        }
    }

    updateArrowPorts() {
        if (this.shape.ends.source.parentLayer == null || this.shape.ends.target.parentLayer == null) {
            this.leaveLayer(false);
            return;
        } else {
            this.joinLayer(this.shape.ends.source.parentLayer, false, false);
        }

        let sourcePorts = [];
        const sourceShape = this.shape.ends.source.shape;
        if (this.shape.ends.source.isType("line", "arrow")) {
            sourcePorts.push({ x: sourceShape.center.x, y: sourceShape.center.y });
        } else if (this.shape.ends.source.isType("text")) {
            let p1x = sourceShape.diagonal.d1.x - 7;
            let p1y = sourceShape.diagonal.d1.y - 7;
            let p2x = sourceShape.diagonal.d2.x + 7;
            let p2y = sourceShape.diagonal.d2.y + 7;
            let p3x = sourceShape.diagonal.d3.x - 7;
            let p3y = sourceShape.diagonal.d3.y + 7;
            let p4x = sourceShape.diagonal.d4.x + 7;
            let p4y = sourceShape.diagonal.d4.y - 7;

            sourcePorts.push({ x: (p2x + p3x) / 2, y: (p2y + p3y) / 2 }); // bottom
            sourcePorts.push({ x: (p1x + p4x) / 2, y: (p1y + p4y) / 2 }); // top
            sourcePorts.push({ x: (p4x + p2x) / 2, y: (p4y + p2y) / 2 }); // right
            sourcePorts.push({ x: (p1x + p3x) / 2, y: (p1y + p3y) / 2 }); // left
        } else {
            sourcePorts.push({ x: (sourceShape.diagonal.d2.x + sourceShape.diagonal.d3.x) / 2, y: (sourceShape.diagonal.d2.y + sourceShape.diagonal.d3.y) / 2 });
            sourcePorts.push({ x: (sourceShape.diagonal.d1.x + sourceShape.diagonal.d4.x) / 2, y: (sourceShape.diagonal.d1.y + sourceShape.diagonal.d4.y) / 2 });
            sourcePorts.push({ x: (sourceShape.diagonal.d4.x + sourceShape.diagonal.d2.x) / 2, y: (sourceShape.diagonal.d4.y + sourceShape.diagonal.d2.y) / 2 });
            sourcePorts.push({ x: (sourceShape.diagonal.d1.x + sourceShape.diagonal.d3.x) / 2, y: (sourceShape.diagonal.d1.y + sourceShape.diagonal.d3.y) / 2 });
        }

        let targetPorts = [];
        const targetShape = this.shape.ends.target.shape;
        if (this.shape.ends.target.isType("line", "arrow")) {
            targetPorts.push({ x: targetShape.center.x, y: targetShape.center.y });
        } else if (this.shape.ends.target.isType("text")) {
            let p1x = targetShape.diagonal.d1.x - 7;
            let p1y = targetShape.diagonal.d1.y - 7;
            let p2x = targetShape.diagonal.d2.x + 7;
            let p2y = targetShape.diagonal.d2.y + 7;
            let p3x = targetShape.diagonal.d3.x - 7;
            let p3y = targetShape.diagonal.d3.y + 7;
            let p4x = targetShape.diagonal.d4.x + 7;
            let p4y = targetShape.diagonal.d4.y - 7;

            targetPorts.push({ x: (p2x + p3x) / 2, y: (p2y + p3y) / 2 });
            targetPorts.push({ x: (p1x + p4x) / 2, y: (p1y + p4y) / 2 });
            targetPorts.push({ x: (p4x + p2x) / 2, y: (p4y + p2y) / 2 });
            targetPorts.push({ x: (p1x + p3x) / 2, y: (p1y + p3y) / 2 });
        } else {
            targetPorts.push({ x: (targetShape.diagonal.d2.x + targetShape.diagonal.d3.x) / 2, y: (targetShape.diagonal.d2.y + targetShape.diagonal.d3.y) / 2 });
            targetPorts.push({ x: (targetShape.diagonal.d1.x + targetShape.diagonal.d4.x) / 2, y: (targetShape.diagonal.d1.y + targetShape.diagonal.d4.y) / 2 });
            targetPorts.push({ x: (targetShape.diagonal.d4.x + targetShape.diagonal.d2.x) / 2, y: (targetShape.diagonal.d4.y + targetShape.diagonal.d2.y) / 2 });
            targetPorts.push({ x: (targetShape.diagonal.d1.x + targetShape.diagonal.d3.x) / 2, y: (targetShape.diagonal.d1.y + targetShape.diagonal.d3.y) / 2 });
        }

        let minDistance = Infinity;
        let closestSourcePort = null;
        let closestTargetPort = null;

        for (let _spoint of sourcePorts) {
            for (let _tpoint of targetPorts) {
                let distance = (_spoint.x - _tpoint.x) ** 2 + (_spoint.y - _tpoint.y) ** 2;
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSourcePort = _spoint;
                    closestTargetPort = _tpoint;
                }
            }
        }

        this.shape.diagonal.d1.moveTo(closestSourcePort.x, closestSourcePort.y);
        this.shape.diagonal.d2.moveTo(closestTargetPort.x, closestTargetPort.y);

        this.whenArrowModified();
    }

    whenArrowModified() {
        for (let _vert of this.shape.verts) {
            _vert.leaveTile();
        }

        this.shape.verts = [];

        this.updateBounds();
        this.updateCenter();
        this.updateVerts();
        this.updateAddress();
        this.relayToArrows();
    }

    // to differentiate beacon and board from text and rect
    isSpecificType(...args) {
        for (let arg of args) {
            if (this.type === arg) {
                return true;
            }
        }
        return false;
    }

    finish() {
        if (this.isType("text")) {
            this.content.cursorPos = -1;
            this.content.selectStart = -1;
            this.content.selectEnd = -1;
        }
        this.updateCenter();
        this.updateCorners();
        this.updateVerts();

        this.whenModified();

        this.tags.status = "drawn";

        if (this.isSpecificType("rect-board")) {
            this.parentBoard.parentSketch.createBoard(this);
        }
    }

    finishTextEdit() {
        this.tags.status = "drawn";

        this.content.cursorPos = -1;
        this.content.selectStart = -1;
        this.content.selectEnd = -1;

        this.whenTextModified();
    }

    updateCenter() {
        if (this.isType("ellipse", "rect", "line", "arrow", "image", "text")) {
            this.shape.center.moveTo((this.shape.diagonal.d1.x + this.shape.diagonal.d2.x) / 2, (this.shape.diagonal.d1.y + this.shape.diagonal.d2.y) / 2);
        }
        if (this.isType("stroke")) {
            let sumx = 0;
            let sumy = 0;
            for (let _point of this.shape.verts) {
                sumx += _point.x;
                sumy += _point.y;
            }
            this.shape.center.moveTo(sumx / this.shape.verts.length, sumy / this.shape.verts.length);
        }
    }

    updateCorners() {
        if (this.isType("rect", "text", "image", "ellipse", "circle")) {
            this.shape.diagonal.d3 = new point(this, this.shape.diagonal.d1.x, this.shape.diagonal.d2.y);
            this.shape.diagonal.d4 = new point(this, this.shape.diagonal.d2.x, this.shape.diagonal.d1.y);
        }
    }

    updateVerts() {
        if (this.isType("line", "arrow")) {
            let resolution = 50;
            for (let i = 0; i < resolution + 1; i++) {
                let x = this.shape.diagonal.d1.x + (this.shape.diagonal.d2.x - this.shape.diagonal.d1.x) * i / resolution;
                let y = this.shape.diagonal.d1.y + (this.shape.diagonal.d2.y - this.shape.diagonal.d1.y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
        }
        if (this.isType("rect", "image")) {
            let resolution = 50;
            for (let i = 0; i < resolution + 1; i++) {
                let x = this.shape.diagonal.d1.x + (this.shape.diagonal.d3.x - this.shape.diagonal.d1.x) * i / resolution;
                let y = this.shape.diagonal.d1.y + (this.shape.diagonal.d3.y - this.shape.diagonal.d1.y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
            for (let i = 0; i < resolution + 1; i++) {
                let x = this.shape.diagonal.d3.x + (this.shape.diagonal.d2.x - this.shape.diagonal.d3.x) * i / resolution;
                let y = this.shape.diagonal.d3.y + (this.shape.diagonal.d2.y - this.shape.diagonal.d3.y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
            for (let i = 0; i < resolution + 1; i++) {
                let x = this.shape.diagonal.d2.x + (this.shape.diagonal.d4.x - this.shape.diagonal.d2.x) * i / resolution;
                let y = this.shape.diagonal.d2.y + (this.shape.diagonal.d4.y - this.shape.diagonal.d2.y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
            for (let i = 0; i < resolution + 1; i++) {
                let x = this.shape.diagonal.d4.x + (this.shape.diagonal.d1.x - this.shape.diagonal.d4.x) * i / resolution;
                let y = this.shape.diagonal.d4.y + (this.shape.diagonal.d1.y - this.shape.diagonal.d4.y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
        }
        if (this.isType("text")) {
            let p1x = this.shape.diagonal.d1.x - 5;
            let p1y = this.shape.diagonal.d1.y - 5;
            let p2x = this.shape.diagonal.d2.x + 5;
            let p2y = this.shape.diagonal.d2.y + 5;
            let p3x = this.shape.diagonal.d3.x - 5;
            let p3y = this.shape.diagonal.d3.y + 5;
            let p4x = this.shape.diagonal.d4.x + 5;
            let p4y = this.shape.diagonal.d4.y - 5;

            let resolution = 50;
            for (let i = 0; i < resolution + 1; i++) {
                let x = p1x + (p3x - p1x) * i / resolution;
                let y = p1y + (p3y - p1y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
            for (let i = 0; i < resolution + 1; i++) {
                let x = p3x + (p2x - p3x) * i / resolution;
                let y = p3y + (p2y - p3y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
            for (let i = 0; i < resolution + 1; i++) {
                let x = p2x + (p4x - p2x) * i / resolution;
                let y = p2y + (p4y - p2y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
            for (let i = 0; i < resolution + 1; i++) {
                let x = p4x + (p1x - p4x) * i / resolution;
                let y = p4y + (p1y - p4y) * i / resolution;
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
        }
        if (this.isType("ellipse")) {
            let width = Math.abs(this.shape.diagonal.d1.x - this.shape.diagonal.d2.x);
            let height = Math.abs(this.shape.diagonal.d1.y - this.shape.diagonal.d2.y);

            let sweep = 2 * Math.PI / 100;
            for (let _angle = 0; _angle < 2 * Math.PI; _angle += sweep) {
                let x = this.shape.center.x + ((width / 2) * Math.cos(_angle));
                let y = this.shape.center.y + ((height / 2) * Math.sin(_angle));
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
        }
        if (this.isType("circle")) {
            let radius = Math.abs(this.shape.diagonal.d1.x - this.shape.diagonal.d2.x) / 2;
            let sweep = 2 * Math.PI / 100;
            for (let _angle = 0; _angle < 2 * Math.PI; _angle += sweep) {
                let x = this.shape.center.x + ((radius) * Math.cos(_angle));
                let y = this.shape.center.y + ((radius) * Math.sin(_angle));
                let p = new point(this, x, y);
                this.shape.verts.push(p);
            }
        }
    }

    updateBounds() {
        if (this.isType("stroke")) {
            let minX = Math.min(...this.shape.verts.map(p => p.x));
            let maxX = Math.max(...this.shape.verts.map(p => p.x));
            let minY = Math.min(...this.shape.verts.map(p => p.y));
            let maxY = Math.max(...this.shape.verts.map(p => p.y));

            this.shape.bounds = { minX, maxX, minY, maxY };
        }
        if (this.isType("line", "arrow", "rect", "text", "image", "ellipse", "circle")) {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = 0;
            let maxY = 0;
            for (let _d of Object.values(this.shape.diagonal)) {
                if (_d.x < minX) minX = _d.x;
                if (_d.x > maxX) maxX = _d.x;
                if (_d.y < minY) minY = _d.y;
                if (_d.y > maxY) maxY = _d.y;
            }
            this.shape.bounds = { minX, maxX, minY, maxY };
        }
    }

    updateOutlinePath() {
        function buildPath2d(_arr) {
            let path = new Path2D();
            if (!_arr || _arr.length === 0) return path;
            path.moveTo(_arr[0].x, _arr[0].y);
            for (let i = 1; i < _arr.length; i++) {
                path.lineTo(_arr[i].x, _arr[i].y);
            }
            path.closePath();

            return path;
        }

        if (this.isType("stroke", "circle", "ellipse")) {
            this.shape.outlinePath = buildPath2d(this.shape.verts);
        }
        if (this.isType("line")) {
            this.shape.outlinePath = buildPath2d([this.shape.diagonal.d1, this.shape.diagonal.d2]);
        } else if (this.isType("rect", "text", "image")) {
            this.shape.outlinePath = buildPath2d([
                this.shape.diagonal.d1,
                this.shape.diagonal.d3,
                this.shape.diagonal.d2,
                this.shape.diagonal.d4
            ]);
        }
    }

    updateIsInWindow() {
        function isInBetween(n, a, b) {
            if (a <= n && n <= b) {
                return true;
            } else {
                return false;
            }
        }
        function isStradling(n1, n2, a, b) {
            if (n1 <= a && n2 >= b) {
                return true;
            } else {
                return false;
            }
        }

        this.tags.isInWindow = false;
        const view = this.parentBoard.viewWindow;
        const bounds = this.shape.bounds;
        if (
            (isInBetween(bounds.minX, view.x0, view.x1)
                ||
                isInBetween(bounds.maxX, view.x0, view.x1)
                ||
                isStradling(bounds.minX, bounds.maxX, view.x0, view.x1)
            )
            && (isInBetween(bounds.minY, view.y0, view.y1)
                ||
                isInBetween(bounds.maxY, view.y0, view.y1)
                ||
                isStradling(bounds.minY, bounds.maxY, view.y0, view.y1))) {
            this.tags.isInWindow = true;
        }
    }

    updateAddress() {
        if (this.parentLayer == null) return;
        if (this.tags.isInWindow == false) return;

        for (let _tile of this.homeTileSet) {
            this.leaveTile(_tile);
        }

        for (let _point of this.shape.verts) {
            _point.updateAddress();
        }

        // handle interiors
        if (this.isType("rect", "text", "image", "ellipse", "circle")) {
            let _x = (this.shape.bounds.minX + this.parentBoard.offsetX) * this.parentBoard.scaleFactor;
            let _y = (this.shape.bounds.minY + this.parentBoard.offsetY) * this.parentBoard.scaleFactor;
            let __x = (this.shape.bounds.maxX + this.parentBoard.offsetX) * this.parentBoard.scaleFactor;
            let __y = (this.shape.bounds.maxY + this.parentBoard.offsetY) * this.parentBoard.scaleFactor;

            let rawMinX = Math.floor(_x / this.parentBoard.tileWidth);
            let rawMinY = Math.floor(_y / this.parentBoard.tileHeight);
            let rawMaxX = Math.floor(__x / this.parentBoard.tileWidth);
            let rawMaxY = Math.floor(__y / this.parentBoard.tileHeight);

            let minx = Math.max(0, rawMinX);
            let miny = Math.max(0, rawMinY);

            let maxx = Math.min(this.parentLayer.tileGrid.length - 1, rawMaxX);
            let maxy = Math.min(this.parentLayer.tileGrid[0].length - 1, rawMaxY);

            for (let _tile of this.parentLayer.tileArr) {
                if (_tile.index.x >= minx && _tile.index.x <= maxx && _tile.index.y >= miny && _tile.index.y <= maxy) {
                    this.joinTile(_tile);
                }
            }
        }
    }

    whenModified() {
        this.updateBounds();
        this.updateOutlinePath();
        this.updateAddress();
    }

    joinTile(_tile) {
        this.homeTileSet.add(_tile);
        _tile.lodgeEntity(this);
    }
    leaveTile(_tile) {
        this.homeTileSet.delete(_tile);
        _tile.evictEntity(this);
    }

    // join and leave should really be handled by an external organ class..but meh if it aint broke dont fix it
    joinLayer(_layer, isBaby = false, isExplicit = true, index = null) {
        if (this.parentLayer == null) {
            this.parentLayer = _layer;
            this.parentLayer.lodgeEntity(this, index);
            if (isBaby == false) {
                this.updateAddress();
            }

            this.relayToArrows();

            if (isExplicit == true) {
                this.deOrphanizeArrow();
            }

            this.relayToBeaconSet("add");

            this.relayToBoardSet("add");
        }
    }

    // add or remove from beacon set of windower
    relayToBeaconSet(action = "add") {
        if (this.isSpecificType("text-beacon")) {
            if (action == "add") {
                this.parentBoard.beaconManager.beaconSet.add(this);
            } else {
                this.parentBoard.beaconManager.beaconSet.delete(this);
            }
            this.parentBoard.beaconManager.updateModal();
        }
    }

    // add or remove hosted board from board set of sketch
    relayToBoardSet(action = "add") {
        if (this.isSpecificType("rect-board")) {
            if (this.content.boardRef != null) {
                if (action == "add") {
                    this.parentBoard.parentSketch.boardSet.add(this.content.boardRef);
                } else {
                    this.parentBoard.parentSketch.boardSet.delete(this.content.boardRef);
                }
            }
        }
    }

    leaveLayer(isExplicit = true) {
        if (this.parentLayer != null) {
            this.parentLayer.evictEntity(this);
            this.parentLayer = null;

            for (let _tile of this.homeTileSet) {
                this.leaveTile(_tile);
            }

            for (let _point of this.shape.verts) {
                _point.leaveTile();
            }

            this.relayToArrows();

            if (isExplicit == true) {
                this.orphanizeArrow();
            }

            this.relayToBeaconSet("delete");

            this.relayToBoardSet("delete");
        }
    }

    // inform connected arrows of change in position
    relayToArrows() {
        for (let _arrow of this.arrowSet) {
            _arrow.updateArrowPorts();
        }
    }

    translate(dx, dy) {
        if (this.isType("arrow") == true) return;

        for (let _dPoint in this.shape.diagonal) {
            this.shape.diagonal[_dPoint].moveBy(dx, dy);
        }
        for (let _point of this.shape.verts) {
            _point.moveBy(dx, dy);
        }
        for (let _pes of this.shape.pesArr) {
            _pes.translate(dx, dy);
        }
        this.shape.center.moveBy(dx, dy);

        this.relayToArrows();
    }

    rotate(cx, cy, da) {
        if (this.isType("arrow") == true) return;

        for (let _dPoint in this.shape.diagonal) {
            this.shape.diagonal[_dPoint].rotate(cx, cy, da);
        }
        for (let _point of this.shape.verts) {
            _point.rotate(cx, cy, da);
        }
        for (let _pes of this.shape.pesArr) {
            _pes.rotate(cx, cy, da);
        }
        this.shape.center.rotate(cx, cy, da);
        this.relayToArrows();

    }

    scale(cx, cy, fx, fy) {
        if (this.isType("arrow") == true) return;

        this.shape.center.scale(cx, cy, fx, fy);

        for (let _dPoint in this.shape.diagonal) {
            this.shape.diagonal[_dPoint].scale(cx, cy, fx, fy);
        }
        for (let _point of this.shape.verts) {
            _point.scale(cx, cy, fx, fy);
        }
        for (let _pes of this.shape.pesArr) {
            _pes.scale(cx, cy, fx, fy);
        }
        if (this.isType("text")) {
        }
        if (this.isType("image")) {
            this.updateContentDimensions();
        }
        this.relayToArrows();
    }

    setPointMemory() {
        this.shape.center.setMemory();
        for (let _dPoint in this.shape.diagonal) {
            this.shape.diagonal[_dPoint].setMemory();
        }
        for (let _point of this.shape.verts) {
            _point.setMemory();
        }
        for (let _pes of this.shape.pesArr) {
            _pes.setPointMemory();
        }
    }

    resetPointMemory() {
        this.shape.center.resetMemory();

        for (let _dPoint in this.shape.diagonal) {
            this.shape.diagonal[_dPoint].resetMemory();
        }
        for (let _point of this.shape.verts) {
            _point.resetMemory();
        }
        for (let _pes of this.shape.pesArr) {
            _pes.resetPointMemory();
        }
    }

    updateStyling(_obj) {
        let oldTextSize = this.styling.textSize;
        this.styling = _obj;
        let newTextSize = this.styling.textSize;

        if (this.isType("text") && oldTextSize != newTextSize) {
            this.whenTextModified();
        }
        this.parentBoard.setUpdate();
    }

    // add or remove from stickyset of board
    relayToStickySet() {
        if (this.tags.isSticky == true) {
            this.parentBoard.stickySet.add(this);
        }
        if (this.tags.isSticky == false) {
            this.parentBoard.stickySet.delete(this);
        }
    }

    show(_canvas) {
        if (this.tags.isInWindow == true || this.tags.isSticky == true) {
            if (this.shape.pesArr.length == 0) {
                this.showBase(_canvas);
            } else {
                this.parentBoard.bufferCanvas.scale(this.parentBoard.scaleFactor);
                this.parentBoard.bufferCanvas.translate(this.parentBoard.offsetX, this.parentBoard.offsetY);
                this.showBase(this.parentBoard.bufferCanvas);
                this.parentBoard.bufferCanvas.ctx.globalCompositeOperation = "destination-out";
                for (let _pes of this.shape.pesArr) {
                    if (_pes.isActive == true) {
                        _pes.show(this.parentBoard.bufferCanvas);
                    }
                }
                _canvas.startpen();
                _canvas.resetTransform();
                _canvas.buffer(this.parentBoard.bufferCanvas, 0, 0);
                _canvas.endpen();
                this.parentBoard.bufferCanvas.ctx.globalCompositeOperation = "source-over";
                this.parentBoard.bufferCanvas.resetTransform();
                this.parentBoard.bufferCanvas.clear();
            }
        }
    }

    showBase(_canvas) {
        if (this.isType("stroke")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);
            if (this.styling.strokeStyle == 'dash') {
                _canvas.setDashLine(this.styling.lineWidth * 2, this.styling.lineWidth * 2);
            }
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }
            _canvas.stroke(this.shape.verts, this.styling.shapeStyle);
            _canvas.endpen();
        }
        if (this.isType("line")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);

            if (this.styling.strokeStyle == 'dash') {
                _canvas.setDashLine(this.styling.lineWidth * 2, this.styling.lineWidth * 2);
            }
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }
            _canvas.line(this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, this.shape.diagonal.d2.x, this.shape.diagonal.d2.y);
            _canvas.endpen();
        }
        if (this.isType("arrow")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);

            if (this.styling.strokeStyle == 'dash') {
                _canvas.setDashLine(this.styling.lineWidth * 2, this.styling.lineWidth * 2);
            }
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }
            _canvas.arrow(this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, this.shape.diagonal.d2.x, this.shape.diagonal.d2.y, this.styling.arrowIcon);
            _canvas.endpen();
        }
        if (this.isType("rect")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);

            if (this.styling.strokeStyle == 'dash') {
                _canvas.setDashLine(this.styling.lineWidth * 2, this.styling.lineWidth * 2);
            }
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }
            if (this.tags.status == "drawing") {
                let w = (this.shape.diagonal.d2.x - this.shape.diagonal.d1.x);
                let h = (this.shape.diagonal.d2.y - this.shape.diagonal.d1.y);
                _canvas.rect(this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, w, h, this.styling.shapeStyle);
            } else {
                _canvas.stroke([this.shape.diagonal.d1, this.shape.diagonal.d3, this.shape.diagonal.d2, this.shape.diagonal.d4, this.shape.diagonal.d1], this.styling.shapeStyle);
            }
            if (this.isSpecificType("rect-board") == true && this.content.imageEl != null) {
                _canvas.drawSkewedImage(
                    this.content.imageEl, this.content.width, this.content.height,
                    this.shape.diagonal.d1.x, this.shape.diagonal.d1.y,
                    this.shape.diagonal.d4.x, this.shape.diagonal.d4.y,
                    this.shape.diagonal.d3.x, this.shape.diagonal.d3.y);
            }
            _canvas.endpen();
        }
        if (this.isType("ellipse")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);

            if (this.styling.strokeStyle == 'dash') {
                _canvas.setDashLine(this.styling.lineWidth * 2, this.styling.lineWidth * 2);
            }
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }
            if (this.tags.status == "drawing") {
                let w = Math.abs(this.shape.diagonal.d2.x - this.shape.diagonal.d1.x) / 2;
                let h = Math.abs(this.shape.diagonal.d2.y - this.shape.diagonal.d1.y) / 2;
                _canvas.ellipse(this.shape.center.x, this.shape.center.y, w, h, undefined, undefined, undefined, this.styling.shapeStyle);
            } else {
                _canvas.stroke(this.shape.verts, this.styling.shapeStyle);
            }
            _canvas.endpen();
        }
        if (this.isType("circle")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);

            if (this.styling.strokeStyle == 'dash') {
                _canvas.setDashLine(this.styling.lineWidth * 2, this.styling.lineWidth * 2);
            }
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }

            if (this.tags.status == "drawing") {
                let r = Math.abs(this.shape.diagonal.d2.x - this.shape.diagonal.d1.x) / 2;
                _canvas.circle(this.shape.center.x, this.shape.center.y, r, undefined, undefined, this.styling.shapeStyle);
            } else {
                _canvas.stroke(this.shape.verts, this.styling.shapeStyle);
            }
            _canvas.endpen();
        }
        if (this.isType("text")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(2) : _canvas.setLineWidth(2 / this.parentBoard.scaleFactor);
            _canvas.setTextSize(this.styling.textSize);
            if (this.tags.isSelected == true) {
                _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
            } else {
                _canvas.setColor(this.styling.color[0], this.styling.color[1], this.styling.color[2], this.styling.opacity);
            }
            if (this.tags.isTouchTyping == false) {
                if ((this.tags.status == "drawing")) {
                    _canvas.text(this.content.text, this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, this.content.cursorPos, this.content.selectStart, this.content.selectEnd);
                    _canvas.setDashLine();
                    _canvas.rect(this.shape.diagonal.d1.x - 5, this.shape.diagonal.d1.y - 5, Math.max(100, this.content.width + 10), this.content.height + 10);
                }
                else {
                    if (this.tags.status == "editing") {
                        _canvas.setDashLine();
                    }
                    _canvas.skewedText(this.content.text,
                        this.shape.diagonal.d1.x, this.shape.diagonal.d1.y,
                        this.shape.diagonal.d4.x, this.shape.diagonal.d4.y,
                        this.shape.diagonal.d3.x, this.shape.diagonal.d3.y,
                        this.content.width, this.content.height, true
                    );
                }
            }
            _canvas.endpen();
        }
        if (this.isType("image")) {
            _canvas.startpen();
            this.parentBoard.scaleFactor >= 1 ? _canvas.setLineWidth(this.styling.lineWidth) : _canvas.setLineWidth(this.styling.lineWidth / this.parentBoard.scaleFactor);
            if (this.content.imageEl) {
                if (this.tags.status == "drawing") {
                    _canvas.image(this.content.imageEl, this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, this.content.width, this.content.height);
                } else {
                    _canvas.drawSkewedImage(
                        this.content.imageEl, this.content.width, this.content.height,
                        this.shape.diagonal.d1.x, this.shape.diagonal.d1.y,
                        this.shape.diagonal.d4.x, this.shape.diagonal.d4.y,
                        this.shape.diagonal.d3.x, this.shape.diagonal.d3.y);
                }
                if (this.tags.isSelected == true) {
                    _canvas.setColor(this.parentBoard.selectionColor[0], this.parentBoard.selectionColor[1], this.parentBoard.selectionColor[2]);
                    _canvas.stroke([this.shape.diagonal.d1, this.shape.diagonal.d3, this.shape.diagonal.d2, this.shape.diagonal.d4, this.shape.diagonal.d1], this.styling.shapeStyle);
                }
            }
            _canvas.endpen();
        }
        if (ISDEBUGGING == true) {
            if (Object.keys(this.shape.diagonal).length == 4) {
                _canvas.startpen();
                _canvas.setColor(0, 255, 255);
                _canvas.stroke([this.shape.diagonal.d1, this.shape.diagonal.d3, this.shape.diagonal.d2, this.shape.diagonal.d4, this.shape.diagonal.d1]);
                _canvas.endpen();
            }
            for (let _point of this.shape.verts) {
                _canvas.startpen();
                _canvas.setColor(0, 255, 0);
                _canvas.circle(_point.x, _point.y, 2, undefined, undefined, "fill");
                _canvas.endpen();
            }
            if (this.shape.outlinePath != null) {
                _canvas.startpen();
                _canvas.setColor(255, 0, 0);
                _canvas.path(this.shape.outlinePath);
                _canvas.endpen();
            }
            for (let _tile of this.homeTileSet) {
                _tile.show();
            }
        }
    }

    // text methods
    addText(string) {
        let start = Math.min(this.content.selectStart, this.content.selectEnd);
        let end = Math.max(this.content.selectStart, this.content.selectEnd);
        if (start == end) {
            this.content.text = this.content.text.slice(0, this.content.cursorPos) + string + this.content.text.slice(this.content.cursorPos);
            this.moveTextPointer("right", string.length);
        } else {
            this.content.text = this.content.text.slice(0, start) + string + this.content.text.slice(end);
            this.moveTextPointer("left");
            this.resetSelection();
            this.moveTextPointer("right");
        }
        this.updateTextSize();
    }

    deleteText(direction = "left") {
        let start = Math.min(this.content.selectStart, this.content.selectEnd);
        let end = Math.max(this.content.selectStart, this.content.selectEnd);
        if (start != end) {
            this.content.text = this.content.text.slice(0, start) + this.content.text.slice(end);
            this.moveTextPointer("left");
            this.resetSelection();
        } else if (direction === "left" && this.content.cursorPos > 0) {
            this.content.text = this.content.text.slice(0, this.content.cursorPos - 1) + this.content.text.slice(this.content.cursorPos);
            this.moveTextPointer("left", 1);
        } else if (direction === "right" && this.content.cursorPos < this.content.text.length) {
            this.content.text = this.content.text.slice(0, this.content.cursorPos) + this.content.text.slice(this.content.cursorPos + 1);
        }
        this.updateTextSize();
    }

    moveTextPointer(direction, chars = 1, targetProp = "cursorPos") {
        let currentIndex = this.content[targetProp];
        const text = this.content.text;

        if (direction == "left") {
            if (this.content.selectStart != this.content.selectEnd && targetProp == "cursorPos") {
                this.content[targetProp] = Math.min(this.content.selectStart, this.content.selectEnd);
            } else {
                this.content[targetProp] = Math.max(0, currentIndex - chars);
            }
        }
        else if (direction == "right") {
            if (this.content.selectStart != this.content.selectEnd && targetProp == "cursorPos") {
                this.content[targetProp] = Math.max(this.content.selectStart, this.content.selectEnd);
            } else {
                this.content[targetProp] = Math.min(text.length, currentIndex + chars);
            }
        }
        else if (direction == "up") {
            if (this.content.selectStart != this.content.selectEnd && targetProp == "cursorPos") {
                this.content[targetProp] = Math.min(this.content.selectStart, this.content.selectEnd);
            } else {
                function moveCursorUp(text, cursor) {
                    const lines = text.split('\n');
                    let charCount = 0, lineIndex = 0, colInLine = 0;
                    for (let i = 0; i < lines.length; i++) {
                        const lineStart = charCount;
                        const lineEnd = charCount + lines[i].length;
                        if (cursor >= lineStart && cursor <= lineEnd) {
                            lineIndex = i; colInLine = cursor - lineStart; break;
                        }
                        charCount += lines[i].length + 1;
                    }
                    if (lineIndex === 0) return cursor;
                    const prevLine = lines[lineIndex - 1];
                    const targetCol = Math.min(prevLine.length, colInLine);
                    let newIndex = 0;
                    for (let i = 0; i < lineIndex - 1; i++) newIndex += lines[i].length + 1;
                    return newIndex + targetCol;
                }
                this.content[targetProp] = moveCursorUp(text, currentIndex);
            }
        }
        else if (direction == "down") {
            if (this.content.selectStart != this.content.selectEnd && targetProp == "cursorPos") {
                this.content[targetProp] = Math.max(this.content.selectStart, this.content.selectEnd);
            } else {
                function moveCursorDown(text, cursor) {
                    const lines = text.split('\n');
                    let charCount = 0, lineIndex = 0, colInLine = 0;
                    for (let i = 0; i < lines.length; i++) {
                        const lineStart = charCount;
                        const lineEnd = charCount + lines[i].length;
                        if (cursor >= lineStart && cursor <= lineEnd) {
                            lineIndex = i; colInLine = cursor - lineStart; break;
                        }
                        charCount += lines[i].length + 1;
                    }
                    if (lineIndex >= lines.length - 1) return cursor;
                    const nextLine = lines[lineIndex + 1];
                    const targetCol = Math.min(nextLine.length, colInLine);
                    let newIndex = 0;
                    for (let i = 0; i <= lineIndex; i++) newIndex += lines[i].length + 1;
                    return newIndex + targetCol;
                }
                this.content[targetProp] = moveCursorDown(text, currentIndex);
            }
        }
        else if (direction == "wordback") {
            if (currentIndex <= 0) {
                this.content[targetProp] = 0;
            } else {
                let i = currentIndex - 1;
                while (i >= 0 && (text[i] === ' ' || text[i] === '\n')) i--;
                while (i >= 0 && text[i] !== ' ' && text[i] !== '\n') i--;
                this.content[targetProp] = i + 1;
            }
        }
        else if (direction == "wordfront") {
            if (currentIndex >= text.length) {
                this.content[targetProp] = text.length;
            } else {
                let i = currentIndex;
                while (i < text.length && (text[i] === ' ' || text[i] === '\n')) i++;
                while (i < text.length && text[i] !== ' ' && text[i] !== '\n') i++;
                this.content[targetProp] = i;
            }
        }
        else if (direction == "linestart") {
            let lineStart = this.content.text.lastIndexOf('\n', currentIndex - 1);
            this.content[targetProp] = lineStart === -1 ? 0 : lineStart + 1;
        }
        else if (direction == "lineend") {
            let lineEnd = this.content.text.indexOf('\n', currentIndex);
            this.content[targetProp] = lineEnd === -1 ? this.content.text.length : lineEnd;
        }

        if (targetProp === "cursorPos") {
            this.resetSelection();
        }
    }

    resetSelection() {
        this.content.selectStart = this.content.cursorPos;
        this.content.selectEnd = this.content.cursorPos;
    }

    updateTextSize() {
        if (this.content.text == "") return; // if not it makes diagonals nan as height is not computable

        this.parentBoard.mainCanvas.startpen();
        this.parentBoard.mainCanvas.setTextSize(this.styling.textSize);

        let lines = this.content.text.split('\n');
        let maxWidth = 0;
        for (let i = 0; i < lines.length; i++) {
            let thisLineWidth = this.parentBoard.mainCanvas.ctx.measureText(lines[i]).width;
            if (thisLineWidth > maxWidth) {
                maxWidth = thisLineWidth;
            }
        }

        let lineHeight = this.parentBoard.mainCanvas.fontsize * 1.2;
        let totalHeight = lines.length * lineHeight;

        this.parentBoard.mainCanvas.endpen();

        if (this.tags.status == "drawing") {
            this.shape.diagonal.d2.moveTo(this.shape.diagonal.d1.x + maxWidth, this.shape.diagonal.d1.y + totalHeight);
            this.content.width = this.shape.diagonal.d2.x - this.shape.diagonal.d1.x;
            this.content.height = this.shape.diagonal.d2.y - this.shape.diagonal.d1.y;
        }
        // manage differently as it may be transformed..so cant just add along axes like for babies
        if (this.tags.status == "editing" || this.tags.status == "drawn") {
            let sx = maxWidth / this.content.width;
            let sy = totalHeight / this.content.height;

            this.shape.diagonal.d3.setMemory();
            this.shape.diagonal.d3.scale(this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, sy, sy);
            this.shape.diagonal.d3.resetMemory();

            this.shape.diagonal.d4.setMemory();
            this.shape.diagonal.d4.scale(this.shape.diagonal.d1.x, this.shape.diagonal.d1.y, sx, sx);
            this.shape.diagonal.d4.resetMemory();

            this.shape.diagonal.d2.setMemory();
            this.shape.diagonal.d2.scale(this.shape.diagonal.d3.x, this.shape.diagonal.d3.y, sx, sx);
            this.shape.diagonal.d2.resetMemory();

            this.shape.diagonal.d2.setMemory();
            this.shape.diagonal.d2.scale(this.shape.diagonal.d4.x, this.shape.diagonal.d4.y, sy, sy);
            this.shape.diagonal.d2.resetMemory();

            this.content.width = maxWidth;
            this.content.height = totalHeight;
        }


    }

    editText() {
        this.tags.status = "editing";
        this.content.cursorPos = this.content.text.length;
    }

    whenTextModified() {
        this.updateTextSize();
        this.updateCenter();

        for (let _vert of this.shape.verts) {
            _vert.leaveTile();
        }
        this.shape.verts = [];
        this.updateVerts();

        this.whenModified();
    }

    async drawTextContent() {
        if (this.isType("text")) {
            let key = this.parentBoard.pressedKey;
            if (key.length != 1) {
                if (key === "Home") {
                    if (this.parentBoard.isShiftPressed == true) {
                        if (this.content.selectStart == this.content.selectEnd) {
                            this.resetSelection();
                        }
                        this.moveTextPointer("linestart", 0, "selectEnd");
                    } else {
                        this.moveTextPointer("linestart");
                    }
                }
                else if (key === "End") {
                    if (this.parentBoard.isShiftPressed == true) {
                        this.moveTextPointer("lineend", 0, "selectEnd");
                    } else {
                        this.moveTextPointer("lineend");
                    }
                }
                else if (this.parentBoard.isShiftPressed == true && this.parentBoard.isCtrlPressed == true && key == "ArrowLeft") {
                    if (this.content.selectStart == this.content.selectEnd) {
                        this.resetSelection();
                    }
                    this.moveTextPointer("wordback", undefined, "selectEnd");
                }
                else if (this.parentBoard.isShiftPressed == true && this.parentBoard.isCtrlPressed == true && key == "ArrowRight") {
                    if (this.content.selectStart == this.content.selectEnd) {
                        this.resetSelection();
                    }
                    this.moveTextPointer("wordfront", undefined, "selectEnd");
                }
                else if (this.parentBoard.isShiftPressed == true && key == "ArrowLeft") {
                    this.moveTextPointer("left", undefined, "selectEnd");
                }
                else if (this.parentBoard.isShiftPressed == true && key == "ArrowRight") {
                    this.moveTextPointer("right", undefined, "selectEnd");
                }
                else if (this.parentBoard.isShiftPressed == true && key == "ArrowUp") {
                    this.moveTextPointer("up", undefined, "selectEnd");
                }
                else if (this.parentBoard.isShiftPressed == true && key == "ArrowDown") {
                    this.moveTextPointer("down", undefined, "selectEnd");
                }
                else if (key == "ArrowLeft") {
                    this.moveTextPointer("left");
                }
                else if (key == "ArrowRight") {
                    this.moveTextPointer("right");
                }
                else if (key == "ArrowUp") {
                    this.moveTextPointer("up");
                }
                else if (key == "ArrowDown") {
                    this.moveTextPointer("down");
                }
                else if (this.parentBoard.isShiftPressed == true && key == 'Enter') {
                    this.addText("\n");
                }
                else if (key == 'Backspace') {
                    this.deleteText();
                }
                else if (key == 'Delete') {
                    this.deleteText("right");
                }
                else if (key == 'Escape') {
                    if (this.parentBoard.status == "drawing") {
                        this.parentBoard.drawer.abortEntity();
                    }
                }
            }
            // type character keys 
            else {
                // uppercase when shift pressed
                if (this.parentBoard.isShiftPressed == true) {
                    this.addText(key.toUpperCase());
                }
                // paste text
                else if (this.parentBoard.isCtrlPressed == true && key == 'v') {
                    try {
                        const _text = await navigator.clipboard.readText();
                        if (_text) {
                            this.addText(_text);
                        }
                    } catch (err) { }
                }
                else if (this.parentBoard.isCtrlPressed == true && key == 'c') {
                    let temp = this.content.text.substring(this.content.selectStart, this.content.selectEnd);
                    navigator.clipboard.writeText(temp);
                }
                else if (this.parentBoard.isCtrlPressed == true && key == 'a') {
                    this.content.selectStart = 0;
                    this.content.selectEnd = this.content.text.length;
                }
                // type normal letters
                else {
                    this.addText(key);
                }
            }

            if (this.isSpecificType("text-beacon")) {
                this.parentBoard.beaconManager.updateModal();
            }
        }
    }

    // image methods
    // updates d2 w and h
    // used for axis aligned baby image...where d2 also has to be set before computing corners
    updateImageSize(w, h) {
        this.shape.diagonal.d2.moveTo(this.shape.diagonal.d1.x + w, this.shape.diagonal.d1.y + h);
        this.content.width = this.shape.diagonal.d2.x - this.shape.diagonal.d1.x;
        this.content.height = this.shape.diagonal.d2.y - this.shape.diagonal.d1.y;
    }

    // updates w and h to be used for showskewedimage()
    // updates w and h from diagonals for adults...as may be transformed
    updateContentDimensions() {
        this.content.width = this.shape.diagonal.d1.distance(this.shape.diagonal.d4.x, this.shape.diagonal.d4.y);
        this.content.height = this.shape.diagonal.d1.distance(this.shape.diagonal.d3.x, this.shape.diagonal.d3.y);
    }

    async imageSizePrompt(defaultValue = "", originalwidth, originalheight) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed; left: 50%; top: 0; transform: translateX(-50%);
                background-color: rgb(40, 40, 45); color: white; padding: 16px; /* 20px -> 16px */
                border-radius: 6px; box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.5); /* 8px -> 6px, 10 30 -> 8 24 */
                font-family: Arial, sans-serif; z-index: 10000;
                display: flex; flex-direction: column; gap: 12px; min-width: 240px; /* 15px -> 12px, 300px -> 240px */
            `;

            const label = document.createElement('div');
            label.innerHTML = 'enter image dimensions<br>enter a single number for scaling original dimensions';
            label.style.fontSize = "13px";

            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.style.cssText = `
                padding: 8px; font-size: 13px; border: 1px solid #555; /* 10px -> 8px, 16px -> 13px */
                border-radius: 3px; background: #111; color: white; outline: none; /* 4px -> 3px */
            `;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; /* 10px -> 8px, 5px -> 4px */
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = "Cancel";
            cancelBtn.style.cssText = `
                padding: 6px 13px; font-size: 11px; border: none; border-radius: 3px; /* 8px 16px -> 6px 13px, 14px -> 11px */
                background-color: #555; color: white; cursor: pointer;
            `;
            cancelBtn.onmouseenter = () => cancelBtn.style.backgroundColor = "#666";
            cancelBtn.onmouseleave = () => cancelBtn.style.backgroundColor = "#555";

            const okBtn = document.createElement('button');
            okBtn.textContent = "OK";
            okBtn.style.cssText = `
                padding: 6px 13px; font-size: 11px; border: none; border-radius: 3px;
                background-color: #007bff; color: white; cursor: pointer;
            `;
            okBtn.onmouseenter = () => okBtn.style.backgroundColor = "#0056b3";
            okBtn.onmouseleave = () => okBtn.style.backgroundColor = "#007bff";

            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);

            dialog.appendChild(label);
            dialog.appendChild(input);
            dialog.appendChild(buttonContainer);

            document.body.appendChild(dialog);

            input.focus();
            input.select();

            const closeDialog = (finalValue) => {
                document.body.removeChild(dialog);
                this.parentBoard.mainCanvas.canvasEl.focus();
                resolve(finalValue);
            };

            okBtn.addEventListener('click', () => {
                closeDialog(input.value);
            });

            cancelBtn.addEventListener('click', () => {
                this.updateImageSize(originalwidth, originalheight);
                this.parentBoard.setUpdate();
                closeDialog(null);
            });

            input.addEventListener('input', (e) => {
                let str = e.target.value;
                let arr = str.split(" ");
                let width, height;
                if (arr.length == 1) {
                    let multiplier = Number(arr[0]);
                    width = originalwidth * multiplier;
                    height = originalheight * multiplier;
                } else {
                    width = Number(arr[0]);
                    height = Number(arr[1]);
                }
                this.updateImageSize(width, height);
                this.parentBoard.setUpdate();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    closeDialog(input.value);
                }
                else if (e.key === 'Escape') {
                    e.stopPropagation();
                    this.updateImageSize(originalwidth, originalheight);
                    this.parentBoard.setUpdate();
                    closeDialog(null);
                }
            });
        });
    }

    async getfile() {
        this.parentBoard.parentSketch.activePointerId = null;

        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                resolve(file || null);
            });

            input.addEventListener('cancel', () => {
                this.parentBoard.isButtonAllowed = true;
                resolve(null);
            });

            input.click();
        });
    }

    async getb64(file) {
        if (!file) return null;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (readEvent) => {
                resolve(readEvent.target.result);
            };

            reader.onerror = () => reject(new Error("FileReader failed"));

            reader.readAsDataURL(file);
        });
    }

    async makeimgel(base64String) {
        if (!base64String) return null;

        return new Promise((resolve, reject) => {
            const imgElement = new Image();
            imgElement.onload = () => {
                resolve(imgElement);
            };
            imgElement.onerror = () => reject(new Error("Failed to decode Base64 into Image"));
            imgElement.src = base64String;
        });
    }

    async drawImageContent(_file) {
        let file;
        if (_file) {
            file = _file;
        } else {
            file = await this.getfile();
        }
        if (file) {
            let b64 = await this.getb64(file);
            let el = await this.makeimgel(b64);
            this.content.imageB64 = b64;
            this.content.imageEl = el;
            this.updateImageSize(this.content.imageEl.naturalWidth, this.content.imageEl.naturalHeight);

            let popup = this.imageSizePrompt(`${this.content.width} ${this.content.height}`, this.content.width, this.content.height);
        } else {
            this.parentBoard.drawer.abortEntity();
        }
    }
}

class point {
    constructor(_parententity, _x, _y, _isPixelErased = false) {
        this.x = _x;
        this.y = _y;
        this.parentEntity = _parententity;
        this.isPixelErased = _isPixelErased;
        this.memory = 0;
        this.homeTile = null;
    }

    toJSON(isJustId = false) {
        if (isJustId == true) {
            return undefined;
        }

        let fullDataClasses = [];
        let onlyRefClasses = [];
        let onlyRefKeys = [];

        const saveObj = { classType: this.constructor.name };

        const parseValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (val instanceof Set) {
                return Array.from(val).map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (fullDataClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON() : undefined;
            }
            if (onlyRefClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON(true) : undefined;
            }
            if (val.constructor.name === "Object") {
                let mirroredObj = {};
                for (let _key of Object.keys(val)) {
                    let parsedProp = parseValue(val[_key]);
                    if (parsedProp !== undefined) {
                        mirroredObj[_key] = parsedProp;
                    }
                }
                return mirroredObj;
            }
            return undefined;
        };

        for (let _key of Object.keys(this)) {
            if (onlyRefKeys.includes(_key)) {
                let finalValue = this[_key].toJSON(true);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            } else {
                let finalValue = parseValue(this[_key]);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            }
        }

        return saveObj;
    }

    fromJSON(_json) {
        const parseLoadedValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseLoadedValue(item));
            }
            if (typeof val === "object") {
                if (val.idStorageType !== undefined) {
                    return new idStorer(val.idStorageType, val.id, this.parentEntity.parentBoard.parentSketch);
                }
                if (val.classType !== undefined) {
                    const ClassBlueprint = ClassRegistry[val.classType];

                    let newInstance = new ClassBlueprint(this);
                    newInstance.fromJSON(val);
                    return newInstance;
                }
                let rebuiltObj = {};
                for (let k of Object.keys(val)) {
                    rebuiltObj[k] = parseLoadedValue(val[k]);
                }
                return rebuiltObj;
            }
        };

        for (let key of Object.keys(_json)) {
            if (key === "classType") continue;

            let parsedValue = parseLoadedValue(_json[key]);
            this[key] = parsedValue;
        }
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    moveBy(x, y) {
        this.x += x;
        this.y += y;
    }

    rotate(centerx, centery, angle) {
        const translatedX = this.x - centerx;
        const translatedY = this.y - centery;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rotatedX = translatedX * cos - translatedY * sin;
        const rotatedY = translatedX * sin + translatedY * cos;

        this.x = rotatedX + centerx;
        this.y = rotatedY + centery;
    }

    scale(centerx, centery, fx, fy) {
        let vectorx = this.memory.x - centerx;
        let vectory = this.memory.y - centery;

        vectorx *= fx;
        vectory *= fy;

        this.x = centerx + vectorx;
        this.y = centery + vectory;
    }

    updateAddress() {
        let currentTile = this.parentEntity.parentLayer.getTile(this.x, this.y);
        if (currentTile == null) {
            this.leaveTile();
        } else {
            if (currentTile == this.homeTile) {
                return;
            } else {
                this.leaveTile();
                this.joinTile(currentTile);
            }
        }
    }

    joinTile(_tile) {
        this.homeTile = _tile;
        _tile.lodgePoint(this);

        this.parentEntity.joinTile(_tile);
    }

    leaveTile() {
        if (this.homeTile != null) {
            this.homeTile.evictPoint(this);
            this.homeTile = null;
        }
    }

    distance(x, y) {
        return Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    }
    vectorTo(_point) {
        let vx = _point.x - this.x;
        let vy = _point.y - this.y;

        return { x: vx, y: vy };

    }
    setMemory() {
        this.memory = { x: this.x, y: this.y };
    }
    resetMemory() {
        this.memory = 0;
    }
}

class pixelEraseStroke {
    constructor(_parententity, _pesid, _linewidth, _rawVerts) {
        this.parentEntity = _parententity;
        this.pesId = _pesid;
        this.lineWidth = _linewidth;
        this.rawVerts = _rawVerts; // kept around because used in duplication
        this.verts = [];
        this.memory = 0;
        this.isActive = true;

        this.initVerts(this.rawVerts);
    }

    toJSON(isJustId = false) {
        if (isJustId == true) {
            return { idStorageType: "pes", id: this.pesId };
        }

        let fullDataClasses = ["point"];
        let onlyRefClasses = [];
        let onlyRefKeys = [];

        const saveObj = { classType: this.constructor.name };

        const parseValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (val instanceof Set) {
                return Array.from(val).map(item => parseValue(item)).filter(item => item !== undefined);
            }
            if (fullDataClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON() : undefined;
            }
            if (onlyRefClasses.includes(val.constructor.name)) {
                return val.toJSON ? val.toJSON(true) : undefined;
            }
            if (val.constructor.name === "Object") {
                let mirroredObj = {};
                for (let _key of Object.keys(val)) {
                    let parsedProp = parseValue(val[_key]);
                    if (parsedProp !== undefined) {
                        mirroredObj[_key] = parsedProp;
                    }
                }
                return mirroredObj;
            }
            return undefined;
        };

        for (let _key of Object.keys(this)) {
            if (onlyRefKeys.includes(_key)) {
                let finalValue = this[_key].toJSON(true);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            } else {
                let finalValue = parseValue(this[_key]);
                if (finalValue !== undefined) {
                    saveObj[_key] = finalValue;
                }
            }
        }

        return saveObj;
    }

    fromJSON(_json) {
        const parseLoadedValue = (val) => {
            if (val === null || typeof val !== "object") {
                return val;
            }
            if (Array.isArray(val)) {
                return val.map(item => parseLoadedValue(item));
            }
            if (typeof val === "object") {
                if (val.idStorageType !== undefined) {
                    return new idStorer(val.idStorageType, val.id, this.parentEntity.parentBoard.parentSketch);
                }
                if (val.classType !== undefined) {
                    const ClassBlueprint = ClassRegistry[val.classType];

                    let newInstance = new ClassBlueprint(this);
                    newInstance.fromJSON(val);
                    return newInstance;
                }
                let rebuiltObj = {};
                for (let k of Object.keys(val)) {
                    rebuiltObj[k] = parseLoadedValue(val[k]);
                }
                return rebuiltObj;
            }
        };

        for (let key of Object.keys(_json)) {
            if (key === "classType") continue;

            let parsedValue = parseLoadedValue(_json[key]);
            this[key] = parsedValue;
        }
    }

    initVerts(_rawVerts) {
        for (let _point of _rawVerts) {
            let p = new point(this.parentEntity, _point.x, _point.y);
            this.verts.push(p);
        }
    }

    show(_canvas) {
        _canvas.startpen();
        _canvas.setColor(255, 0, 0);
        _canvas.setLineWidth(this.lineWidth);
        _canvas.stroke(this.verts);
        _canvas.endpen();
    }

    translate(dx, dy) {
        for (let _point of this.verts) {
            _point.moveBy(dx, dy);
        }
    }

    rotate(cx, cy, da) {
        for (let _point of this.verts) {
            _point.rotate(cx, cy, da);
        }
    }

    scale(cx, cy, fx, fy) {
        this.lineWidth = this.memory * Math.sqrt(Math.abs(fx * fy));
        for (let _point of this.verts) {
            _point.scale(cx, cy, fx, fy);
        }
    }

    setPointMemory() {
        this.memory = this.lineWidth;
        for (let _point of this.verts) {
            _point.setMemory();
        }
    }

    resetPointMemory() {
        this.memory = 0;
        for (let _point of this.verts) {
            _point.resetMemory();
        }
    }

}

class idStorer {
    constructor(_type, _id, _sketch) {
        this.type = _type;
        this[`${_type}Id`] = _id;
        this.parentSketch = _sketch;
    }

    getRef() {
        if (this.type == "board") {
            for (let _board of this.parentSketch.boardSet) {
                if (_board.boardId == this.boardId) {
                    return _board;
                }
            }
        }
        if (this.type == "layer") {
            for (let _board of this.parentSketch.boardSet) {
                for (let _layer of _board.layerArr) {
                    if (_layer.layerId == this.layerId) {
                        return _layer;
                    }
                }
            }
        }
        if (this.type == "entity") {
            for (let _board of this.parentSketch.boardSet) {
                for (let _layer of _board.layerArr) {
                    for (let _entity of _layer.entityArr) {
                        if (_entity.entityId == this.entityId) {
                            return _entity;
                        }
                    }
                }
            }
        }
    }
}

function areObjectsEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (!obj1 || !obj2) return false;

    let keys1 = Object.keys(obj1);
    let keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (let key of keys1) {
        let val1 = obj1[key];
        let val2 = obj2[key];

        if (Array.isArray(val1) && Array.isArray(val2)) {
            if (val1.length !== val2.length) return false;

            for (let i = 0; i < val1.length; i++) {
                if (val1[i] !== val2[i]) return false;
            }
        }
        else if (val1 !== val2) {
            return false;
        }
    }

    return true;
}
function removeFromArray(arr, value) {
    const index = arr.indexOf(value);
    if (index !== -1) {
        arr.splice(index, 1);
    }
}
function setElementPosition(arr, element, newIndex) {
    const oldIndex = arr.indexOf(element);
    if (oldIndex === -1) return arr;
    newIndex = Math.max(0, Math.min(newIndex, arr.length - 1));
    const [item] = arr.splice(oldIndex, 1);
    arr.splice(newIndex, 0, item);
    return arr;
}
function hexToRgb(hex) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    return [r, g, b];
}
function rgbToHex([r, g, b]) {
    let hexR = r.toString(16).padStart(2, '0');
    let hexG = g.toString(16).padStart(2, '0');
    let hexB = b.toString(16).padStart(2, '0');

    return `#${hexR}${hexG}${hexB}`;
}
function remap(value, inMin, inMax, outMin, outMax) {
    if (inMin === inMax) return outMin;
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

// needed for automating recursively making classes from loadfile
const ClassRegistry = {
    "point": point,
    "pixelEraseStroke": pixelEraseStroke,
    "entity": entity,
    "layer": layer,
    "board": board,
    "Sketch": Sketch,
};

let n = new Not_e();
n.start();