const endpointURL = 'https://api.glitchtextiles.com/v0/apps/gradientes/';

const landscapeWidth = 1000;
const landscapeHeight = 768;
const portraitWidth = 768;
const portraitHeight = 1000;

var canvas;

var gradientImg = null; // Holds the generated gradient
var choppedImg = null; // Holds the chopped gradient
var ditheredImg = null;
var stretchedImg = null;
var activeImg = null;

var canvasDiv;
var controlsDiv;
var progressDiv;
var generateDiv;
var chopDiv;
var quantizeDiv;
var approveDiv;

// DOM elements
var orientationRadio;
var submitButton;
// var mintButton; // not ready yet, but it's here just in case
var nextButton;
var backButton;

// Nav Buttons
var generateButton;
var chopButton;
var quantizeButton;
var approveButton;

var paletteDropdownOptions;
var diffusionDropdownOptions;
var diffusionSlider;

var loadingOverlay;

var ditherMethod = 'floyd-steinberg';
var pixelSize = 1;
var colorPickerA;
var colorPickerA_wrapper;
var colorPickerB;
var colorPickerB_wrapper;

/*
Workflow:
---
1. Generate a gradient
2. Tweek gradient and regenerate
3. Chop gradient and regenerate
3. Apply the PCW color palette
4. Stretch for weaving
5. Preview and approve
*/

var steps = [
	'generate',
	'chop',
	'quantize',
	'approve'
];

var progress = 'generate';

var palette_color;
var palette_greyscale;
var palette_bw;
var active_palette = null;
var alias=true;

//------------------------------------------------------------------

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */

function spinnerShow(){
	loadingOverlay.style.display = "block";
	redraw();
}

function spinnerHide(){
	loadingOverlay.style.display = "none";
	redraw();
}

function ditherAlgorithmDropdown() {
	ditherPaletteDropdownOptions.classList.remove("show");
	ditherAlgorithmDropdownOptions.classList.toggle("show");
}

function ditherPaletteDropdown() {
	ditherAlgorithmDropdownOptions.classList.remove("show");
	ditherPaletteDropdownOptions.classList.toggle("show");
}

function pixelSizeDropdown() {
	pixelSizeDropdownOptions.classList.toggle("show");
}

function preload(){
	// grabs the palette information and creates a new palette from it
	fetch('./static/rgb_palette.txt')
		.then(response => response.text())
		.then((data) => {
			data = data.split('\n');
			palette_color = new Palette(data);
			active_palette = palette_color;
		});
	fetch('./static/greyscale_palette.txt')
		.then(response => response.text())
		.then((data) => {
			data = data.split('\n');
			palette_greyscale = new Palette(data);
		});
	fetch('./static/bw_palette.txt')
		.then(response => response.text())
		.then((data) => {
			data = data.split('\n');
			palette_bw = new Palette(data);
		});
}

