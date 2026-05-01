/* Asian Nonprofit Research — Main JS */

// Country display-name overrides. Internal keys (used for routing, JSON lookups,
// TopoJSON matching, file paths) stay in English; UI surfaces the preferred form.
window.countryDisplay = function (key) {
  var overrides = { 'Turkey': 'Türkiye' };
  return overrides[key] || key;
};

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
      renderAsiaMap();
      renderCountryCards();
      renderOverviewChart();
    })
    .catch(function (err) { console.error('Data load failed:', err); });

  function renderOverview() {
    var countries = Object.values(DATA.countries);
    var totalEl = document.getElementById('stat-total');
    var countriesEl = document.getElementById('stat-countries');
    var yearEl = document.getElementById('stat-years');

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
  }

  function renderCountryCards() {
    var countries = Object.entries(DATA.countries)
      .sort(function (a, b) { return b[1].total_papers - a[1].total_papers; });

    var html = '';
    countries.forEach(function (entry) {
      var key = entry[0], c = entry[1];
      var yr = c.year_range[0] && c.year_range[1] ? c.year_range[0] + '–' + c.year_range[1] : 'N/A';
      html += '<a class="country-card" href="country.html?c=' + encodeURIComponent(key) + '">';
      html += '<h3>' + esc(window.countryDisplay(c.name)) + '</h3>';
      html += '<div class="count">' + c.total_papers.toLocaleString() + '</div>';
      html += '<div class="meta">papers &middot; ' + yr + '</div>';
      html += sparklineSVG(c.years);
      html += '</a>';
    });
    countryGrid.innerHTML = html;
  }

  // Asia choropleth — real country borders from world-atlas TopoJSON;
  // 8 covered locations filled with primary color, top country in warm accent.
  function renderAsiaMap() {
    var host = document.getElementById('asia-map');
    if (!host) return;
    if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
      host.innerHTML = '<div class="map-fallback">Map libraries failed to load.</div>';
      return;
    }

    // Map our dataset keys → TopoJSON country `properties.name` values.
    var TOPO_NAME = {
      'Turkey': 'Turkey',
      'Bangladesh': 'Bangladesh',
      'Nepal': 'Nepal',
      'Vietnam': 'Vietnam',
      'China': 'China',
      'Taiwan': 'Taiwan',
      'Korea': 'South Korea',
      'Japan': 'Japan'
    };
    var coveredByTopo = {};
    Object.entries(DATA.countries).forEach(function (e) {
      var topo = TOPO_NAME[e[0]];
      if (topo) coveredByTopo[topo] = { key: e[0], data: e[1] };
    });

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function (world) {
        var countries = topojson.feature(world, world.objects.countries);
        var W = 1000, H = 540;
        // Mercator centered over Asia, zoomed out to show full continental context
        // (Europe edge, Russia, SE Asia islands, North Africa). Highlighted
        // countries appear smaller against the broader map.
        var projection = d3.geoMercator()
          .center([90, 25])
          .scale(380)
          .translate([W / 2, H / 2]);
        var path = d3.geoPath(projection);

        // Manual centroid overrides for countries whose geometric centroid is
        // off-mainland (e.g. island nations or oddly-shaped polygons).
        var LABEL_OVERRIDE = {
          'Japan':       [137.5, 36.5],
          'Taiwan':      [121.0, 23.7],
          'Vietnam':     [106.5, 16.5]
        };

        var svg = '<svg class="asia" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Asia map highlighting covered countries">';
        var labelData = [];
        countries.features.forEach(function (c) {
          var d = path(c);
          if (!d) return;
          var name = c.properties.name;
          var info = coveredByTopo[name];
          if (info) {
            svg += '<path class="ctry covered" d="' + d + '"><title>' + esc(window.countryDisplay(info.data.name)) + ' — ' + info.data.total_papers.toLocaleString() + ' papers</title></path>';
            var pt;
            if (LABEL_OVERRIDE[name]) {
              pt = projection(LABEL_OVERRIDE[name]);
            } else {
              pt = path.centroid(c);
            }
            if (pt && isFinite(pt[0]) && isFinite(pt[1])) {
              labelData.push({ name: window.countryDisplay(info.data.name), papers: info.data.total_papers, x: pt[0], y: pt[1] });
            }
          } else {
            svg += '<path class="ctry base" d="' + d + '"/>';
          }
        });
        // Labels on top of fills so they're never overdrawn
        labelData.forEach(function (l) {
          svg += '<text class="ctry-label" x="' + l.x.toFixed(1) + '" y="' + (l.y - 2).toFixed(1) + '" text-anchor="middle">' + esc(l.name) + '</text>';
          svg += '<text class="ctry-count" x="' + l.x.toFixed(1) + '" y="' + (l.y + 12).toFixed(1) + '" text-anchor="middle">' + l.papers.toLocaleString() + '</text>';
        });
        svg += '</svg>';
        host.innerHTML = svg;
      })
      .catch(function (err) {
        console.error('Map load failed:', err);
        host.innerHTML = '<div class="map-fallback">Map data unavailable.</div>';
      });
  }

  // Inline SVG sparkline of yearly publication counts. Uses currentColor so CSS controls hue.
  function sparklineSVG(years) {
    if (!years || years.length < 2) return '';
    var W = 200, H = 30, pad = 1;
    var minY = years[0][0], maxY = years[years.length - 1][0];
    var span = Math.max(1, maxY - minY);
    var maxV = 0;
    for (var i = 0; i < years.length; i++) if (years[i][1] > maxV) maxV = years[i][1];
    if (maxV === 0) return '';
    var pts = [];
    for (var j = 0; j < years.length; j++) {
      var x = ((years[j][0] - minY) / span) * W;
      var v = years[j][1] / maxV;
      var y = (H - pad) - v * (H - pad * 2);
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    var line = pts.join(' ');
    var area = '0,' + (H - pad).toFixed(1) + ' ' + line + ' ' + W + ',' + (H - pad).toFixed(1);
    return '<svg class="card-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon class="spark-area" points="' + area + '"/>' +
      '<polyline fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" points="' + line + '"/>' +
      '</svg>';
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
