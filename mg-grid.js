// Background grid + color extraction script for MarkupGo / Bannerbear, etc.
// Uses the SVG grid panels hosted in this repo.

(function() {
  // Base URL for retro SVG panels in this repo
  var GRID_BASE_URL = 'https://raw.githubusercontent.com/qtfarty/assets-image-gen-assets/main/grids';

  // ========= Utility =========
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function(x) {
      var h = x.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  function colorFromUrlHash(url) {
    var hash1 = 0, hash2 = 0, i, ch;
    for (i = 0; i < url.length; i++) {
      ch = url.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1) + ch; hash1 |= 0;
      hash2 = ((hash2 << 5) - hash2) + ch * 31; hash2 |= 0;
    }

    var bgR = Math.max(50, Math.min(200, Math.abs((hash1 & 0xFF0000) >> 16)));
    var bgG = Math.max(50, Math.min(200, Math.abs((hash1 & 0x00FF00) >> 8)));
    var bgB = Math.max(50, Math.min(200, Math.abs(hash1 & 0x0000FF)));

    var gridR = Math.max(50, Math.min(255, Math.abs((hash2 & 0xFF0000) >> 16)));
    var gridG = Math.max(50, Math.min(255, Math.abs((hash2 & 0x00FF00) >> 8)));
    var gridB = Math.max(50, Math.min(255, Math.abs(hash2 & 0x0000FF)));

    return {
      bg: rgbToHex(bgR, bgG, bgB),
      grid: rgbToHex(gridR, gridG, gridB)
    };
  }

  function extractColor(url, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      try {
        var c = document.createElement('canvas');
        c.width = 10; c.height = 10;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 10, 10);
        var d = ctx.getImageData(0, 0, 10, 10).data;

        var rSum = 0, gSum = 0, bSum = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
          rSum += d[i]; gSum += d[i + 1]; bSum += d[i + 2]; n++;
        }
        var avgR = Math.round(rSum / n);
        var avgG = Math.round(gSum / n);
        var avgB = Math.round(bSum / n);

        // Accent color = farthest from average in RGB space
        var maxDist = -1;
        var accR = avgR, accG = avgG, accB = avgB;
        for (var j = 0; j < d.length; j += 4) {
          var pr = d[j], pg = d[j + 1], pb = d[j + 2];
          var dist = Math.sqrt(
            Math.pow(pr - avgR, 2) +
            Math.pow(pg - avgG, 2) +
            Math.pow(pb - avgB, 2)
          );
          if (dist > maxDist) {
            maxDist = dist;
            accR = pr; accG = pg; accB = pb;
          }
        }

        cb({
          bg: rgbToHex(avgR, avgG, avgB),
          grid: rgbToHex(accR, accG, accB)
        });
      } catch (e) {
        cb(colorFromUrlHash(url));
      }
    };

    img.onerror = function() {
      cb(colorFromUrlHash(url));
    };

    img.src = url;
  }

  // ========= Grid generators =========

  function makeConcaveCylinder(color) {
    var W = 1080, H = 1920, cx = 540, cy = 960;
    var lines = '';
    // Vertical lines
    for (var i = 0; i <= 10; i++) {
      lines += '<line x1="' + (i * 108) + '" y1="0" x2="' + (i * 108) + '" y2="' + H + '" />';
    }
    // Horizontal curves
    var N = 12, minGap = 50, maxGap = 110;
    var gaps = [], positions = [cy], yUp = cy, yDown = cy;
    for (i = 0; i < N; i++) gaps.push(minGap + (maxGap - minGap) * (i / (N - 1)));
    for (i = 0; i < N; i++) {
      yUp -= gaps[i]; yDown += gaps[i];
      positions.push(yUp, yDown);
    }
    positions.sort(function(a, b) { return a - b; });

    for (i = 0; i < positions.length; i++) {
      var y = positions[i];
      var yr = Math.round(y * 10) / 10;
      var dy = cy - y;
      var yMid = Math.round((y + dy * 0.15) * 10) / 10;
      lines += '<path d="M0,' + yr + ' Q' + cx + ',' + yMid + ' ' + W + ',' + yr + '" />';
    }

    return '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" ' +
      'viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<g stroke="' + color + '" fill="none" stroke-width="4">' + lines + '</g></svg>';
  }

  function makeStackedTunnels(color) {
    var lines = '';
    var sH = 640;
    for (var s = 0; s < 3; s++) {
      var yS = s * sH, cy = yS + sH / 2, cx = 540;
      for (var i = 0; i <= 6; i++) {
        var sc = Math.pow(i / 6, 1.5);
        var w = Math.round(1080 * (1 - sc));
        var h = Math.round(sH * (1 - sc));
        if (w < 10) continue;
        lines += '<rect x="' + Math.round(cx - w / 2) +
                 '" y="' + Math.round(cy - h / 2) +
                 '" width="' + w +
                 '" height="' + h + '" />';
      }

      var iW = 216, iH = 128;
      var iL = Math.round(cx - iW / 2);
      var iR = Math.round(cx + iW / 2);
      var iT = Math.round(cy - iH / 2);
      var iB = Math.round(cy + iH / 2);

      lines += '<line x1="0" y1="' + yS + '" x2="' + iL + '" y2="' + iT + '" />' +
               '<line x1="1080" y1="' + yS + '" x2="' + iR + '" y2="' + iT + '" />' +
               '<line x1="0" y1="' + (yS + sH) + '" x2="' + iL + '" y2="' + iB + '" />' +
               '<line x1="1080" y1="' + (yS + sH) + '" x2="' + iR + '" y2="' + iB + '" />';

      for (var x = 108; x < 1080; x += 108) {
        var tx = Math.round(iL + (iW * (x / 1080)));
        lines += '<line x1="' + x + '" y1="' + yS + '" x2="' + tx + '" y2="' + iT + '" />' +
                 '<line x1="' + x + '" y1="' + (yS + sH) + '" x2="' + tx + '" y2="' + iB + '" />';
      }
      for (var y = yS + 64; y < yS + sH; y += 64) {
        var ty = Math.round(iT + (iH * ((y - yS) / sH)));
        lines += '<line x1="0" y1="' + y + '" x2="' + iL + '" y2="' + ty + '" />' +
                 '<line x1="1080" y1="' + y + '" x2="' + iR + '" y2="' + ty + '" />';
      }
    }

    return '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" ' +
      'viewBox="0 0 1080 1920" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<g stroke="' + color + '" fill="none" stroke-width="4">' + lines + '</g></svg>';
  }

  var RETRO_GRID_FILES = [
    'retro_a1.svg', 'retro_a2.svg', 'retro_a3.svg', 'retro_a4.svg',
    'retro_b1.svg', 'retro_b2.svg', 'retro_b3.svg', 'retro_b4.svg'
  ];
  var RETRO_GRIDS = RETRO_GRID_FILES.map(function(f) { return GRID_BASE_URL + '/' + f; });
  var GENERATORS = [makeConcaveCylinder, makeStackedTunnels];

  // ========= Main =========

  var bgEl = document.getElementById('mg-bg');
  var gridEl = document.getElementById('mg-grid');
  if (!bgEl || !gridEl) return;

  var sourceUrl = bgEl.getAttribute('data-mg-source');
  var defaultBg = bgEl.style.background || null;

  function applyGrid(colors) {
    var bgColor = colors && colors.bg ? colors.bg : defaultBg;
    var gridColor = colors && colors.grid ? colors.grid : '#ffffff';

    if (bgColor) bgEl.style.background = bgColor;

    var total = GENERATORS.length + RETRO_GRIDS.length;
    var idx = Math.floor(Math.random() * total);

    if (idx < GENERATORS.length) {
      gridEl.innerHTML = GENERATORS[idx](gridColor);
    } else {
      var url = RETRO_GRIDS[idx - GENERATORS.length];
      gridEl.innerHTML =
        '<img src="' + url + '" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:1" />';
    }
  }

  if (sourceUrl && !/^data:/.test(sourceUrl)) {
    extractColor(sourceUrl, function(colors) { applyGrid(colors); });
  } else {
    applyGrid(null);
  }
})();