function setup(){
	loadingOverlay = document.getElementById('loading-overlay');
	noLoop(); // disable looping. only update with user interaction
	window.addEventListener('resize', redraw);
	canvas = createCanvas().id('canvas').parent('canvasContainer').hide();
	generateDiv = document.getElementById('generateDiv');
	chopDiv = document.getElementById('chopDiv');
	quantizeDiv = document.getElementById('quantizeDiv');
	approveDiv = document.getElementById('approveDiv');
	chopMinSlider = document.getElementById('chopMinSlider');
	chopMinSlider.addEventListener('change', function(){chop();redraw();});
	chopMaxSlider = document.getElementById('chopMaxSlider');
	chopMaxSlider.addEventListener('change', function(){chop();redraw();});
	chopWarpSlider = document.getElementById('chopWarpSlider');
	chopWarpSlider.addEventListener('change', function(){chop();redraw();});
	chopJitterSlider = document.getElementById('chopJitterSlider');
	chopJitterSlider.addEventListener('change', function(){chop();redraw();});
	chopShiftSlider = document.getElementById('chopShiftSlider');
	chopShiftSlider.addEventListener('change', function(){chop();redraw();});
	chopSeedSlider = document.getElementById('chopSeedSlider');
	chopSeedSlider.addEventListener('change', function(){chop();redraw();});

	ditherPaletteDropdownOptions = document.getElementById("ditherPalette-dropdown-options");
	ditherAlgorithmDropdownOptions = document.getElementById("ditherAlgorithm-dropdown-options");
	pixelSizeDropdownOptions = document.getElementById("pixelSize-dropdown-options");

	// create next button
	nextButton = document.createElement('button');
	nextButton.onclick = progressNext;
	nextButton.id = 'nextButton';
	nextButton.innerHTML = 'next';
	nextButton.disabled = true;
	nextButton.className = 'progressButton';
	document.getElementById('input-table-controls-next').appendChild(nextButton);

	// create back button
	backButton = document.createElement('button');
	backButton.onclick = progressBack;
	backButton.id = 'backButton';
	backButton.innerHTML = 'back';
	backButton.disabled = true;
	backButton.className = 'progressButton';
	document.getElementById('input-table-controls-back').appendChild(backButton);

	document.getElementById('aliasToggle').checked = false;
	document.getElementById('aliasToggle').addEventListener('change', function(){quantize();redraw();});

	document.getElementById('portraitRadioButton').checked = true;
	document.getElementById('landscapeRadioButton').checked = false;
	document.getElementById('portraitRadioButton').addEventListener('input', function(){generate();redraw();});
	document.getElementById('landscapeRadioButton').addEventListener('input', function(){generate();redraw();});
	document.getElementById('verticalRadioButton').checked = true;
	document.getElementById('horizontalRadioButton').checked = false;
	document.getElementById('verticalRadioButton').addEventListener('input', function(){generate();redraw();});
	document.getElementById('horizontalRadioButton').addEventListener('input', function(){generate();redraw();});
	document.getElementById('diffusionSlider').addEventListener('change', function(){quantize();redraw();});

	colorPickerA = document.getElementById("colorPickerA");
	colorPickerB = document.getElementById("colorPickerB");
	colorPickerA_wrapper = document.getElementById("colorPickerA-wrapper");
	colorPickerB_wrapper = document.getElementById("colorPickerB-wrapper");
	colorPickerA.addEventListener('change',changeColorPickerA);
	colorPickerB.addEventListener('change',changeColorPickerB);
	colorPickerA.value ='#4c017e';
	colorPickerB.value ='#c2e2ff'
	changeColorPickerA();
	changeColorPickerB();

	generate();
}

function changeColorPickerA() {
		colorPickerA_wrapper.style.backgroundColor = colorPickerA.value;
		updateGradients();
	}

function changeColorPickerB() {
		colorPickerB_wrapper.style.backgroundColor = colorPickerB.value;
	  updateGradients();
	}

function updateGradients(){
	document.getElementById("horizontalGradient").style.background = `linear-gradient(to right, ${colorPickerA.value}, ${colorPickerB.value})`;
	document.getElementById("verticalGradient").style.background = `linear-gradient(to bottom, ${colorPickerA.value}, ${colorPickerB.value})`;
	generate();  
}

function updateAll(event) {
  console.log(event);
}

function draw(){
	background(127);
	if (activeImg != null){
		fitCanvasTo(activeImg);
		image(activeImg, 0, 0, canvas.width, canvas.height);
	}
}


function showGenerateGUI(){
	generateDiv.style.display = 'block';
	chopDiv.style.display = 'none';
	quantizeDiv.style.display = 'none';
	approveDiv.style.display = 'none';
	backButton.disabled = true;
	nextButton.disabled = false;
}

function generate(){
	spinnerShow();
	showGenerateGUI();
	gradientImg = createGradient(
		getOrientation(),
		getDirection(),
		color(colorPickerA.value),
		color(colorPickerB.value),
		pixelSize);
	if(gradientImg != null){
		activeImg = upsampleImage(gradientImg, pixelSize);
		canvas.show();
		nextButton.disabled = false;
	} else {
		canvas.hide();
		nextButton.disabled = true;
	}
	progress = 'generate';
	spinnerHide();
}

function showChopGUI(){
	generateDiv.style.display = 'none';
	chopDiv.style.display = 'block';
	quantizeDiv.style.display = 'none';
	approveDiv.style.display = 'none';
	backButton.disabled = false;
	nextButton.disabled = false;
}

