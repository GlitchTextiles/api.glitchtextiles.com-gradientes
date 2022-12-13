function getImageOrientation(_image){
	if (_image.width <= _image.height ){
		return 'portrait';
	} else {
		return 'landscape';
	}
}

function stretch(_image){
	_image.loadPixels();
	var orientation = getImageOrientation(_image);
	var design;
	var row;
	switch(orientation){
		case 'portrait':
			design = createImage(768, 1025);
			design.loadPixels();
			row = 0;
			for (var y = 0; y < design.height; y++) {
				for (var x = 0; x < design.width*4; x+=4) {
					// create an index for pixels[]
					i = y*design.width*4 + x;
					j = row*_image.width*4 + x;
					for(var ch = 0; ch < 4; ++ch){
						design.pixels[i+ch]=_image.pixels[j+ch];
					}
				}
				if (y%41 != 0) {
					row++;
				}
			}
			break;
		case 'landscape':
			design = createImage(1025, 768);
			design.loadPixels();
			col = 0;
			for (var x = 0; x < design.width*4; x+=4) {
				for (var y = 0; y < design.height; y++) {
					// create an index for pixels[]
					i = y*design.width*4 + x;
					j = y*_image.width*4 + col;
					for(var ch = 0; ch < 4; ++ch){
						design.pixels[i+ch]=_image.pixels[j+ch];
					}
				}
				if (x/4 % 41 != 0) {
					col+=4;
				}
			}
			break;
	}
	design.updatePixels();
	return design;
}

function downsampleImage(srcImg, factor){
	factor = int(factor);
	if (factor == 1){
		return srcImg;
	} else if ( factor > 1 ){
		var dstImg = createImage(srcImg.width/factor, srcImg.height/factor);
		srcImg.loadPixels();
		dstImg.loadPixels();
		for(var y = 0; y < dstImg.height; y++){
			for(var x = 0; x < dstImg.width*4; x+=4){
				for(var ch = 0; ch < 4; ch++){
					dstImg.pixels[y*dstImg.width*4+(x+ch)] = srcImg.pixels[(y*factor)*srcImg.width*4+((x*factor)+ch)]
				}
			}
		}
		dstImg.updatePixels();
		return dstImg;
	} else {
		return null;
	}
}

function upsampleImage(srcImg, factor){
	factor = int(factor);
	if (factor == 1){
		return srcImg;
	} else if (factor > 1){
		var dstImg = createImage(srcImg.width*factor, srcImg.height*factor);
		srcImg.loadPixels();
		dstImg.loadPixels();
		for(var row = 0; row < srcImg.height; row++){
			for(var col = 0; col < srcImg.width*4; col+=4){
				for(var y = 0; y < factor; y++){
					for (var x = 0 ; x < factor*4; x+=4){
						for(var ch = 0; ch < 4; ch++){
							dstImg.pixels[(row*factor+y)*dstImg.width*4+(col*factor+x+ch)] = srcImg.pixels[row*srcImg.width*4+(col+ch)];
						}
					}
				}
			}
		}
		dstImg.updatePixels();
		return dstImg;
	} else {
		return null;
	}
}