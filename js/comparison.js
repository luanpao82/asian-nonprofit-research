/* Asian Nonprofit Research — Cross-Country Comparison */
(function () {
  'use strict';

  fetch('data/similarity.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      renderHeatmap('heatmap-topic', data.countries, data.matrix, 'LDA Topic Cosine Similarity', 'Greens');
      renderHeatmap('heatmap-jaccard', data.countries, data.word_jaccard_matrix, 'Top-20 Word Jaccard Similarity', 'Blues');
      renderSharedTermsTable(data);
    })
    .catch(function (err) { console.error('Similarity data load failed:', err); });

  function renderHeatmap(containerId, countries, matrix, title, palette) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var n = countries.length;
    var cellSize = Math.min(80, Math.floor((container.clientWidth - 120) / n));
    cellSize = Math.max(55, cellSize);

    var tableW = 120 + cellSize * n;

    // Color scale
    function getColor(val, scheme) {
      if (isNaN(val) || val === null) return '#eee';
      var t = Math.max(0, Math.min(1, val));
      if (scheme === 'Greens') {
        var r = Math.round(247 - t * 200);
        var g = Math.round(252 - t * 80);
        var b = Math.round(245 - t * 180);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
      } else {
        var r2 = Math.round(247 - t * 190);
        var g2 = Math.round(251 - t * 100);
        var b2 = Math.round(255 - t * 30);
        return 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
      }
    }

    var html = '<table style="border-collapse:collapse;margin:1rem auto;">';
    // Header row
    html += '<tr><td style="width:120px;"></td>';
    for (var j = 0; j < n; j++) {
      html += '<td style="width:' + cellSize + 'px;text-align:center;font-size:0.72rem;font-weight:600;padding:6px 2px;color:#333;writing-mode:vertical-lr;transform:rotate(180deg);height:80px;">' + window.countryDisplay(countries[j]) + '</td>';
    }
    html += '</tr>';

    // Data rows
    for (var i = 0; i < n; i++) {
      html += '<tr>';
      html += '<td style="text-align:right;padding-right:8px;font-size:0.82rem;font-weight:600;color:#333;">' + window.countryDisplay(countries[i]) + '</td>';
      for (var j2 = 0; j2 < n; j2++) {
        var val = matrix[i][j2];
        var displayVal = (val !== null && !isNaN(val)) ? val.toFixed(2) : '—';
        var bg = getColor(val, palette);
        var textColor = val > 0.6 ? '#fff' : '#222';
        var border = (i === j2) ? '2px solid #333' : '1px solid #ddd';
        html += '<td style="width:' + cellSize + 'px;height:' + cellSize + 'px;text-align:center;vertical-align:middle;' +
                'background:' + bg + ';color:' + textColor + ';font-size:0.78rem;font-weight:500;' +
                'border:' + border + ';cursor:pointer;" ' +
                'data-i="' + i + '" data-j="' + j2 + '">' + displayVal + '</td>';
      }
      html += '</tr>';
    }
    html += '</table>';

    container.innerHTML = html;
  }

  function renderSharedTermsTable(data) {
    var container = document.getElementById('shared-terms-table');
    if (!container) return;

    var countries = data.countries;
    var shared = data.shared_terms;
    var matrix = data.matrix;

    // Build table of all country pairs sorted by similarity
    var pairs = [];
    for (var i = 0; i < countries.length; i++) {
      for (var j = i + 1; j < countries.length; j++) {
        var key = countries[i] + '_' + countries[j];
        var terms = shared[key] || [];
        pairs.push({
          c1: countries[i],
          c2: countries[j],
          similarity: matrix[i][j],
          shared_terms: terms
        });
      }
    }
    pairs.sort(function (a, b) { return b.similarity - a.similarity; });

    var html = '<div class="table-wrap"><table>';
    html += '<thead><tr><th>Location Pair</th><th>Topic Similarity</th><th>Shared LDA Terms</th></tr></thead><tbody>';

    pairs.forEach(function (p) {
      var simVal = (p.similarity !== null && !isNaN(p.similarity)) ? p.similarity.toFixed(3) : '—';
      var termsStr = p.shared_terms.length > 0 ? p.shared_terms.map(function (t) { return '<code>' + t + '</code>'; }).join(' ') : '<span style="color:#999;">none</span>';
      html += '<tr>';
      html += '<td><strong>' + window.countryDisplay(p.c1) + ' &harr; ' + window.countryDisplay(p.c2) + '</strong></td>';
      html += '<td>' + simVal + '</td>';
      html += '<td>' + termsStr + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

})();
