/* Asian Nonprofit Research — Topic Model Explorer */
(function () {
  'use strict';

  var COLORS = [
    '#283593', '#1565c0', '#00838f', '#2e7d32', '#e65100',
    '#6a1b9a', '#c62828', '#4e342e', '#00695c', '#ef6c00',
    '#ad1457', '#558b2f', '#0277bd', '#bf360c', '#4527a0',
    '#d84315', '#1b5e20', '#01579b', '#e53935', '#00796b',
    '#827717', '#4a148c', '#b71c1c', '#006064', '#33691e'
  ];

  var params = new URLSearchParams(window.location.search);
  var countryKey = params.get('c');
  if (!countryKey) {
    document.getElementById('topics-content').innerHTML = '<p>No location selected. <a href="index.html">Go back</a>.</p>';
    return;
  }

  // Update back link
  document.getElementById('back-link').href = 'country.html?c=' + encodeURIComponent(countryKey);

  // Load both site_data (for country name) and lda_results
  Promise.all([
    fetch('data/site_data.json').then(function (r) { return r.json(); }),
    fetch('data/lda_results.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    var siteData = results[0];
    var ldaData = results[1];

    var country = siteData.countries[countryKey];
    var ldaResult = ldaData[countryKey];

    if (!country) {
      document.getElementById('topics-content').innerHTML = '<p>Location not found. <a href="index.html">Go back</a>.</p>';
      return;
    }

    // Page title
    document.title = country.name + ' — Topic Explorer | Asian Nonprofit Research';
    document.getElementById('page-title').textContent = country.name + ': Topic Model Explorer';
    document.getElementById('page-subtitle').textContent =
      country.total_papers.toLocaleString() + ' papers · ' +
      (country.year_range[0] || '?') + '–' + (country.year_range[1] || '?');

    // Country nav
    var nav = document.getElementById('country-nav');
    var html = '';
    Object.entries(siteData.countries)
      .sort(function (a, b) { return b[1].total_papers - a[1].total_papers; })
      .forEach(function (entry) {
        var active = entry[0] === countryKey ? ' active' : '';
        html += '<a href="topics.html?c=' + encodeURIComponent(entry[0]) + '" class="' + active + '">' + esc(entry[1].name) + '</a>';
      });
    nav.innerHTML = html;

    if (!ldaResult || !ldaResult.all_k_results) {
      document.getElementById('k-tabs').innerHTML = '<p style="color:#999;">Multi-k topic data not available. Please re-run the pipeline to generate it.</p>';
      return;
    }

    var selectedK = ldaResult.selected_k;
    var perplexityScores = ldaResult.perplexity_scores || {};
    var allK = ldaResult.all_k_results;
    var kValues = Object.keys(allK).map(Number).sort(function (a, b) { return a - b; });

    // Perplexity summary row
    renderPerplexitySummary(perplexityScores, selectedK);

    // Build tabs + panels
    renderKTabs(kValues, allK, selectedK, country.name);

  }).catch(function (err) { console.error(err); });


  function renderPerplexitySummary(scores, selectedK) {
    var container = document.getElementById('perplexity-summary');
    if (!container) return;
    var ks = Object.keys(scores).map(Number).sort(function (a, b) { return a - b; });
    if (!ks.length) { container.style.display = 'none'; return; }

    var html = '';
    ks.forEach(function (k) {
      var isSelected = k === selectedK;
      html += '<div class="perp-item' + (isSelected ? ' selected' : '') + '">';
      html += '<div class="perp-label">k=' + k + (isSelected ? ' ★' : '') + '</div>';
      html += '<div class="perp-value">' + scores[String(k)] + '</div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }


  function renderKTabs(kValues, allK, selectedK, countryName) {
    var tabsEl = document.getElementById('k-tabs');
    var panelsEl = document.getElementById('k-panels');

    // Build tabs
    var tabHtml = '';
    kValues.forEach(function (k, i) {
      var isSelected = k === selectedK;
      var cls = 'k-tab' + (isSelected ? ' selected-k' : '') + (i === 0 ? ' active' : '');
      tabHtml += '<button class="' + cls + '" data-k="' + k + '">k=' + k +
        (isSelected ? '<span class="k-badge">best</span>' : '') + '</button>';
    });
    tabsEl.innerHTML = tabHtml;

    // Build panels (all rendered upfront, toggled via display)
    var panelHtml = '';
    kValues.forEach(function (k, i) {
      var active = i === 0 ? ' active' : '';
      panelHtml += '<div class="k-panel' + active + '" id="panel-k' + k + '">';
      panelHtml += '<p style="color:#555;margin-bottom:1rem;">Showing <strong>' + k + ' topics</strong> for ' + esc(countryName) + '.</p>';

      var topics = allK[String(k)];
      topics.forEach(function (topic) {
        panelHtml += '<h3>Topic ' + topic.topic_id + '</h3>';
        panelHtml += '<div class="chart-container"><div style="height:280px;"><canvas id="tc-k' + k + '-t' + topic.topic_id + '"></canvas></div></div>';
        panelHtml += '<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Term</th><th>&beta;</th></tr></thead><tbody>';
        topic.terms.forEach(function (t, i) {
          panelHtml += '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(t[0]) + '</strong></td><td>' + t[1].toFixed(4) + '</td></tr>';
        });
        panelHtml += '</tbody></table></div>';
      });
      panelHtml += '</div>';
    });
    panelsEl.innerHTML = panelHtml;

    // Render charts for first visible tab
    renderChartsForK(kValues[0], allK);

    // Tab click handler
    tabsEl.querySelectorAll('.k-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = parseInt(this.dataset.k);
        // Switch active tab
        tabsEl.querySelectorAll('.k-tab').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        // Switch active panel
        panelsEl.querySelectorAll('.k-panel').forEach(function (p) { p.classList.remove('active'); });
        document.getElementById('panel-k' + k).classList.add('active');
        // Render charts (only once per k)
        renderChartsForK(k, allK);
      });
    });
  }


  var renderedK = {};

  function renderChartsForK(k, allK) {
    if (renderedK[k]) return;
    renderedK[k] = true;

    var topics = allK[String(k)];
    topics.forEach(function (topic) {
      var canvasId = 'tc-k' + k + '-t' + topic.topic_id;
      var canvas = document.getElementById(canvasId);
      if (!canvas) return;
      var terms = topic.terms.slice(0, 10);
      var color = COLORS[(topic.topic_id - 1) % COLORS.length];
      new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: terms.map(function (t) { return t[0]; }),
          datasets: [{
            label: 'Beta',
            data: terms.map(function (t) { return t[1]; }),
            backgroundColor: color + 'cc',
            borderColor: color,
            borderWidth: 1,
            borderRadius: 3,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Topic ' + topic.topic_id + ': Top 10 Terms', font: { size: 13, weight: '600' } }
          },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' }, title: { display: true, text: 'Beta (probability)' } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      });
    });
  }


  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
