class Not_e {
    constructor() {
        // determine device type
        this.isDeviceTouch = false;
        if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
            this.isDeviceTouch = true;
        }
        else {
            this.isDeviceTouch = false;
        }

        // entity arrays
        this.entityArr = [];

        this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

        this.activeEntity = 0;

        this.scalefactor = 1;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;

        // undo-redo arrays
        this.undoArr = [];
        this.redoArr = [];

        this.erasedStuffArr = [];

        this.deltaX = 0;
        this.deltaY = 0;

        // selection vars
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

        this.scrollTimeout = 0;
        this.timeoutinterval = 0;

        // drawing vars
        this.guidesSwitch = false;
        this.currentStrokeWeight = 4;
        this.currentStrokeStyle = 'solid';
        this.currentShapeStyle = 'hollow';
        this.eraserSize = 30;
        this.currentColor = [255, 255, 255];
        this.currentOpacity = 255;
        this.backgroundColor = [0, 0, 0];
        this.currentTextSize = 30;
        this.updateNeeded = true;
        this.eraserCell = { x: 1, y: 1 };
        this.entityID = 0;
        this.cursorOffset = 0;

        // mode vars
        this.mode = 'stroke';
        this.currentMode = 'stroke';

        // canvas
        this.canvas;
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        this.viewWindow = { x0: 0, y0: 0, x1: this.canvasWidth, y1: this.canvasHeight };

        this.grid = {
            length: 0.7 * this.eraserSize,
            matrix: []
        };

        // UI elements
        this.canvas;
        this.colorDisplay;
        this.lineModeButton;
        this.strokeModeButton;
        this.textModeButton;
        this.rectModeButton;
        this.selectModeButton;
        this.imageselectModeButton;
        this.eraseModeButton;
        this.removeModeButton;
        this.strokeWeightDisplay;
        this.solidStyleButton;
        this.dashStyleButton;
        this.picButton;
        this.undoButton;
        this.redoButton;
        this.saveModeButton;

        this.screenRatio = window.innerWidth / window.innerHeight;

        this.heightDenominator = 17.5;
        this.widthDenominator = this.heightDenominator * this.screenRatio;

        this.buttonHeight = window.innerHeight / this.heightDenominator;
        this.buttonWidth = window.innerWidth / this.widthDenominator;

