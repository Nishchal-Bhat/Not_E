class note {
    constructor() {
        this.isDeviceTouch = false;

        // entity arrays
        this.pointEntities = [];
        this.imageEntities = [];

        this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

        // undo-redo arrays
        this.undoArr = [];
        this.redoArr = [];

        this.erasedStuffArr = [];

        this.deltaX = 0;
        this.deltaY = 0;
        this.selectedStuffArr = [];
        this.changingColor = false;

        // mouse state vars
        this.isLeftMouseDown = false;
        this.isRightMouseDown = false;
        this.isFingerDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.startX = 0;
        this.startY = 0;

        // drawing vars
        this.currentStrokeWeight = 4;
        this.currentStrokeStyle = 'solid';
        this.eraserSize = 30;
        this.currentColor = [255, 255, 255];
        this.backgroundColor = [0, 0, 0];
        this.currentTextSize = 30;
        this.updateNeeded = true;
        this.eraserCell = { x: 1, y: 1 };
        this.entityID = 0;

        // mode vars
        this.mode = 'stroke';
        this.currentMode = 'stroke';

        // canvas
        this.canvas;
        this.currentWidth = window.innerWidth + 100;
        this.currentHeight = window.innerHeight + 100;

        this.grid = {
            length: 0.7 * this.eraserSize,
            matrix: []
        };
    }

    async addEntity(_type, _file) {
        if (_type == 'image') {
            if (_file.type === 'image') {
                let dimensions = window.prompt(`Enter desired image width and height seperated by a space.\nFor example: 100 100 \nYour screen size is ${window.innerWidth} ${window.innerHeight} \nLeave blank for default image dimensions.`, "");

                let imagedata = await createImg(_file.data).hide();
                imagedata.elt.onload = () => {
                    let img = {
                        type: 'image',
                        id: this.entityID,
                        x0: this.mouseX, y0: this.mouseY,
                        width: dimensions == "" ? imagedata.width : Number(dimensions.split(" ")[0]),
                        height: dimensions == "" ? imagedata.height : Number(dimensions.split(" ")[1]),
                        data: _file.data,
                        content: imagedata,
                        status: 'moving'
                    };
                    this.imageEntities.push(img);

                    this.undoArr.push({ type: _type, id: img.id });
                    this.redoArr = [];
                };
            } else {
                window.alert("That's not an image file");
            }
        } else {
            let entity;
            if (_type == 'line') {
                entity = {
                    type: 'line',
                    id: this.entityID,
                    x0: this.mouseX, y0: this.mouseY,
                    x1: this.mouseX, y1: this.mouseY,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle
                };
            }

            if (_type == 'stroke') {
                entity = {
                    type: 'stroke',
                    id: this.entityID,
                    arr: [{ x: this.mouseX, y: this.mouseY, id: this.entityID }],
                    status: 'drawing',
                    color: this.currentColor,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle
                };
            }

            if (_type == 'rect') {
                entity = {
                    type: 'rect',
                    id: this.entityID,
                    x0: this.mouseX, y0: this.mouseY,
                    x1: this.mouseX, y1: this.mouseY,
                    width: 0,
                    height: 0,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle
                };
            }

            if (_type == 'text') {
                entity = {
                    type: 'text',
                    id: this.entityID,
                    x0: this.mouseX, y0: this.mouseY,
                    x1: this.mouseX, y1: this.mouseY,
                    width: 100,
                    height: 50,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    movingColor: 0,
                    size: this.currentTextSize,
                    content: ""
                };
            }

            this.pointEntities.push(entity);

            this.undoArr.push({ type: _type, id: entity.id });
            this.redoArr = [];
        }


        this.updateNeeded = true;
    }

    finishEntity() {
        if (this.mode == 'image') {
            if (this.imageEntities.length > 0 && this.imageEntities[this.imageEntities.length - 1].status == 'moving') {
                this.imageEntities[this.imageEntities.length - 1].status = 'drawn';
                this.mode = this.currentMode;

                this.entityID++;
            }
        } else if (this.pointEntities.length > 0 && (this.pointEntities[this.pointEntities.length - 1].status == 'drawing' || this.pointEntities[this.pointEntities.length - 1].status == 'moving')) {

            let currententity = this.pointEntities[this.pointEntities.length - 1];
            if (currententity.type == 'line') {
                let temparr = [];
                let resolution = 30;
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: currententity.x0 + (currententity.x1 - currententity.x0) * i / resolution,
                        y: currententity.y0 + (currententity.y1 - currententity.y0) * i / resolution,
                        id: currententity.id
                    });
                }
                currententity.arr = temparr;
                currententity.status = 'drawn';
            }

            if (currententity.type == 'stroke') {
                if (currententity.arr.length > 30) {
                    currententity.arr = this.reduceArr(currententity.arr);
                }
                currententity.status = 'drawn';
            }

            if (currententity.type == 'rect') {
                let temparr = [];
                let resolution = 30;

                currententity.width = currententity.x1 - currententity.x0;
                currententity.height = currententity.y1 - currententity.y0;

                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: currententity.x0 + ((currententity.width) * i / resolution),
                        y: currententity.y0,
                        id: currententity.id
                    });
                }
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: currententity.x1,
                        y: currententity.y0 + (currententity.height) * i / resolution,
                        id: currententity.id

                    });
                }
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: currententity.x1 - (currententity.width) * i / resolution,
                        y: currententity.y1,
                        id: currententity.id
                    });
                }
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: currententity.x0,
                        y: currententity.y1 - (currententity.height) * i / resolution,
                        id: currententity.id
                    });
                }
                currententity.arr = temparr;
                currententity.status = 'drawn';

            }

            if (currententity.type == 'text') {
                if (currententity.status == 'moving') {
                    currententity.x1 = currententity.x0 + currententity.width;
                    currententity.y1 = currententity.y0 + currententity.height;

                    let temparr = [];
                    let resolution = 30;

                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: currententity.x0 + ((currententity.width) * i / resolution),
                            y: currententity.y0,
                            id: currententity.id
                        });
                    }
                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: currententity.x1,
                            y: currententity.y0 + (currententity.height) * i / resolution,
                            id: currententity.id

                        });
                    }
                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: currententity.x1 - (currententity.width) * i / resolution,
                            y: currententity.y1,
                            id: currententity.id
                        });
                    }
                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: currententity.x0,
                            y: currententity.y1 - (currententity.height) * i / resolution,
                            id: currententity.id
                        });
                    }
                    currententity.arr = temparr;
                    currententity.status = 'drawn';
                }

                if (currententity.status == 'drawing') {
                    currententity.x0 = this.mouseX;
                    currententity.y0 = this.mouseY;
                    currententity.status = 'moving';
                }
            }
            this.populateGrid();


            this.entityID++;
        }

        this.updateNeeded = true;
    }

    showEntity(_entity) {
        push();
        if (_entity.type == 'line') {
            strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            line(_entity.x0, _entity.y0, _entity.x1, _entity.y1);
        }

        if (_entity.type == 'stroke') {
            strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            noFill();
            beginShape();
            for (let point of _entity.arr) {
                vertex(point.x, point.y);
            }
            endShape();
        }

        if (_entity.type == 'rect') {
            strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);

            }
            noFill();
            rect(_entity.x0, _entity.y0, _entity.x1 - _entity.x0, _entity.y1 - _entity.y0);
        }

        if (_entity.type == 'text') {
            strokeWeight(1);
            textSize(_entity.size);
            if (_entity.movingColor == 0) {
                stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
                fill(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                fill(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            textAlign(LEFT, TOP);
            text(_entity.content, _entity.x0, _entity.y0);

            // draw dotted rectangle around text
            if (_entity.status == 'drawing' || _entity.status == 'moving') {
                noFill();
                drawingContext.setLineDash([10, 10]);
                rect(_entity.x0 - 5, _entity.y0 - 5, _entity.width + 10, _entity.height + 10);
            }
        }
        pop();
    }

    showImage(_entity) {
        push();
        if (_entity.status == 'moving') {
            stroke(255, 0, 0);
            noFill();
            drawingContext.setLineDash([10, 10]);
            rect(_entity.x0 - 5, _entity.y0 - 5, _entity.width + 10, _entity.height + 10);
        }
        image(_entity.content, _entity.x0, _entity.y0, _entity.width, _entity.height);
        pop();
    }

    showSelectionBox() {
        push();
        strokeWeight(1);
        stroke(255, 0, 0);
        noFill();
        drawingContext.setLineDash([7, 7]);
        rect(this.selectionBox.x0, this.selectionBox.y0, this.selectionBox.x1 - this.selectionBox.x0, this.selectionBox.y1 - this.selectionBox.y0);
        pop();
    }

    makeSelection() {
        for (let _entity of this.pointEntities) {
            for (let _point of _entity.arr) {
                if (this.selectionBox.x0 < _point.x && _point.x < this.selectionBox.x1 && this.selectionBox.y0 < _point.y && _point.y < this.selectionBox.y1) {
                    this.selectedStuffArr.push(_entity.id);
                    break;
                }
                if (this.selectionBox.x0 > _point.x && _point.x > this.selectionBox.x1 && this.selectionBox.y0 > _point.y && _point.y > this.selectionBox.y1) {
                    this.selectedStuffArr.push(_entity.id);
                    break;
                }

                if (this.selectionBox.x0 > _point.x && _point.x > this.selectionBox.x1 && this.selectionBox.y0 < _point.y && _point.y < this.selectionBox.y1) {
                    this.selectedStuffArr.push(_entity.id);
                    break;
                }

                if (this.selectionBox.x0 < _point.x && _point.x < this.selectionBox.x1 && this.selectionBox.y0 > _point.y && _point.y > this.selectionBox.y1) {
                    this.selectedStuffArr.push(_entity.id);
                    break;
                }
            }
        }
    }

    highlightSelectedEntities() {
        this.changingColor = true;
        setTimeout(() => {
            let color = [random(255), random(255), random(255)];
            for (let _id of this.selectedStuffArr) {
                if (this.mode == 'moving') {
                    this.pointEntities.find(e => e.id == _id).movingColor = color;
                }
            }
            this.changingColor = false;
        }, 300);
    }

    moveSelections(event) {
        for (let _id of this.selectedStuffArr) {
            let _entity = this.pointEntities.find(e => e.id == _id);
            if (_entity.type == 'line') {
                _entity.x0 += event.movementX;
                _entity.y0 += event.movementY;
                _entity.x1 += event.movementX;
                _entity.y1 += event.movementY;
                for (let _point of _entity.arr) {
                    _point.x += event.movementX;
                    _point.y += event.movementY;
                }
            }
            if (_entity.type == 'stroke') {
                for (let _point of _entity.arr) {
                    _point.x += event.movementX;
                    _point.y += event.movementY;
                }
            }
            if (_entity.type == 'rect') {
                _entity.x0 += event.movementX;
                _entity.y0 += event.movementY;
                _entity.x1 += event.movementX;
                _entity.y1 += event.movementY;
                for (let _point of _entity.arr) {
                    _point.x += event.movementX;
                    _point.y += event.movementY;
                }
            }
            if (_entity.type == 'text') {
                _entity.x0 += event.movementX;
                _entity.y0 += event.movementY;
                _entity.x1 += event.movementX;
                _entity.y1 += event.movementY;
                for (let _point of _entity.arr) {
                    _point.x += event.movementX;
                    _point.y += event.movementY;
                }
            }

        }
    }

    finishMoving() {
        for (let _id of this.selectedStuffArr) {
            let _entity = this.pointEntities.find(e => e.id == _id);
            _entity.movingColor = 0;
        }

        this.undoArr.push({
            type: 'moved', entities: this.selectedStuffArr,
            deltaX: this.deltaX,
            deltaY: this.deltaY
        });
        this.redoArr = [];

        this.selectedStuffArr = [];
        this.deltaX = 0;
        this.deltaY = 0;

        this.populateGrid();

        this.updateNeeded = true;
    }

    drawEntity(_type) {
        if (_type == 'image' && this.imageEntities.length > 0 && this.imageEntities[this.imageEntities.length - 1].status == 'moving') {
            this.imageEntities[this.imageEntities.length - 1].x0 = this.mouseX;
            this.imageEntities[this.imageEntities.length - 1].y0 = this.mouseY;
        }

        if (_type == 'text' && this.pointEntities.length > 0 && this.pointEntities[this.pointEntities.length - 1].status == 'moving') {
            this.pointEntities[this.pointEntities.length - 1].x0 = this.mouseX;
            this.pointEntities[this.pointEntities.length - 1].y0 = this.mouseY;
        }

        if (_type == 'line' || _type == 'rect') {
            if (this.pointEntities.length > 0 && this.pointEntities[this.pointEntities.length - 1].status == 'drawing') {
                this.pointEntities[this.pointEntities.length - 1].x1 = this.mouseX;
                this.pointEntities[this.pointEntities.length - 1].y1 = this.mouseY;
            }
        }

        if (_type == 'stroke') {
            if (this.pointEntities.length > 0 && this.pointEntities[this.pointEntities.length - 1].status == 'drawing') {
                this.pointEntities[this.pointEntities.length - 1].arr.push({ x: this.mouseX, y: this.mouseY, id: this.entityID });
            }
        }

        if (this.mode == 'select') {
            this.selectionBox.x1 = this.mouseX;
            this.selectionBox.y1 = this.mouseY;
        }
    }

    erase() {
        // draw eraser UI
        strokeWeight(1);
        stroke(255, 182, 193);
        fill(255, 182, 193);
        circle(this.mouseX, this.mouseY, this.eraserSize * 2);

        let coordy = Math.floor(this.mouseY / this.grid.length);
        let coordx = Math.floor(this.mouseX / this.grid.length);

        this.eraserCell = { y: coordy, x: coordx };

        try {
            // 0
            for (let _point of this.grid.matrix[this.eraserCell.y][this.eraserCell.x].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // E
            for (let _point of this.grid.matrix[this.eraserCell.y][this.eraserCell.x + 1].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // S
            for (let _point of this.grid.matrix[this.eraserCell.y + 1][this.eraserCell.x].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // SE
            for (let _point of this.grid.matrix[this.eraserCell.y + 1][this.eraserCell.x + 1].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // W
            for (let _point of this.grid.matrix[this.eraserCell.y][this.eraserCell.x - 1].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // N
            for (let _point of this.grid.matrix[this.eraserCell.y - 1][this.eraserCell.x].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // NW
            for (let _point of this.grid.matrix[this.eraserCell.y - 1][this.eraserCell.x - 1].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // NE
            for (let _point of this.grid.matrix[this.eraserCell.y - 1][this.eraserCell.x + 1].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
            // SW
            for (let _point of this.grid.matrix[this.eraserCell.y + 1][this.eraserCell.x - 1].points) {
                if ((this.mouseY - _point.y) ** 2 + (this.mouseX - _point.x) ** 2 < this.eraserSize ** 2) {
                    let _entity = this.pointEntities.find(e => e.id == _point.id);
                    if (_entity) {
                        this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
        }
        catch {
        }

    }

    remove() {
        for (let _img of this.imageEntities) {
            if (_img.x0 < this.mouseX && this.mouseX < _img.x0 + _img.width && _img.y0 < this.mouseY && this.mouseY < _img.y0 + _img.height) {
                this.imageEntities.splice(this.imageEntities.indexOf(_img), 1);
                this.erasedStuffArr.push(_img);
                this.undoArr.push({ type: 'removed', id: _img.id });
                this.redoArr = [];
            }
        }

        for (let _entity of this.pointEntities) {
            if (_entity.type == 'text') {
                if (_entity.x0 < this.mouseX && this.mouseX < _entity.x1 && _entity.y0 < this.mouseY && this.mouseY < _entity.y1) {
                    this.pointEntities.splice(this.pointEntities.indexOf(_entity), 1);
                    this.erasedStuffArr.push(_entity);
                    this.undoArr.push({ type: 'erased', id: _entity.id });
                    this.redoArr = [];
                }

            }
        }
    }

    keyPressed() {
        if (this.mode == 'text' && this.pointEntities.length > 0 && this.pointEntities[this.pointEntities.length - 1].status == 'drawing') {
            let currententity = this.pointEntities[this.pointEntities.length - 1];
            // ignore special keys
            if (key == 'Enter' || key == 'Shift' || key == 'Backspace' || key == 'Alt' || key == 'Control' || key == 'Tab' || key == 'Escape' || key.includes('Arrow')) {
                // shift enter for newline...also update text entity height with each newline
                if (keyIsDown(16) == true && key == 'Enter') {
                    currententity.content += `\n`;
                    currententity.height += currententity.size * 1.25;
                }
                // backspace 
                else if (key == 'Backspace') {
                    currententity.content = currententity.content.substring(0, currententity.content.length - 1);
                }
                // finish current text 
                else if (key == 'Enter') {
                    this.finishEntity();
                }
            }
            // type character keys 
            else {
                // uppercase when shift pressed
                if (keyIsDown(16) == true) {
                    currententity.content += `${key.toUpperCase()}`;
                } else {
                    currententity.content += `${key}`;
                }
            }
            // update text entity width
            textSize(this.currentTextSize);
            currententity.width = textWidth(currententity.content) > 100 ? textWidth(currententity.content.split('\n').reduce((a, b) => a.length > b.length ? a : b, "")) + 20 : 100;
        }
        // shortcuts 
        else if ((this.pointEntities.length > 0 && this.pointEntities[this.pointEntities.length - 1].status != 'drawing' && this.pointEntities[this.pointEntities.length - 1].status != 'moving') || this.pointEntities.length == 0) {
            // colors
            if (key == '`') {
                this.currentColor = [255, 255, 255];
                colorDisplay.value('#ffffff');
            }
            if (key == '1') {
                this.currentColor = [255, 0, 0];
                colorDisplay.value('#ff0000');
            }
            if (key == '2') {
                this.currentColor = [0, 255, 0];
                colorDisplay.value('#00ff00');
            }
            if (key == '3') {
                this.currentColor = [0, 170, 255];
                colorDisplay.value('#00aaff');
            }
            if (key == '4') {
                this.currentColor = [255, 255, 0];
                colorDisplay.value('#ffff00');
            }
            if (key == '5') {
                this.currentColor = [0, 0, 0];
                colorDisplay.value('#000000');
            }
            // stroke
            if (key == 'q') {
                if (this.isRightMouseDown == false) {
                    if (this.mode == 'erase') {
                        if (this.eraserSize > 1) {
                            this.eraserSize -= 5;
                        }
                    }
                    if (this.mode == 'text') {
                        if (this.currentTextSize > 1) {
                            this.currentTextSize--;
                        }
                    } else {
                        if (this.currentStrokeWeight > 1) {
                            this.currentStrokeWeight--;
                        }
                    }
                } else {
                    if (this.eraserSize > 1) {
                        this.eraserSize -= 5;
                    }
                }
            }
            if (key == 'w') {
                if (this.isRightMouseDown == false) {
                    if (this.mode == 'erase') {
                        this.eraserSize += 5;
                    }
                    if (this.mode == 'text') {
                        this.currentTextSize++;
                    } else {
                        this.currentStrokeWeight++;
                    }
                } else {
                    this.eraserSize += 5;
                }
            }
            if (key == 'e') {
                this.currentStrokeStyle = this.currentStrokeStyle == 'solid' ? 'dash' : 'solid';
            }
            // modes
            if (key == 'a') {
                this.mode = 'line';
                this.currentMode = 'line';
            }
            if (key == 's') {
                this.mode = 'stroke';
                this.currentMode = 'stroke';
            }
            if (key == 'd') {
                this.mode = 'rect';
                this.currentMode = 'rect';
            }
            if (key == 'f') {
                this.mode = 'text';
                this.currentMode = 'text';
            }
            // misc
            if (key == 'z') {
                this.undo();
            }
            if (key == 'x') {
                this.redo();
            }
            if (key == 'v') {
                this.mode = this.mode == 'erase' ? this.currentMode : 'erase';
            }
            if (key == 'c') {
                this.mode = 'select';
                this.currentMode = 'select';
                this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
            }
        }

        this.updateNeeded = true;
    }

    mousePressed(event) {
        if (this.isDeviceTouch == false) {
            this.mouseX = mouseX;
            this.mouseY = Math.max(mouseY, 0);
            // only detect presses on canvas
            if (event.srcElement.id == 'defaultCanvas0') {
                // fresh left click
                if (mouseButton == LEFT && this.isLeftMouseDown == false && this.isRightMouseDown == false && this.mode != 'remove') {
                    if (this.mode == 'select') {
                        this.selectionBox.x0 = this.mouseX;
                        this.selectionBox.y0 = this.mouseY;
                        this.selectionBox.x1 = this.mouseX;
                        this.selectionBox.y1 = this.mouseY;
                    }

                    if (this.mode == 'line' || this.mode == 'stroke' || this.mode == 'rect') {
                        this.addEntity(this.mode);
                    }

                    if (this.mode == 'text' && this.mode != 'remove') {
                        if (this.pointEntities.length == 0) {
                            this.addEntity('text');
                        } else if (this.pointEntities[this.pointEntities.length - 1].status != 'moving' && this.pointEntities[this.pointEntities.length - 1].status != 'drawing') {
                            this.addEntity('text');
                        } else if (this.pointEntities[this.pointEntities.length - 1].status == 'drawing') {
                            this.finishEntity();
                        }
                    }

                    if (this.mode == 'image') {
                        this.drawEntity(this.mode);
                    }

                }

                // update mouse state vars
                if (event.button == 0) {
                    this.isLeftMouseDown = true;
                    if (this.mode == 'erase') {
                        this.isRightMouseDown = true;
                    }
                }
                if (event.button == 2) {
                    this.isRightMouseDown = true;
                }
            }

            this.updateNeeded = true;
        }
    }

    mouseReleased(event) {
        if (this.isDeviceTouch == false) {
            // update mouse state vars
            if (event.button == 0) {
                this.isLeftMouseDown = false;
                if (this.mode == 'erase') {
                    this.isRightMouseDown = false;
                }
            }
            if (event.button == 2) {
                this.isRightMouseDown = false;
            }
        }
        this.updateNeeded = true;
    }

    mouseClicked() {
        if (this.isDeviceTouch == false) {
            this.mouseX = mouseX;
            this.mouseY = Math.max(mouseY, 0);

            if ((this.mode == 'line' || this.mode == 'stroke' || this.mode == 'rect') && this.isLeftMouseDown == false) {
                this.finishEntity();
            }

            if (this.mode == 'image') {
                if (this.imageEntities.length > 0 && this.imageEntities[this.imageEntities.length - 1].status == 'moving') {
                    this.finishEntity();
                }
            }
            if (this.mode == 'text') {
                if (this.pointEntities.length > 0 && this.pointEntities[this.pointEntities.length - 1].status == 'moving') {
                    this.finishEntity();
                }
            }

            if (this.mode == 'moving' && this.isLeftMouseDown == false) {
                this.finishMoving();
                this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
                this.mode = 'select';
            } else if (this.mode == 'select' && this.isLeftMouseDown == false) {
                this.makeSelection();
                if (this.selectedStuffArr.length > 0) {
                    this.mode = 'moving';
                } else {
                    this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
                    this.mode = 'select';
                }
            }

            this.updateNeeded = true;
        }
    }

    mouseDragged(event) {
        if (this.isDeviceTouch == false) {
            this.mouseX = mouseX;
            this.mouseY = Math.max(mouseY, 0);
            if (this.mode == 'moving' && this.isLeftMouseDown == true) {
                this.moveSelections(event);
                this.deltaX += event.movementX;
                this.deltaY += event.movementY;
            } else if (this.mode == 'remove') {
                if (this.isLeftMouseDown == true) {
                    this.remove();
                }
            } else if (this.isRightMouseDown == true) {
                this.erase();
            } else if (this.isLeftMouseDown == true) {
                this.drawEntity(this.mode);
            }
        }
    }

    touchStarted(event) {
        if (this.isDeviceTouch == true) {
            this.mouseX = event.touches[0].clientX;
            this.mouseY = Math.max(event.touches[0].clientY - buttonWidth, 0);

            this.startX = event.touches[0].clientX;
            this.startY = event.touches[0].clientY;

            if (event.target.id == 'defaultCanvas0') {

                if (this.mode == 'select') {
                    this.selectionBox.x0 = this.mouseX;
                    this.selectionBox.y0 = this.mouseY;
                    this.selectionBox.x1 = this.mouseX;
                    this.selectionBox.y1 = this.mouseY;
                }

                if (this.mode == 'line' || this.mode == 'stroke' || this.mode == 'rect') {
                    this.addEntity(this.mode);
                }

                if (this.mode == 'text' && this.mode != 'remove') {
                    if (this.pointEntities.length == 0) {
                        this.addEntity('text');
                    } else if (this.pointEntities[this.pointEntities.length - 1].status != 'moving' && this.pointEntities[this.pointEntities.length - 1].status != 'drawing') {
                        this.addEntity('text');
                    } else if (this.pointEntities[this.pointEntities.length - 1].status == 'drawing') {
                        this.finishEntity();
                    }
                }

                if (this.mode == 'image') {
                    this.drawEntity(this.mode);
                }

                this.isFingerDown = true;
            }
            this.updateNeeded = true;
        }
    }

    touchEnded() {
        if (this.isDeviceTouch == true) {
            // update mouse state vars
            this.isFingerDown = false;

            if ((this.mode == 'line' || this.mode == 'stroke' || this.mode == 'rect') && this.isLeftMouseDown == false) {
                this.finishEntity();
            }

            if (this.mode == 'image') {
                if (this.imageEntities.length > 0 && this.imageEntities[this.imageEntities.length - 1].status == 'moving') {
                    this.imageEntities[this.imageEntities.length - 1].status = 'drawn';
                    this.mode = this.currentMode;
                }
            }
            if (this.mode == 'text') {
                if (this.pointEntities[this.pointEntities.length - 1].status == 'moving') {
                    this.finishEntity();
                }
            }

            if (this.mode == 'moving' && this.isLeftMouseDown == false) {
                this.finishMoving();
                this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
                this.mode = 'select';
            } else if (this.mode == 'select' && this.isLeftMouseDown == false) {
                this.makeSelection();
                if (this.selectedStuffArr.length > 0) {
                    this.mode = 'moving';
                } else {
                    this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
                    this.mode = 'select';
                }
            }

            this.updateNeeded = true;
        }
    }

    touchMoved(event) {
        if (this.isDeviceTouch == true) {
            this.mouseX = event.touches[0].clientX;
            this.mouseY = Math.max(event.touches[0].clientY - buttonWidth, 0);

            event.movementX = event.touches[0].clientX - this.startX;
            event.movementY = event.touches[0].clientY - this.startY;

            this.startX = event.touches[0].clientX;
            this.startY = event.touches[0].clientY;

            if (this.mode == 'moving') {
                this.moveSelections(event);
                this.deltaX += event.movementX;
                this.deltaY += event.movementY;
            } else if (this.mode == 'remove') {
                this.remove();
            } else if (this.mode == 'erase') {
                this.erase();
            } else if (this.isFingerDown == true) {
                this.drawEntity(this.mode);
            }

            this.updateNeeded = true;
        }
    }

    reduceArr(arr) {
        // array to store redundant points indices
        let deleteArr = [];

        for (let point = 1; point < arr.length - 1; point++) {
            // calculate number of remaining points
            let numberOfZeroes = 0;
            for (let index in arr) {
                if (deleteArr.includes(Number(index))) { numberOfZeroes++; }
            }
            let remainingPoints = arr.length - numberOfZeroes;
            // only continue marking redundant points if more than 30 points exist
            if (remainingPoints > 30) {
                let vector1 = { x: arr[point - 1].x - arr[point].x, y: arr[point - 1].y - arr[point].y };
                let vector2 = { x: arr[point + 1].x - arr[point].x, y: arr[point + 1].y - arr[point].y };

                // identity and mark redundant points
                if (Math.abs(this.angle(vector1, vector2)) > 175) {
                    deleteArr.push(point);
                }
            } else {
                break;
            }
        }

        // set redundant points to zero
        for (let i in arr) {
            if (deleteArr.includes(Number(i))) {
                arr[i] = 0;
            }
        }

        // extract non-redundant points
        let result = arr.filter(point => point !== 0);
        return result;
    }

    angle(vector1, vector2) {
        let dotproduct = vector1.y * vector2.y + vector1.x * vector2.x;

        let mag1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
        let mag2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

        return (Math.acos(dotproduct / (mag1 * mag2))) * (180 / Math.PI);
    }

    makeGrid() {
        for (let y = 0; y < this.currentHeight; y += this.grid.length) {
            this.grid.matrix.push([]);
            for (let x = 0; x < this.currentWidth; x += this.grid.length) {
                this.grid.matrix[this.grid.matrix.length - 1].push({ x: x, y: y, points: [] });
            }
        }
    }

    populateGrid() {
        this.grid = {
            length: 0.7 * this.eraserSize,
            matrix: []
        };

        this.makeGrid();

        for (let _entity of this.pointEntities) {
            if (_entity.type != 'text') {
                for (let _point of _entity.arr) {
                    let coordY = Math.floor(_point.y / this.grid.length);
                    let coordX = Math.floor(_point.x / this.grid.length);

                    this.grid.matrix[coordY][coordX].points.push(_point);
                }
            }
        }
    }

    undo() {
        try {
            if (this.undoArr.length > 0) {
                let activity = this.undoArr.pop();
                this.redoArr.push(activity);

                if (activity.type == 'line' || activity.type == 'stroke' || activity.type == 'rect' || activity.type == 'text') {
                    let entity = this.pointEntities.find(e => e.id == activity.id);
                    this.pointEntities.splice(this.pointEntities.indexOf(entity), 1);
                    this.erasedStuffArr.push(entity);
                }
                if (activity.type == 'image') {
                    let entity = this.imageEntities.find(e => e.id == activity.id);
                    this.imageEntities.splice(this.imageEntities.indexOf(entity), 1);
                    this.erasedStuffArr.push(entity);
                }

                if (activity.type == 'erased') {
                    let erased = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(erased), 1);
                    this.pointEntities.push(erased);
                }
                if (activity.type == 'removed') {
                    let erased = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(erased), 1);
                    this.imageEntities.push(erased);
                }

                if (activity.type == 'moved') {
                    for (let _id of activity.entities) {
                        let _entity = this.pointEntities.find(e => e.id == _id);
                        for (let _point of _entity.arr) {
                            _point.x -= activity.deltaX;
                            _point.y -= activity.deltaY;
                        }
                        if (_entity.type != 'stroke') {
                            _entity.x0 -= activity.deltaX;
                            _entity.y0 -= activity.deltaY;
                            _entity.x1 -= activity.deltaX;
                            _entity.y1 -= activity.deltaY;
                        }
                    }
                }
            }
        }
        catch (err) {
            window.alert('error undoing');
        }

        this.populateGrid();
    }

    redo() {
        try {
            if (this.redoArr.length > 0) {
                let activity = this.redoArr.pop();
                this.undoArr.push(activity);

                if (activity.type == 'line' || activity.type == 'stroke' || activity.type == 'rect' || activity.type == 'text') {
                    let entity = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(entity), 1);
                    this.pointEntities.push(entity);
                }
                if (activity.type == 'image') {
                    let entity = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(entity), 1);
                    this.imageEntities.push(entity);
                }

                if (activity.type == 'erased') {
                    let restored = this.pointEntities.find(e => e.id == activity.id);
                    this.pointEntities.splice(this.pointEntities.indexOf(restored), 1);
                    this.erasedStuffArr.push(restored);
                }
                if (activity.type == 'removed') {
                    let restored = this.imageEntities.find(e => e.id == activity.id);
                    this.imageEntities.splice(this.imageEntities.indexOf(restored), 1);
                    this.erasedStuffArr.push(restored);
                }

                if (activity.type == 'moved') {
                    for (let _id of activity.entities) {
                        let _entity = this.pointEntities.find(e => e.id == _id);
                        for (let _point of _entity.arr) {
                            _point.x += activity.deltaX;
                            _point.y += activity.deltaY;
                        }
                        if (_entity.type != 'stroke') {
                            _entity.x0 += activity.deltaX;
                            _entity.y0 += activity.deltaY;
                            _entity.x1 += activity.deltaX;
                            _entity.y1 += activity.deltaY;
                        }
                    }
                }
            }
        }
        catch (err) {
            window.alert('error redoing');
        }

        this.populateGrid();
    }
}

// UI elements
let colorDisplay;
let lineModeButton;
let strokeModeButton;
let textModeButton;
let rectModeButton;
let selectModeButton;
let eraseModeButton;
let removeModeButton;
let strokeWeightDisplay;
let solidStyleButton;
let dashStyleButton;
let undoButton;
let redoButton;

let screenratio = window.innerWidth / window.innerHeight;

let heightdenominator = 17.5;
let widthdenominator = heightdenominator * screenratio;

let buttonHeight = window.innerHeight / heightdenominator;

let buttonWidth = window.innerWidth / widthdenominator;

let buttonFont = buttonWidth / 2.1;
let spacing = buttonWidth / 2.5;

let n = new note();

// disable right click and spacebar scroll
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', function (e) {
    if (e.code == 'Space' && e.target == document.body) {
        e.preventDefault();
    }
});

window.onbeforeunload = function () {
    return "";
};

function setup() {
    if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
        n.isDeviceTouch = true;
    }
    else {
        n.isDeviceTouch = false;
    }

    // make canvas
    canvas = createCanvas(n.currentWidth, n.currentHeight).position(0, buttonHeight);
    canvas.style('touch-action : none');

    // set background color
    background(n.backgroundColor[0], n.backgroundColor[1], n.backgroundColor[2]);

    // infinite sroll
    canvas.mouseWheel((e) => {
        if (window.innerHeight + window.scrollY >= n.currentHeight - 100) {
            if (e.deltaY > 0) {
                n.currentHeight += 100;
                resizeCanvas(n.currentWidth, n.currentHeight);
                n.updateNeeded = true;
            }
        }

        if (window.innerWidth + window.scrollX >= n.currentWidth - 100) {
            if (e.deltaX > 0) {
                n.currentWidth += 100;
                resizeCanvas(n.currentWidth, n.currentHeight);
                n.updateNeeded = true;
            }
        }


    });

    // make UI elements
    let topbar = createDiv().position(0, 0).size(buttonPos(22, 8), buttonHeight).style('background-color:rgb(70,70,120)').style('position : fixed');

    colorDisplay = createColorPicker('white').position(0, 0).size(buttonWidth, buttonHeight).attribute('title', "set brush color").style('position : fixed');
    colorDisplay.input(() => {
        let value = hexToRgb(colorDisplay.value());
        n.currentColor = [value.r, value.g, value.b];
    });
    let colorbutton = createButton('OK').position(buttonPos(1, 0), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont / 1.5}px`).style('position : fixed');

    lineModeButton = createButton('📏').position(buttonPos(2, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "line mode").style('position : fixed');
    lineModeButton.mouseClicked(() => {
        n.isRightMouseDown = false;
        n.mode = 'line'; n.currentMode = 'line';
    });
    strokeModeButton = createButton('🖊').position(buttonPos(3, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "freehand mode").style('position : fixed');
    strokeModeButton.mouseClicked(() => {
        n.isRightMouseDown = false;
        n.mode = 'stroke';
        n.currentMode = 'stroke';
    });
    rectModeButton = createButton('🟥').position(buttonPos(4, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "rectangle mode").style('position : fixed');
    rectModeButton.mouseClicked(() => {
        n.isRightMouseDown = false;
        n.mode = 'rect'; n.currentMode = 'rect';
    });
    textModeButton = createButton('₸').position(buttonPos(5, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "text mode").style('position : fixed');
    textModeButton.mouseClicked(() => {
        n.isRightMouseDown = false;
        n.mode = 'text';
        n.currentMode = 'text';
    });
    let picButton = createButton('🖼').position(buttonPos(6, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "insert image").style('position : fixed');
    picButton.mouseClicked(() => {
        n.mode = 'image';
        input = createFileInput((file) => { n.addEntity('image', file); });
        input.hide();
        input.elt.click();
    });

    eraseModeButton = createButton('🧽').position(buttonPos(7, 2), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "erase mode").style('position : fixed');
    eraseModeButton.mouseClicked(() => {
        n.mode = n.mode == 'erase' ? n.currentMode : 'erase';
    });
    removeModeButton = createButton('X').position(buttonPos(8, 2), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "remove text and images").style('position : fixed');
    removeModeButton.mouseClicked(() => {
        n.mode = n.mode == 'remove' ? n.currentMode : 'remove';
        n.updateNeeded = true;
    });
    selectModeButton = createButton('⛶').position(buttonPos(9, 2), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "select mode").style('position : fixed');
    selectModeButton.mouseClicked(() => {
        n.mode = 'select';
    });

    let strokeMinusButton = createButton(' ⎼ ').position(buttonPos(10, 3), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "decrease stroke size").style('position : fixed');
    strokeWeightDisplay = createDiv('4').position(buttonPos(11, 3), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).style('background-color : rgb(170,170,170)').style('position : fixed');
    let strokePlusButton = createButton(' + ').position(buttonPos(12, 3), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "increase stroke size").style('position : fixed');
    strokeMinusButton.mouseClicked(() => {
        if (n.isRightMouseDown == false) {
            if (n.mode == 'erase') {
                if (n.eraserSize > 1) {
                    n.eraserSize -= 5;
                }
            }
            if (n.mode == 'text') {
                if (n.currentTextSize > 1) {
                    n.currentTextSize--;
                }
            } else {
                if (n.currentStrokeWeight > 1) {
                    n.currentStrokeWeight--;
                }
            }
        } else {
            if (n.eraserSize > 1) {
                n.eraserSize -= 5;
            }
        }
    });
    strokePlusButton.mouseClicked(() => {
        if (n.isRightMouseDown == false) {
            if (n.mode == 'erase') {
                n.eraserSize += 5;
            }
            if (n.mode == 'text') {
                n.currentTextSize++;
            } else {
                n.currentStrokeWeight++;
            }
        } else {
            n.eraserSize += 5;
        }
    });

    solidStyleButton = createButton('⎯').position(buttonPos(13, 4), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "solid strokes").style('position : fixed');
    dashStyleButton = createButton('---').position(buttonPos(14, 4), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "dashed strokes").style('position : fixed');
    solidStyleButton.mouseClicked(() => { n.currentStrokeStyle = 'solid'; });
    dashStyleButton.mouseClicked(() => { n.currentStrokeStyle = 'dash'; });

    undoButton = createButton('↶').position(buttonPos(15, 5), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "undo").style('position : fixed');
    undoButton.mouseClicked(() => { n.undo(); });
    redoButton = createButton('↷').position(buttonPos(16, 5), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "redo").style('position : fixed');
    redoButton.mouseClicked(() => { n.redo(); });

    let saveButton = createButton('💾').position(buttonPos(17, 6), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "save canvas").style('position : fixed');
    saveButton.mouseClicked(() => {
        let name = window.prompt('enter filename', 'myNotes');
        if (saveModeButton.value() == 'jpg') {
            saveCanvas(`${name}`, 'jpg');
        }
        if (saveModeButton.value() == 'json') {
            let newimgarr = [];
            for (let i of n.imageEntities) {
                newimgarr.push({
                    type: i.type,
                    id: i.id,
                    status: i.status,
                    data: i.data,
                    x0: i.x0,
                    y0: i.y0,
                    width: i.width,
                    height: i.height,
                });
            }
            saveJSON({
                canvassize: { width: n.currentWidth, height: n.currentHeight },
                backgroundColor: n.backgroundColor,
                pointEntities: n.pointEntities,
                imageEntities: newimgarr
            }, `${name}.json`);
        }

    });
    let saveModeButton = createSelect().position(buttonPos(18, 6), 0).size(buttonWidth, buttonHeight / 2).style(`font-size:${buttonFont / 2}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "set save format").style('position : fixed');
    saveModeButton.option('jpg');
    saveModeButton.option('json');
    let openButton = createButton('📁').position(buttonPos(19, 6), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "open save file").style('position : fixed');
    openButton.mouseClicked(() => {
        let input = createFileInput(openJSON);
        input.hide();
        input.elt.click();
    });

    let bgColorDisplay = createColorPicker('black').position(buttonPos(20, 7), 0).size(buttonWidth, buttonHeight).attribute('title', "set background").style('position : fixed');
    let bgcolorbutton = createButton('OK').position(buttonPos(21, 7), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont / 1.5}px`).style('position : fixed');
    bgColorDisplay.input(() => {
        let value = hexToRgb(bgColorDisplay.value());
        n.backgroundColor = [value.r, value.g, value.b];
        n.updateNeeded = true;
    });

    let helpbutton = createButton('❓').position(buttonPos(22, 8), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', 'help').style('position : fixed');
    helpbutton.mouseClicked(() => { window.open('https://github.com/Nishchal-Bhat/Not_E?tab=readme-ov-file#instructions', '_blank'); });

    n.populateGrid();
}

function draw() {
    if (n.pointEntities.length > 0 && (n.pointEntities[n.pointEntities.length - 1].status == 'drawing' || n.pointEntities[n.pointEntities.length - 1].status == 'moving')) { n.updateNeeded = true; }
    if (n.imageEntities.length > 0 && n.imageEntities[n.imageEntities.length - 1].status == 'moving') { n.updateNeeded = true; }
    if ((n.mode == 'erase' || n.mode == 'remove') && n.isDeviceTouch == false) { n.updateNeeded = true; }
    if (n.isRightMouseDown == true) { n.updateNeeded = true; }
    if (n.mode == 'select') { n.updateNeeded = true; }
    if (n.mode == 'moving') { n.updateNeeded = true; }

    // set background color
    if (n.updateNeeded == true) {
        background(n.backgroundColor[0], n.backgroundColor[1], n.backgroundColor[2]);

        // update UI elements
        {
            if (n.isRightMouseDown == true || n.mode == 'erase') {
                strokeWeightDisplay.html(n.eraserSize);
            } else if (n.mode == 'text') {
                strokeWeightDisplay.html(n.currentTextSize);
            } else {
                strokeWeightDisplay.html(n.currentStrokeWeight);
            }
            lineModeButton.style('background-color : revert');
            strokeModeButton.style('background-color : revert');
            rectModeButton.style('background-color : revert');
            textModeButton.style('background-color : revert');
            eraseModeButton.style('background-color : revert');
            removeModeButton.style('background-color : revert');
            selectModeButton.style('background-color : revert');
            solidStyleButton.style('background-color : revert');
            dashStyleButton.style('background-color : revert');
            undoButton.style('background-color : revert');
            redoButton.style('background-color : revert');

            if (n.mode == 'line') {
                lineModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.mode == 'stroke') {
                strokeModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.mode == 'rect') {
                rectModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.mode == 'text') {
                textModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.isRightMouseDown == true || n.mode == 'erase') {
                eraseModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.mode == 'remove') {
                removeModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.mode == 'select' || n.mode == 'moving') {
                selectModeButton.style('background-color : rgb(170,170,170)');
            }
            if (n.undoArr.length == 0) {
                undoButton.style('background-color : rgb(170,170,170)');
            }
            if (n.redoArr.length == 0) {
                redoButton.style('background-color : rgb(170,170,170)');
            }
            if (n.currentStrokeStyle == 'solid') {
                solidStyleButton.style('background-color : rgb(170,170,170)');
            }
            if (n.currentStrokeStyle == 'dash') {
                dashStyleButton.style('background-color : rgb(170,170,170)');
            }
        }

        if (n.isDeviceTouch == true) {
            // show all images
            for (let _img of n.imageEntities) {
                n.showImage(_img);
            }

            // show entities
            for (let _entity of n.pointEntities) {
                n.showEntity(_entity);
            }

            if (n.mode == 'select') {
                n.showSelectionBox();
            }

            if (n.mode == 'moving') {
                if (n.changingColor == false) {
                    n.highlightSelectedEntities();
                }
                if (n.isFingerDown == true) {
                    // draw cursor
                    push();
                    strokeWeight(2);
                    stroke(255, 182, 193);
                    line(n.mouseX - 20, n.mouseY, n.mouseX + 20, n.mouseY);
                    line(n.mouseX, n.mouseY - 20, n.mouseX, n.mouseY + 20);
                    pop();
                }
            }

            // erasing lines and strokes
            if (n.mode == 'erase' && n.isFingerDown == true) {
                // draw eraser UI
                strokeWeight(1);
                stroke(255, 182, 193);
                fill(255, 182, 193);
                circle(n.mouseX, n.mouseY, n.eraserSize * 2);
            }

            if (n.mode == 'remove' && n.isFingerDown == true) {
                // draw remove UI
                strokeWeight(4);
                stroke(255, 182, 193);
                fill(255, 182, 193);
                line(n.mouseX - 30, n.mouseY - 30, n.mouseX + 30, n.mouseY + 30);
                line(n.mouseX - 30, n.mouseY + 30, n.mouseX + 30, n.mouseY - 30);
            }
        }
        else {
            n.mouseX = mouseX;
            n.mouseY = Math.max(mouseY, 0);

            // show all images
            for (let _img of n.imageEntities) {
                n.showImage(_img);
            }

            // show entities
            for (let _entity of n.pointEntities) {
                n.showEntity(_entity);
            }

            if (n.mode == 'select') {
                n.showSelectionBox();
            }

            if (n.mode == 'moving') {
                if (n.changingColor == false) {
                    n.highlightSelectedEntities();
                }
                // draw cursor
                push();
                strokeWeight(2);
                stroke(255, 182, 193);
                line(n.mouseX - 20, n.mouseY, n.mouseX + 20, n.mouseY);
                line(n.mouseX, n.mouseY - 20, n.mouseX, n.mouseY + 20);
                pop();
            }

            // erasing lines and strokes
            if (n.mode == 'erase' || n.isRightMouseDown == true) {
                // draw eraser UI
                strokeWeight(1);
                stroke(255, 182, 193);
                fill(255, 182, 193);
                circle(n.mouseX, n.mouseY, n.eraserSize * 2);
            }
            if (n.mode == 'remove') {
                // draw remove UI
                strokeWeight(4);
                stroke(255, 182, 193);
                fill(255, 182, 193);
                line(n.mouseX - 30, n.mouseY - 30, n.mouseX + 30, n.mouseY + 30);
                line(n.mouseX - 30, n.mouseY + 30, n.mouseX + 30, n.mouseY - 30);
            }
        }
    }
    n.updateNeeded = false;
}

function keyPressed(event) {
    n.keyPressed(event);
}

function mousePressed(event) {
    n.mousePressed(event);
}

function mouseReleased(event) {
    n.mouseReleased(event);
}

function mouseClicked() {
    n.mouseClicked();
}

function mouseDragged(event) {
    n.mouseDragged(event);
}

function touchStarted(event) {
    n.touchStarted(event);
}

function touchEnded() {
    n.touchEnded();
}

function touchMoved(event) {
    n.touchMoved(event);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function buttonPos(buttons, spaces) {
    return buttonWidth * buttons + spacing * spaces;
}

function openJSON(file) {
    try {
        let json = file.data;

        let newimages = [];
        let imagecontent = 0;
        for (let i of json.imageEntities) {
            imagecontent = createImg(i.data).hide();
            newimages.push({
                content: imagecontent,
                data: i.data,
                width: i.width,
                height: i.height,
                x0: i.x0,
                y0: i.y0,
                status: i.status,
                type: i.type,
                id: i.id
            });
        }

        if (imagecontent != 0) {
            imagecontent.elt.onload = () => {
                resizeCanvas(json.canvassize.width, json.canvassize.height);
                n.backgroundColor = json.backgroundColor;
                n.pointEntities = json.pointEntities;
                n.imageEntities = newimages;
                n.populateGrid();

                n.updateNeeded = true;
            };
        }
    }
    catch (err) {
        window.alert("not a valid save file");

    }

}
