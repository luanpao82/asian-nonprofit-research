/* Asian Nonprofit Research — Country Page JS */
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
  if (!countryKey) { document.getElementById('country-content').innerHTML = '<p>No country selected. <a href="index.html">Go back</a>.</p>'; return; }

  fetch('data/site_data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var country = data.countries[countryKey];
      if (!country) { document.getElementById('country-content').innerHTML = '<p>Country not found. <a href="index.html">Go back</a>.</p>'; return; }

      // Set page title
      document.title = country.name + ' | Asian Nonprofit Research';
      document.getElementById('country-title').textContent = country.name;
      document.getElementById('country-subtitle').textContent =
        country.total_papers.toLocaleString() + ' papers · ' +
        (country.year_range[0] || '?') + '–' + (country.year_range[1] || '?');

      // Country nav
      var nav = document.getElementById('country-nav');
      if (nav) {
        var html = '';
        Object.entries(data.countries)
          .sort(function (a, b) { return b[1].total_papers - a[1].total_papers; })
          .forEach(function (entry) {
            var active = entry[0] === countryKey ? ' active' : '';
            html += '<a href="country.html?c=' + encodeURIComponent(entry[0]) + '" class="' + active + '">' + esc(entry[1].name) + '</a>';
          });
        nav.innerHTML = html;
      }

      renderYearChart(country);
      renderTopWords(country);
      renderBigrams(country);
      renderPairs(country);
    })
    .catch(function (err) { console.error(err); });

  function renderYearChart(c) {
    var canvas = document.getElementById('year-chart');
    if (!canvas || !c.years.length) return;

    var years = c.years.map(function (y) { return y[0]; });
    var counts = c.years.map(function (y) { return y[1]; });

    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Papers',
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
          title: { display: true, text: 'Publications by Year: ' + c.name, font: { size: 14, weight: '600' } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false }, ticks: { maxTicksLimit: 20 } }
        }
      }
    });
  }

  function renderTopWords(c) {
    var canvas = document.getElementById('words-chart');
    if (!canvas || !c.top_words.length) return;

    var words = c.top_words.slice(0, 25);
    var labels = words.map(function (w) { return w[0]; });
    var values = words.map(function (w) { return w[1]; });

    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Frequency',
          data: values,
          backgroundColor: COLORS.slice(0, 25).map(function (c) { return c + 'cc'; }),
          borderColor: COLORS.slice(0, 25),
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
          title: { display: true, text: 'Top 25 Words: ' + c.name, font: { size: 14, weight: '600' } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });

    // Table
    var container = document.getElementById('words-table');
    if (container) {
      var html = '<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Word</th><th>Frequency</th></tr></thead><tbody>';
      words.forEach(function (w, i) {
        html += '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(w[0]) + '</strong></td><td>' + w[1] + '</td></tr>';
      });
      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
  }

  function renderBigrams(c) {
    var canvas = document.getElementById('bigrams-chart');
    if (!canvas || !c.top_bigrams.length) return;

    var bigrams = c.top_bigrams.slice(0, 20);
    var labels = bigrams.map(function (b) { return b[0]; });
    var values = bigrams.map(function (b) { return b[1]; });

    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Frequency',
          data: values,
          backgroundColor: 'rgba(0, 131, 143, 0.65)',
          borderColor: 'rgba(0, 131, 143, 1)',
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
          title: { display: true, text: 'Top 20 Bigrams: ' + c.name, font: { size: 14, weight: '600' } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });

    // Table
    var container = document.getElementById('bigrams-table');
    if (container) {
      var all = c.top_bigrams.slice(0, 30);
      var html = '<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Bigram</th><th>Frequency</th></tr></thead><tbody>';
      all.forEach(function (b, i) {
        html += '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(b[0]) + '</strong></td><td>' + b[1] + '</td></tr>';
      });
      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
  }

  function renderPairs(c) {
    var canvas = document.getElementById('pairs-chart');
    if (!canvas || !c.top_pairs.length) return;

    var pairs = c.top_pairs.slice(0, 20);
    var labels = pairs.map(function (p) { return p[0]; });
    var values = pairs.map(function (p) { return p[1]; });

    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Co-occurrences',
          data: values,
          backgroundColor: 'rgba(106, 27, 154, 0.6)',
          borderColor: 'rgba(106, 27, 154, 1)',
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
          title: { display: true, text: 'Top 20 Co-occurrence Pairs: ' + c.name, font: { size: 14, weight: '600' } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });

    var container = document.getElementById('pairs-table');
    if (container) {
      var all = c.top_pairs.slice(0, 30);
      var html = '<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Pair</th><th>Co-occurrences</th></tr></thead><tbody>';
      all.forEach(function (p, i) {
        html += '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(p[0]) + '</strong></td><td>' + p[1] + '</td></tr>';
      });
      html += '</tbody></table></div>';
      container.innerHTML = html;
    }
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
