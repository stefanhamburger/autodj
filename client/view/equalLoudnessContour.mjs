/**
 * For the given frequency, return by how much we need to adjust the amplitude so it is normalized
 * Implements the Equal-loudness contour as described in ISO 226:2003 (https://www.iso.org/standard/34222.html). © 2003 ISO
 * Formulas taken from https://www.mathworks.com/matlabcentral/fileexchange/7028-iso-226-equal-loudness-level-contour-signal by Jeff Tackett
 * For an explanation of the Math, see https://web.archive.org/web/20070927210848/http://www.nedo.go.jp/itd/grant-e/report/00pdf/is-01e.pdf
 */

/*
Copyright (c) 2009, Jeff Tackett
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in
the documentation and/or other materials provided with the distribution

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
*/

//Parameters for each of the 29 frequencies
const f = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500];

const af = [0.532, 0.506, 0.480, 0.455, 0.432, 0.409, 0.387, 0.367, 0.349, 0.330, 0.315,
  0.301, 0.288, 0.276, 0.267, 0.259, 0.253, 0.250, 0.246, 0.244, 0.243, 0.243,
  0.243, 0.242, 0.242, 0.245, 0.254, 0.271, 0.301];

const Lu = [-31.6, -27.2, -23.0, -19.1, -15.9, -13.0, -10.3, -8.1, -6.2, -4.5, -3.1,
  -2.0, -1.1, -0.4, 0.0, 0.3, 0.5, 0.0, -2.7, -4.1, -1.0, 1.7,
  2.5, 1.2, -2.1, -7.1, -11.2, -10.7, -3.1];

const Tf = [78.5, 68.7, 59.5, 51.1, 44.0, 37.5, 31.5, 26.5, 22.1, 17.9, 14.4,
  11.4, 8.6, 6.2, 4.4, 3.0, 2.2, 2.4, 3.5, 1.7, -1.3, -4.2,
  -6.0, -5.4, -1.5, 6.0, 12.6, 13.9, 12.3];

/**
 * For the given phon value, returns the Sound-Pressure-Level for each of the 29 frequencies
 * @param phon
 */
const phonToSPL = (phon) => {
  if (phon < 0 || phon > 90) {
    throw new RangeError('Phon value out of bounds!');
  }

  const out = [];

  const Ln = phon;
  for (let i = 0; i < f.length; i += 1) {
    const Af = 4.47E-3 * (10 ** (0.025 * Ln) - 1.15) + (0.4 * 10 ** (((Tf[i] + Lu[i]) / 10) - 9)) ** af[i];
    const Lp = ((10 / af[i]) * Math.log10(Af)) - Lu[i] + 94;

    const freq = f[i];//frequency
    const spl = Lp;//Sound-Pressure-Level
    out.push({ freq, spl });
  }

  return out;
};

//Calculate the SPL data for 40 phons
//40 phons is the loudness level of a pure 1 kHz tone at 40 dB
const splData = phonToSPL(40);

/** For the given frequency, return by how much we need to adjust the amplitude so it is normalized */
const frequencyToVolume = (frequency) => {
  //Find the two closest frequency values
  let index = splData.length - 1;
  for (let i = 1; i < splData.length; i += 1) {
    if (frequency <= splData[i].freq) {
      index = i;
      break;
    }
  }

  //linearily interpolate between both values and return the result
  const freqFrom = splData[index - 1].freq;
  const freqTo = splData[index].freq;
  const weight = (frequency - freqFrom) / (freqTo - freqFrom);

  const splFrom = splData[index - 1].spl;
  const splTo = splData[index].spl;
  const spl = (1.0 - weight) * splFrom + weight * splTo;

  //compare spl to reference value and return difference factor
  //Returned value is in [0.4, 1.12]
  const splReference = 40;
  return splReference / spl;
};

export default frequencyToVolume;