function chop(){
	spinnerShow();
	if(gradientImg != null){
		canvas.show()
		showChopGUI();
		choppedImg = chopImage( // image, direction, min, max, warp, jitter, shift, seed
			gradientImg,
			getDirection(),
			chopMinSlider.value/1000.0,
			chopMaxSlider.value/1000.0,
			chopWarpSlider.value/1000.0,
			chopJitterSlider.value/1000.0,
			chopShiftSlider.value/1000.0,
			chopSeedSlider.value
		);
		if(choppedImg != null){
			activeImg = upsampleImage(choppedImg, pixelSize);
			canvas.show();
			nextButton.disabled = false;
		} else {
			canvas.hide();
			nextButton.disabled = true;
		}
	} else {
		canvas.hide();
		nextButton.disabled = true;
	}
	progress = 'chop';
	spinnerHide();
}

function showQuantizeGUI(){
	generateDiv.style.display = 'none';
	chopDiv.style.display = 'none';
	quantizeDiv.style.display = 'block';
	approveDiv.style.display = 'none';
	backButton.disabled = false;
	nextButton.disabled = false;
}

async function quantize(){
	spinnerShow();
	if (choppedImg != null){
		showQuantizeGUI();
		var amount = document.getElementById('diffusionSlider').value/1000.0;
		if (document.getElementById('aliasToggle').checked){
			ditheredImg = upsampleImage(choppedImg,2);
			ditheredImg = await dither(ditheredImg, active_palette, ditherMethod, amount);
		  ditheredImg = downsampleImage(ditheredImg, 2);
		} else {
			ditheredImg = await dither(choppedImg, active_palette, ditherMethod, amount);
		}

		activeImg = upsampleImage(ditheredImg, pixelSize);
		spinnerHide();
		progress = 'quantize';
	} else {
		nextButton.disabled = true;
	}
	spinnerHide();
}

function showApproveGUI(){
	generateDiv.style.display = 'none';
	chopDiv.style.display = 'none';
	quantizeDiv.style.display = 'none';
	approveDiv.style.display = 'block';
	backButton.disabled = false;
	nextButton.disabled = true;
}

function approve(){
	showApproveGUI();
	stretchedImg = stretch(upsampleImage(ditheredImg, pixelSize));
	activeImg = stretchedImg;
	progress = 'approve';
}

function progressNext(){
	var result
	switch(progress){
		case 'generate':
			chop();
			break;
		case 'chop':
			quantize();
			break;
		case 'quantize':
			approve();
			break;
		case 'approve':
			break;
	}
	redraw();
}

function progressBack(){
	switch(progress){
		case 'chop':
			showGenerateGUI();
			activeImg = gradientImg;
			progress = 'generate';
			break;
		case 'quantize':
			showChopGUI();
			activeImg = choppedImg;
			progress = 'chop';
			break;
		case 'approve':
			showQuantizeGUI();
			activeImg = ditheredImg;
			progress = 'quantize';
			break;
	}
	redraw();
}

//------------------------------------------------------------------
// handling uploaded file

function setPixelSize(_selection){
	var label;
	pixelSize = _selection;
	switch(_selection){
		case 1:
			label="1x";
			break;
		case 2:
			label="2x";
			break;
		case 4:
			label="4x";
			break;
		case 8:
			label="8x";
			break;
	}
	document.getElementById('pixelSize-dropdown-button').innerHTML = label;
	pixelSizeDropdownOptions.classList.remove("show");
	generate();
	redraw();
}

function setActivePalette(_selection){
	var label;
	switch(_selection){
		case 0:
			active_palette = palette_color;
			label = 'color'
			break;
		case 1:
			active_palette = palette_greyscale;
			label = 'greyscale'
			break;
		case 2:
			active_palette = palette_bw;
			label = 'black & white'
			break;
	}
	document.getElementById('ditherPalette-dropdown-button').innerHTML = label;
	ditherPaletteDropdownOptions.classList.remove("show");
	quantize();
	redraw();
}

