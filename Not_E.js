let isDeviceTouch = false;

// entity arrays
let lineArr = [];
let strokeArr = [];
let textArr = [];
let imgArr = [];

// undo-redo arrays
let undoArr = [];
let redoArr = [];
let erasedStuffArr = [];

// mouse state vars
let isLeftMouseDown = false;
let isRightMouseDown = false;
let isfingerdown = false;

// drawing vars
let currentStrokeWeight = 4;
let currentStrokeStyle = 'solid';
let eraserSize = 30;
let currentColor = [255, 255, 255];
let backgroundColor = [0, 0, 0];
let currentTextSize = 30;
let updateNeeded = true;

// mode vars
let mode = 'stroke';
let currentMode = 'stroke';
let removeMode = false;

// canvas
let canvas;
let currentWidth = window.innerWidth + 100;
let currentHeight = window.innerHeight + 100;

// UI elements
let colorDisplay;
let lineModeButton;
let strokeModeButton;
let textModeButton;
let eraseModeButton;
let removeModeButton;
let strokeWeightDisplay;
let solidStyleButton;
let dashStyleButton;
let undoButton;
let redoButton;

let screenratio = window.innerWidth / window.innerHeight;

let heightdenominator = 16;
let widthdenominator = heightdenominator * screenratio;

let buttonHeight = window.innerHeight / heightdenominator;

let buttonWidth = window.innerWidth / widthdenominator;

let buttonFont = buttonWidth / 2.1;
let spacing = buttonWidth / 2.5;

// disable right click and spacebar scroll
document.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', function (e) {
    if (e.code == 'Space' && e.target == document.body) {
        e.preventDefault();
    }
});

