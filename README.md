# Not_E

Not_E (pronounced "naughty") is a simple, lightweight drawing app.

It is designed specifically with pen tablet/drawing tablet users in mind.

Most web-based drawing apps lack keyboard shortcuts and require cumbersome interactions like moving to different areas of the screen to switch between colors or to use the eraser, this can be a pain for people using pen tablets.

Not_E implements clean, user-friendly keyboard shortcuts, all present on the left hand side of the keyboard, so you can keep drawing with both hands. 🫲😁🫱

You can use it online here : https://nishchal-bhat.github.io/Not_E/

Or download the [Not_E.html](./Not_E.html) file.<br>
This is a standalone file that you can open in your browser and use like any other application.

Not_E has a seamless UI for saving and loading sketches, but it requires the - [Not_E_Back.js](./Not_E_Back.js) - Node backend server to be running on your device.

You can also manually save and open your sketch as JSON files without requiring the server.

---
## Features
- Draw, erase, select, modify and so much more.
- Add text and images.
- Keyboard shortcuts for all actions.
- Undo/redo for easy corrections.
- Infinite scrolling canvas.
- Separate entities into layers as you choose.
- Beacons to easily jump to specific spots in the canvas.
- You can save your canvas in either a .jpg or .json format. <br>
Choosing .jpg will save an image of your entire canvas.<br>
Choosing .json will create a save file on your device. This save file can be loaded up subsequently.

The app also has a few ~~bugs~~...~~features~~...quirks 🤭. Please read [Instructions](https://github.com/Nishchal-Bhat/Not_E?tab=readme-ov-file#instructions)

---
## Keyboard Shortcuts : 
|key|action|
|-|-|
|`|switch to white|
|1|switch to red|
|2|switch to green|
|3|switch to blue|
|4|switch to black|
|5|switch to yellow|
|6|switch to orange|
|7|switch to magenta|
|8|switch to violet|
|q|__decrease stroke, eraser, text size__ <sup>1</sup>|
|w|increase stroke, eraser, text size|
|e|toggle between 'solid' and 'dashed' strokes|
|p|save sketch as jpg and json|
|Spacebar|reset view|
|a|freehand mode|
|s|line mode|
|d|__text mode OR duplicate__ <sup>2</sup>|
|f|rectangle mode|
|g|ellipse mode|
|h|circle mode|
|z|undo|
|x|redo|
|c|select mode|
|v|image select mode|
|b|__scroll mode__|
|n|__eraser mode__ <sup>3</sup>|
|m|__remove mode__ <sup>4</sup>|
|Esc|Cancel selection or text entry|
|Shift|__Scroll the canvas__<sup>5</sup>|

### ** __NOTE__ : 
<sup>1.</sup> "q" and "w" control the size of:
  - the stroke when in line/freehand/rect/ellipse/circle mode
  - the eraser when in eraser mode
  - the text when in text mode

<sup>2.</sup> "d" duplicates all seleted items when in selection mode and switches to text mode otherwise

<sup>3.</sup> You can also use button 1 (or whichever is mapped to right click) on the stylus to activate the eraser without having to switch to eraser mode.

<sup>5.</sup> You can scroll the canvas along both axes by holding down Shift and dragging with your pen.

---
## Instructions

- When in text mode, you can hit Enter to place the text exactly where it is. To insert a new line, use Shift + Enter