function setDitherAlgorithm(_selection){
	var label;
	switch(_selection){
		case 0:
			ditherMethod='floyd-steinberg';
			label='floyd-steinberg';
			break;
		case 1:
			ditherMethod='false-floyd-steinberg';
			label='false floyd-steinberg';
			break;
		case 2:
			ditherMethod='jarvis-judice-ninke';
			label='jarvis, judice & ninke';
			break;
		case 3:
			ditherMethod='stucki';
			label='stucki';
			break;
		case 4:
			ditherMethod='atkinson';
			label='atkinson';
			break;
		case 5:
			ditherMethod='burkes';
			label='burkes';
			break;
		case 6:
			ditherMethod='sierra';
			label='sierra';
			break;
		case 7:
			ditherMethod='two-row-sierra';
			label='two-row sierra';
			break;
		case 8:
			ditherMethod='sierra-lite';
			label='sierra lite';
			break;
	}
	document.getElementById('ditherAlgorithm-dropdown-button').innerHTML = label;
	ditherAlgorithmDropdownOptions.classList.remove("show");
	quantize();
	redraw();
}

//------------------------------------------------------------------
// image adjustments

function getOrientation(){
	var elements = document.getElementsByName('orientation');
	for (var i = 0; i < elements.length; i++){
		if(elements[i].checked){
			return elements[i].value;
		}
	}
}

function getDirection(){
	var elements = document.getElementsByName('direction');
	for (var i = 0; i < elements.length; i++){
		if(elements[i].checked){
			return elements[i].value;
		}
	}
}

function createGradient(_orientation, _direction, _colorA, _colorB, _pixelSize){

	let design; // draw the gradient into this
	let i = 0; // use this as an index
	let c; // store the color here

	switch(_orientation){
		case 'portrait':
			design = createImage(portraitWidth/_pixelSize, portraitHeight/_pixelSize);
			break;
		case 'landscape':
			design = createImage(landscapeWidth/_pixelSize, landscapeHeight/_pixelSize);
			break;
	}

	design.loadPixels();

	switch(_direction){
		case 'vertical':
			for (var y = 0; y < design.height; y++) {
				c = lerpColor(_colorA, _colorB, y/design.height);
				for (var x = 0; x < design.width*4; x+=4) {
					// create an index for pixels[]
					i = y*design.width*4 + x;
					design.pixels[i]=red(c);
					design.pixels[i+1]=green(c);
					design.pixels[i+2]=blue(c);
					design.pixels[i+3]=255;
				}
			}
			break;
		case 'horizontal':
			for (var x = 0; x < design.width*4; x+=4) {
				c = lerpColor(_colorA, _colorB, x/(design.width*4));
				for (var y = 0; y < design.height; y++) {
					// create an index for pixels[]
					i = y*design.width*4 + x;
					design.pixels[i]=red(c);
					design.pixels[i+1]=green(c);
					design.pixels[i+2]=blue(c);
					design.pixels[i+3]=255;
				}
			}
			break;
	}

	design.updatePixels();

	return design;
}

function fitCanvasTo(_image){
	var canvasContainer = document.getElementById('canvasContainer');
	var newWidth;
	switch(getImageOrientation(_image)){
		case 'portrait':
			newWidth = Math.min(canvasContainer.offsetWidth, 768);
			break;
		case 'landscape':
			if (_image.width == 1025){
				newWidth = Math.min(canvasContainer.offsetWidth, 1025);
			} else {
				newWidth = Math.min(canvasContainer.offsetWidth, 1000);
			}
			break;
	}
	var newHeight = ( _image.height * newWidth )/( _image.width );
	resizeCanvas(newWidth, newHeight);
}

//------------------------------------------------------------------
// send image to server


async function createProduct(){
	try{
		document.getElementById('createOrderButton').disabled = true;
		spinnerShow();
		if(stretchedImg != null ){
			var redirectURL = null;
			stretchedImg.loadPixels();
			var imageBlob = await new Promise(resolve => stretchedImg.canvas.toBlob(resolve, 'image/png'));
			var formData = new FormData();
			formData.append('image',imageBlob,'custom.png')
			var response = await fetch(endpointURL, {
				method: 'POST',
				body: formData
			});
			var body = await response.json();
			var status_code = response.status;
			// console.log(status_code);
			// console.log(body);
			if ( status_code == 201 ){
				if (body['message']){
					redirectURL = body['message'];
					window.top.location.href = redirectURL
				} else {
					console.log(`A response is ${status_code} but the body is ${body}.`);
				}
			} else {
				console.log("A server error prevented product page creation.");
			}
		}
	} catch (error){
		console.error(error);
	} finally {
		document.getElementById('createOrderButton').disabled = false;
		spinnerHide();
	}
}