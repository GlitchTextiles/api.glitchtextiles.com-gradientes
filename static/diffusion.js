/*

Resources:

https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html
https://bisqwit.iki.fi/story/howto/dither/jy/

2D Error Diffusion:
-------------------
Floyd-Steinberg
Jarvis, Judice, & Ninke
Stucki
Atkinson
Burkes
Sierra 3x2
Sierra 5x2
Sierra 5x3

Positional:
-----------
Bayer 2x2
Bayer 4x4
Bayer 8x8
Bayer 16x16
*/

// converts p5.Color or array of 0-255 [ R, G, B ] values to hex string, without #
function rgb2hex(_color){
  if(Array.isArray(_color)){
    return _color[0].toString(16).padStart(2, '0') + _color[1].toString(16).padStart(2, '0') + _color[2].toString(16).padStart(2, '0');
  } else {
    return red(_rgb).toString(16).padStart(2, '0') + green(_rgb).toString(16).padStart(2, '0') + blue(_rgb).toString(16).padStart(2, '0');
  }
}

// hex string, without # to [ R, G ,B ] values: 0 - 255
function hex2rgb(_hex){
  var comps = _hex.match(/.{1,2}/g)
  return [parseInt(comps[0], 16),
          parseInt(comps[1], 16),
          parseInt(comps[2], 16)];
}

// Source: https://github.com/antimatter15/rgb-lab/blob/master/color.js
// the following functions are based off of the pseudocode
// found on www.easyrgb.com

function lab2rgb(lab){
  var y = (lab[0] + 16) / 116.0,
      x = lab[1] / 500.0 + y,
      z = y - lab[2] / 200.0,
      r, g, b;

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16.0/116.0) / 7.787);
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16.0/116.0) / 7.787);
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16.0/116.0) / 7.787);

  r = x *  3.2406 + y * -1.5372 + z * -0.4986;
  g = x * -0.9689 + y *  1.8758 + z *  0.0415;
  b = x *  0.0557 + y * -0.2040 + z *  1.0570;

  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
  b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;

  return [Math.max(0, Math.min(1, r)) * 255, 
          Math.max(0, Math.min(1, g)) * 255, 
          Math.max(0, Math.min(1, b)) * 255];
}

function rgb2lab(rgb){
  var r = rgb[0] / 255.0,
      g = rgb[1] / 255.0,
      b = rgb[2] / 255.0,
      x, y, z;

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1.0/3.0) : (7.787 * x) + 16.0/116.0;
  y = (y > 0.008856) ? Math.pow(y, 1.0/3.0) : (7.787 * y) + 16.0/116.0;
  z = (z > 0.008856) ? Math.pow(z, 1.0/3.0) : (7.787 * z) + 16.0/116.0;

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

// calculate the perceptual distance between colors in CIELAB
// https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs

