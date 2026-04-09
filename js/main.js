/* Asian Nonprofit Research — Main JS */
(function () {
  'use strict';

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // Active nav link
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // ---- Index page ----
  var countryGrid = document.getElementById('country-grid');
  if (!countryGrid) return;

  var DATA = null;

  fetch('data/site_data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      DATA = data;
      renderOverview();
      renderCountryCards();
      renderOverviewChart();
    })
    .catch(function (err) { console.error('Data load failed:', err); });

  function renderOverview() {
    var countries = Object.values(DATA.countries);
    var totalEl = document.getElementById('stat-total');
    var countriesEl = document.getElementById('stat-countries');
    var yearEl = document.getElementById('stat-years');
    var peakEl = document.getElementById('stat-peak');

    if (totalEl) totalEl.textContent = DATA.total_papers.toLocaleString();
    if (countriesEl) countriesEl.textContent = countries.length;

    var allYears = [];
    countries.forEach(function (c) {
      if (c.year_range[0]) allYears.push(c.year_range[0]);
      if (c.year_range[1]) allYears.push(c.year_range[1]);
    });
    var minY = Math.min.apply(null, allYears);
    var maxY = Math.max.apply(null, allYears);
    if (yearEl) yearEl.textContent = minY + '–' + maxY;

    // Find peak country
    var peak = countries.reduce(function (a, b) { return a.total_papers > b.total_papers ? a : b; });
    if (peakEl) peakEl.textContent = peak.name + ' (' + peak.total_papers.toLocaleString() + ')';
  }

  function renderCountryCards() {
    var countries = Object.entries(DATA.countries)
      .sort(function (a, b) { return b[1].total_papers - a[1].total_papers; });

    var html = '';
    countries.forEach(function (entry) {
      var key = entry[0], c = entry[1];
      var yr = c.year_range[0] && c.year_range[1] ? c.year_range[0] + '–' + c.year_range[1] : 'N/A';
      html += '<a class="country-card" href="country.html?c=' + encodeURIComponent(key) + '">';
      html += '<h3>' + esc(c.name) + '</h3>';
      html += '<div class="count">' + c.total_papers.toLocaleString() + '</div>';
      html += '<div class="meta">papers &middot; ' + yr + '</div>';
      html += '</a>';
    });
    countryGrid.innerHTML = html;
  }

  function renderOverviewChart() {
    var canvas = document.getElementById('overview-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Aggregate all countries by year
    var yearTotals = {};
    Object.values(DATA.countries).forEach(function (c) {
      c.years.forEach(function (yc) {
        yearTotals[yc[0]] = (yearTotals[yc[0]] || 0) + yc[1];
      });
    });

    var years = Object.keys(yearTotals).map(Number).sort(function (a, b) { return a - b; });
    // Filter to reasonable range
    years = years.filter(function (y) { return y >= 1985; });
    var counts = years.map(function (y) { return yearTotals[y] || 0; });

    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Publications',
          data: counts,
          backgroundColor: 'rgba(40, 53, 147, 0.7)',
          borderColor: 'rgba(40, 53, 147, 1)',
          borderWidth: 1,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Total Publications Across All Locations by Year', font: { size: 14, weight: '600' } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false }, ticks: { maxTicksLimit: 20 } }
        }
      }
    });
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