function setup() {
    if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
        isDeviceTouch = true;
    }
    else {
        isDeviceTouch = false;
    }

    // make canvas
    canvas = createCanvas(currentWidth, currentHeight).position(0, buttonHeight);
    canvas.style('touch-action : none');

    // set background color
    background(backgroundColor[0], backgroundColor[1], backgroundColor[2]);

    // infinite sroll
    canvas.mouseWheel((e) => {
        if (window.innerHeight + window.scrollY >= currentHeight - 100) {
            if (e.deltaY > 0) {
                currentHeight += 100;
                resizeCanvas(currentWidth, currentHeight);
                updateNeeded = true;
            }
        }

        if (window.innerWidth + window.scrollX >= currentWidth - 100) {
            if (e.deltaX > 0) {
                currentWidth += 100;
                resizeCanvas(currentWidth, currentHeight);
                updateNeeded = true;
            }
        }


    });

    // click detection for text and image
    canvas.mouseClicked(() => {
        if (isDeviceTouch == false) {
            if (mode == 'text' && removeMode == false) {
                if (textArr.length == 0) {
                    addText();
                } else if (textArr[textArr.length - 1].status != 'moving' && textArr[textArr.length - 1].status != 'drawing') {
                    addText();
                } else if (textArr[textArr.length - 1].status == 'moving') {
                    finishText();
                }
            }

            if (mode == 'image') {
                if (imgArr.length > 0 && imgArr[imgArr.length - 1].status == 'moving') {
                    imgArr[imgArr.length - 1].status = 'drawn';
                    mode = currentMode;
                    updateNeeded = true;
                }
            }
        }
    });

    // make UI elements
    let topbar = createDiv().position(0, 0).size(buttonPos(20, 8), buttonHeight).style('background-color:rgb(70,70,120)');

    colorDisplay = createColorPicker('white').position(0, 0).size(buttonWidth, buttonHeight).attribute('title', "set brush color");
    colorDisplay.input(() => {
        let value = hexToRgb(colorDisplay.value());
        currentColor = [value.r, value.g, value.b];
    });
    let colorbutton = createButton('OK').position(buttonPos(1, 0), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont / 1.5}px`);

    lineModeButton = createButton('📏').position(buttonPos(2, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "line mode")
        ;
    lineModeButton.mouseClicked(() => {
        isRightMouseDown = false;
        mode = 'line'; currentMode = 'line';
    });
    strokeModeButton = createButton('🖊').position(buttonPos(3, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "freehand mode");
    strokeModeButton.mouseClicked(() => {
        isRightMouseDown = false;
        mode = 'stroke'; currentMode = 'stroke';
    });
    textModeButton = createButton('₸').position(buttonPos(4, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "text mode");
    textModeButton.mouseClicked(() => {
        isRightMouseDown = false;
        mode = 'text'; currentMode = 'text';
    });
    let picButton = createButton('🖼').position(buttonPos(5, 1), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "insert image");
    picButton.mouseClicked(() => {
        mode = 'image';
        input = createFileInput(addImage);
        input.hide();
        input.elt.click();
    });

    eraseModeButton = createButton('🧽').position(buttonPos(6, 2), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "erase mode one");
    eraseModeButton.mouseClicked(() => {
        mode = mode == 'erase' ? currentMode : 'erase';
    });
    removeModeButton = createButton('X').position(buttonPos(7, 2), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "remove text and images");
    removeModeButton.mouseClicked(() => {
        removeMode == true ? removeMode = false : removeMode = true; updateNeeded = true;
    });

    let strokeMinusButton = createButton(' ⎼ ').position(buttonPos(8, 3), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "decrease stroke size");
    strokeWeightDisplay = createDiv('4').position(buttonPos(9, 3), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).style('background-color : rgb(170,170,170)');
    let strokePlusButton = createButton(' + ').position(buttonPos(10, 3), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "increase stroke size");
    strokeMinusButton.mouseClicked(() => {
        if (isRightMouseDown == false) {
            if (mode == 'erase') {
                if (eraserSize > 1) {
                    eraserSize -= 5;
                }
            }
            if (mode == 'text') {
                if (currentTextSize > 1) {
                    currentTextSize--;
                }
            } else {
                if (currentStrokeWeight > 1) {
                    currentStrokeWeight--;
                }
            }
        } else {
            if (eraserSize > 1) {
                eraserSize -= 5;
            }
        }
    });
    strokePlusButton.mouseClicked(() => {
        if (isRightMouseDown == false) {
            if (mode == 'erase') {
                eraserSize += 5;
            }
            if (mode == 'text') {
                currentTextSize++;
            } else {
                currentStrokeWeight++;
            }
        } else {
            eraserSize += 5;
        }
    });

    solidStyleButton = createButton('⎯').position(buttonPos(11, 4), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "solid strokes");
    dashStyleButton = createButton('---').position(buttonPos(12, 4), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "dashed strokes");
    solidStyleButton.mouseClicked(() => { currentStrokeStyle = 'solid'; });
    dashStyleButton.mouseClicked(() => { currentStrokeStyle = 'dash'; });

    undoButton = createButton('↶').position(buttonPos(13, 5), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "undo");
    undoButton.mouseClicked(() => { undo(); });
    redoButton = createButton('↷').position(buttonPos(14, 5), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "redo");
    redoButton.mouseClicked(() => { redo(); });

    let saveButton = createButton('💾').position(buttonPos(15, 6), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "save canvas");
    saveButton.mouseClicked(() => {
        let name = window.prompt('enter filename', 'myNotes');
        if (saveModeButton.value() == 'jpg') {
            saveCanvas(`${name}`, 'jpg');
        }
        if (saveModeButton.value() == 'json') {
            let newimgarr = [];
            for (let i of imgArr) {
                newimgarr.push({
                    data: i.data,
                    x0: i.x0,
                    y0: i.y0,
                    width: i.width,
                    height: i.height,
                    status: i.status
                });
            }
            saveJSON({
                canvassize: { width: currentWidth, height: currentHeight },
                backgroundColor: backgroundColor,
                lines: lineArr,
                strokes: strokeArr,
                texts: textArr,
                images: newimgarr
            }, `${name}.json`);
        }

    });
    let saveModeButton = createSelect().position(buttonPos(16, 6), 0).size(buttonWidth, buttonHeight / 2).style(`font-size:${buttonFont / 2}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "set save format");
    saveModeButton.option('jpg');
    saveModeButton.option('json');
    let openButton = createButton('📁').position(buttonPos(17, 6), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', "open save file");
    openButton.mouseClicked(() => {
        let input = createFileInput(openJSON);
        input.hide();
        input.elt.click();
    });

    let bgColorDisplay = createColorPicker('black').position(buttonPos(18, 7), 0).size(buttonWidth, buttonHeight).attribute('title', "set background");
    let bgcolorbutton = createButton('OK').position(buttonPos(19, 7), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont / 1.5}px`);
    bgColorDisplay.input(() => {
        let value = hexToRgb(bgColorDisplay.value());
        backgroundColor = [value.r, value.g, value.b];
        updateNeeded = true;
    });

    let helpbutton = createButton('❓').position(buttonPos(20, 8), 0).size(buttonWidth, buttonHeight).style(`font-size:${buttonFont}px`).style('text-align : center').style(`line-height: ${buttonHeight}px`).attribute('title', 'help');
    helpbutton.mouseClicked(() => { window.open('https://github.com/Nishchal-Bhat/Not_E?tab=readme-ov-file#instructions', '_blank'); });
}

function draw() {
    if (lineArr.length > 0 && lineArr[lineArr.length - 1].status == 'drawing') { updateNeeded = true; }
    if (strokeArr.length > 0 && strokeArr[strokeArr.length - 1].status == 'drawing') { updateNeeded = true; }
    if (textArr.length > 0 && (textArr[textArr.length - 1].status == 'drawing' || textArr[textArr.length - 1].status == 'moving')) { updateNeeded = true; }
    if (imgArr.length > 0 && imgArr[imgArr.length - 1].status == 'moving') { updateNeeded = true; }
    if (mode == 'erase') { updateNeeded = true; }
    if (removeMode == true) { updateNeeded = true; }
    if (isRightMouseDown == true) { updateNeeded = true; }

    // set background color
    if (updateNeeded == true) {
        background(backgroundColor[0], backgroundColor[1], backgroundColor[2]);

        // update UI elements
        {
            if (isRightMouseDown == true || mode == 'erase') {
                strokeWeightDisplay.html(eraserSize);
            } else if (mode == 'text') {
                strokeWeightDisplay.html(currentTextSize);
            } else {
                strokeWeightDisplay.html(currentStrokeWeight);
            }
            lineModeButton.style('background-color : revert');
            strokeModeButton.style('background-color : revert');
            textModeButton.style('background-color : revert');
            eraseModeButton.style('background-color : revert');
            removeModeButton.style('background-color : revert');
            solidStyleButton.style('background-color : revert');
            dashStyleButton.style('background-color : revert');
            undoButton.style('background-color : revert');
            redoButton.style('background-color : revert');

            if (currentMode == 'line') {
                lineModeButton.style('background-color : rgb(170,170,170)');
            }
            if (currentMode == 'stroke') {
                strokeModeButton.style('background-color : rgb(170,170,170)');
            }
            if (currentMode == 'text') {
                textModeButton.style('background-color : rgb(170,170,170)');
            }
            if (isRightMouseDown == true || mode == 'erase') {
                eraseModeButton.style('background-color : rgb(170,170,170)');
            }
            if (removeMode == true) {
                removeModeButton.style('background-color : rgb(170,170,170)');
            }
            if (undoArr.length == 0) {
                undoButton.style('background-color : rgb(170,170,170)');
            }
            if (redoArr.length == 0) {
                redoButton.style('background-color : rgb(170,170,170)');
            }
            if (currentStrokeStyle == 'solid') {
                solidStyleButton.style('background-color : rgb(170,170,170)');
            }
            if (currentStrokeStyle == 'dash') {
                dashStyleButton.style('background-color : rgb(170,170,170)');
            }
        }

        if (isDeviceTouch == true) {
            let mouseX = touches.length > 0 ? touches[0].x : -1000;
            let mouseY = touches.length > 0 ? touches[0].y : -1000;

            // show all images
            for (let _img of imgArr) {
                showImage(_img);
            }

            // draw all texts
            for (let _text of textArr) {
                showText(_text);
            }

            // draw all lines
            for (let _line of lineArr) {
                showLine(_line);
            }

            // draw all strokes
            for (let _stroke of strokeArr) {
                showStroke(_stroke);
            }

            // erasing lines and strokes
            if (mode == 'erase') {
                if (isfingerdown) {
                    // draw eraser UI
                    strokeWeight(1);
                    stroke(255, 255, 255, 100);
                    fill(255, 255, 255, 100);
                    circle(mouseX, mouseY, eraserSize * 2);
                    for (let _stroke of strokeArr) {
                        for (let point of _stroke.arr) {
                            if (dist(point.x, point.y, mouseX, mouseY) < eraserSize) {
                                let erased = strokeArr.splice(strokeArr.indexOf(_stroke), 1);
                                erasedStuffArr.push(erased[0]);
                                undoArr.push('erase stroke');
                                redoArr = [];
                                break;
                            }
                        }
                    }

                    for (let _line of lineArr) {
                        for (let point of _line.arr) {
                            if (dist(point.x, point.y, mouseX, mouseY) < eraserSize) {
                                let erased = lineArr.splice(lineArr.indexOf(_line), 1);
                                erasedStuffArr.push(erased[0]);
                                undoArr.push('erase line');
                                redoArr = [];
                                break;
                            }
                        }
                    }
                }
            }
            // removing texts and images
            else if (removeMode == true) {
                if (isfingerdown == true) {
                    // draw remove UI
                    strokeWeight(4);
                    stroke(255, 0, 0, 150);
                    fill(255, 0, 0, 150);
                    line(mouseX - 30, mouseY - 30, mouseX + 30, mouseY + 30);
                    line(mouseX - 30, mouseY + 30, mouseX + 30, mouseY - 30);

                    for (let _img of imgArr) {
                        if (_img.x0 < mouseX && mouseX < _img.x0 + _img.width && _img.y0 < mouseY && mouseY < _img.y0 + _img.height) {
                            let erased = imgArr.splice(imgArr.indexOf(_img), 1);
                            erasedStuffArr.push(erased[0]);
                            undoArr.push('erase image');
                            redoArr = [];
                        }
                    }

                    for (let _text of textArr) {
                        let width = _text.width;
                        let height = _text.height;
                        if (_text.x0 < mouseX && mouseX < _text.x0 + width && _text.y0 < mouseY && mouseY < _text.y0 + height) {
                            let erased = textArr.splice(textArr.indexOf(_text), 1);
                            erasedStuffArr.push(erased[0]);
                            undoArr.push('erase text');
                            redoArr = [];
                        }
                    }
                }
            }
            // drawing current line and stroke
            else if (isfingerdown == true) {
                // draw current line
                if (mode == 'line') {
                    if (lineArr.length > 0 && lineArr[lineArr.length - 1].status == 'drawing') {
                        lineArr[lineArr.length - 1].x1 = mouseX;
                        lineArr[lineArr.length - 1].y1 = mouseY;
                    }
                }

                // draw current stroke
                if (mode == 'stroke') {
                    if (strokeArr.length > 0 && strokeArr[strokeArr.length - 1].status == 'drawing') {
                        strokeArr[strokeArr.length - 1].arr.push({ x: mouseX, y: mouseY });
                    }
                }
            }
        } else {

            // move current image
            if (mode == 'image' && imgArr.length > 0 && imgArr[imgArr.length - 1].status == 'moving') {
                imgArr[imgArr.length - 1].x0 = mouseX;
                imgArr[imgArr.length - 1].y0 = mouseY;
                // draw dotted rectangle around image
                push();
                stroke(255, 0, 0);
                noFill();
                drawingContext.setLineDash([10, 10]);
                rect(imgArr[imgArr.length - 1].x0 - 5, imgArr[imgArr.length - 1].y0 - 5, imgArr[imgArr.length - 1].width + 5, imgArr[imgArr.length - 1].height + 5);
                pop();
            }

            // show all images
            for (let _img of imgArr) {
                showImage(_img);
            }

            // move current text
            if (mode == 'text' && textArr.length > 0 && textArr[textArr.length - 1].status == 'moving') {
                textArr[textArr.length - 1].x0 = mouseX;
                textArr[textArr.length - 1].y0 = mouseY;
                // draw dotted rectangle around text
                push();
                noFill();
                drawingContext.setLineDash([10, 10]);
                rect(textArr[textArr.length - 1].x0 - 5, textArr[textArr.length - 1].y0 - 5, textArr[textArr.length - 1].width + 5, textArr[textArr.length - 1].height + 5);
                pop();
            }
            // draw all texts
            for (let _text of textArr) {
                showText(_text);
            }

            // draw all lines
            for (let _line of lineArr) {
                showLine(_line);
            }

            // draw all strokes
            for (let _stroke of strokeArr) {
                showStroke(_stroke);
            }

            // erasing lines and strokes
            if (mode == 'erase') {
                // draw eraser UI
                strokeWeight(1);
                stroke(255, 255, 255, 100);
                fill(255, 255, 255, 100);
                circle(mouseX, mouseY, eraserSize * 2);
            }
            if (isRightMouseDown == true) {
                // draw eraser UI
                strokeWeight(1);
                stroke(255, 255, 255, 100);
                fill(255, 255, 255, 100);
                circle(mouseX, mouseY, eraserSize * 2);
                for (let _stroke of strokeArr) {
                    for (let point of _stroke.arr) {
                        if (dist(point.x, point.y, mouseX, mouseY) < eraserSize) {
                            let erased = strokeArr.splice(strokeArr.indexOf(_stroke), 1);
                            erasedStuffArr.push(erased[0]);
                            undoArr.push('erase stroke');
                            redoArr = [];
                            break;
                        }
                    }
                }

                for (let _line of lineArr) {
                    for (let point of _line.arr) {
                        if (dist(point.x, point.y, mouseX, mouseY) < eraserSize) {
                            let erased = lineArr.splice(lineArr.indexOf(_line), 1);
                            erasedStuffArr.push(erased[0]);
                            undoArr.push('erase line');
                            redoArr = [];
                            break;
                        }
                    }
                }
            }
            // removing texts and images
            else if (removeMode == true) {
                // draw remove UI
                strokeWeight(4);
                stroke(255, 0, 0, 150);
                fill(255, 0, 0, 150);
                line(mouseX - 30, mouseY - 30, mouseX + 30, mouseY + 30);
                line(mouseX - 30, mouseY + 30, mouseX + 30, mouseY - 30);

                if (isLeftMouseDown == true) {
                    for (let _img of imgArr) {
                        if (_img.x0 < mouseX && mouseX < _img.x0 + _img.width && _img.y0 < mouseY && mouseY < _img.y0 + _img.height) {
                            let erased = imgArr.splice(imgArr.indexOf(_img), 1);
                            erasedStuffArr.push(erased[0]);
                            undoArr.push('erase image');
                            redoArr = [];
                        }
                    }

                    for (let _text of textArr) {
                        let width = _text.width;
                        let height = _text.height;
                        if (_text.x0 < mouseX && mouseX < _text.x0 + width && _text.y0 < mouseY && mouseY < _text.y0 + height) {
                            let erased = textArr.splice(textArr.indexOf(_text), 1);
                            erasedStuffArr.push(erased[0]);
                            undoArr.push('erase text');
                            redoArr = [];
                        }
                    }
                }
            }
            // drawing current line and stroke
            else if (isLeftMouseDown == true) {
                // draw current line
                if (mode == 'line') {
                    if (lineArr.length > 0 && lineArr[lineArr.length - 1].status == 'drawing') {
                        lineArr[lineArr.length - 1].x1 = mouseX;
                        lineArr[lineArr.length - 1].y1 = mouseY;
                    }
                }

                // draw current stroke
                if (mode == 'stroke') {
                    if (strokeArr.length > 0 && strokeArr[strokeArr.length - 1].status == 'drawing') {
                        strokeArr[strokeArr.length - 1].arr.push({ x: mouseX, y: mouseY });
                    }
                }
            }
        }
    }
    updateNeeded = false;
}

function mousePressed(event) {
    if (isDeviceTouch == false) {
        // only detect presses on canvas
        if (event.srcElement.id == 'defaultCanvas0') {
            // fresh left click
            if (mouseButton == LEFT && isLeftMouseDown == false && isRightMouseDown == false && removeMode == false) {
                // add new line
                if (mode == 'line') {
                    addLine();
                    updateNeeded = true;
                }
                // add new stroke
                if (mode == 'stroke') {
                    addStroke();
                    updateNeeded = true;
                }

                if (mode == 'text') {
                    if (textArr.length > 0 && textArr[textArr.length - 1].status == 'drawing' && textArr[textArr.length - 1].content.length > 0) {
                        finishText();
                    }
                }
            }

            // update mouse state vars
            if (event.button == 0) {
                isLeftMouseDown = true;
                if (mode == 'erase') {
                    isRightMouseDown = true;
                }
            }
            if (event.button == 2) {
                isRightMouseDown = true;
            }
        }
    }
}

function mouseReleased(event) {
    if (isDeviceTouch == false) {
        // update mouse state vars
        if (event.button == 0) {
            isLeftMouseDown = false;
            if (mode == 'erase') {
                isRightMouseDown = false;
                updateNeeded = true;
            }
        }
        if (event.button == 2) {
            isRightMouseDown = false;
        }
        // finish current line
        if (mode == 'line' && isLeftMouseDown == false) {
            finishLine();
        }
        // finish curernt stroke
        if (mode == 'stroke' && isLeftMouseDown == false) {
            finishStroke();
        }
        updateNeeded = true;
    }
}

function touchStarted(event) {
    // only detect presses on canvas
    if (event.target.id == 'defaultCanvas0') {
        // add new line
        if (mode == 'line') {
            addLine();
            updateNeeded = true;
        }
        // add new stroke
        if (mode == 'stroke') {
            addStroke();
            updateNeeded = true;
        }

        if (mode == 'text' && removeMode == false) {
            if (textArr.length == 0) {
                addText();
            } else if (textArr[textArr.length - 1].status == 'drawing') {
                finishText();
            }
            else if (textArr[textArr.length - 1].status != 'moving') {
                addText();
            }
        }

        if (mode == 'image' && removeMode == false) {
            if (imgArr.length == 0) {
                addImage();
            } else if (imgArr[imgArr.length - 1].status != 'moving') {
                addImage();
            }
            // if (imgArr.length > 0 && imgArr[imgArr.length - 1].status == 'moving') {
            //     imgArr[imgArr.length - 1].status = 'drawn';
            //     mode = currentMode;
            //     updateNeeded = true;
            // }
        }

        isfingerdown = true;
    }
}

function touchEnded() {
    // update mouse state vars
    if (event.button == 0) {
        isLeftMouseDown = false;
        if (mode == 'erase') {
            isRightMouseDown = false;
            updateNeeded = true;
        }
    }
    if (event.button == 2) {
        isRightMouseDown = false;
    }
    // finish current line
    if (mode == 'line' && isLeftMouseDown == false) {
        finishLine();
        updateNeeded = true;
    }
    // finish curernt stroke
    if (mode == 'stroke' && isLeftMouseDown == false) {
        finishStroke();
        updateNeeded = true;
    }

    if (mode == 'text' && removeMode == false) {
        if (textArr[textArr.length - 1].status == 'moving') {
            finishText();
        }
    }

    if (mode == 'image' && removeMode == false) {
        if (imgArr[imgArr.length - 1].status == 'moving') {
            finishImage();
        }
    }
    updateNeeded = true;
}

function touchMoved() {
    if (isDeviceTouch == true) {
        // move current image
        if (mode == 'image' && imgArr.length > 0 && imgArr[imgArr.length - 1].status == 'moving') {
            imgArr[imgArr.length - 1].x0 = touches[0].x;
            imgArr[imgArr.length - 1].y0 = touches[0].y;
        }

        // move current text
        if (mode == 'text' && textArr.length > 0 && textArr[textArr.length - 1].status == 'moving') {
            textArr[textArr.length - 1].x0 = touches[0].x;
            textArr[textArr.length - 1].y0 = touches[0].y;

        }
    }
}

function keyPressed() {
    // when creating text entity
    if (mode == 'text' && textArr.length > 0 && textArr[textArr.length - 1].status == 'drawing') {
        // ignore special keys
        if (key == 'Enter' || key == 'Shift' || key == 'Backspace' || key == 'Alt' || key == 'Control' || key == 'Tab' || key == 'Escape' || key.includes('Arrow')) {
            // shift enter for newline...also update text entity height with each newline
            if (keyIsDown(16) == true && key == 'Enter') {
                textArr[textArr.length - 1].content += `\n`;
                textArr[textArr.length - 1].height += textArr[textArr.length - 1].size * 1.34;
            }
            // backspace 
            else if (key == 'Backspace') {
                textArr[textArr.length - 1].content = textArr[textArr.length - 1].content.substring(0, textArr[textArr.length - 1].content.length - 1);
            }
            // finish current text 
            else if (key == 'Enter') {
                finishText();
            }
        }
        // type character keys 
        else {
            // uppercase when shift pressed
            if (keyIsDown(16) == true) {
                textArr[textArr.length - 1].content += `${key.toUpperCase()}`;
            } else {
                textArr[textArr.length - 1].content += `${key}`;
            }
        }
        // update text entity width
        let _text = textArr[textArr.length - 1];
        textArr[textArr.length - 1].width = textWidth(_text.content) > 100 ? textWidth(_text.content.split('\n').reduce((a, b) => a.length > b.length ? a : b, "")) + 20 : 100;
    }
    // shortcuts 
    else {
        // colors
        if (key == '`') {
            currentColor = [255, 255, 255];
            colorDisplay.value('#ffffff');
            updateNeeded = true;
        }
        if (key == '1') {
            currentColor = [255, 0, 0];
            colorDisplay.value('#ff0000');
            updateNeeded = true;
        }
        if (key == '2') {
            currentColor = [0, 255, 0];
            colorDisplay.value('#00ff00');
            updateNeeded = true;
        }
        if (key == '3') {
            currentColor = [0, 170, 255];
            colorDisplay.value('#00aaff');
            updateNeeded = true;
        }
        if (key == '4') {
            updateNeeded = true;
            currentColor = [255, 255, 0];
            colorDisplay.value('#ffff00');
        }
        if (key == '5') {
            updateNeeded = true;
            currentColor = [0, 0, 0];
            colorDisplay.value('#000000');
        }
        // stroke
        if (key == 'q') {
            updateNeeded = true;
            if (isRightMouseDown == false) {
                if (mode == 'erase') {
                    if (eraserSize > 1) {
                        eraserSize -= 5;
                    }
                }
                if (mode == 'text') {
                    if (currentTextSize > 1) {
                        currentTextSize--;
                    }
                } else {
                    if (currentStrokeWeight > 1) {
                        currentStrokeWeight--;
                    }
                }
            } else {
                if (eraserSize > 1) {
                    eraserSize -= 5;
                }
            }
        }
        if (key == 'w') {
            updateNeeded = true;
            if (isRightMouseDown == false) {
                if (mode == 'erase') {
                    eraserSize += 5;
                }
                if (mode == 'text') {
                    currentTextSize++;
                } else {
                    currentStrokeWeight++;
                }
            } else {
                eraserSize += 5;
            }
        }
        if (key == 'e') {
            updateNeeded = true;
            currentStrokeStyle = currentStrokeStyle == 'solid' ? 'dash' : 'solid';
        }
        // modes
        if (key == 'a') {
            updateNeeded = true;
            mode = 'line';
            currentMode = 'line';
        }
        if (key == 's') {
            updateNeeded = true;
            mode = 'stroke';
            currentMode = 'stroke';
        }
        if (key == 'd') {
            updateNeeded = true;
            mode = 'text';
            currentMode = 'text';
        }
        if (key == 'f') {
            updateNeeded = true;
            mode = mode == 'erase' ? currentMode : 'erase';
        }
        // undo/redo
        if (key == 'z') {
            updateNeeded = true;
            undo();
        }
        if (key == 'x') {
            updateNeeded = true;
            redo();
        }
    }
}

