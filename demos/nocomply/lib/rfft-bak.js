/** 
 * FFT is a class for calculating the Discrete Fourier Transform of a signal 
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
 
/*global Float32Array, Uint32Array*/

function FFT(bufferSize, sampleRate) {
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;
  this.spectrum         = new Float32Array(bufferSize/2);
  this.real             = new Float32Array(bufferSize);
  this.imag             = new Float32Array(bufferSize);
    
  this.reverseTable     = new Uint32Array(bufferSize);

  var limit = 1;
  var bit = bufferSize >> 1;
  var i;

  while ( limit < bufferSize ) {
    for ( i = 0; i < limit; i++ ) {
      this.reverseTable[i + limit] = this.reverseTable[i] + bit;
    }

    limit = limit << 1;
    bit = bit >> 1;
  }

  this.sinTable = new Float32Array(bufferSize);
  this.cosTable = new Float32Array(bufferSize);

  for ( i = 0; i < bufferSize; i++ ) {
    this.sinTable[i] = Math.sin(-Math.PI/i);
    this.cosTable[i] = Math.cos(-Math.PI/i);
  }
}

/**
 * Performs a forward tranform on the sample buffer. 
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function(buffer) {
  // Locally scope variables for speed up
  var bufferSize      = this.bufferSize,
      cosTable        = this.cosTable,
      sinTable        = this.sinTable,
      reverseTable    = this.reverseTable,
      real            = this.real,
      imag            = this.imag,
      spectrum        = this.spectrum;

  var k = Math.floor(Math.log(bufferSize) / Math.LN2);
  if ( Math.pow(2, k) !== bufferSize ) { throw "Invalid buffer size, must be a power of 2."; }
  if ( bufferSize !== buffer.length ) { throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length; }

  var halfSize = 1, 
      phaseShiftStepReal, 
      phaseShiftStepImag, 
      currentPhaseShiftReal, 
      currentPhaseShiftImag, 
      off, 
      tr, 
      ti, 
      tmpReal, 
      i;

  for ( i = 0; i < bufferSize; i++ ) {
    real[i] = buffer[reverseTable[i]];
    imag[i] = 0;
  }


  while ( halfSize < bufferSize ) {
    phaseShiftStepReal = cosTable[halfSize];
    phaseShiftStepImag = sinTable[halfSize];
    currentPhaseShiftReal = 1;
    currentPhaseShiftImag = 0;

    for ( var fftStep = 0; fftStep < halfSize; fftStep++ ) {
      i = fftStep;

      while ( i < bufferSize ) {
        off = i + halfSize;
        tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
        ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

        real[off] = real[i] - tr;
        imag[off] = imag[i] - ti;
        real[i] += tr;
        imag[i] += ti;

        i += halfSize << 1;
      }

      tmpReal = currentPhaseShiftReal;
      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
    }

    halfSize = halfSize << 1;
  }

  i = bufferSize/2;
  while(i--) {
    spectrum[i] = 2 * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / bufferSize;
  }

  return spectrum;
};

FFT.prototype.inverse = function(real, imag) {
  // Locally scope variables for speed up
  var bufferSize      = this.bufferSize,
      cosTable        = this.cosTable,
      sinTable        = this.sinTable,
      reverseTable    = this.reverseTable,
      spectrum        = this.spectrum;
      
      real = real || this.real;
      imag = imag || this.imag;

  var halfSize = 1, 
      phaseShiftStepReal, 
      phaseShiftStepImag, 
      currentPhaseShiftReal, 
      currentPhaseShiftImag, 
      off, 
      tr, 
      ti, 
      tmpReal, 
      i;

  for (i = 0; i < bufferSize; i++) {
    imag[i] *= -1;
  }

  var revReal = new Float32Array(bufferSize);
  var revImag = new Float32Array(bufferSize);
  
  for (i = 0; i < real.length; i++) {
    revReal[i] = real[reverseTable[i]];
    revImag[i] = imag[reverseTable[i]];
  }
  
  real = revReal;
  imag = revImag;



  while ( halfSize < bufferSize ) {
    phaseShiftStepReal = cosTable[halfSize];
    phaseShiftStepImag = sinTable[halfSize];
    currentPhaseShiftReal = 1;
    currentPhaseShiftImag = 0;

    for ( var fftStep = 0; fftStep < halfSize; fftStep++ ) {
      i = fftStep;

      while ( i < bufferSize ) {
        off = i + halfSize;
        tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
        ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

        real[off] = real[i] - tr;
        imag[off] = imag[i] - ti;
        real[i] += tr;
        imag[i] += ti;

        i += halfSize << 1;
      }

      tmpReal = currentPhaseShiftReal;
      currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
      currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
    }

    halfSize = halfSize << 1;
  }

  var buffer = new Float32Array(bufferSize);
  for (i = 0; i < bufferSize; i++) {
    buffer[i] = real[i] / bufferSize;
  }

  return buffer;
};


// want a new scope, use strict to avoid bugs and let js implementation
// optimize more!
var RFFT;
(function() {"use strict"; 
  // lookup tables don't really gain us any speed, but they do increase 
  // cache footprint, so don't use them in here
  
  // also we don't use sepearate arrays for real/imaginary parts
  
  // this one a little more than twice as fast as the one in FFT
  // however I only did the forward transform

  RFFT = function(bufferSize, sampleRate) {
    this.bufferSize = bufferSize;  
    this.sampleRate = sampleRate;
    this.trans = new Float32Array(bufferSize);
    this.spectrum = new Float32Array(bufferSize/2);
  };
  
  // the rest of this was translated from C, see http://www.jjj.de/fxt/
  // this is the real split radix FFT

  // don't use a lookup table to do the permute, use this instead
  function revbin_permute(d, s) {
    var nh = d.length>>>1, nm1 = d.length - 1;
  
    function revbin_upd(r, h) {
      while ( !((r^=h)&h) ) { h = h >> 1; }
      return r;
    }
  
    var x, r = 0;
    d[0] = s[0];
    x = 1;
    do {
      r = r + nh;
      //swap(a[x], a[r]);
      d[x] = s[r];
      d[r] = s[x];
      x++;
    
      r = revbin_upd(r, nh);
      if(r>=x) { //swap(a[x], a[r]);
        d[x] = s[r]; d[r] = s[x];
        d[nm1-x] = s[nm1-r]; d[nm1-r] = s[nm1-x];
      }
      x++;
    } while(x < nh);
    d[nm1] = s[nm1];
  }
  
  // define some constants
  var sqrt = Math.sqrt, cos = Math.cos, sin = Math.sin;
  var _2pi = 2*Math.PI, SQRT1_2 = Math.SQRT1_2;
  
  // Ordering of output:
  //
  // trans[0]     = re[0] (==zero frequency, purely real)
  // trans[1]     = re[1]
  //             ...
  // trans[n/2-1] = re[n/2-1]
  // trans[n/2]   = re[n/2]    (==nyquist frequency, purely real)
  //
  // trans[n/2+1] = im[n/2-1]
  // trans[n/2+2] = im[n/2-2]
  //             ...
  // trans[n-1]   = im[1]  

  RFFT.prototype.forward = function(buffer) {
    var n = this.bufferSize;
    var x = this.trans,
      ix, id, i0, 
      i1, i2, i3, i4, i5, i6, i7, i8,
      n2, n4, n8, nn,
      t1, t2, t3, t4, st1,
      e, a, cc1, ss1, cc3, ss3,
      j;
    revbin_permute(x, buffer);

    for(ix=0, id=4; ix<n; id*=4) {
      for(i0=ix; i0<n; i0+=id) {
        //sumdiff(x[i0], x[i0+1]); // {a, b}  <--| {a+b, a-b}
        st1 = x[i0] - x[i0+1]; x[i0] += x[i0+1]; x[i0+1] = st1;
      }
      ix = 2*(id-1);
    }
  
    n2 = 2;
    nn = n >>> 1;
    while((nn = nn >>> 1)) {
      ix = 0;
      n2 = n2 << 1;
      id = n2 << 1;
      n4 = n2 >>> 2;
      n8 = n2 >>> 3;
      do {
      
        if(n4 !== 1) {
          for(i0 = ix; i0 < n; i0 += id) {
            i1 = i0;
            i2 = i1 + n4;
            i3 = i2 + n4;
            i4 = i3 + n4;
        
            //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
            t1 = x[i3] + x[i4]; x[i4] -= x[i3];
            //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
            x[i3] = x[i1] - t1; x[i1] += t1;
        
        
            i1 += n8;
            i2 += n8;
            i3 += n8;
            i4 += n8;
            
            //sumdiff(x[i3], x[i4], t1, t2); // {s, d}  <--| {a+b, a-b}
            t1 = x[i3] + x[i4]; t2 = x[i3] - x[i4];
            
            t1 = -t1 * SQRT1_2;
            t2 *= SQRT1_2;
        
            // sumdiff(t1, x[i2], x[i4], x[i3]); // {s, d}  <--| {a+b, a-b}
            st1 = x[i2]; x[i4] = t1 + st1; x[i3] = t1 - st1;
            //sumdiff3(x[i1], t2, x[i2]); // {a, b, d} <--| {a+b, b, a-b}
            x[i2] = x[i1] - t2; x[i1] += t2;
          }
        } else {
          for(i0 = ix; i0 < n; i0 += id) {
            i1 = i0;
            i2 = i1 + n4;
            i3 = i2 + n4;
            i4 = i3 + n4;
        
            //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
            t1 = x[i3] + x[i4]; x[i4] -= x[i3];
            //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
            x[i3] = x[i1] - t1; x[i1] += t1;
          }
        }
      
        ix = (id<<1) - n2;
        id = id << 2;
      } while(ix < n);
    
      e = _2pi/n2;
      for(j=1; j<n8; j++) {
        a = j*e;
        ss1 = sin(a);   cc1 = cos(a); 
        //ss3 = sin(3*a); cc3 = cos(3*a);
        cc3 = 4*cc1*(cc1*cc1-0.75); ss3 = 4*ss1*(0.75-ss1*ss1);
      
        ix = 0; id = n2 << 1;
        do {
          for(i0 = ix; i0 < n; i0+= id) {
            i1 = i0 + j;
            i2 = i1 + n4;
            i3 = i2 + n4;
            i4 = i3 + n4;
          
            i5 = i0 + n4 - j;
            i6 = i5 + n4;
            i7 = i6 + n4;
            i8 = i7 + n4;
          
            //cmult(c, s, x, y, &u, &v)
            //cmult(cc1, ss1, x[i7], x[i3], t2, t1); // {u,v} <--| {x*c-y*s, x*s+y*c}
            t2 = x[i7]*cc1 - x[i3]*ss1; t1 = x[i7]*ss1 + x[i3]*cc1;
            //cmult(cc3, ss3, x[i8], x[i4], t4, t3);
            t4 = x[i8]*cc3 - x[i4]*ss3; t3 = x[i8]*ss3 + x[i4]*cc3;
          
            //sumdiff(t2, t4);   // {a, b} <--| {a+b, a-b}
            st1 = t2 - t4; t2 += t4; t4 = st1;
            //sumdiff(t2, x[i6], x[i8], x[i3]); // {s, d}  <--| {a+b, a-b}
            //st1 = x[i6]; x[i8] = t2 + st1; x[i3] = t2 - st1;
            x[i8] = t2 + x[i6]; x[i3] = t2 - x[i6];
            
            //sumdiff_r(t1, t3); // {a, b} <--| {a+b, b-a}
            st1 = t3 - t1; t1 += t3; t3 = st1;
            //sumdiff(t3, x[i2], x[i4], x[i7]); // {s, d}  <--| {a+b, a-b}
            //st1 = x[i2]; x[i4] = t3 + st1; x[i7] = t3 - st1;
            x[i4] = t3 + x[i2]; x[i7] = t3 - x[i2];
            
            //sumdiff3(x[i1], t1, x[i6]);   // {a, b, d} <--| {a+b, b, a-b}
            x[i6] = x[i1] - t1; x[i1] += t1;
            //diffsum3_r(t4, x[i5], x[i2]); // {a, b, s} <--| {a, b-a, a+b}
            x[i2] = t4 + x[i5]; x[i5] -= t4;
          }
        
          ix = (id << 1) - n2;
          id = id << 2;
      
        } while(ix < n);
      }
    }
  
    var spectrum = this.spectrum;
    var i = (n>>>1);
    var bSi = 2.0 / n;
    while(--i) {
      spectrum[i] = bSi * sqrt(x[i] * x[i] + x[n-i-1] * x[n-i-1]);
    }
    spectrum[0] = bSi * x[0];
  };
})();
