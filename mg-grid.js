// Background grid + color extraction script for MarkupGo / Bannerbear, etc.
// Uses the SVG grid panels hosted in this repo.

(function () {
    // Base URL for retro SVG panels in this repo
    var GRID_BASE_URL = 'https://raw.githubusercontent.com/qtfarty/assets-image-gen-assets/main/grids';

    // ========= Utility =========
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function (x) {
            var h = x.toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    function colorFromUrlHash(url) {
        var hash = 0, i, ch;
        for (i = 0; i < url.length; i++) {
            ch = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch; hash |= 0;
        }

        var h = Math.abs(hash) % 360; // Hue
        var s = 0.8; // High saturation
        var l = 0.6; // High lightness

        var c = (1 - Math.abs(2 * l - 1)) * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = l - c / 2;
        var r1 = 0, g1 = 0, b1 = 0;

        if (h < 60) { r1 = c; g1 = x; b1 = 0; }
        else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
        else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
        else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
        else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
        else { r1 = c; g1 = 0; b1 = x; }

        var gridR = Math.round((r1 + m) * 255);
        var gridG = Math.round((g1 + m) * 255);
        var gridB = Math.round((b1 + m) * 255);

        // Pale grey background with slight uniqueness based on hash
        var bgTint = Math.abs(hash) % 20;
        var bgR = 210 + (bgTint % 10);
        var bgG = 210 + ((bgTint >> 1) % 10);
        var bgB = 210 + ((bgTint >> 2) % 10);

        return {
            bg: rgbToHex(bgR, bgG, bgB),
            grid: rgbToHex(gridR, gridG, gridB)
        };
    }

    function extractColor(url, cb) {
        var img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            try {
                var c = document.createElement('canvas');
                c.width = 10; c.height = 10;
                var ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, 10, 10);
                var d = ctx.getImageData(0, 0, 10, 10).data;

                var rSum = 0, gSum = 0, bSum = 0, n = 0;
                var maxSat = -1;
                var accR = 100, accG = 200, accB = 255;

                for (var i = 0; i < d.length; i += 4) {
                    var pr = d[i], pg = d[i + 1], pb = d[i + 2];
                    rSum += pr; gSum += pg; bSum += pb; n++;

                    var cMax = Math.max(pr, pg, pb);
                    var cMin = Math.min(pr, pg, pb);
                    var sat = cMax - cMin;
                    if (sat > maxSat) {
                        maxSat = sat;
                        accR = pr; accG = pg; accB = pb;
                    }
                }
                var avgR = Math.round(rSum / n);
                var avgG = Math.round(gSum / n);
                var avgB = Math.round(bSum / n);

                // Blend the average color heavily with a pale gray (#cccccc ish)
                var mix = 0.85;
                var baseGray = 210;
                var bgR = Math.round(avgR * (1 - mix) + baseGray * mix);
                var bgG = Math.round(avgG * (1 - mix) + baseGray * mix);
                var bgB = Math.round(avgB * (1 - mix) + baseGray * mix);

                // Ensure the accent color (vivid line) is bright enough
                var accLuma = 0.299 * accR + 0.587 * accG + 0.114 * accB;
                if (accLuma < 100) {
                    var boost = 100 / (accLuma || 1);
                    accR = Math.min(255, Math.round(accR * boost));
                    accG = Math.min(255, Math.round(accG * boost));
                    accB = Math.min(255, Math.round(accB * boost));
                }

                cb({
                    bg: rgbToHex(bgR, bgG, bgB),
                    grid: rgbToHex(accR, accG, accB)
                });
            } catch (e) {
                cb(colorFromUrlHash(url));
            }
        };

        img.onerror = function () {
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
        positions.sort(function (a, b) { return a - b; });

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
                lines += '<rect x="' + Math.round(cx - w / 2) + '" y="' + Math.round(cy - h / 2) +
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

    // NOTE: retro_a2.svg and retro_a3.svg were removed due to extreme contrast
    var RETRO_GRID_FILES = [
        'retro_a1.svg', 'retro_a4.svg',
        'retro_b1.svg', 'retro_b2.svg', 'retro_b3.svg', 'retro_b4.svg'
    ];
    var RETRO_GRIDS = RETRO_GRID_FILES.map(function (f) { return GRID_BASE_URL + '/' + f; });
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

            // We must fetch the SVG text so we can inject {{ grid_color }} inline.
            // We cannot use an <img> tag for dynamic color replacements.
            fetch(url)
                .then(function (response) { return response.text(); })
                .then(function (svgText) {
                    gridEl.innerHTML = svgText.replaceAll('{{ grid_color }}', gridColor);
                })
                .catch(function (err) {
                    console.error("Failed to fetch SVG grid", err);
                });
        }
    }

    if (sourceUrl && !/^data:/.test(sourceUrl)) {
        extractColor(sourceUrl, function (colors) { applyGrid(colors); });
    } else {
        applyGrid(null);
    }
})();