function addLine() {
    if (isDeviceTouch == true) {
        let mouseX = touches[0].x;
        let mouseY = touches[0].y;
    }
    let line = {
        x0: mouseX, y0: mouseY, x1: mouseX, y1: mouseY,
        status: 'drawing',
        arr: [],
        color: currentColor,
        strokeWeight: currentStrokeWeight,
        strokeStyle: currentStrokeStyle
    };
    lineArr.push(line);
    undoArr.push('line');
    redoArr = [];

    updateNeeded = true;
}

function finishLine() {
    if (lineArr.length > 0 && lineArr[lineArr.length - 1].status == 'drawing') {
        let temparr = [];
        let resolution = 30;
        for (let i = 0; i < resolution + 1; i++) {
            temparr.push({ x: lineArr[lineArr.length - 1].x0 + (lineArr[lineArr.length - 1].x1 - lineArr[lineArr.length - 1].x0) * i / resolution, y: lineArr[lineArr.length - 1].y0 + (lineArr[lineArr.length - 1].y1 - lineArr[lineArr.length - 1].y0) * i / resolution });
        }
        lineArr[lineArr.length - 1].arr = temparr;
        lineArr[lineArr.length - 1].status = 'drawn';
    }
}

function addStroke() {
    if (isDeviceTouch == true) {
        let mouseX = touches[0].x;
        let mouseY = touches[0].y;
    }
    let stroke = {};
    stroke = {
        arr: [{ x: mouseX, y: mouseY }],
        color: currentColor,
        status: 'drawing',
        strokeWeight: currentStrokeWeight,
        strokeStyle: currentStrokeStyle
    };

    strokeArr.push(stroke);
    undoArr.push('stroke');
    redoArr = [];
    updateNeeded = true;
}