        this.buttonFont = this.buttonWidth / 2.1;
        this.spacingX = this.buttonWidth / 2.5;
        this.spacingY = this.buttonHeight / 2.5;
    }

    // handle canvasOffset vars
    scrollViewWindow(event, isWheel = false) {
        let scrollX;
        let scrollY;
        if (isWheel == true) {
            scrollX = event.deltaX;
            scrollY = event.deltaY;
        } else {
            scrollX = (-1 * event.movementX);
            scrollY = (-1 * event.movementY);
        }

        this.canvasOffsetX += scrollX;
        this.canvasOffsetY += scrollY;

        if (this.canvasOffsetX < 0) {
            this.canvasOffsetX -= scrollX;
        }
        if (this.canvasOffsetY < 0) {
            this.canvasOffsetY -= scrollY;
        }
    }

    isButtonClickAllowed() {
        return (this.entityArr.length == 0 || (this.isEntityDrawing() == false && this.isEntityMoving() == false && this.mode != 'moving'));
    }

    // sets viewWindow based on canvasoffset and scalefactor
    manageViewWindow(newscale) {
        let oldscale = this.scalefactor;
        this.scalefactor = newscale;

        let midpointX = this.canvasOffsetX + ((this.canvasWidth / oldscale) / 2);
        let newleft = Math.max(0, midpointX - ((this.canvasWidth / newscale) / 2));
        let newright = newleft + (this.canvasWidth / newscale);

        let midpointY = this.canvasOffsetY + ((this.canvasHeight / oldscale) / 2);
        let newtop = Math.max(0, midpointY - ((this.canvasHeight / newscale) / 2));
        let newbottom = newtop + (this.canvasHeight / newscale);

        this.canvasOffsetX = newleft;
        this.canvasOffsetY = newtop;

        this.viewWindow.x0 = newleft;
        this.viewWindow.x1 = newright;
        this.viewWindow.y0 = newtop;
        this.viewWindow.y1 = newbottom;
    }

    // make p5 canvas
    makeCanvas() {
        // make canvas
        this.canvas = createCanvas(this.canvasWidth, this.canvasHeight).position(this.buttonWidth, this.buttonHeight).style('position : fixed');
        this.canvas.style('touch-action : none');

        // set background color
        background(this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2]);

        // infinite sroll
        this.canvas.mouseWheel((event) => {
            this.mouseWheel(event);
        });

    }

    // make all the buttons
    makeGUI() {
        // make UI elements
        let topbar = createDiv().position(0, 0).size(this.canvasWidth, this.buttonHeight).style('background-color:rgb(70,70,120)').style('position : fixed');
        let sidebar = createDiv().position(0, 0).size(this.buttonWidth, this.canvasHeight).style('background-color', 'rgb(70, 70, 120)').style('position', 'fixed');

        this.homeview = createButton('🏠').position(0, this.buttonY(0, 0)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "rectangle mode").style('position : fixed');
        this.homeview.mouseClicked(() => { this.resetView(); });
        this.strokeModeButton = createButton('🖊').position(0, this.buttonY(1, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "freehand mode").style('position : fixed');
        this.strokeModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.isRightMouseDown = false;
                this.mode = 'stroke';
                this.currentMode = 'stroke';
            }
        });

        this.lineModeButton = createButton('📏').position(0, this.buttonY(2, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "line mode").style('position : fixed');
        this.lineModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.isRightMouseDown = false;
                this.mode = 'line';
                this.currentMode = 'line';
            }
        });
        this.textModeButton = createButton('₸').position(0, this.buttonY(3, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "text mode").style('position : fixed');
        this.textModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.isRightMouseDown = false;
                this.mode = 'text';
                this.currentMode = 'text';
            }

        });
        this.rectModeButton = createButton('🟥').position(0, this.buttonY(4, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "rectangle mode").style('position : fixed');
        this.rectModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.isRightMouseDown = false;
                this.mode = 'rect'; this.currentMode = 'rect';
            }

        });

        this.ellipseModeButton = createButton('⬭').position(0, this.buttonY(5, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "rectangle mode").style('position : fixed');
        this.ellipseModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.isRightMouseDown = false;
                this.mode = 'ellipse'; this.currentMode = 'ellipse';
            }
        });
        this.circleModeButton = createButton('🔵').position(0, this.buttonY(6, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "rectangle mode").style('position : fixed');
        this.circleModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.isRightMouseDown = false;
                this.mode = 'circle'; this.currentMode = 'circle';
            }
        });

        this.picButton = createButton('🖼').position(0, this.buttonY(7, 1)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "insert image").style('position : fixed');
        this.picButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.mode = 'image';
                let input = createFileInput((file) => { this.addEntity('image', file); });
                input.hide();
                input.elt.click();
            }
        });

        this.selectModeButton = createButton('⛶').position(0, this.buttonY(8, 2)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "select mode").style('position : fixed');
        this.selectModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.mode = this.mode === 'select' ? this.currentMode : 'select';
            }
        });
        this.imageselectModeButton = createButton('⮽').position(0, this.buttonY(9, 2)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "image select mode").style('position : fixed');
        this.imageselectModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.mode = this.mode == 'imageselect' ? this.currentMode : 'imageselect';
            }

        });
        this.scrollModeButton = createButton('🖐').position(0, this.buttonY(10, 2)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "scroll mode").style('position : fixed');
        this.scrollModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.mode = this.mode == 'scroll' ? this.currentMode : 'scroll';
            }
        });
        this.eraseModeButton = createButton('🧽').position(0, this.buttonY(11, 2)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "erase mode").style('position : fixed');
        this.eraseModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.mode = this.mode == 'erase' ? this.currentMode : 'erase';
            }
        });
        this.removeModeButton = createButton('X').position(0, this.buttonY(12, 2)).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "remove text and images").style('position : fixed');
        this.removeModeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.mode = this.mode == 'remove' ? this.currentMode : 'remove';
                this.updateNeeded = true;
            }
        });
        this.colorDisplay = createColorPicker('white').position(this.buttonX(1, 1), 0).size(this.buttonWidth, this.buttonHeight / 1.5).attribute('title', "set brush color").style('position : fixed');
        this.colorDisplay.input(() => {
            let value = this.hexToRgb(this.colorDisplay.value());
            this.currentColor = [value.r, value.g, value.b];
        });
        let colorbutton = createButton('OK').position(this.buttonX(2, 1), 0).size(this.buttonWidth, this.buttonHeight / 1.5).style(`font-size:${this.buttonFont / 1.5}px`).style('position : fixed');
        this.opacitySlider = createSlider(0, 255).value(255).size(this.buttonWidth * 2, this.buttonHeight / 4);

        this.opacitySlider.position(this.buttonX(1, 1) - 2, (this.buttonHeight / 1.5) + 1);
        this.opacitySlider.input(() => {
            this.currentOpacity = this.opacitySlider.value();
        });

        let strokeMinusButton = createButton(' ⎼ ').position(this.buttonX(3, 2), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "decrease stroke size").style('position : fixed');
        this.strokeWeightDisplay = createDiv('4').position(this.buttonX(4, 2), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).style('background-color : rgb(170,170,170)').style('position : fixed');
        let strokePlusButton = createButton(' + ').position(this.buttonX(5, 2), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "increase stroke size").style('position : fixed');
        strokeMinusButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                if (this.isRightMouseDown == false) {
                    if (this.mode == 'erase') {
                        if (this.eraserSize > 5) {
                            this.eraserSize -= 5;
                        } else if (this.eraserSize > 1) {
                            this.eraserSize -= 1;
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
                    if (this.eraserSize > 5) {
                        this.eraserSize -= 5;
                    } else if (this.eraserSize > 1) {
                        this.eraserSize -= 1;
                    }
                }
            }
        });
        strokePlusButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                if (this.isRightMouseDown == false) {
                    if (this.mode == 'erase') {
                        if (this.eraserSize < 5) {
                            this.eraserSize += 1;
                        } else {
                            this.eraserSize += 5;
                        }
                    }
                    if (this.mode == 'text') {
                        this.currentTextSize++;
                    } else {
                        this.currentStrokeWeight++;
                    }
                } else {
                    if (this.eraserSize < 5) {
                        this.eraserSize += 1;
                    } else {
                        this.eraserSize += 5;
                    }
                }
            }
        });

        this.solidStyleButton = createButton('⎯').position(this.buttonX(6, 3), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "solid strokes").style('position : fixed');
        this.dashStyleButton = createButton('---').position(this.buttonX(7, 3), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "dashed strokes").style('position : fixed');
        this.solidStyleButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.currentStrokeStyle = 'solid';
            }
        });
        this.dashStyleButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.currentStrokeStyle = 'dash';
            }
        });

        this.hollowShapeButton = createButton('⭕').position(this.buttonX(8, 4), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "solid strokes").style('position : fixed');
        this.hollowShapeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.currentShapeStyle = 'hollow';
            }
        });
        this.solidShapeButton = createButton('🔴').position(this.buttonX(9, 4), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "solid strokes").style('position : fixed');
        this.solidShapeButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.currentShapeStyle = 'solid';
            }
        });

        this.undoButton = createButton('↶').position(this.buttonX(10, 5), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "undo").style('position : fixed');
        this.undoButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.undo();
            }
        });
        this.redoButton = createButton('↷').position(this.buttonX(11, 5), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "redo").style('position : fixed');
        this.redoButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.redo();
            }
        });

        this.zoomOutButton = createButton('🔎').position(this.buttonX(12, 6), 0).size(this.buttonWidth, this.buttonHeight / 1.5).style(`font-size:${this.buttonFont / 1.2}px`).style('text-align : center').style(`line-height: ${this.buttonHeight / 1.5}px`).attribute('title', "zoom out").style('position : fixed');
        this.zoomOutButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                const step = Math.max(0.5, this.scalefactor * 0.1);
                if (this.scalefactor > 0.25) {
                    this.manageViewWindow(Math.max(0.25, this.scalefactor - step));
                    this.updateDisplayStatus();

                    this.zoomSlider.value(map(this.scalefactor, 0.25, 4, 0, 100));
                }
            }

        });
        this.zoomResetButton = createButton('↺').position(this.buttonX(13, 6), 0).size(this.buttonWidth, this.buttonHeight / 1.5).style(`font-size:${this.buttonFont / 1.2}px`).style('text-align : center').style(`line-height: ${this.buttonHeight / 1.5}px`).attribute('title', "reset zoom").style('position : fixed');
        this.zoomInButton = createButton('🔍').position(this.buttonX(14, 6), 0).size(this.buttonWidth, this.buttonHeight / 1.5).style(`font-size:${this.buttonFont / 1.2}px`).style('text-align : center').style(`line-height: ${this.buttonHeight / 1.5}px`).attribute('title', "zoom in").style('position : fixed');
        this.zoomResetButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                this.zoomSlider.value(20);
                this.manageViewWindow(1);
                this.updateDisplayStatus();
            }

        });
        this.zoomInButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                const step = Math.max(0.5, this.scalefactor * 0.1);
                if (this.scalefactor < 4) {
                    this.manageViewWindow(Math.min(4, this.scalefactor + step));
                    this.updateDisplayStatus();

                    this.zoomSlider.value(map(this.scalefactor, 0.25, 4, 0, 100));
                }
            }

        });

        this.zoomSlider = createSlider(0, 100).value(20);
        this.zoomSlider.position(this.buttonX(12, 6) + 5, (this.buttonHeight / 1.5) + 1);
        this.zoomSlider.input(() => {
            this.manageViewWindow(map(this.zoomSlider.value(), 0, 100, 0.25, 4));

            this.updateDisplayStatus();

            clearTimeout(this.scrollTimeout);

            this.scrollTimeout = setTimeout(() => {
                this.populateGrid();
            }, 300);
        });

        let saveButton = createButton('💾').position(this.buttonX(15, 7), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "save canvas").style('position : fixed');
        saveButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                let filename = window.prompt('enter filename', 'myNotes');
                this.saveFile(filename, this.saveModeButton.value());
            }

        });
        this.saveModeButton = createSelect().position(this.buttonX(16, 7), 0).size(this.buttonWidth, this.buttonHeight / 2).style(`font-size:${this.buttonFont / 2}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "set save format").style('position : fixed');
        this.saveModeButton.option('jpg');
        this.saveModeButton.option('json');
        let openButton = createButton('📁').position(this.buttonX(17, 7), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "open save file").style('position : fixed');
        openButton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                let input = createFileInput(this.openJSON);
                input.hide();
                input.elt.click();
            }
        });

        let bgColorDisplay = createColorPicker('black').position(this.buttonX(18, 8), 0).size(this.buttonWidth, this.buttonHeight).attribute('title', "set background").style('position : fixed');
        let bgcolorbutton = createButton('OK').position(this.buttonX(19, 8), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont / 1.5}px`).style('position : fixed');
        bgColorDisplay.input(() => {
            let value = this.hexToRgb(bgColorDisplay.value());
            this.backgroundColor = [value.r, value.g, value.b];
            this.updateNeeded = true;
        });

        this.guidesbutton = createButton('🔢').position(this.buttonX(20, 9), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', "rectangle mode").style('position : fixed');
        this.guidesbutton.mouseClicked(() => { this.guidesSwitch = this.guidesSwitch != true; });

        let helpbutton = createButton('❓').position(this.buttonX(21, 10), 0).size(this.buttonWidth, this.buttonHeight).style(`font-size:${this.buttonFont}px`).style('text-align : center').style(`line-height: ${this.buttonHeight}px`).attribute('title', 'help').style('position : fixed');
        helpbutton.mouseClicked(() => {
            if (this.isButtonClickAllowed() == true) {
                window.open('https://github.com/Nishchal-Bhat/Not_E?tab=readme-ov-file#not_e', '_blank');
            }
        });
    }

    // change button displays depending on current mode
    updateGUI() {
        if (this.isRightMouseDown == true || this.mode == 'erase') {
            this.strokeWeightDisplay.html(this.eraserSize);
        } else if (this.mode == 'text') {
            this.strokeWeightDisplay.html(this.currentTextSize);
        } else {
            this.strokeWeightDisplay.html(this.currentStrokeWeight);
        }
        this.lineModeButton.style('background-color : revert');
        this.strokeModeButton.style('background-color : revert');
        this.textModeButton.style('background-color : revert');
        this.rectModeButton.style('background-color : revert');
        this.circleModeButton.style('background-color : revert');
        this.ellipseModeButton.style('background-color : revert');
        this.selectModeButton.style('background-color : revert');
        this.scrollModeButton.style('background-color : revert');
        this.eraseModeButton.style('background-color : revert');
        this.removeModeButton.style('background-color : revert');
        this.imageselectModeButton.style('background-color : revert');
        this.solidStyleButton.style('background-color : revert');
        this.dashStyleButton.style('background-color : revert');
        this.solidShapeButton.style('background-color : revert');
        this.hollowShapeButton.style('background-color : revert');
        this.undoButton.style('background-color : revert');
        this.redoButton.style('background-color : revert');

        if (this.mode == 'line') {
            this.lineModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'stroke') {
            this.strokeModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'text') {
            this.textModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'rect') {
            this.rectModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'circle') {
            this.circleModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'ellipse') {
            this.ellipseModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.isRightMouseDown == true || this.mode == 'erase') {
            this.eraseModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'remove') {
            this.removeModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'scroll') {
            this.scrollModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'select' || (this.mode == 'moving' && this.entityArr.find((e) => e.id == this.selectedStuffArr[0]).type != 'image')) {
            this.selectModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.mode == 'imageselect' || (this.mode == 'moving' && this.entityArr.find((e) => e.id == this.selectedStuffArr[0]).type == 'image')) {
            this.imageselectModeButton.style('background-color : rgb(170,170,170)');
        }
        if (this.undoArr.length == 0) {
            this.undoButton.style('background-color : rgb(170,170,170)');
        }
        if (this.redoArr.length == 0) {
            this.redoButton.style('background-color : rgb(170,170,170)');
        }
        if (this.currentStrokeStyle == 'solid') {
            this.solidStyleButton.style('background-color : rgb(170,170,170)');
        } else {
            this.dashStyleButton.style('background-color : rgb(170,170,170)');
        }
        if (this.currentShapeStyle == 'solid') {
            this.solidShapeButton.style('background-color : rgb(170,170,170)');
        } else {
            this.hollowShapeButton.style('background-color : rgb(170,170,170)');
        }
    }

    // adds new entity to the program
    async addEntity(_type, _file) {
        if (_type == 'image') {
            if (_file.type === 'image') {
                let dimensions = window.prompt(`Enter desired image width and height seperated by a space.\nFor example: 100 100 \nOr enter "." if you want to enter the other value and scale accordingly \nFor example: 100 . OR . 300  \nYour screen size is ${window.innerWidth} ${window.innerHeight} \nLeave blank for default image dimensions.`, "");
                let imagedata = await createImg(_file.data).hide();
                imagedata.elt.onload = () => {
                    let enteredwidth;
                    let enteredheight;

                    if (dimensions == "") {
                        enteredwidth = imagedata.width;
                    } else if (dimensions.split(" ")[0] == ".") {
                        enteredwidth = (imagedata.width / imagedata.height) * Number(dimensions.split(" ")[1]);
                    } else {
                        enteredwidth = Number(dimensions.split(" ")[0]);
                    }

                    if (dimensions == "") {
                        enteredheight = imagedata.height;
                    } else if (dimensions.split(" ")[1] == ".") {
                        enteredheight = (imagedata.height / imagedata.width) * Number(dimensions.split(" ")[0]);
                    } else {
                        enteredheight = Number(dimensions.split(" ")[1]);
                    }
                    let img = {
                        type: 'image',
                        id: this.entityID,
                        x0: this.mouseX + this.viewWindow.x0,
                        y0: this.mouseY + this.viewWindow.y0,
                        x1: this.mouseX + enteredwidth + this.viewWindow.x0,
                        y1: this.mouseY + enteredheight + this.viewWindow.y0,
                        width: enteredwidth,
                        height: enteredheight,
                        data: _file.data,
                        content: imagedata,
                        status: 'moving',
                        movingColor: 0,
                        displayed: true,
                        offsetX: -1 * this.viewWindow.x0,
                        offsetY: -1 * this.viewWindow.y0,
                    };
                    this.entityArr.push(img);
                    this.activeEntity = this.entityArr[this.entityArr.length - 1];


                    this.undoArr.push({ type: _type, id: img.id });
                    this.redoArr = [];
                };
            } else {
                window.alert("That's not an image file");
            }
        } else {
            let entity;
            if (_type == 'stroke') {
                entity = {
                    type: 'stroke',
                    id: this.entityID,
                    arr: [{
                        x: this.mouseX + this.viewWindow.x0,
                        y: this.mouseY + this.viewWindow.y0,
                        id: this.entityID
                    }],
                    status: 'drawing',
                    color: this.currentColor,
                    opacity: this.currentOpacity,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle,
                    displayed: true,
                    offsetX: -1 * this.viewWindow.x0,
                    offsetY: -1 * this.viewWindow.y0,
                };
            }

            if (_type == 'line') {
                entity = {
                    type: 'line',
                    id: this.entityID,
                    x0: this.mouseX + this.viewWindow.x0,
                    y0: this.mouseY + this.viewWindow.y0,
                    x1: this.mouseX + this.viewWindow.x0,
                    y1: this.mouseY + this.viewWindow.y0,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    opacity: this.currentOpacity,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle,
                    displayed: true,
                    offsetX: -1 * this.viewWindow.x0,
                    offsetY: -1 * this.viewWindow.y0,
                };
            }

            if (_type == 'rect') {
                entity = {
                    type: 'rect',
                    id: this.entityID,
                    x0: this.mouseX + this.viewWindow.x0,
                    y0: this.mouseY + this.viewWindow.y0,
                    x1: this.mouseX + this.viewWindow.x0,
                    y1: this.mouseY + this.viewWindow.y0,
                    width: 0,
                    height: 0,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    opacity: this.currentOpacity,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle,
                    shapeStyle: this.currentShapeStyle,
                    displayed: true,
                    offsetX: -1 * this.viewWindow.x0,
                    offsetY: -1 * this.viewWindow.y0,
                };
            }

            if (_type == 'text') {
                entity = {
                    type: 'text',
                    id: this.entityID,
                    x0: this.mouseX + this.viewWindow.x0,
                    y0: this.mouseY + this.viewWindow.y0,
                    x1: this.mouseX + this.viewWindow.x0,
                    y1: this.mouseY + this.viewWindow.y0,
                    width: 100,
                    height: 50,
                    arr: [],
                    edited: false,
                    status: 'drawing',
                    color: this.currentColor,
                    opacity: this.currentOpacity,
                    movingColor: 0,
                    size: this.currentTextSize,
                    content: "",
                    displayed: true,
                    offsetX: -1 * this.viewWindow.x0,
                    offsetY: -1 * this.viewWindow.y0,
                };
            }

            if (_type == 'circle') {
                entity = {
                    type: 'circle',
                    id: this.entityID,
                    x: this.mouseX + this.viewWindow.x0,
                    y: this.mouseY + this.viewWindow.y0,
                    radius: 0,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    opacity: this.currentOpacity,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle,
                    shapeStyle: this.currentShapeStyle,
                    displayed: true,
                    offsetX: -1 * this.viewWindow.x0,
                    offsetY: -1 * this.viewWindow.y0,
                };
            }

            if (_type == 'ellipse') {
                entity = {
                    type: 'ellipse',
                    id: this.entityID,
                    x0: this.mouseX + this.viewWindow.x0,
                    y0: this.mouseY + this.viewWindow.y0,
                    x1: this.mouseX + this.viewWindow.x0,
                    y1: this.mouseY + this.viewWindow.y0,
                    width: 0,
                    height: 0,
                    arr: [],
                    status: 'drawing',
                    color: this.currentColor,
                    opacity: this.currentOpacity,
                    movingColor: 0,
                    strokeWeight: this.currentStrokeWeight,
                    strokeStyle: this.currentStrokeStyle,
                    shapeStyle: this.currentShapeStyle,
                    displayed: true,
                    offsetX: -1 * this.viewWindow.x0,
                    offsetY: -1 * this.viewWindow.y0,
                };
            }

            this.entityArr.push(entity);

            this.undoArr.push({ type: _type, id: entity.id });
            this.redoArr = [];

            this.activeEntity = this.entityArr[this.entityArr.length - 1];
        }

        this.updateNeeded = true;
    }

    // draws the actual body of the entity
    drawEntity() {
        if (this.activeEntity) {
            let type = this.activeEntity.type;

            if (type == 'image' && this.isEntityMoving() == true) {
                this.activeEntity.x0 = this.mouseX + this.viewWindow.x0;
                this.activeEntity.y0 = this.mouseY + this.viewWindow.y0;
            }

            if (type == 'text' && this.isEntityMoving() == true) {
                this.activeEntity.x0 = this.mouseX + this.viewWindow.x0;
                this.activeEntity.y0 = this.mouseY + this.viewWindow.y0;
            }

            if (type == 'line' || type == 'rect' || type == 'ellipse') {
                if (this.isEntityDrawing() == true) {
                    this.activeEntity.x1 = this.mouseX + this.viewWindow.x0;
                    this.activeEntity.y1 = this.mouseY + this.viewWindow.y0;
                }
            }

            if (type == 'circle') {
                if (this.isEntityDrawing() == true) {
                    this.activeEntity.radius = dist(this.activeEntity.x, this.activeEntity.y, this.mouseX + this.viewWindow.x0, this.mouseY + this.viewWindow.y0);
                }
            }

            if (type == 'stroke') {
                if (this.isEntityDrawing() == true) {
                    this.activeEntity.arr.push({
                        x: this.mouseX + this.viewWindow.x0,
                        y: this.mouseY + this.viewWindow.y0,
                        id: this.entityID
                    });
                }
            }
        }
    }

    // sets entity status to drawn and computes points and other parameters of the entity
    finishEntity(drawDirectly = false) {
        if (this.mode == 'image') {
            if (this.isEntityMoving() == true) {
                this.activeEntity.x1 = this.activeEntity.x0 + this.activeEntity.width;
                this.activeEntity.y1 = this.activeEntity.y0 + this.activeEntity.height;
                this.activeEntity.status = 'drawn';
                this.mode = this.currentMode;

                this.entityID++;
            }
        } else if (this.isEntityDrawing() == true || this.isEntityMoving() == true) {

            if (this.mode == 'line') {
                let temparr = [];
                let resolution = 30;
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: this.activeEntity.x0 + (this.activeEntity.x1 - this.activeEntity.x0) * i / resolution,
                        y: this.activeEntity.y0 + (this.activeEntity.y1 - this.activeEntity.y0) * i / resolution,
                        id: this.activeEntity.id
                    });
                }
                this.activeEntity.arr = temparr;
                this.activeEntity.status = 'drawn';
            }

            if (this.mode == 'stroke') {
                if (this.activeEntity.arr.length > 30) {
                    this.activeEntity.arr = this.reduceArr(this.activeEntity.arr);
                }
                this.activeEntity.status = 'drawn';
            }

            if (this.mode == 'circle') {
                let temparr = [];
                let sweep = 0.08;
                for (let _angle = 0; _angle < 2 * Math.PI; _angle += sweep) {
                    temparr.push({
                        x: this.activeEntity.x + this.activeEntity.radius * Math.cos(_angle),
                        y: this.activeEntity.y + this.activeEntity.radius * Math.sin(_angle),
                        id: this.activeEntity.id
                    });
                }
                this.activeEntity.arr = temparr;
                this.activeEntity.status = 'drawn';
            }

            if (this.mode == 'ellipse') {
                this.activeEntity.width = this.activeEntity.x1 - this.activeEntity.x0;
                this.activeEntity.height = this.activeEntity.y1 - this.activeEntity.y0;

                let temparr = [];
                let sweep = 0.08;
                for (let _angle = 0; _angle < 2 * Math.PI; _angle += sweep) {
                    temparr.push({
                        x: ((this.activeEntity.x0 + this.activeEntity.x1) / 2) + ((this.activeEntity.width / 2) * Math.cos(_angle)),
                        y: ((this.activeEntity.y0 + this.activeEntity.y1) / 2) + ((this.activeEntity.height / 2) * Math.sin(_angle)),
                        id: this.activeEntity.id
                    });
                }
                this.activeEntity.arr = temparr;
                this.activeEntity.status = 'drawn';
            }

            if (this.mode == 'rect') {
                let temparr = [];
                let resolution = 30;

                this.activeEntity.width = this.activeEntity.x1 - this.activeEntity.x0;
                this.activeEntity.height = this.activeEntity.y1 - this.activeEntity.y0;

                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: this.activeEntity.x0 + ((this.activeEntity.width) * i / resolution),
                        y: this.activeEntity.y0,
                        id: this.activeEntity.id
                    });
                }
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: this.activeEntity.x1,
                        y: this.activeEntity.y0 + (this.activeEntity.height) * i / resolution,
                        id: this.activeEntity.id

                    });
                }
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: this.activeEntity.x1 - (this.activeEntity.width) * i / resolution,
                        y: this.activeEntity.y1,
                        id: this.activeEntity.id
                    });
                }
                for (let i = 0; i < resolution + 1; i++) {
                    temparr.push({
                        x: this.activeEntity.x0,
                        y: this.activeEntity.y1 - (this.activeEntity.height) * i / resolution,
                        id: this.activeEntity.id
                    });
                }
                this.activeEntity.arr = temparr;
                this.activeEntity.status = 'drawn';

            }

            if (this.mode == 'text') {
                if (this.activeEntity.status == 'moving') {
                    this.activeEntity.x1 = this.activeEntity.x0 + this.activeEntity.width;
                    this.activeEntity.y1 = this.activeEntity.y0 + this.activeEntity.height;

                    let temparr = [];
                    let resolution = 30;

                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: this.activeEntity.x0 + ((this.activeEntity.width) * i / resolution),
                            y: this.activeEntity.y0,
                            id: this.activeEntity.id
                        });
                    }
                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: this.activeEntity.x1,
                            y: this.activeEntity.y0 + (this.activeEntity.height) * i / resolution,
                            id: this.activeEntity.id

                        });
                    }
                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: this.activeEntity.x1 - (this.activeEntity.width) * i / resolution,
                            y: this.activeEntity.y1,
                            id: this.activeEntity.id
                        });
                    }
                    for (let i = 0; i < resolution + 1; i++) {
                        temparr.push({
                            x: this.activeEntity.x0,
                            y: this.activeEntity.y1 - (this.activeEntity.height) * i / resolution,
                            id: this.activeEntity.id
                        });
                    }
                    this.activeEntity.arr = temparr;
                    this.activeEntity.status = 'drawn';
                }

                if (this.activeEntity.status == 'drawing') {
                    if (this.activeEntity.edited == true || drawDirectly == true) {
                        this.activeEntity.x1 = this.activeEntity.x0 + this.activeEntity.width;
                        this.activeEntity.y1 = this.activeEntity.y0 + this.activeEntity.height;

                        let temparr = [];
                        let resolution = 30;

                        for (let i = 0; i < resolution + 1; i++) {
                            temparr.push({
                                x: this.activeEntity.x0 + ((this.activeEntity.width) * i / resolution),
                                y: this.activeEntity.y0,
                                id: this.activeEntity.id
                            });
                        }
                        for (let i = 0; i < resolution + 1; i++) {
                            temparr.push({
                                x: this.activeEntity.x1,
                                y: this.activeEntity.y0 + (this.activeEntity.height) * i / resolution,
                                id: this.activeEntity.id

                            });
                        }
                        for (let i = 0; i < resolution + 1; i++) {
                            temparr.push({
                                x: this.activeEntity.x1 - (this.activeEntity.width) * i / resolution,
                                y: this.activeEntity.y1,
                                id: this.activeEntity.id
                            });
                        }
                        for (let i = 0; i < resolution + 1; i++) {
                            temparr.push({
                                x: this.activeEntity.x0,
                                y: this.activeEntity.y1 - (this.activeEntity.height) * i / resolution,
                                id: this.activeEntity.id
                            });
                        }
                        this.activeEntity.arr = temparr;
                        this.activeEntity.status = 'drawn';

                        if (this.activeEntity.edited == true) {
                            this.undoArr.push({
                                type: 'textedit',
                                id: this.activeEntity.id,
                                oldcontent: this.activeEntity.prevcontent,
                                newcontent: this.activeEntity.content
                            });
                        }


                    } else {
                        this.activeEntity.x0 = this.mouseX;
                        this.activeEntity.y0 = this.mouseY;
                        this.activeEntity.status = 'moving';

                    }

                    this.cursorOffset = 0;
                }
            }
            this.populateGrid();
        }

        this.entityID++;

        this.updateNeeded = true;
    }

    // updates positions of entities when view window is scrolled
    updateDisplayStatus() {
        for (let _entity of this.entityArr) {
            _entity.offsetX = this.viewWindow.x0 * -1;
            _entity.offsetY = this.viewWindow.y0 * -1;
        }

        function pointInRect(point, rect) {
            return (
                point.x >= rect.x0 &&
                point.x <= rect.x1 &&
                point.y >= rect.y0 &&
                point.y <= rect.y1
            );
        }

        for (let _entity of this.entityArr) {
            _entity.displayed = false;
        }

        for (let _entity of this.entityArr) {
            if (_entity.type == 'stroke' || _entity.type == 'circle' || _entity.type == 'ellipse') {
                for (let _point of _entity.arr) {
                    if (pointInRect({ x: _point.x, y: _point.y }, this.viewWindow) == true) {
                        _entity.displayed = true;
                        break;
                    }
                }
            } else if (_entity.type == 'image') {
                if (this.rectsIntersect(this.viewWindow, {
                    x0: _entity.x0,
                    y0: _entity.y0,
                    x1: _entity.x1,
                    y1: _entity.y1
                }) == true) {
                    _entity.displayed = true;
                }
            }
            else {
                if (pointInRect({ x: _entity.x0, y: _entity.y0 }, this.viewWindow) == true ||
                    pointInRect({ x: _entity.x1, y: _entity.y1 }, this.viewWindow) == true ||
                    pointInRect({ x: _entity.x0, y: _entity.y1 }, this.viewWindow) == true ||
                    pointInRect({ x: _entity.x1, y: _entity.y0 }, this.viewWindow) == true) {
                    _entity.displayed = true;
                }
            }
        }

        this.updateNeeded = true;
    }

    // shows the entity on the canvas
    showEntity(_entity) {
        if (_entity.displayed == true) {
            push();
            if (_entity.type == 'image') {
                if (_entity.status == 'moving') {
                    stroke(255, 0, 0);
                    noFill();
                    drawingContext.setLineDash([10, 10]);
                    rect(_entity.x0 - 5 + _entity.offsetX, _entity.y0 - 5 + _entity.offsetY, _entity.width + 10, _entity.height + 10);
                }
                if (_entity.movingColor != 0) {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                    noFill();
                    drawingContext.setLineDash([10, 10]);
                    rect(_entity.x0 - 5 + _entity.offsetX, _entity.y0 - 5 + _entity.offsetY, _entity.width + 10, _entity.height + 10);
                }
                image(_entity.content, _entity.x0 + _entity.offsetX, _entity.y0 + _entity.offsetY, _entity.width, _entity.height);
            }
            if (_entity.type == 'line') {
                strokeWeight(_entity.strokeWeight);
                if (_entity.strokeStyle == 'dash') {
                    drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
                }
                if (_entity.movingColor == 0) {
                    stroke(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                } else {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                }
                line(_entity.x0 + _entity.offsetX, _entity.y0 + _entity.offsetY, _entity.x1 + _entity.offsetX, _entity.y1 + _entity.offsetY);
            }

            if (_entity.type == 'stroke') {
                strokeWeight(_entity.strokeWeight);
                if (_entity.strokeStyle == 'dash') {
                    drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
                }
                if (_entity.movingColor == 0) {
                    stroke(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                } else {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                }
                noFill();
                beginShape();
                for (let point of _entity.arr) {
                    vertex(point.x + _entity.offsetX, point.y + _entity.offsetY);
                }
                endShape();
            }

            if (_entity.type == 'rect') {
                strokeWeight(_entity.strokeWeight);
                if (_entity.strokeStyle == 'dash') {
                    drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
                }
                if (_entity.movingColor == 0) {
                    stroke(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    if (_entity.shapeStyle == 'solid') {
                        fill(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    } else {
                        noFill();
                    }
                } else {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                    if (_entity.shapeStyle == 'solid') {
                        fill(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2], _entity.opacity);
                    } else {
                        noFill();
                    }
                }
                rect(_entity.x0 + _entity.offsetX, _entity.y0 + _entity.offsetY, _entity.x1 - _entity.x0, _entity.y1 - _entity.y0);
            }

            if (_entity.type == 'circle') {
                strokeWeight(_entity.strokeWeight);
                noFill();
                if (_entity.strokeStyle == 'dash') {
                    drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
                }
                if (_entity.movingColor == 0) {
                    stroke(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    if (_entity.shapeStyle == 'solid') {
                        fill(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    }
                } else {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                    if (_entity.shapeStyle == 'solid') {
                        fill(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2], _entity.opacity);
                    }
                }
                circle(_entity.x + _entity.offsetX, _entity.y + _entity.offsetY, _entity.radius * 2);
            }
            if (_entity.type == 'ellipse') {
                strokeWeight(_entity.strokeWeight);
                noFill();
                if (_entity.strokeStyle == 'dash') {
                    drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
                }
                if (_entity.movingColor == 0) {
                    stroke(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    if (_entity.shapeStyle == 'solid') {
                        fill(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    }
                } else {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                    if (_entity.shapeStyle == 'solid') {
                        fill(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2], _entity.opacity);
                    }
                }
                ellipse(((_entity.x0 + _entity.x1) / 2) + _entity.offsetX, ((_entity.y0 + _entity.y1) / 2) + _entity.offsetY, _entity.x1 - _entity.x0, _entity.y1 - _entity.y0);
            }

            if (_entity.type == 'text') {
                strokeWeight(1);
                textSize(_entity.size);
                if (_entity.movingColor == 0) {
                    stroke(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                    fill(_entity.color[0], _entity.color[1], _entity.color[2], _entity.opacity);
                } else {
                    stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                    fill(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                }
                textAlign(LEFT, TOP);
                if (_entity.status == 'drawing') {
                    text(this.insertCursor(_entity.content, _entity.content.length - this.cursorOffset), _entity.x0 + _entity.offsetX, _entity.y0 + _entity.offsetY);
                } else {
                    text(_entity.content, _entity.x0 + _entity.offsetX, _entity.y0 + _entity.offsetY);
                }


                // draw dotted rectangle around text
                if (_entity.status == 'drawing' || _entity.status == 'moving') {
                    noFill();
                    drawingContext.setLineDash([10, 10]);
                    rect(_entity.x0 - 5 + _entity.offsetX, _entity.y0 - 5 + _entity.offsetY, _entity.width + 10, _entity.height + 10);
                }
            }
            pop();
        }
    }

    // adds entity to the graphics object used for making a save file
    showEntityGraphics(_entity, g) {
        g.push();
        if (_entity.type == 'image') {
            if (_entity.status == 'moving') {
                g.stroke(255, 0, 0);
                g.noFill();
                g.drawingContext.setLineDash([10, 10]);
                g.rect(_entity.x0 - 5, _entity.y0 - 5, _entity.width + 10, _entity.height + 10);
            }
            if (_entity.movingColor != 0) {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                g.noFill();
                g.drawingContext.setLineDash([10, 10]);
                g.rect(_entity.x0 - 5, _entity.y0 - 5, _entity.width + 10, _entity.height + 10);
            }
            g.image(_entity.content, _entity.x0, _entity.y0, _entity.width, _entity.height);
        }
        if (_entity.type == 'line') {
            g.strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                g.drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                g.stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            g.line(_entity.x0, _entity.y0, _entity.x1, _entity.y1);
        }

        if (_entity.type == 'stroke') {
            g.strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                g.drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                g.stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            g.noFill();
            g.beginShape();
            for (let point of _entity.arr) {
                g.vertex(point.x, point.y);
            }
            g.endShape();
        }

        if (_entity.type == 'rect') {
            g.strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                g.drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                g.stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);

            }
            g.noFill();
            g.rect(_entity.x0, _entity.y0, _entity.x1 - _entity.x0, _entity.y1 - _entity.y0);
        }

        if (_entity.type == 'circle') {
            g.strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                g.drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                g.stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            g.noFill();
            g.circle(_entity.x, _entity.y, _entity.radius * 2);
        }
        if (_entity.type == 'ellipse') {
            g.strokeWeight(_entity.strokeWeight);
            if (_entity.strokeStyle == 'dash') {
                g.drawingContext.setLineDash([_entity.strokeWeight * 2, _entity.strokeWeight * 2]);
            }
            if (_entity.movingColor == 0) {
                g.stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            g.noFill();
            g.ellipse(((_entity.x0 + _entity.x1) / 2), ((_entity.y0 + _entity.y1) / 2), _entity.x1 - _entity.x0, _entity.y1 - _entity.y0);
        }

        if (_entity.type == 'text') {
            g.strokeWeight(1);
            g.textSize(_entity.size);
            if (_entity.movingColor == 0) {
                g.stroke(_entity.color[0], _entity.color[1], _entity.color[2]);
                g.fill(_entity.color[0], _entity.color[1], _entity.color[2]);
            } else {
                g.stroke(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
                g.fill(_entity.movingColor[0], _entity.movingColor[1], _entity.movingColor[2]);
            }
            g.textAlign(LEFT, TOP);
            if (_entity.status == 'drawing') {
                g.text(this.insertCursor(_entity.content, _entity.content.length - this.cursorOffset), _entity.x0, _entity.y0);
            } else {
                g.text(_entity.content, _entity.x0, _entity.y0);
            }


            // draw dotted rectangle around text
            if (_entity.status == 'drawing' || _entity.status == 'moving') {
                g.noFill();
                g.drawingContext.setLineDash([10, 10]);
                g.rect(_entity.x0 - 5, _entity.y0 - 5, _entity.width + 10, _entity.height + 10);
            }
        }

        g.pop();
    }

    // initiate selection box when in select mode
    startSelectionBox() {
        this.selectionBox.x0 = this.mouseX;
        this.selectionBox.y0 = this.mouseY;
        this.selectionBox.x1 = this.mouseX;
        this.selectionBox.y1 = this.mouseY;
    }

    // shows selection box on the canvas
    showselectionBox(type) {
        push();
        strokeWeight(1 / this.scalefactor);
        if (type == "image") {
            stroke(0, 255, 0);
        } else {
            stroke(255, 0, 0);
        }
        noFill();
        drawingContext.setLineDash([7, 7]);
        rect(this.selectionBox.x0, this.selectionBox.y0, this.selectionBox.x1 - this.selectionBox.x0, this.selectionBox.y1 - this.selectionBox.y0);
        pop();
    }

    // updates position of the selection box on mouse movement
    drawselection() {

        if (this.mode == 'select' || this.mode == 'imageselect') {
            this.selectionBox.x1 = this.mouseX;
            this.selectionBox.y1 = this.mouseY;
        }
    }

    // determines all entities lying inside the box when mouse is released
    makeSelection() {
        for (let _entity of this.entityArr) {
            if (_entity.type != 'image') {
                for (let _point of _entity.arr) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };

                    if (this.selectionBox.x0 < realpoint.x && realpoint.x < this.selectionBox.x1 && this.selectionBox.y0 < realpoint.y && realpoint.y < this.selectionBox.y1) {
                        this.selectedStuffArr.push(_entity.id);
                        break;
                    }
                    if (this.selectionBox.x0 > realpoint.x && realpoint.x > this.selectionBox.x1 && this.selectionBox.y0 > realpoint.y && realpoint.y > this.selectionBox.y1) {
                        this.selectedStuffArr.push(_entity.id);
                        break;
                    }

                    if (this.selectionBox.x0 > realpoint.x && realpoint.x > this.selectionBox.x1 && this.selectionBox.y0 < realpoint.y && realpoint.y < this.selectionBox.y1) {
                        this.selectedStuffArr.push(_entity.id);
                        break;
                    }

                    if (this.selectionBox.x0 < realpoint.x && realpoint.x < this.selectionBox.x1 && this.selectionBox.y0 > realpoint.y && realpoint.y > this.selectionBox.y1) {
                        this.selectedStuffArr.push(_entity.id);
                        break;
                    }
                }
            }
        }

        if (this.selectedStuffArr.length > 0) {
            this.mode = 'moving';
        } else {
            this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
            this.mode = 'select';
        }
    }

    // same as above but for images
    makeImageSelection() {
        for (let _entity of this.entityArr) {
            if (_entity.type == 'image') {
                if (this.rectsIntersect(this.selectionBox, {
                    x0: _entity.x0 + _entity.offsetX,
                    y0: _entity.y0 + _entity.offsetY,
                    x1: _entity.x1 + _entity.offsetX,
                    y1: _entity.y1 + _entity.offsetY
                }) == true) {
                    this.selectedStuffArr.push(_entity.id);
                }
            }
        }

        if (this.selectedStuffArr.length > 0) {
            this.mode = 'moving';
        } else {
            this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
            this.mode = 'imageselect';
        }
    }

    // keeps changing movingColor of selected entities
    highlightSelectedEntities() {
        this.changingColor = true;
        setTimeout(() => {
            let color = [random(255), random(255), random(255)];
            for (let _id of this.selectedStuffArr) {
                if (this.mode == 'moving' || this.mode == 'imagemoving') {
                    this.entityArr.find(e => e.id == _id).movingColor = color;
                }
            }
            this.changingColor = false;
        }, 300);
    }

    // updates position of selected entities when they are moved
    moveSelections(event) {
        let motionX = event.movementX / this.scalefactor;
        let motionY = event.movementY / this.scalefactor;
        for (let _id of this.selectedStuffArr) {
            let _entity = this.entityArr.find(e => e.id == _id);
            if (_entity.type == 'line' || _entity.type == 'rect' || _entity.type == 'text' || _entity.type == 'ellipse') {
                _entity.x0 += motionX;
                _entity.y0 += motionY;
                _entity.x1 += motionX;
                _entity.y1 += motionY;
                for (let _point of _entity.arr) {
                    _point.x += motionX;
                    _point.y += motionY;
                }
            }
            if (_entity.type == 'circle') {
                _entity.x += motionX;
                _entity.y += motionY;
                for (let _point of _entity.arr) {
                    _point.x += motionX;
                    _point.y += motionY;
                }
            }
            if (_entity.type == 'stroke') {
                for (let _point of _entity.arr) {
                    _point.x += motionX;
                    _point.y += motionY;
                }
            }
            if (_entity.type == 'image') {
                _entity.x0 += motionX;
                _entity.y0 += motionY;
                _entity.x1 += motionX;
                _entity.y1 += motionY;
            }

        }
        this.deltaX += motionX;
        this.deltaY += motionY;
    }

    // adds duplicates entites to the program and to the canvas
    duplicateSelections() {
        if (this.mode == 'moving') {
            let temparr = [];

            for (let _id of this.selectedStuffArr) {
                let entity = this.entityArr.find(e => e.id == _id);
                let newentity = structuredClone(entity);
                entity.movingColor = 0;
                newentity.id = `${entity.id}_d${this.entityID}`;
                temparr.push(newentity.id);
                this.entityArr.push(newentity);

                for (let _point of newentity.arr) {
                    _point.id = newentity.id;
                }

                this.entityID++;
            }

            this.selectedStuffArr = [];

            for (let _id of temparr) {
                this.selectedStuffArr.push(_id);
            }

            this.undoArr.push({ type: "duplicate", ids: this.selectedStuffArr.slice() });
            this.redoArr = [];
        }
    }

    // clears selected status of the selected entities
    // takes in a parameter to determine if selection was cancelled with esc
    finishMoving(ifEscape = false) {
        for (let _id of this.selectedStuffArr) {
            let _entity = this.entityArr.find(e => e.id == _id);
            _entity.movingColor = 0;
        }

        // only update undoArr if selection is moved and not if selection is cancelled
        if (ifEscape == false && this.selectedStuffArr.length != 0) {
            this.undoArr.push({
                type: 'moved', entities: this.selectedStuffArr,
                deltaX: this.deltaX,
                deltaY: this.deltaY
            });
            this.redoArr = [];
        }

        if (this.entityArr.find(e => e.id == this.selectedStuffArr[0]).type == 'image') {
            this.mode = 'imageselect';
        } else {
            this.mode = 'select';
        }

        this.selectedStuffArr = [];
        this.deltaX = 0;
        this.deltaY = 0;

        this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };

        this.populateGrid();

        this.updateNeeded = true;
    }

    // correct mouse position factoring in scale
    fixMousePos() {
        this.mouseX = (Math.min(Math.max(mouseX, 0), this.canvasWidth)) / this.scalefactor;
        this.mouseY = (Math.min(Math.max(mouseY, 0), this.canvasHeight)) / this.scalefactor;
    }

    // erases primitives
    erase() {
        let coordy = Math.floor(this.mouseY / this.grid.length);
        let coordx = Math.floor(this.mouseX / this.grid.length);

        this.eraserCell = { y: coordy, x: coordx };

        // try block to stop the error messages when it checks for boxes outside the canvas when eraser is at the edge
        try {
            // 0
            for (let _point of this.grid.matrix[this.eraserCell.y][this.eraserCell.x].points) {
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
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
                let _entity = this.entityArr.find(e => e.id == _point.id);
                if (_entity) {
                    let realpoint = { x: _point.x + _entity.offsetX, y: _point.y + _entity.offsetY };
                    if ((this.mouseY - realpoint.y) ** 2 + (this.mouseX - realpoint.x) ** 2 < this.eraserSize ** 2) {
                        this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
                        this.erasedStuffArr.push(_entity);
                        this.undoArr.push({ type: 'erased', id: _entity.id });
                        this.redoArr = [];
                        populateGrid();
                        break;
                    }
                }
            }
        }
        catch (err) { }
    }

    // erases text and images
    remove() {
        for (let _entity of this.entityArr) {
            if (_entity.type == 'text' || _entity.type == 'image') {
                if (_entity.x0 < this.mouseX && this.mouseX < _entity.x1 && _entity.y0 < this.mouseY && this.mouseY < _entity.y1) {
                    this.entityArr.splice(this.entityArr.indexOf(_entity), 1);
                    this.erasedStuffArr.push(_entity);
                    this.undoArr.push({ type: 'erased', id: _entity.id });
                    this.redoArr = [];
                }
            }
        }
    }

    // resets view window to home view
    resetView() {
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;

        this.manageViewWindow(this.scalefactor);

        this.updateDisplayStatus();
    }

    // show canvas measurements along the edges
    showGuideNumbers() {
        push();
        stroke(255, 255, 0);
        fill(255, 255, 0);
        strokeWeight(0.5 / this.scalefactor);
        textSize(18 / this.scalefactor);
        textAlign(CENTER, TOP);
        for (let x = 0; x < this.canvasWidth / this.scalefactor; x += (this.canvasWidth / this.scalefactor) / 10) {
            if (x == 0) {
            } else {
                text(`${Math.floor((x + this.viewWindow.x0) / 10)}`, x, 0);
            }
        }
        textAlign(LEFT, CENTER);
        for (let y = 0; y < this.canvasHeight / this.scalefactor; y += (this.canvasHeight / this.scalefactor) / 10) {
            if (y == 0) {
            } else {
                text(`${Math.floor((y + this.viewWindow.y0) / 10)}`, 2, y);
            }
        }
        pop();
    }

    // checks if a entity exists and if it is being moved
    // used to disable all other activites except mouse movement
    isEntityMoving() {
        return (this.entityArr.length > 0 && this.activeEntity.status == 'moving');
    }

    // checks if a entity exists and if it is being drawn
    isEntityDrawing() {
        return (this.entityArr.length > 0 && this.activeEntity.status == 'drawing');
    }

    // ~ input functions

    // stops the key held down check interval
    keyReleased() {
        clearInterval(this.timeoutinterval);
        clearInterval(this.keyinterval);
    }

    // handles typing and shortcuts
    async keyPressed() {
        if (key == 'ArrowLeft' || key == 'ArrowRight' || key == 'Backspace') {
            this.timeoutinterval = setTimeout(() => {
                this.keyinterval = setInterval(() => {
                    if (keyIsDown(37)) {
                        if (this.cursorOffset < this.activeEntity.content.length) {
                            this.cursorOffset++;
                        }
                    }
                    if (keyIsDown(39)) {
                        if (this.cursorOffset > 0) {
                            this.cursorOffset--;
                        }
                    }
                    if (keyIsDown(8)) {
                        this.activeEntity.content = this.deleteChar(this.activeEntity.content, this.activeEntity.content.length - this.cursorOffset - 1);

                    }

                }, 25);
            }, 250);
        }

        if (this.mode == 'text' && this.isEntityDrawing() == true) {
            // ignore special keys
            if (key == 'Enter' || key == 'Shift' || key == 'Backspace' || key == 'Alt' || key == 'Control' || key == 'Tab' || key == 'Escape' || key.includes('Arrow')) {
                // shift enter for newline...also update text entity height with each newline
                if (keyIsDown(16) == true && key == 'Enter') {
                    this.activeEntity.content = this.insertChar(this.activeEntity.content, this.activeEntity.content.length - this.cursorOffset, "\n");
                    this.activeEntity.height += this.activeEntity.size * 1.25;
                }
                // backspace 
                else if (key == 'Backspace') {
                    this.activeEntity.content = this.deleteChar(this.activeEntity.content, this.activeEntity.content.length - this.cursorOffset - 1);
                }
                // finish current text 
                else if (key == 'Enter') {
                    this.finishEntity(true);
                }
                else if (key == "ArrowLeft") {
                    if (this.cursorOffset < this.activeEntity.content.length) {
                        this.cursorOffset++;
                    }
                }
                else if (key == "ArrowRight") {
                    if (this.cursorOffset > 0) {
                        this.cursorOffset--;
                    }
                }
                else if (key == "ArrowUp") {
                    function moveCursorUp(text, cursor) {
                        const lines = text.split('\n');

                        // Step 1: Walk through lines to find which line cursor is in
                        let charCount = 0;
                        let lineIndex = 0;
                        let colInLine = 0;

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const lineStart = charCount;
                            const lineEnd = charCount + line.length;

                            if (cursor >= lineStart && cursor <= lineEnd) {
                                lineIndex = i;
                                colInLine = cursor - lineStart;
                                break;
                            }

                            charCount += line.length + 1; // +1 for '\n'
                        }

                        // Step 2: If we're on the first line, can't move up
                        if (lineIndex === 0) return cursor;

                        // Step 3: Compute new cursor position in the previous line
                        const prevLine = lines[lineIndex - 1];
                        const targetCol = Math.min(prevLine.length, colInLine);

                        // Step 4: Calculate absolute index of new position
                        let newIndex = 0;
                        for (let i = 0; i < lineIndex - 1; i++) {
                            newIndex += lines[i].length + 1;
                        }
                        newIndex += targetCol;

                        return newIndex;
                    }
                    let cursorindex = this.activeEntity.content.length - this.cursorOffset;
                    cursorindex = moveCursorUp(this.activeEntity.content, cursorindex);
                    this.cursorOffset = this.activeEntity.content.length - cursorindex;
                }
                else if (key == "ArrowDown") {
                    function moveCursorDown(text, cursor) {
                        const lines = text.split('\n');

                        // Step 1: Find current line and column
                        let charCount = 0;
                        let lineIndex = 0;
                        let colInLine = 0;

                        for (let i = 0; i < lines.length; i++) {
                            const lineStart = charCount;
                            const lineEnd = charCount + lines[i].length;

                            if (cursor >= lineStart && cursor <= lineEnd) {
                                lineIndex = i;
                                colInLine = cursor - lineStart;
                                break;
                            }

                            charCount += lines[i].length + 1; // +1 for '\n'
                        }

                        // Step 2: If already on the last line, can't go down
                        if (lineIndex >= lines.length - 1) return cursor;

                        // Step 3: Get line below and target column
                        const nextLine = lines[lineIndex + 1];
                        const targetCol = Math.min(nextLine.length, colInLine);

                        // Step 4: Compute new absolute index
                        let newIndex = 0;
                        for (let i = 0; i <= lineIndex; i++) {
                            newIndex += lines[i].length + 1; // +1 for '\n'
                        }
                        newIndex += targetCol;

                        return newIndex;
                    }

                    let cursorindex = this.activeEntity.content.length - this.cursorOffset;
                    cursorindex = moveCursorDown(this.activeEntity.content, cursorindex);
                    this.cursorOffset = this.activeEntity.content.length - cursorindex;
                }
                else if (key == 'Escape') {
                    if (this.activeEntity.edited == false) {
                        this.entityArr.pop();
                        this.undoArr.pop();
                        this.activeEntity = this.entityArr[this.entityArr.length - 1];
                    } else {
                        this.activeEntity.status = 'drawn';
                    }
                }
            }
            // type character keys 
            else {
                // uppercase when shift pressed
                if (keyIsDown(16) == true) {
                    this.activeEntity.content = this.insertChar(this.activeEntity.content, this.activeEntity.content.length - this.cursorOffset, key.toUpperCase());
                }
                // paste text
                else if (keyIsDown(17) == true && key == 'v') {
                    navigator.clipboard.readText()
                        .then(text => {
                            if (text) {
                                this.activeEntity.content = this.insertChar(this.activeEntity.content, this.activeEntity.content.length - this.cursorOffset, text);

                                // update text entity width and height
                                textSize(this.currentTextSize);
                                this.activeEntity.width = textWidth(this.activeEntity.content) > 100 ? textWidth(this.activeEntity.content.split('\n').reduce((a, b) => a.length > b.length ? a : b, "")) + 20 : 100;
                                this.activeEntity.height = this.activeEntity.size * 1.25 * this.activeEntity.content.split('\n').length;
                            }
                        });
                }
                // type normal letters
                else {
                    this.activeEntity.content = this.insertChar(this.activeEntity.content, this.activeEntity.content.length - this.cursorOffset, key);
                }
            }
            // update text entity width
            // include check to see if text was cancelled
            if (key != 'Escape') {
                textSize(this.currentTextSize);
                this.activeEntity.width = textWidth(this.activeEntity.content) > 100 ? textWidth(this.activeEntity.content.split('\n').reduce((a, b) => a.length > b.length ? a : b, "")) + 20 : 100;
                this.activeEntity.height = this.activeEntity.size * 1.25 * this.activeEntity.content.split('\n').length;
            }
        }
        // shortcuts 
        else if (this.entityArr.length == 0 || (this.entityArr.length > 0 && this.isEntityDrawing() == false && this.isEntityMoving() == false && this.mode != 'moving')) {
            // colors
            if (key == '`') {
                this.currentColor = [255, 255, 255];
                this.colorDisplay.value('#ffffff');
            }
            if (key == '1') {
                this.currentColor = [255, 0, 0];
                this.colorDisplay.value('#ff0000');
            }
            if (key == '2') {
                this.currentColor = [0, 255, 0];
                this.colorDisplay.value('#00ff00');
            }
            if (key == '3') {
                this.currentColor = [0, 170, 255];
                this.colorDisplay.value('#00aaff');
            }
            if (key == '4') {
                this.currentColor = [0, 0, 0];
                this.colorDisplay.value('#000000');
            }
            if (key == '5') {
                this.currentColor = [255, 255, 0];
                this.colorDisplay.value('#ffff00');
            }
            if (key == "6") {
                this.currentColor = [255, 0, 255];
                this.colorDisplay.value('#FF00FF');
            }
            if (key == "7") {
                this.currentColor = [255, 165, 0];
                this.colorDisplay.value('#FFA500');
            }
            if (key == "8") {
                this.currentColor = [138, 43, 226];
                this.colorDisplay.value('#8A2BE2');
            }
            // stroke
            if (key == 'q') {
                if (this.isRightMouseDown == false) {
                    if (this.mode == 'erase') {
                        if (this.eraserSize > 5) {
                            this.eraserSize -= 5;
                        } else if (this.eraserSize > 1) {
                            this.eraserSize -= 1;
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
                    if (this.eraserSize > 5) {
                        this.eraserSize -= 5;
                    } else if (this.eraserSize > 1) {
                        this.eraserSize -= 1;
                    }
                }
            }
            if (key == 'w') {
                if (this.isRightMouseDown == false) {
                    if (this.mode == 'erase') {
                        if (this.eraserSize < 5) {
                            this.eraserSize += 1;
                        } else {
                            this.eraserSize += 5;
                        }
                    }
                    if (this.mode == 'text') {
                        this.currentTextSize++;
                    } else {
                        this.currentStrokeWeight++;
                    }
                } else {
                    if (this.eraserSize < 5) {
                        this.eraserSize += 1;
                    } else {
                        this.eraserSize += 5;
                    }
                }
            }
            if (key == 'e') {
                this.currentStrokeStyle = this.currentStrokeStyle == 'solid' ? 'dash' : 'solid';
            }
            // modes
            if (key == 'a') {
                this.mode = 'stroke';
                this.currentMode = 'stroke';
            }
            if (key == 's') {
                this.mode = 'line';
                this.currentMode = 'line';
            }
            if (key == 'd') {
                this.mode = 'text';
                this.currentMode = 'text';
            }
            if (key == 'f') {
                this.mode = 'rect';
                this.currentMode = 'rect';
            }
            if (key == 'g') {
                this.mode = 'ellipse';
                this.currentMode = 'ellipse';
            }
            if (key == 'h') {
                this.mode = 'circle';
                this.currentMode = 'circle';
            }
            // misc
            if (key == 'z') {
                this.undo();
            }
            if (key == 'x') {
                this.redo();
            }
            if (key == 'c') {
                this.mode = this.mode == 'select' ? this.currentMode : 'select';
                this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
            }
            if (key == 'v') {
                this.mode = this.mode == 'imageselect' ? this.currentMode : 'imageselect';
                this.selectionBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
            }
            if (key == 'b') {
                this.mode = this.mode == 'scroll' ? this.currentMode : 'scroll';
            }
            if (key == 'n') {
                this.mode = this.mode == 'erase' ? this.currentMode : 'erase';
            }
            if (key == 'm') {
                this.mode = this.mode == 'remove' ? this.currentMode : 'remove';
            }
            if (key == 'p') {
                let now = new Date();
                let year = now.getFullYear();
                let month = String(now.getMonth() + 1).padStart(2, '0');
                let date = String(now.getDate()).padStart(2, '0');
                let hour = String(now.getHours()).padStart(2, '0');
                let minute = String(now.getMinutes()).padStart(2, '0');
                let second = String(now.getSeconds()).padStart(2, '0');

                this.saveFile(`${year}_${month}_${date}_${hour}h${minute}m`, 'jpg');

                this.saveFile(`${year}_${month}_${date}_${hour}h${minute}m`, 'json');
            }
            if (key == ' ') {
                this.resetView();
            }
        }
        else if ((this.entityArr.length > 0 && this.mode == 'moving')) {
            if (key == 'd') {
                this.duplicateSelections();
            }
            if (key == 'Escape') {
                // only cancel selection if not being moved
                if (this.isLeftMouseDown == false) {
                    this.finishMoving(true);
                } // else finish movement and silently undo it
                else {
                    this.finishMoving();
                    this.isLeftMouseDown = false;
                    this.undo();
                    this.redoArr.pop();
                }
            }
        }
        this.updateNeeded = true;
    }

    // handles adding new entities, starting select/imageselect, starting text edit
    mousePressed(event) {
        // only detect presses on canvas
        if (event.srcElement.id == 'defaultCanvas0') {
            if (keyIsDown(16) == false) {
                this.fixMousePos();
                // fresh left click
                if (event.button == 0 && this.isLeftMouseDown == false && this.isRightMouseDown == false && this.mode != 'remove') {
                    if (this.mode == 'image') {
                        if (this.entityArr.length == 0) {
                            this.mode = this.currentMode;
                        } else {
                            if (this.isEntityMoving() == false) {
                                this.mode = this.currentMode;
                            }
                        }
                    }
                    else if (this.mode == 'select' || this.mode == 'imageselect') {
                        this.startSelectionBox();
                    }
                    else if (this.mode == 'line' || this.mode == 'stroke' || this.mode == 'rect' || this.mode == 'circle' || this.mode == 'ellipse') {
                        this.addEntity(this.mode);
                    }
                    // handle editing text
                    else if (this.mode == 'text') {
                        let clickedOnText = false;
                        if (this.entityArr.length > 0 && this.isEntityDrawing() == false) {
                            for (let _index in this.entityArr) {
                                let _entity = this.entityArr[_index];
                                if (_entity.type == 'text') {
                                    if (_entity.x0 + _entity.offsetX < this.mouseX &&
                                        this.mouseX < _entity.x1 + _entity.offsetX &&
                                        _entity.y0 + _entity.offsetY < this.mouseY &&
                                        this.mouseY < _entity.y1 + _entity.offsetY) {
                                        clickedOnText = true;
                                        this.activeEntity = _entity;
                                        _entity.edited = true;
                                        _entity.prevcontent = _entity.content;
                                        _entity.status = 'drawing';
                                        break;
                                    }
                                }
                            }
                        }

                        if (clickedOnText == false) {
                            if (this.entityArr.length == 0) {
                                this.addEntity('text');
                            } else if (this.isEntityMoving() == false && this.isEntityDrawing() == false) {
                                this.addEntity('text');
                            } else if (this.isEntityDrawing() == true) {
                                if (this.activeEntity.content.length != 0) {
                                    this.finishEntity();
                                } else {
                                    this.entityArr.pop();
                                    this.undoArr.pop();
                                    this.activeEntity = this.entityArr[this.entityArr.length - 1];
                                }
                            }
                        }

                    }
                }
                // update mouse state vars
                if (event.button == 0) {
                    this.isLeftMouseDown = true;
                }
                if (event.button == 2) {
                    this.isRightMouseDown = true;
                }
            }
            this.updateNeeded = true;
        }
    }

    // handles scrolling view window, drawing entities, erasing/removing, moving selections. drawing/expanding selection
    mouseDragged(event) {
        // only detect drags on canvas
        if (event.srcElement.id == 'defaultCanvas0') {

            if (keyIsDown(16) == true) {
                this.scrollViewWindow(event);

                this.manageViewWindow(this.scalefactor);

                this.updateDisplayStatus();

                clearTimeout(this.scrollTimeout);

                this.scrollTimeout = setTimeout(() => {
                    this.populateGrid();
                }, 300);
            }
            else {
                this.fixMousePos();

                if (this.mode == 'moving' && this.isLeftMouseDown == true) {
                    this.moveSelections(event);
                }
                else if (this.mode == 'remove' && this.isLeftMouseDown == true) {
                    this.remove();
                }
                else if ((this.mode == 'erase' && this.isLeftMouseDown == true) || (this.isRightMouseDown == true && this.mode != 'drawing')) {
                    this.erase();
                }
                else if (this.mode == 'scroll') {
                    this.scrollViewWindow(event);

                    this.manageViewWindow(this.scalefactor);

                    this.updateDisplayStatus();

                    clearTimeout(this.scrollTimeout);

                    this.scrollTimeout = setTimeout(() => {
                        this.populateGrid();
                    }, 300);
                }
                else if (this.isLeftMouseDown == true) {
                    if (this.mode == 'select' || this.mode == 'imageselect') {
                        this.drawselection();
                    } else {
                        this.drawEntity();
                    }
                }
            }
        }
    }

    // resets mouse state vars set from mousePressed...detects both mouse buttons
    mouseReleased(event) {
        // update mouse state vars
        if (event.button == 0) {
            this.isLeftMouseDown = false;
        }
        if (event.button == 2) {
            this.isRightMouseDown = false;
        }
        this.updateNeeded = true;
    }

    // handles finishing the active(newest) entity, finishing select/imageselect...detects only left mouse
    mouseClicked(event) {
        this.fixMousePos();

        if ((this.mode == 'line' || this.mode == 'stroke' || this.mode == 'rect' || this.mode == 'circle' || this.mode == 'ellipse') && this.isLeftMouseDown == false) {
            this.finishEntity();
        }
        else if (this.mode == 'image' || this.mode == 'text') {
            if (this.isEntityMoving() == true) {
                this.finishEntity();
            }
        }
        else if (this.mode == 'moving' && this.isLeftMouseDown == false && this.mouseY > 0) {
            this.finishMoving();
        }
        else if (this.mode == 'select' && this.isLeftMouseDown == false) {
            this.makeSelection();
        }
        else if (this.mode == 'imageselect' && this.isLeftMouseDown == false) {
            this.makeImageSelection();
        }
        this.updateNeeded = true;
    }

    // handles scrolling view window
    mouseWheel(event) {
        if (this.isEntityDrawing() == false && this.isEntityMoving() == false) {

            this.scrollViewWindow(event, true);

            this.manageViewWindow(this.scalefactor);

            this.updateDisplayStatus();

            clearTimeout(this.scrollTimeout);

            this.scrollTimeout = setTimeout(() => {
                this.populateGrid();
            }, 300);
        }
    }

    // touch equivalents...not fully functional...haven't updated them
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
                    if (this.entityArr.length == 0) {
                        this.addEntity('text');
                    } else if (this.entityArr[this.entityArr.length - 1].status != 'moving' && this.entityArr[this.entityArr.length - 1].status != 'drawing') {
                        this.addEntity('text');
                    } else if (this.entityArr[this.entityArr.length - 1].status == 'drawing') {
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
                if (this.entityArr.length > 0 && this.entityArr[this.entityArr.length - 1].status == 'moving') {
                    this.entityArr[this.entityArr.length - 1].status = 'drawn';
                    this.mode = this.currentMode;
                }
            }
            if (this.mode == 'text') {
                if (this.entityArr[this.entityArr.length - 1].status == 'moving') {
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

    // shows the grid boxes with points in them...debugging only
    showGrid() {
        // background(0);
        push();
        stroke(0, 255, 0);
        noFill();
        for (let _row of this.grid.matrix) {
            for (let _column of _row) {
                if (_column.points.length != 0) {
                    rect(_column.x, _column.y, this.grid.length, this.grid.length);
                }
            }
        }
        pop();
    }

    // makes the grid for populateGrid...a helper function
    makeGrid() {
        for (let y = 0; y < this.canvasHeight / this.scalefactor; y += this.grid.length) {
            this.grid.matrix.push([]);
            for (let x = 0; x < this.canvasWidth / this.scalefactor; x += this.grid.length) {
                this.grid.matrix[this.grid.matrix.length - 1].push({ x: x, y: y, points: [] });
            }
        }
    }

    // adds displayed points to boxes based on position...for spatial hashing during erasing
    populateGrid() {
        this.grid = {
            length: 0.7 * this.eraserSize,
            matrix: []
        };

        this.makeGrid();

        for (let _entity of this.entityArr) {
            if (_entity.displayed == true && _entity.type != 'text' && _entity.type != 'image') {
                for (let _point of _entity.arr) {
                    let coordY = Math.floor((_point.y + _entity.offsetY) / this.grid.length);
                    let coordX = Math.floor((_point.x + _entity.offsetX) / this.grid.length);
                    if (coordY >= 0 &&
                        coordX >= 0 &&
                        coordY <= this.grid.matrix.length - 1 &&
                        coordX <= this.grid.matrix[0].length - 1) {
                        this.grid.matrix[coordY][coordX].points.push(_point);
                    }
                }
            }
        }

        this.updateNeeded = true;
    }

    undo() {
        try {
            if (this.undoArr.length > 0) {
                let activity = this.undoArr.pop();
                this.redoArr.push(activity);

                if (activity.type == 'line' || activity.type == 'stroke' || activity.type == 'rect' || activity.type == 'text' || activity.type == 'circle' || activity.type == 'ellipse') {
                    let entity = this.entityArr.find(e => e.id == activity.id);
                    this.entityArr.splice(this.entityArr.indexOf(entity), 1);
                    this.erasedStuffArr.push(entity);
                }
                if (activity.type == 'image') {
                    let entity = this.entityArr.find(e => e.id == activity.id);
                    this.entityArr.splice(this.entityArr.indexOf(entity), 1);
                    this.erasedStuffArr.push(entity);
                }

                if (activity.type == 'erased') {
                    let erased = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(erased), 1);
                    this.entityArr.push(erased);
                }
                if (activity.type == 'removed') {
                    let erased = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(erased), 1);
                    this.entityArr.push(erased);
                }

                if (activity.type == 'moved') {
                    for (let _id of activity.entities) {
                        let _entity = this.entityArr.find(e => e.id == _id);
                        if (_entity.type == 'image') {
                            _entity.x0 -= activity.deltaX;
                            _entity.y0 -= activity.deltaY;
                            _entity.x1 -= activity.deltaX;
                            _entity.y1 -= activity.deltaY;
                        } else {
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
                if (activity.type == 'duplicate') {
                    for (let _id of activity.ids) {
                        let entity = this.entityArr.find(e => e.id == _id);

                        const index = this.entityArr.findIndex(e => e.id === _id);
                        if (index !== -1) {
                            this.entityArr.splice(index, 1);
                        }
                        this.erasedStuffArr.push(entity);
                    }
                }

                if (activity.type == 'textedit') {
                    let entity = this.entityArr.find(e => e.id == activity.id);
                    entity.content = activity.oldcontent;

                }
            }
        }
        catch (err) {
            window.alert('error undoing');
        }

        this.activeEntity = this.entityArr[this.entityArr.length - 1];
        this.updateDisplayStatus();
        this.populateGrid();
    }

    redo() {
        try {
            if (this.redoArr.length > 0) {
                let activity = this.redoArr.pop();
                this.undoArr.push(activity);

                if (activity.type == 'line' || activity.type == 'stroke' || activity.type == 'rect' || activity.type == 'text' || activity.type == 'circle' || activity.type == 'ellipse') {
                    let entity = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(entity), 1);
                    this.entityArr.push(entity);
                }
                if (activity.type == 'image') {
                    let entity = this.erasedStuffArr.find(e => e.id == activity.id);
                    this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(entity), 1);
                    this.entityArr.push(entity);
                }

                if (activity.type == 'erased') {
                    let restored = this.entityArr.find(e => e.id == activity.id);
                    this.entityArr.splice(this.entityArr.indexOf(restored), 1);
                    this.erasedStuffArr.push(restored);
                }
                if (activity.type == 'removed') {
                    let restored = this.entityArr.find(e => e.id == activity.id);
                    this.entityArr.splice(this.entityArr.indexOf(restored), 1);
                    this.erasedStuffArr.push(restored);
                }

                if (activity.type == 'moved') {
                    for (let _id of activity.entities) {
                        let _entity = this.entityArr.find(e => e.id == _id);
                        if (_entity.type == 'image') {
                            _entity.x0 += activity.deltaX;
                            _entity.y0 += activity.deltaY;
                            _entity.x1 += activity.deltaX;
                            _entity.y1 += activity.deltaY;
                        } else {
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

                if (activity.type == 'duplicate') {
                    for (let _id of activity.ids) {
                        let entity = this.erasedStuffArr.find(e => e.id == _id);
                        this.erasedStuffArr.splice(this.erasedStuffArr.indexOf(entity), 1);
                        this.entityArr.push(entity);
                    }
                }

                if (activity.type == 'textedit') {
                    let entity = this.entityArr.find(e => e.id == activity.id);
                    entity.content = activity.newcontent;
                }
            }
        }
        catch (err) {
            window.alert('error redoing');
        }

        this.activeEntity = this.entityArr[this.entityArr.length - 1];
        this.updateDisplayStatus();
        this.populateGrid();
    }

    // checks the conditions where canvas display must be updated
    // called at the beginning of every draw() loop
    checkIfUpdateNeeded() {
        // conditions under which canvas must be updated
        if (this.isEntityDrawing() == true || this.isEntityMoving() == true) { this.updateNeeded = true; }
        if ((this.mode == 'erase' || this.mode == 'remove') && this.isDeviceTouch == false) { this.updateNeeded = true; }
        if (this.isRightMouseDown == true) { this.updateNeeded = true; }
        if (this.mode == 'select') { this.updateNeeded = true; }
        if (this.mode == 'imageselect') { this.updateNeeded = true; }
        if (this.mode == 'moving') { this.updateNeeded = true; }
        if (this.mode == 'imagemoving') { this.updateNeeded = true; }
    }

    // resets updateNeeded at the end of every draw() loop
    resetUpdateNeeded() {
        this.updateNeeded = false;
    }

    //responsible for actually drawing the entities onto the canvas
    updateCanvas() {
        // set background color
        background(n.backgroundColor[0], n.backgroundColor[1], n.backgroundColor[2]);

        if (this.isDeviceTouch == true) {
            // show all images
            for (let _img of this.entityArr) {
                this.showImage(_img);
            }

            // show entities
            for (let _entity of this.entityArr) {
                this.showEntity(_entity);
            }

            if (this.mode == 'select') {
                this.showselectionBox();
            }

            if (this.mode == 'moving') {
                if (this.changingColor == false) {
                    this.highlightSelectedEntities();
                }
                if (this.isFingerDown == true) {
                    // draw cursor
                    push();
                    strokeWeight(2);
                    stroke(255, 182, 193);
                    line(this.mouseX - 20, this.mouseY, this.mouseX + 20, this.mouseY);
                    line(this.mouseX, this.mouseY - 20, this.mouseX, this.mouseY + 20);
                    pop();
                }
            }

            // erasing lines and strokes
            if (this.mode == 'erase' && this.isFingerDown == true) {
                // draw eraser UI
                strokeWeight(1);
                stroke(255, 182, 193);
                fill(255, 182, 193);
                circle(this.mouseX, this.mouseY, this.eraserSize * 2);
            }

            if (this.mode == 'remove' && this.isFingerDown == true) {
                // draw remove UI
                strokeWeight(4);
                stroke(255, 182, 193);
                fill(255, 182, 193);
                line(this.mouseX - 30, this.mouseY - 30, this.mouseX + 30, this.mouseY + 30);
                line(this.mouseX - 30, this.mouseY + 30, this.mouseX + 30, this.mouseY - 30);
            }
        }
        else {
            this.fixMousePos();

            // show all images
            for (let _entity of this.entityArr) {
                if (_entity.type == 'image') {
                    this.showEntity(_entity);
                }
            }
            // show all non image entities on top
            for (let _entity of this.entityArr) {
                if (_entity.type != 'image') {
                    this.showEntity(_entity);
                }
            }

            if (this.mode == 'select') {
                this.showselectionBox("nonimage");
            }
            if (this.mode == 'imageselect') {
                this.showselectionBox("image");
            }

            if (this.mode == 'moving') {
                if (this.changingColor == false) {
                    this.highlightSelectedEntities();
                }
                this.drawMovingCursor();
            }

            // draw eraser UI even when mouse is still
            if (this.mode == 'erase' || this.isRightMouseDown == true) {
                this.drawEraserCursor();
            }
            // draw remove UI even when mouse is still
            if (this.mode == 'remove') {
                this.drawRemoveCursor();
            }
            // draw scroll UI even when mouse is still
            if (this.mode == 'scroll') {
                this.drawScrollCursor();
            }
            if (this.guidesSwitch == true) {
                this.showGuideNumbers();
            }
        }
    }

    // draw cursor while selections are being moved
    drawMovingCursor() {
        push();
        strokeWeight(2);
        stroke(255, 182, 193);
        line(this.mouseX - 20, this.mouseY, this.mouseX + 20, this.mouseY);
        line(this.mouseX, this.mouseY - 20, this.mouseX, this.mouseY + 20);
        pop();
    }

    // draw cursor while canvas is being moved
    drawScrollCursor() {
        if (this.isLeftMouseDown == true) {
            push();
            textSize(35);
            textAlign(CENTER, CENTER);
            text("🖐", this.mouseX - 10, this.mouseY - 10);
            pop();
        }
    }

    // draw eraser cursor
    drawEraserCursor() {
        push();
        strokeWeight(1);
        stroke(255, 182, 193);
        fill(255, 182, 193);
        circle(this.mouseX, this.mouseY, this.eraserSize * 2);
        pop();
    }

    // draw cursor for text/image eraser
    drawRemoveCursor() {

        push();
        strokeWeight(4);
        stroke(255, 182, 193);
        fill(255, 182, 193);
        line(this.mouseX - 30, this.mouseY - 30, this.mouseX + 30, this.mouseY + 30);
        line(this.mouseX - 30, this.mouseY + 30, this.mouseX + 30, this.mouseY - 30);
        pop();
    }

    // saves the sketch as jpg or json
    saveFile(filename, format) {
        if (format == 'jpg') {
            let extentX = 0;
            let extentY = 0;

            for (let _entity of this.entityArr) {
                if (_entity.type != "stroke" && _entity.type != "circle") {
                    let maxX = Math.max(_entity.x0, _entity.x1);
                    if (maxX > extentX) {
                        extentX = maxX;
                    }
                    let maxY = Math.max(_entity.y0, _entity.y1);
                    if (maxY > extentY) {
                        extentY = maxY;
                    }
                } else {
                    for (let _point of _entity.arr) {
                        if (_point.x > extentX) {
                            extentX = _point.x;
                        }
                        if (_point.y > extentY) {
                            extentY = _point.y;
                        }
                    }
                }
            }

            let graphics = createGraphics(Math.max(800, extentX + 100), Math.max(800, extentY + 100));

            graphics.background(this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2]);

            for (let _entity of this.entityArr) {
                if (_entity.type == 'image') {
                    this.showEntityGraphics(_entity, graphics);
                }
            }
            for (let _entity of this.entityArr) {
                if (_entity.type != 'image') {
                    this.showEntityGraphics(_entity, graphics);
                }
            }

            graphics.save(`${filename}.jpg`);

            graphics.remove();
            graphics = undefined;
        }
        if (format == 'json') {
            let temparr = [];
            for (let _entity of this.entityArr) {
                if (_entity.type == 'image') {
                    temparr.push({
                        type: _entity.type,
                        id: _entity.id,
                        status: _entity.status,
                        data: _entity.data,
                        x0: _entity.x0,
                        y0: _entity.y0,
                        x1: _entity.x1,
                        y1: _entity.y1,
                        width: _entity.width,
                        height: _entity.height,
                        movingColor: _entity.movingColor,
                        displayed: _entity.displayed,
                        offsetX: _entity.offsetX,
                        offsetY: _entity.offsetY,
                    });
                } else {
                    temparr.push(_entity);
                }
            }
            saveJSON({
                backgroundColor: this.backgroundColor,
                entityArr: temparr,
            }, `${filename}.json`);
        }
    }

    // opens a json save file
    openJSON(file) {
        try {
            let json = file.data;

            let imagecontent = 0;

            let temparr = [];

            for (let _entity of json.entityArr) {
                if (_entity.type == 'image') {
                    imagecontent = createImg(_entity.data).hide();
                    temparr.push({
                        content: imagecontent,
                        data: _entity.data,
                        width: _entity.width,
                        height: _entity.height,
                        x0: _entity.x0,
                        y0: _entity.y0,
                        x1: _entity.x1,
                        y1: _entity.y1,
                        movingColor: _entity.movingColor,
                        status: _entity.status,
                        type: _entity.type,
                        id: `${_entity.id}i`,
                        displayed: _entity.displayed,
                        offsetX: _entity.offsetX,
                        offsetY: _entity.offsetY,
                    });
                } else {
                    _entity.id = `${_entity.id}i`;
                    for (let _point of _entity.arr) {
                        _point.id = _entity.id;
                    }
                    temparr.push(_entity);
                }
            }

            if (imagecontent != 0) {
                imagecontent.elt.onload = () => {
                    n.backgroundColor = json.backgroundColor;
                    n.entityArr = temparr;

                    n.populateGrid();

                    n.updateNeeded = true;
                };
            } else {
                n.backgroundColor = json.backgroundColor;
                n.entityArr = temparr;

                n.populateGrid();

                n.updateNeeded = true;
            }
        }
        catch (err) {
            window.alert("not a valid save file");
        }

    }

    // ~ helper functions

    // checks if A in any way touches B
    rectsIntersect(selectionBox, image) {
        // Normalize r1
        const left1 = Math.min(selectionBox.x1, selectionBox.x0);
        const right1 = Math.max(selectionBox.x1, selectionBox.x0);
        const top1 = Math.min(selectionBox.y1, selectionBox.y0);
        const bottom1 = Math.max(selectionBox.y1, selectionBox.y0);

        // Normalize r2
        const left2 = Math.min(image.x1, image.x0);
        const right2 = Math.max(image.x1, image.x0);
        const top2 = Math.min(image.y1, image.y0);
        const bottom2 = Math.max(image.y1, image.y0);

        // Check for overlap
        if (left1 < right2 &&
            right1 > left2 &&
            top1 < bottom2 &&
            bottom1 > top2) {
            return true;
        }
    }

    // delete points from an array that dont contribute to curvature
    // used in a stroke entity to reduce number of points
    // we dont want a straight line to have 500 points when 30 will do, do we?
    // 30 instead of 2, for erasing to work.
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

    // calcultes angle between 2 vectors...used in reduceArr
    angle(vector1, vector2) {
        let dotproduct = vector1.y * vector2.y + vector1.x * vector2.x;

        let mag1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
        let mag2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

        return (Math.acos(dotproduct / (mag1 * mag2))) * (180 / Math.PI);
    }

    // converts output from html color picker to number from 1-255
    hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // computes X position of a button based on number of buttons and spaces
    buttonX(buttons, spaces) {
        return this.buttonWidth * buttons + this.spacingX * spaces;
    }

    // computes Y position of a button based on number of buttons and spaces
    buttonY(buttons, spaces) {
        return this.buttonHeight * buttons + this.spacingX * spaces;
    }

    // inserts | characters into a string at an index
    insertCursor(str, index) {
        return str.slice(0, index) + "|" + str.slice(index);
    }

    // deleted character at an index
    deleteChar(str, index) {
        if (index > -1 && index < str.length) {
            return str.slice(0, index) + str.slice(index + 1);
        } else {
            return str;
        }
    }

    // inserts character at an index
    insertChar(str, index, char) {
        if (index > -1 && index <= str.length) {
            return str.slice(0, index) + char + str.slice(index);
        } else {
            return str;
        }
    }

    // moves the element at an index to the end of an array
    // no longer being used...was made to move the text entity being edited to the end
    // much better to have an activeEntity that you can call on at any time instead of messing with the order of the array
    moveToLast(arr, index) {
        if (index < 0 || index >= arr.length) {
            throw new RangeError("Index out of bounds");
        }
        const [item] = arr.splice(index, 1); // remove the item
        arr.push(item); // push to end

        return arr;
    }
}

let n = new Not_e();

// disable right click and keyboard scroll
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
    if (e.code == 'Space' && e.target == document.body) {
        e.preventDefault();
    }
    if (e.code == 'ArrowLeft' && e.target == document.body) {
        e.preventDefault();
    }
    if (e.code == 'ArrowRight' && e.target == document.body) {
        e.preventDefault();
    }
    if (e.code == 'ArrowUp' && e.target == document.body) {
        e.preventDefault();
    }
    if (e.code == 'ArrowDown' && e.target == document.body) {
        e.preventDefault();
    }
});
document.addEventListener('wheel', (e) => {
    e.preventDefault();
}, { passive: false });

// warning when page closed
window.onbeforeunload = function () {
    return "";
};

function setup() {
    n.makeCanvas();
    n.makeGUI();

    n.populateGrid();
}

function draw() {
    scale(n.scalefactor);
    n.checkIfUpdateNeeded();

    if (n.updateNeeded == true) {
        n.updateGUI();

        n.updateCanvas();
    }

    n.resetUpdateNeeded();

    // ! debugging only
    // n.showGrid();
}

// ~ input listeners

function keyPressed(event) {
    n.keyPressed(event);
}

function keyReleased() {
    n.keyReleased();
}

function mousePressed(event) {
    n.mousePressed(event);
}

function mouseReleased(event) {
    n.mouseReleased(event);
}

function mouseClicked(event) {
    n.mouseClicked(event);
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
