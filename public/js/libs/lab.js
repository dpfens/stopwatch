var LAB = {
    cie2000: function (labA, labB) {
      /*
       * CIE2000 equation for quantifying perceptual distance between colors.
       * For a very high-level explanation, see https://sensing.konicaminolta.us/us/blog/identifying-color-differences-using-l-a-b-or-l-c-h-coordinates/
       * or for a more mathematical approach: https://zschuessler.github.io/DeltaE/learn/
       * Implementation based on equations from http://www.brucelindbloom.com/index.html?Eqn_DeltaE_CIE2000.html 
      */
  
      const l1 = labA[0],
          a1 = labA[1],
          b1 = labA[2],
          l2 = labB[0],
          a2 = labB[1],
          b2 = labB[2];
  
      // missing utility functions added to Math Object
      Math.rad2deg = function(rad) {
          return 360 * rad / (2 * Math.PI);
      };
      Math.deg2rad = function(deg) {
          return (2 * Math.PI * deg) / 360;
      };
      
      const avgL = (l1 + l2) / 2;
      const c1 = Math.sqrt(Math.pow(a1, 2) + Math.pow(b1, 2));
      const c2 = Math.sqrt(Math.pow(a2, 2) + Math.pow(b2, 2));
      const avgC = (c1 + c2) / 2;
      const g = (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7)))) / 2;
  
      const a1p = a1 * (1 + g);
      const a2p = a2 * (1 + g);
  
      const c1p = Math.sqrt(Math.pow(a1p, 2) + Math.pow(b1, 2));
      const c2p = Math.sqrt(Math.pow(a2p, 2) + Math.pow(b2, 2));
  
      const avgCp = (c1p + c2p) / 2;
  
      let h1p = Math.rad2deg(Math.atan2(b1, a1p));
      if (h1p < 0) {
          h1p = h1p + 360;
      }
  
      let h2p = Math.rad2deg(Math.atan2(b2, a2p));
      if (h2p < 0) {
          h2p = h2p + 360;
      }
  
      const avghp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
  
      const t = 1 - 0.17 * Math.cos(Math.deg2rad(avghp - 30)) + 0.24 * Math.cos(Math.deg2rad(2 * avghp)) + 0.32 * Math.cos(Math.deg2rad(3 * avghp + 6)) - 0.2 * Math.cos(Math.deg2rad(4 * avghp - 63));
  
      let deltahp = h2p - h1p;
      if (Math.abs(deltahp) > 180) {
          if (h2p <= h1p) {
              deltahp += 360;
          } else {
              deltahp -= 360;
          }
      }
  
      const deltalp = l2 - l1;
      const deltacp = c2p - c1p;
  
      deltahp = 2 * Math.sqrt(c1p * c2p) * Math.sin(Math.deg2rad(deltahp) / 2);
  
      const sl = 1 + ((0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2)));
      const sc = 1 + 0.045 * avgCp;
      const sh = 1 + 0.015 * avgCp * t;
  
      const deltaro = 30 * Math.exp(-(Math.pow((avghp - 275) / 25, 2)));
      const rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
      const rt = -rc * Math.sin(2 * Math.deg2rad(deltaro));
  
      const kl = 1;
      const kc = 1;
      const kh = 1;
  
      const deltaE = Math.sqrt(Math.pow(deltalp / (kl * sl), 2) + Math.pow(deltacp / (kc * sc), 2) + Math.pow(deltahp / (kh * sh), 2) + rt * (deltacp / (kc * sc)) * (deltahp / (kh * sh)));
      return deltaE;
  },
  cie94: function (labA, labB){
    /**
     * calculates the perceptual distance between colors in CIELAB
     */
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
  },
  rgb2lab: function(rgb){
        var r = rgb[0] / 255,
            g = rgb[1] / 255,
            b = rgb[2] / 255,
            x, y, z;

        r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

        x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

        return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
    },
    lab2rgb: function(lab){
        var y = (lab[0] + 16) / 116,
            x = lab[1] / 500 + y,
            z = y - lab[2] / 200,
            r, g, b;

        x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787);
        y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787);
        z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787);

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
}