function finishStroke() {
    if (strokeArr.length > 0 && strokeArr[strokeArr.length - 1].status == 'drawing') {
        strokeArr[strokeArr.length - 1].status = 'drawn';
        if (strokeArr[strokeArr.length - 1].arr.length > 30) {
            strokeArr[strokeArr.length - 1].arr = reducearr(strokeArr[strokeArr.length - 1].arr);
        }
    }

}

function addText() {
    if (isDeviceTouch == true) {
        let mouseX = touches[0].x;
        let mouseY = touches[0].y;
    }
    let text = {
        x0: mouseX, y0: mouseY, status: 'drawing',
        content: "",
        color: currentColor,
        width: 100,
        height: 50,
        size: currentTextSize
    };
    textArr.push(text);
    undoArr.push('text');
    redoArr = [];
    updateNeeded = true;
}

function finishText() {
    if (textArr.length > 0 && textArr[textArr.length - 1].status == 'moving') {
        textArr[textArr.length - 1].status = 'drawn';
    }
    if (textArr.length > 0 && textArr[textArr.length - 1].status == 'drawing') {
        textArr[textArr.length - 1].status = 'moving';
    }
    updateNeeded = true;
}

function finishImage() {
    imgArr[imgArr.length - 1].status = 'drawn';
    mode = currentMode;
    updateNeeded = true;
}

