var active;
var mode, direction;
var  noise_octaves, position_x, position_y, size, buffer, seed;
var shift, start, end, scale, noise_falloff;

function chopImage(_image, _direction, _min, _max, _warp, _jitter, _shift, _seed) {
	// console.log(`_direction: ${_direction}, _min: ${_min}, _max: ${_max}, _warp: ${_warp}, _jitter: ${_jitter}, _shift: ${_shift}, _seed: ${_seed}`);
	var buffer = createImage(_image.width, _image.height);
	var start = 0;
	var next_start = 0;
	var end = 0;
	var shift = 0;
	var noiseOffset = 0;
	var noiseScale = _image.width * 0.1;
	var span = 0;
	var value = 0;
	_image.loadPixels();
	buffer.loadPixels();
	noiseSeed(_seed);
	randomSeed(_seed);
	switch(_direction) {
		case "horizontal":
			while (next_start < _image.height) {
				span = Math.ceil(map(random(0, 1), 0, 1, _min*_image.height, _max*_image.height));
				if (span < 1){
					span = 1;
				} else {
					start = next_start;
					end = Math.min(next_start + span, _image.height);
					next_start = end;
					value = (start+end)/(2.0*_image.height);
					shift = getShift(value, _shift*_image.width, _warp*_image.width, noiseScale);
					shiftRows(_image, buffer, start, end, shift, _jitter);
				}
			}
			break;
		case "vertical":
			while (next_start < _image.width) {
				span = Math.ceil(map(random(0, 1), 0, 1, _min*_image.width, _max*_image.width));
				if (span < 1){
					span = 1;
				} else {
					start = next_start;
					end = Math.min(next_start + span, _image.width);
					next_start = end;
					value = (start+end)/(2.0*_image.width);
					shift = getShift(value, _shift*_image.height, _warp*_image.height, noiseScale);
					shiftCols(_image, buffer, start, end, shift, _jitter);
				}
			}
			break;
	}
	buffer.updatePixels();
	return buffer;
}

function getShift(_value, _offset, _amount, _noiseScale){
	return int(_offset+(_amount*2*(noise(_noiseScale*_value)-.5)));
}

function shiftRows(imgSrc, imgDst, start, end, amount, jitter) {
	for (var i = start; i < end; ++i) {
		shiftRow(imgSrc, imgDst, i, amount, jitter);
	}
}

function shiftCols(imgSrc, imgDst, start, end, amount, jitter) {
	for (var i = start; i < end; ++i) {
		shiftCol(imgSrc, imgDst, i, amount, jitter);
	}
}


function shiftRow(imgSrc, imgDst, row, amount, jitter) {
	if((imgSrc.width != imgDst.width) || (imgSrc.height != imgDst.height)){
		console.log("Source and destination image dimentions do not match!");
		return;
	} else {
		var indexDst;
		var indexSrc;
		var displacement = amount + int(random(0,1) * jitter * imgDst.width);
		for (var x = 0; x < imgDst.width*4; x+=4) {
			for (var ch = 0; ch < 4; ++ch){
				indexDst = (row*imgDst.width*4)+(((4*(displacement+2*imgDst.width))+x+ch) % (imgDst.width*4));
				indexSrc = (row*imgSrc.width*4)+(x+ch);
				imgDst.pixels[indexDst] = imgSrc.pixels[indexSrc];
			}
		}
	}
}

function shiftCol(imgSrc, imgDst, col, amount, jitter) {
	if((imgSrc.width != imgDst.width) || (imgSrc.height != imgDst.height)){
		console.log("Source and destination image dimentions do not match!");
		return;
	} else {
		var indexDst;
		var indexSrc;
		var displacement = amount + int(random(0,1) * jitter * imgDst.height);
		for (var y = 0; y < imgDst.height; ++y) {
			for (var ch = 0; ch < 4; ++ch){
				indexDst = (((y+displacement+2*imgDst.height) % imgDst.height)*imgDst.width*4)+((col*4)+ch);
				indexSrc = (y*imgSrc.width*4)+((col*4)+ch);
				imgDst.pixels[indexDst] = imgSrc.pixels[indexSrc];
			}
		}
	}
}