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
      renderNetwork('bigram-network', country.bigram_network, 'Bigram Network: ' + country.name);
      renderNetwork('pair-network', country.pair_network, 'Co-occurrence Network: ' + country.name);
      renderWordCloud(country);
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

  // ---- D3 Force-directed Network ----
  function renderNetwork(containerId, edges, title) {
    var container = document.getElementById(containerId);
    if (!container || !edges || !edges.length) return;

    // Take top edges (adaptive: quantile cut at ~top 15%)
    edges = edges.slice();
    edges.sort(function (a, b) { return b.weight - a.weight; });
    var maxEdges = Math.min(80, edges.length);
    var cutoff = edges.length > maxEdges ? edges[maxEdges - 1].weight : edges[edges.length - 1].weight;
    edges = edges.filter(function (e) { return e.weight >= cutoff; }).slice(0, maxEdges);

    // Build node set
    var nodeMap = {};
    edges.forEach(function (e) {
      nodeMap[e.source] = nodeMap[e.source] || { id: e.source, degree: 0 };
      nodeMap[e.target] = nodeMap[e.target] || { id: e.target, degree: 0 };
      nodeMap[e.source].degree++;
      nodeMap[e.target].degree++;
    });
    var nodes = Object.values(nodeMap);

    // Louvain-like community via connected components with greedy grouping
    var adj = {};
    nodes.forEach(function (n) { adj[n.id] = []; });
    edges.forEach(function (e) {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    });
    var visited = {};
    var groupId = 0;
    nodes.forEach(function (n) {
      if (visited[n.id]) return;
      var stack = [n.id];
      while (stack.length) {
        var cur = stack.pop();
        if (visited[cur]) continue;
        visited[cur] = true;
        nodeMap[cur].group = groupId;
        adj[cur].forEach(function (nb) { if (!visited[nb]) stack.push(nb); });
      }
      groupId++;
    });

    var width = container.clientWidth;
    var height = 550;

    // Clear
    container.innerHTML = '';

    var svg = d3.select('#' + containerId).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    var maxDeg = d3.max(nodes, function (n) { return n.degree; });
    var maxW = d3.max(edges, function (e) { return e.weight; });
    var sizeScale = d3.scaleSqrt().domain([1, maxDeg || 1]).range([4, 18]);
    var widthScale = d3.scaleLinear().domain([1, maxW || 1]).range([0.5, 4]);
    var colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    var simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(function (d) { return d.id; }).distance(60))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(function (d) { return sizeScale(d.degree) + 2; }));

    var link = svg.append('g')
      .selectAll('line')
      .data(edges).join('line')
      .attr('stroke', '#999').attr('stroke-opacity', 0.3)
      .attr('stroke-width', function (d) { return widthScale(d.weight); });

    var node = svg.append('g')
      .selectAll('circle')
      .data(nodes).join('circle')
      .attr('r', function (d) { return sizeScale(d.degree); })
      .attr('fill', function (d) { return colorScale(d.group); })
      .attr('stroke', '#fff').attr('stroke-width', 1)
      .attr('opacity', 0.85)
      .call(d3.drag()
        .on('start', function (event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', function (event, d) { d.fx = event.x; d.fy = event.y; })
        .on('end', function (event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Labels for top nodes
    var labelThreshold = Math.max(3, Math.floor(nodes.length * 0.3));
    var topNodes = nodes.slice().sort(function (a, b) { return b.degree - a.degree; }).slice(0, labelThreshold);
    var topIds = new Set(topNodes.map(function (n) { return n.id; }));

    var label = svg.append('g')
      .selectAll('text')
      .data(nodes.filter(function (n) { return topIds.has(n.id); }))
      .join('text')
      .text(function (d) { return d.id; })
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '600')
      .attr('fill', '#222')
      .attr('text-anchor', 'middle')
      .attr('dy', function (d) { return -sizeScale(d.degree) - 4; })
      .style('pointer-events', 'none');

    // Tooltip on hover
    node.append('title').text(function (d) { return d.id + ' (degree: ' + d.degree + ')'; });

    simulation.on('tick', function () {
      link
        .attr('x1', function (d) { return d.source.x; }).attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; }).attr('y2', function (d) { return d.target.y; });
      node
        .attr('cx', function (d) { return d.x = Math.max(15, Math.min(width - 15, d.x)); })
        .attr('cy', function (d) { return d.y = Math.max(15, Math.min(height - 15, d.y)); });
      label
        .attr('x', function (d) { return d.x; })
        .attr('y', function (d) { return d.y; });
    });
  }

  // ---- Canvas Word Cloud ----
  function renderWordCloud(country) {
    var canvas = document.getElementById('wordcloud-canvas');
    if (!canvas || !country.wordcloud_words || !country.wordcloud_words.length) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    var words = country.wordcloud_words.slice(0, 80);
    var maxFreq = words[0][1];
    var minFreq = words[words.length - 1][1];

    // Spiral placement
    var placed = [];
    var cloudColors = ['#283593', '#1565c0', '#00838f', '#2e7d32', '#e65100',
                       '#6a1b9a', '#c62828', '#4e342e', '#00695c', '#ef6c00',
                       '#ad1457', '#558b2f', '#0277bd', '#bf360c', '#4527a0'];

    function fontSize(freq) {
      var minSize = 10, maxSize = 56;
      if (maxFreq === minFreq) return (minSize + maxSize) / 2;
      return minSize + (freq - minFreq) / (maxFreq - minFreq) * (maxSize - minSize);
    }

    function intersects(r, list) {
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y) return true;
      }
      return false;
    }

    words.forEach(function (entry, idx) {
      var word = entry[0], freq = entry[1];
      var size = fontSize(freq);
      ctx.font = '600 ' + size + 'px Inter, sans-serif';
      var metrics = ctx.measureText(word);
      var tw = metrics.width + 4;
      var th = size * 1.2;

      // Spiral search for placement
      var cx = W / 2, cy = H / 2;
      var angle = 0, radius = 0;
      var found = false;

      for (var step = 0; step < 1500; step++) {
        var x = cx + radius * Math.cos(angle) - tw / 2;
        var y = cy + radius * Math.sin(angle) - th / 2;

        if (x >= 0 && y >= 0 && x + tw <= W && y + th <= H) {
          var rect = { x: x, y: y, w: tw, h: th };
          if (!intersects(rect, placed)) {
            ctx.fillStyle = cloudColors[idx % cloudColors.length];
            ctx.fillText(word, x + 2, y + size);
            placed.push(rect);
            found = true;
            break;
          }
        }
        angle += 0.3;
        radius += 0.35;
      }
    });
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