async function addImage(file) {
    if (file.type === 'image') {
        let dimensions = window.prompt(`Enter desired image width and height seperated by a space.\nFor example: 100 100 \nYour screen size is ${window.innerWidth} ${window.innerHeight} \nLeave blank for default image dimensions.`, "");

        let imagedata = await createImg(file.data).hide();
        imagedata.elt.onload = () => {
            let img = {
                data: file.data,
                content: imagedata,
                x0: 0,
                y0: 0,
                width: dimensions == "" ? imagedata.width : Number(dimensions.split(" ")[0]),
                height: dimensions == "" ? imagedata.height : Number(dimensions.split(" ")[1]),
                status: 'moving'
            };
            imgArr.push(img);
            undoArr.push('image');
            redoArr = [];
        };
    } else {
        window.alert("That's not an image file");
    }
}

function showLine(_line) {
    push();
    strokeWeight(_line.strokeWeight);
    if (_line.strokeStyle == 'dash') {
        drawingContext.setLineDash([_line.strokeWeight * 2, _line.strokeWeight * 2]);
    }
    stroke(_line.color[0], _line.color[1], _line.color[2]);
    line(_line.x0, _line.y0, _line.x1, _line.y1);
    pop();
}
function showStroke(_stroke) {
    push();
    strokeWeight(_stroke.strokeWeight);
    if (_stroke.strokeStyle == 'dash') {
        drawingContext.setLineDash([_stroke.strokeWeight * 2, _stroke.strokeWeight * 2]);
    }
    stroke(_stroke.color[0], _stroke.color[1], _stroke.color[2]);
    noFill();
    beginShape();
    for (let point of _stroke.arr) {
        vertex(point.x, point.y);
    }
    endShape();
    pop();
}
function showText(_text) {
    strokeWeight(1);
    textSize(_text.size);
    stroke(_text.color[0], _text.color[1], _text.color[2]);
    fill(_text.color[0], _text.color[1], _text.color[2]);
    textAlign(LEFT, TOP);
    text(_text.content, _text.x0, _text.y0);

    // draw dotted rectangle around text
    if (_text.status == 'drawing' || _text.status == 'moving') {
        push();
        noFill();
        drawingContext.setLineDash([10, 10]);
        rect(_text.x0 - 5, _text.y0 - 5, _text.width + 10, _text.height + 10);
        pop();
    }
}
function showImage(_img) {
    // draw dotted rectangle around image
    if (_img.status == 'moving') {
        push();
        stroke(255, 0, 0);
        noFill();
        drawingContext.setLineDash([10, 10]);
        rect(_img.x0 - 5, _img.y0 - 5, _img.width + 10, _img.height + 10);
        pop();
    }

    image(_img.content, _img.x0, _img.y0, _img.width, _img.height);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function undo() {
    try {
        if (undoArr.length > 0) {
            let activity = undoArr.pop();
            redoArr.push(activity);

            if (activity == 'line') {
                let latest = lineArr.pop();
                erasedStuffArr.push(latest);
            }
            if (activity == 'stroke') {
                let latest = strokeArr.pop();
                erasedStuffArr.push(latest);
            }
            if (activity == 'text') {
                let latest = textArr.pop();
                erasedStuffArr.push(latest);
            }
            if (activity == 'image') {
                let latest = imgArr.pop();
                erasedStuffArr.push(latest);
            }

            if (activity == 'erase line') {
                let erased = erasedStuffArr.pop();
                lineArr.push(erased);
            }
            if (activity == 'erase stroke') {
                let erased = erasedStuffArr.pop();
                strokeArr.push(erased);
            }
            if (activity == 'erase image') {
                let erased = erasedStuffArr.pop();
                imgArr.push(erased);
            }
            if (activity == 'erase text') {
                let erased = erasedStuffArr.pop();
                textArr.push(erased);
            }
        }
    }
    catch {
        window.alert('error undoing');
    }
}

function redo() {
    try {
        if (redoArr.length > 0) {
            let activity = redoArr.pop();
            undoArr.push(activity);

            if (activity == 'line') {
                let erased = erasedStuffArr.pop();
                lineArr.push(erased);
            }
            if (activity == 'stroke') {
                let erased = erasedStuffArr.pop();
                strokeArr.push(erased);
            }
            if (activity == 'text') {
                let erased = erasedStuffArr.pop();
                textArr.push(erased);
            }
            if (activity == 'image') {
                let erased = erasedStuffArr.pop();
                imgArr.push(erased);
            }

            if (activity == 'erase line') {
                let restored = lineArr.pop();
                erasedStuffArr.push(restored);
            }
            if (activity == 'erase stroke') {
                let restored = strokeArr.pop();
                erasedStuffArr.push(restored);
            }
            if (activity == 'erase image') {
                let restored = imgArr.pop();
                erasedStuffArr.push(restored);
            }
            if (activity == 'erase text') {
                let restored = textArr.pop();
                erasedStuffArr.push(restored);
            }
        }
    }
    catch {
        window.alert('error redoing');
    }
}

function openJSON(file) {
    try {
        let json = file.data;

        newimages = [];
        for (let i of json.images) {
            let imagecontent = createImg(i.data).hide();
            newimages.push({
                content: imagecontent,
                data: i.data,
                width: i.width,
                height: i.height,
                x0: i.x0,
                y0: i.y0,
                status: i.status
            });
        }

        resizeCanvas(json.canvassize.width, json.canvassize.height);
        backgroundColor = json.backgroundColor;
        lineArr = json.lines;
        strokeArr = json.strokes;
        textArr = json.texts;
        imgArr = newimages;

        updateNeeded = true;
    }
    catch {
        window.alert("not a valid save file");

    }

}

function buttonPos(buttons, spaces) {
    return buttonWidth * buttons + spacing * spaces;
}

function reducearr(arr) {
    // array to store redundant points indices
    let deletearr = [];

    for (let point = 1; point < arr.length - 1; point++) {
        // calculate number of remaining points
        let numberOfZeroes = 0;
        for (let index in arr) {
            if (deletearr.includes(Number(index))) { numberOfZeroes++; }
        }
        let remainingpoints = arr.length - numberOfZeroes;
        // only continue marking redundant points if more than 30 points exist
        if (remainingpoints > 30) {
            let vector1 = { x: arr[point - 1].x - arr[point].x, y: arr[point - 1].y - arr[point].y };
            let vector2 = { x: arr[point + 1].x - arr[point].x, y: arr[point + 1].y - arr[point].y };

            // identity and mark redundant points
            if (Math.abs(angle(vector1, vector2)) > 175) {
                deletearr.push(point);
            }
        } else {
            break;
        }
    }

    // set redundant points to zero
    for (let i in arr) {
        if (deletearr.includes(Number(i))) {
            arr[i] = 0;
        }
    }

    // extract non-redundant points
    result = arr.filter(point => point !== 0);
    return result;
}

function angle(vector1, vector2) {
    let dotproduct = vector1.y * vector2.y + vector1.x * vector2.x;

    let mag1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
    let mag2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

    return (Math.acos(dotproduct / (mag1 * mag2))) * (180 / Math.PI);
}