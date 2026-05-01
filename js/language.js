/* Asian Nonprofit Research — English vs Local Language */
(function () {
  'use strict';

  var COLORS = ['#283593','#1565c0','#00838f','#2e7d32','#e65100','#6a1b9a','#c62828','#4e342e'];

  fetch('data/lang_comparison.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      renderSummary(data);
      renderDetails(data);
    })
    .catch(function (err) { console.error(err); });

  function renderSummary(data) {
    // Sort by LDA cosine descending
    var countries = Object.keys(data).filter(function (c) { return !data[c].skip && data[c].lda_cosine; });
    countries.sort(function (a, b) { return (data[b].lda_cosine || 0) - (data[a].lda_cosine || 0); });

    // Chart
    var canvas = document.getElementById('summary-chart');
    if (canvas) {
      new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: countries,
          datasets: [
            {
              label: 'LDA Cosine Similarity',
              data: countries.map(function (c) { return data[c].lda_cosine; }),
              backgroundColor: 'rgba(40, 53, 147, 0.75)',
              borderColor: '#283593',
              borderWidth: 1, borderRadius: 3,
            },
            {
              label: 'Jaccard Top-20 Words',
              data: countries.map(function (c) { return data[c].jaccard; }),
              backgroundColor: 'rgba(0, 131, 143, 0.6)',
              borderColor: '#00838f',
              borderWidth: 1, borderRadius: 3,
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'English vs Local Language: Thematic Similarity by Location', font: { size: 14, weight: '600' } },
            legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 15 } }
          },
          scales: {
            y: { beginAtZero: true, max: 1, grid: { color: 'rgba(0,0,0,0.06)' },
                 ticks: { callback: function (v) { return v.toFixed(1); } } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Table
    var container = document.getElementById('summary-table');
    if (!container) return;
    var html = '<div class="table-wrap"><table><thead><tr>' +
      '<th>Location</th><th>English (WoS)</th><th>Local Language</th>' +
      '<th>Jaccard</th><th>LDA Cosine</th><th>Interpretation</th></tr></thead><tbody>';

    countries.forEach(function (c) {
      var d = data[c];
      var interp = '';
      if (d.lda_cosine >= 0.55) interp = 'High similarity';
      else if (d.lda_cosine >= 0.35) interp = 'Moderate similarity';
      else interp = 'Low similarity';

      html += '<tr><td><strong>' + window.countryDisplay(c) + '</strong></td>';
      html += '<td>' + d.nvsq_n + ' articles</td>';
      html += '<td>' + d.local_n.toLocaleString() + ' articles</td>';
      html += '<td>' + d.jaccard.toFixed(3) + '</td>';
      html += '<td><strong>' + d.lda_cosine.toFixed(3) + '</strong></td>';
      html += '<td>' + interp + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function renderDetails(data) {
    var container = document.getElementById('country-details');
    if (!container) return;

    var countries = Object.keys(data).filter(function (c) { return !data[c].skip; });
    countries.sort(function (a, b) { return (data[b].lda_cosine || 0) - (data[a].lda_cosine || 0); });

    var html = '';
    countries.forEach(function (c, idx) {
      var d = data[c];
      html += '<div class="section">';
      html += '<p class="section-label">' + window.countryDisplay(c) + '</p>';
      html += '<h2 style="border-bottom:none;margin-top:0.5rem;">' + window.countryDisplay(c) + ': English (' + d.nvsq_n + ') vs Local (' + d.local_n.toLocaleString() + ')</h2>';

      // Similarity scores
      var interp = d.lda_cosine >= 0.55 ? 'high' : d.lda_cosine >= 0.35 ? 'moderate' : 'low';
      html += '<div class="callout"><p><strong>LDA Cosine Similarity: ' + d.lda_cosine.toFixed(3) + '</strong> (' + interp + ') &nbsp;|&nbsp; Jaccard Top-20: ' + d.jaccard.toFixed(3) + '</p></div>';

      // Top 15 words side by side
      html += '<h3>Top 15 Keywords Comparison</h3>';
      html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>English (WoS)</th><th>Freq</th><th>Local Language</th><th>Freq</th></tr></thead><tbody>';
      for (var i = 0; i < 15; i++) {
        var nw = d.nvsq_top15[i] || ['—', ''];
        var lw = d.local_top15[i] || ['—', ''];
        var nBold = d.shared_top20.indexOf(nw[0]) >= 0 ? ' style="color:#2e7d32;font-weight:700;"' : '';
        var lBold = d.shared_top20.indexOf(lw[0]) >= 0 ? ' style="color:#2e7d32;font-weight:700;"' : '';
        html += '<tr><td>' + (i + 1) + '</td>';
        html += '<td' + nBold + '>' + esc(nw[0]) + '</td><td>' + nw[1] + '</td>';
        html += '<td' + lBold + '>' + esc(lw[0]) + '</td><td>' + lw[1] + '</td></tr>';
      }
      html += '</tbody></table></div>';
      html += '<p style="font-size:0.82rem;color:#666;"><span style="color:#2e7d32;font-weight:700;">Green</span> = appears in both top-20 lists</p>';

      // Shared / unique
      html += '<h3>Vocabulary Overlap (Top-20)</h3>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin:1rem 0;">';
      html += '<div><strong>Shared (' + d.shared_top20.length + ')</strong><br>' + d.shared_top20.map(function (w) { return '<code>' + w + '</code>'; }).join(' ') + '</div>';
      html += '<div><strong>English only (' + d.nvsq_only.length + ')</strong><br>' + d.nvsq_only.map(function (w) { return '<code>' + w + '</code>'; }).join(' ') + '</div>';
      html += '<div><strong>Local only (' + d.local_only.length + ')</strong><br>' + d.local_only.map(function (w) { return '<code>' + w + '</code>'; }).join(' ') + '</div>';
      html += '</div>';

      html += '</div><hr>';
    });

    container.innerHTML = html;
  }

  function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
})();