function deltaE(labA, labB){
  var deltaL = labA[0] - labB[0];
  var deltaA = labA[1] - labB[1];
  var deltaB = labA[2] - labB[2];
  var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  var deltaC = c1 - c2;
  var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  var sc = 1.0 + 0.045 * c1;
  var sh = 1.0 + 0.015 * c1;
  var deltaLKlsl = deltaL / (1.0);
  var deltaCkcsc = deltaC / (sc);
  var deltaHkhsh = deltaH / (sh);
  var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

//====================================================================================
// Swatch Class

class Swatch {

  constructor(_color){
    this.rgb = null; // array [ r, g, b ]
    this.hex = null; // string "0a1b2c3d"
    this.lab = null; // array [ L, a, b ]

    // check format
    if (typeof(_color) === 'string' && (_color.length >= 6 && _color.length <=7)){
      if (_color.charAt(0) === '#'){
        this.hex = _color.substring(1);
      } else {
        this.hex = _color;
      }
      this.rgb = hex2rgb(this.hex);
    } else if (Array.isArray(_color) && typeof(_color[0]) === 'number' && _color.length === 3) {
      this.rgb = _color;
      this.hex = rgb2hex(this.rgb);
    } else {
      throw new Error('accepts RGB HEX string formatted: AABBCC, or RGB values 0-255 as an array of 3 values: [ 0, 127, 255 ]');
    }

    // compute CIELAB vector
    if( this.rgb && this.hex){
      this.lab = rgb2lab(this.rgb);
    }
  }
}

//====================================================================================
// Palette Class
// a palette is made up of swatches

class Palette {

  constructor(_hexes) {
    var load = [];
    var palette;
    _hexes.forEach(function(_hex){load.push(new Swatch(_hex))});
    this.palette=load;
  }

  size() {
    return this.palette.length;
  }

  getSwatch(_index) {
    if (_index < this.palette.length && _index >= 0 ){
      return this.palette[_index];
    } else {
      return null;
    }
  }

  // getSwatchColor(_index) {
  //   if (_index < this.palette.length && _index >= 0 ){
  //     return this.palette[_index].c;
  //   } else {
  //     return null;
  //   }
  // }

  nearestLAB(_lab) {
    var candidate;
    var lastDistance=255;
    var distance;
    this.palette.forEach(function(swatch){
      distance = deltaE(swatch.lab, _lab);
      if (distance < lastDistance) {
        candidate = swatch.rgb;
        lastDistance = distance;
      }
    });
    return candidate;
  }
}

//====================================================================================


var matrices = {
    'floyd-steinberg': {
      'start' : 1,
      'matrix' : [
        [0.0, 0.0, 7.0/16.0],
        [3.0/16.0, 5.0/16.0, 1.0/16.0]
      ]
    },
    'false-floyd-steinberg': {
      'start' : 0,
      'matrix' : [
        [0.0, 3.0/8.0],
        [3.0/8.0, 2.0/8.0]
      ]
    },
    'jarvis-judice-ninke': {
      'start' : 2,
      'matrix' : [
        [0.0, 0.0, 0.0, 7.0/48.0, 5.0/48.0],
        [3.0/48.0, 5.0/48.0, 7.0/48.0, 5.0/48.0, 3.0/48.0],
        [1.0/48.0, 3.0/48.0, 5.0/48.0, 3.0/48.0, 1.0/48.0]
      ]
    },
    'stucki': {
      'start' : 2,
      'matrix' : [
        [0.0, 0.0, 0.0, 8.0/42.0, 4.0/42.0],
        [2.0/42.0, 4.0/42.0, 8.0/42.0, 4.0/42.0, 2.0/42.0],
        [1.0/42.0, 2.0/42.0, 4.0/42.0, 2.0/42.0, 1.0/42.0]
      ]
    },
    'atkinson': {
      'start' : 1,
      'matrix' : [
        [0.0, 0.0, 1.0/8.0, 1.0/8.0],
        [1.0/8.0, 1.0/8.0, 1.0/8.0, 0.0],
        [0.0, 1.0/8.0, 0.0, 0.0]
      ]
    },
    'burkes': {
      'start' : 2,
      'matrix' : [
        [0.0, 0.0, 0.0, 8.0/32.0, 4.0/32.0],
        [2.0/32.0, 4.0/32.0, 8.0/32.0, 4.0/32.0, 2.0/32.0]
      ]
    },
    'sierra': {
      'start' : 2,
      'matrix' : [
        [0.0, 0.0, 0.0, 5.0/32.0, 3.0/32.0],
        [2.0/32.0, 4.0/32.0, 5.0/32.0, 4.0/32.0, 2.0/32.0],
        [0.0, 2.0/32.0, 3.0/32.0, 2.0/32.0, 0.0]
      ]
    },
    'two-row-sierra': {
      'start' : 2,
      'matrix' : [
        [0.0, 0.0, 0.0, 4.0/16.0, 3.0/16.0],
        [1.0/16.0, 2.0/16.0, 3.0/16.0, 2.0/16.0, 1.0/16.0]
      ]
    },
    'sierra-lite': {
      'start' : 1,
      'matrix' : [
        [0.0, 0.0, 2.0/4.0],
        [1.0/4.0, 1.0/4.0, 0.0]
      ]
    }
  }

async function dither(_image, _palette, _algorithm, _amount) {
  var matrixStart = matrices[_algorithm]['start']
  var matrix = matrices[_algorithm]['matrix']
  var dither = createImage(_image.width,_image.height);
  dither.copy(_image,0,0,_image.width,_image.height,0,0,dither.width,dither.height);
  dither.loadPixels();
  var nearestColor;
  var pixelHex;
  var pixelLAB;
  var i, iN, r, g ,b, eR, eG, eB;
  var matches={};

  // iterate over the image Left to Right, Top to Bottom
  for (var y = 0; y < _image.height; y++) {
    for (var x = 0; x < _image.width*4; x+=4) {

      // create an index for pixels[]
      i = y*_image.width*4 + x

      // grab the pixel data
      r = dither.pixels[i];
      g = dither.pixels[i+1];
      b = dither.pixels[i+2];
      
      // create a hex string from the pixel data
      pixelHex = rgb2hex([r,g,b]);
      // check if the swatch color matches one we've seen before
      if(pixelHex in matches){ // yep, use that color
        nearestColor = matches[pixelHex];
      } else { // nope, look for the nearest color and save it for later
        pixelLAB = rgb2lab([r,g,b]);
        nearestColor = _palette.nearestLAB(pixelLAB);
        matches[pixelHex] = nearestColor; // save the match to save some time if we encounter it later
      }

      //replace the old color with the nearest match
      dither.pixels[i]=nearestColor[0];
      dither.pixels[i+1]=nearestColor[1];
      dither.pixels[i+2]=nearestColor[2];
      dither.pixels[i+3]=255;

      // calculate the error
      eR = r - nearestColor[0];
      eG = g - nearestColor[1];
      eB = b - nearestColor[2];

      // propagate that error to neighbors
      for(var yN = 0; yN < matrix.length; yN++){
        if (y+yN < _image.height) {
          for(var xN = matrixStart; xN < matrix[0].length; xN++){
            if (x/4 + (xN - matrixStart) < _image.width) {
              if(matrix[yN][xN] > 0){
                iN = (y+yN)*_image.width*4 + (x+4*(xN-matrixStart)); // generate index of neighbor for pixels[]
                dither.pixels[iN] = max(0,min(255, _amount * eR * matrix[yN][xN] + dither.pixels[iN]));
                dither.pixels[iN+1] = max(0,min(255, _amount * eG * matrix[yN][xN] + dither.pixels[iN+1]));
                dither.pixels[iN+2] = max(0,min(255, _amount * eB * matrix[yN][xN] + dither.pixels[iN+2]));
              }
            }
          }
        }
      }
    }
  }
  dither.updatePixels();
  return dither;
}


