/* CrystalFlow Miami — Command Center App Logic
   Wired to live API at crystalflow-api.onrender.com */

(function () {
  "use strict";

  var API_BASE = "https://crystalflow-api.onrender.com";

  /* ===== VIEW NAVIGATION ===== */
  var navItems = document.querySelectorAll(".nav-item[data-view]");
  var views = document.querySelectorAll(".view");
  var pageTitle = document.getElementById("pageTitle");
  var headerCTA = document.getElementById("headerCTA");

  var viewTitles = {
    dashboard: "Analytics Dashboard",
    quote: "Instant Quote Calculator",
    portal: "Accounts",
    dispatch: "Technician Dispatch",
    warranty: "Warranty Claims",
    automations: "Automations",
    email: "Email Campaigns",
    sms: "SMS Drips",
    settings: "Settings",
  };

  var ctaLabels = {
    dashboard: "+ New Lead",
    quote: "Send Quote",
    portal: "+ Add Customer",
    dispatch: "New Job",
    warranty: "+ New Claim",
    automations: "+ New Automation",
    email: "Compose Email",
    sms: "Compose Email",
    settings: "",
  };

  var dispatchMapInitialized = false;
  var dashboardLoaded = false;
  var revenueChartInstance = null;
  var sourcesChartInstance = null;
  var funnelChartInstance = null;
  var packageChartInstance = null;

  function switchView(viewId) {
    navItems.forEach(function (item) { item.classList.remove("active"); });
    views.forEach(function (v) { v.classList.remove("active"); });

    var target = document.querySelector('.nav-item[data-view="' + viewId + '"]');
    var view = document.getElementById("view-" + viewId);

    if (target) target.classList.add("active");
    if (view) view.classList.add("active");
    if (pageTitle) pageTitle.textContent = viewTitles[viewId] || viewId;
    if (headerCTA) headerCTA.textContent = ctaLabels[viewId] || "+ New";

    if (viewId === "dashboard" && !dashboardLoaded) {
      dashboardLoaded = true;
      loadDashboard();
    }
    if (viewId === "dispatch" && !dispatchMapInitialized) {
      dispatchMapInitialized = true;
      setTimeout(initDispatchMap, 100);
      loadDispatchData();
    }
    if (viewId === "portal") {
      loadPortalCustomers();
    }
    if (viewId === "email") {
      loadEmailSequences();
    }
    if (viewId === "sms") {
      loadSmsSequences();
    }
    if (viewId === "warranty") {
      loadWarrantyClaims();
    }
    if (viewId === "settings") {
      checkSystemHealth();
    }
  }

  navItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  /* hash-based routing */
  function routeFromHash() {
    var hash = window.location.hash.replace("#", "");
    if (hash && viewTitles[hash]) {
      switchView(hash);
    }
  }
  window.addEventListener("hashchange", routeFromHash);
  routeFromHash();

  /* ===== API HELPER ===== */
  function api(path) {
    return fetch(API_BASE + path)
      .then(function (r) {
        if (!r.ok) throw new Error("API error: " + r.status);
        return r.json();
      });
  }

  function apiPost(path, body) {
    return fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error("API error: " + r.status);
      return r.json();
    });
  }

  /* ===== DASHBOARD — LIVE DATA ===== */
  function loadDashboard() {
    api("/api/admin/dashboard-full")
      .then(function (data) {
        updateKPIs(data);
        updateCharts(data);
        updateActivityFeed(data.recent_activity);
      })
      .catch(function (err) {
        console.error("Dashboard load failed:", err);
        /* Keep whatever demo data is showing */
      });
  }

  function updateKPIs(data) {
    var kpis = data.kpis;
    var els = document.querySelectorAll(".kpi-value[data-kpi-key]");
    els.forEach(function (el) {
      var key = el.dataset.kpiKey;
      if (!key) return;
      var value;
      if (key === "revenue") value = kpis.revenue_mtd;
      else if (key === "leads") value = kpis.active_leads;
      else if (key === "conversion") value = kpis.conversion_rate;
      else if (key === "installs") value = kpis.installs_completed;
      if (value !== undefined) {
        el.dataset.count = Math.round(value);
        animateValue(el, value, key);
      }
    });

    /* Update subtitle text for each KPI */
    var revenueSub = document.querySelector('[data-kpi-sub="revenue"]');
    if (revenueSub && kpis.revenue_change !== undefined) {
      var revDir = kpis.revenue_change >= 0 ? "up" : "down";
      revenueSub.className = "kpi-delta " + revDir;
      revenueSub.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="' + (revDir === "up" ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6") + '"/></svg> ' + Math.abs(Math.round(kpis.revenue_change)) + '% vs last month';
    }

    var leadsSub = document.querySelector('[data-kpi-sub="leads"]');
    if (leadsSub && kpis.new_leads_this_week !== undefined) {
      leadsSub.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 15l-6-6-6 6"/></svg> ' + kpis.new_leads_this_week + ' new this week';
    }

    var convSub = document.querySelector('[data-kpi-sub="conversion"]');
    if (convSub && kpis.conversion_change !== undefined) {
      var convDir = kpis.conversion_change >= 0 ? "up" : "down";
      convSub.className = "kpi-delta " + convDir;
      convSub.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="' + (convDir === "up" ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6") + '"/></svg> ' + Math.abs(Math.round(kpis.conversion_change)) + '% vs last month';
    }

    var installSub = document.querySelector('[data-kpi-sub="installs"]');
    if (installSub) {
      var instWeek = kpis.installs_this_week !== undefined ? kpis.installs_this_week : 0;
      installSub.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 15l-6-6-6 6"/></svg> ' + instWeek + ' this week';
    }
  }

  function animateValue(el, target, key) {
    var prefix = key === "revenue" ? "$" : "";
    var suffix = key === "conversion" ? "%" : "";
    var duration = 1200;
    var start = performance.now();
    var startVal = 0;

    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(target * eased);
      el.textContent = prefix + current.toLocaleString("en-US") + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateCharts(data) {
    updateRevenueChart(data.monthly_revenue);
    updateSourcesChart(data.lead_source_breakdown);
    updateFunnelChart(data.pipeline_funnel);
    updatePackageChart(data.leads);
  }

  var chartColors = {
    cyan: "#00C9DB",
    pink: "#E8439A",
    violet: "#5B6BF5",
    success: "#34D399",
    warning: "#FBBF24",
    cyanAlpha: "rgba(0, 201, 219, 0.15)",
  };

  Chart.defaults.color = "#9B98B5";
  Chart.defaults.borderColor = "rgba(45, 43, 74, 0.5)";
  Chart.defaults.font.family = "'Space Grotesk', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 16;

  function updateRevenueChart(monthlyData) {
    var ctx = document.getElementById("revenueChart");
    if (!ctx) return;

    var labels = monthlyData.map(function (m) { return m.month; });
    var values = monthlyData.map(function (m) { return m.revenue; });
    var target = values.length > 0 ? Math.max.apply(null, values) * 0.8 : 25000;

    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Revenue",
            data: values,
            borderColor: chartColors.cyan,
            backgroundColor: chartColors.cyanAlpha,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: chartColors.cyan,
          },
          {
            label: "Target",
            data: labels.map(function () { return target; }),
            borderColor: "rgba(155, 152, 181, 0.3)",
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", align: "end" },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.dataset.label + ": $" + ctx.parsed.y.toLocaleString(); },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function (v) { return "$" + (v / 1000).toFixed(0) + "k"; } },
            grid: { color: "rgba(45, 43, 74, 0.3)" },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function updateSourcesChart(sourceBreakdown) {
    var ctx = document.getElementById("sourcesChart");
    if (!ctx) return;

    var sourceLabels = {
      google: "Google Ads",
      instagram: "Instagram",
      referral: "Referral",
      direct: "Intercom",
      facebook: "Facebook",
      website: "Website",
    };
    var sourceColors = [chartColors.cyan, chartColors.pink, chartColors.violet, chartColors.success, chartColors.warning, "#9B98B5"];

    var labels = [];
    var values = [];
    var colors = [];
    var i = 0;
    for (var key in sourceBreakdown) {
      labels.push(sourceLabels[key] || key);
      values.push(sourceBreakdown[key]);
      colors.push(sourceColors[i % sourceColors.length]);
      i++;
    }

    /* If no data, show placeholder */
    if (labels.length === 0) {
      labels = ["No Data"];
      values = [1];
      colors = ["#2A2745"];
    }

    if (sourcesChartInstance) sourcesChartInstance.destroy();
    sourcesChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ctx.label + ": " + ctx.parsed + " (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }

  function updateFunnelChart(funnelData) {
    var ctx = document.getElementById("funnelChart");
    if (!ctx) return;

    var labels = funnelData.map(function (f) { return f.label; });
    var values = funnelData.map(function (f) { return f.count; });
    var funnelColors = [chartColors.cyan, chartColors.violet, chartColors.pink, "#9B98B5", chartColors.warning, "#FF6B35", chartColors.success];

    if (funnelChartInstance) funnelChartInstance.destroy();
    funnelChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: funnelColors.slice(0, labels.length),
          borderRadius: 6,
          barThickness: 28,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "rgba(45, 43, 74, 0.3)" } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  function updatePackageChart(leadStats) {
    var ctx = document.getElementById("packageChart");
    if (!ctx) return;

    /* Count by package interest from won leads or all leads */
    var byPackage = { kitchen_guard: 0, home_shield: 0, pure_life: 0 };
    if (leadStats && leadStats.by_status && leadStats.by_status.won !== undefined) {
      /* We use the total breakdown — API gives us what we need */
    }

    /* For now, show the package interest distribution */
    var labels = ["Kitchen Guard", "Home Shield", "Pure Life"];
    var values = [
      byPackage.kitchen_guard || 0,
      byPackage.home_shield || 0,
      byPackage.pure_life || 0,
    ];

    if (packageChartInstance) packageChartInstance.destroy();
    packageChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Units",
          data: values,
          backgroundColor: [chartColors.cyan, chartColors.violet, chartColors.pink],
          borderRadius: 6,
          barThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(45, 43, 74, 0.3)" },
            ticks: { stepSize: 1 },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function updateActivityFeed(activities) {
    var feed = document.getElementById("activityFeed");
    if (!feed || !activities || activities.length === 0) return;

    feed.innerHTML = "";
    activities.forEach(function (act) {
      var item = document.createElement("div");
      item.className = "activity-item";
      var time = new Date(act.created_at);
      var timeStr = time.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
                    time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      item.innerHTML =
        '<div class="activity-icon">' + getActivityIcon(act.event_type) + '</div>' +
        '<div class="activity-info">' +
          '<span class="activity-text">' + (act.description || act.event_type) + '</span>' +
          '<span class="activity-time">' + timeStr + '</span>' +
        '</div>';
      feed.appendChild(item);
    });
  }

  function getActivityIcon(type) {
    var icons = {
      status_change: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/></svg>',
      lead_created: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      email_sent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>',
      sms_sent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
    };
    return icons[type] || icons.status_change;
  }

  /* ===== ACCOUNTS MANAGEMENT ===== */
  var accountsPage = 0;
  var accountsLimit = 20;
  var accountsTotal = 0;
  var allCustomers = [];
  var accountsLoaded = false;

  function loadPortalCustomers() {
    var offset = accountsPage * accountsLimit;
    api("/api/admin/customers?limit=" + accountsLimit + "&offset=" + offset)
      .then(function (data) {
        accountsTotal = data.total || 0;
        allCustomers = data.customers || [];
        var badge = document.getElementById("accountsBadge");
        if (badge) badge.textContent = accountsTotal;
        renderAccountsTable(allCustomers);
        renderAccountsPagination();
        accountsLoaded = true;
      })
      .catch(function (err) {
        console.error("Failed to load customers:", err);
        var tbody = document.getElementById("accountsTableBody");
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="7"><div class="accounts-empty">' +
            '<div style="color:var(--color-error);">Failed to load accounts. Retrying...</div></div></td></tr>';
        }
        setTimeout(loadPortalCustomers, 3000);
      });
  }

  function getInitials(first, last) {
    var f = (first || "").trim();
    var l = (last || "").trim();
    return ((f[0] || "") + (l[0] || "")).toUpperCase() || "??";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "--";
    try {
      var d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) { return dateStr; }
  }

  function statusBadgeClass(status) {
    var s = (status || "pending").toLowerCase();
    if (s === "active") return "badge-completed";
    if (s === "inactive") return "badge-cancelled";
    return "badge-pending";
  }

  function renderAccountsTable(customers) {
    var tbody = document.getElementById("accountsTableBody");
    if (!tbody) return;

    // Apply search filter
    var searchVal = (document.getElementById("accountsSearchInput") || {}).value || "";
    searchVal = searchVal.toLowerCase().trim();
    var statusFilter = (document.getElementById("accountsStatusFilter") || {}).value || "all";

    var filtered = customers.filter(function (c) {
      var matchSearch = !searchVal ||
        ((c.first_name || "") + " " + (c.last_name || "")).toLowerCase().indexOf(searchVal) !== -1 ||
        (c.email || "").toLowerCase().indexOf(searchVal) !== -1 ||
        (c.phone || "").toLowerCase().indexOf(searchVal) !== -1;
      var matchStatus = statusFilter === "all" || (c.status || "pending").toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="accounts-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-faint);">' +
        '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        '<div style="color:var(--color-text-muted);margin-top:var(--space-3);">' +
        (searchVal || statusFilter !== "all" ? "No accounts match your search" : "No customer accounts yet") +
        '</div></div></td></tr>';
      return;
    }

    var html = "";
    filtered.forEach(function (c) {
      var initials = getInitials(c.first_name, c.last_name);
      var name = ((c.first_name || "") + " " + (c.last_name || "")).trim() || "Unknown";
      var status = c.status || "pending";
      html += '<tr class="accounts-row" data-customer-id="' + (c.id || "") + '">' +
        '<td><div class="accounts-customer-cell">' +
          '<div class="accounts-customer-avatar">' + initials + '</div>' +
          '<span class="accounts-customer-name">' + name + '</span>' +
        '</div></td>' +
        '<td>' + (c.email || "--") + '</td>' +
        '<td>' + (c.phone || "--") + '</td>' +
        '<td style="color:var(--color-cyan);">' + (c.package || "--") + '</td>' +
        '<td><span class="badge ' + statusBadgeClass(status) + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span></td>' +
        '<td>' + formatDate(c.created_at) + '</td>' +
        '<td><button class="view-row-btn" title="View details" data-cid="' + (c.id || "") + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
        '</button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;

    // Attach row click handlers
    var rowBtns = tbody.querySelectorAll(".view-row-btn");
    rowBtns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var cid = btn.dataset.cid;
        var cust = allCustomers.find(function (c) { return String(c.id) === String(cid); });
        if (cust) openAccountDetail(cust);
      });
    });

    // Also allow clicking the whole row
    var rows = tbody.querySelectorAll(".accounts-row");
    rows.forEach(function (row) {
      row.style.cursor = "pointer";
      row.addEventListener("click", function () {
        var cid = row.dataset.customerId;
        var cust = allCustomers.find(function (c) { return String(c.id) === String(cid); });
        if (cust) openAccountDetail(cust);
      });
    });
  }

  function renderAccountsPagination() {
    var pag = document.getElementById("accountsPagination");
    if (!pag) return;
    var totalPages = Math.max(1, Math.ceil(accountsTotal / accountsLimit));
    var currentPage = accountsPage + 1;
    pag.innerHTML = '<span>Showing ' + Math.min(accountsPage * accountsLimit + 1, accountsTotal) +
      ' - ' + Math.min((accountsPage + 1) * accountsLimit, accountsTotal) +
      ' of ' + accountsTotal + ' accounts</span>' +
      '<div class="accounts-pagination-btns">' +
        '<button id="prevPageBtn"' + (accountsPage === 0 ? ' disabled' : '') + '>Previous</button>' +
        '<button id="nextPageBtn"' + (currentPage >= totalPages ? ' disabled' : '') + '>Next</button>' +
      '</div>';

    var prevBtn = document.getElementById("prevPageBtn");
    var nextBtn = document.getElementById("nextPageBtn");
    if (prevBtn) prevBtn.addEventListener("click", function () {
      if (accountsPage > 0) { accountsPage--; loadPortalCustomers(); }
    });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if ((accountsPage + 1) * accountsLimit < accountsTotal) { accountsPage++; loadPortalCustomers(); }
    });
  }

  /* ===== ACCOUNT DETAIL PANEL ===== */
  var detailPanel = document.getElementById("accountDetailPanel");
  var detailOverlay = document.getElementById("accountDetailOverlay");
  var closeDetailBtn = document.getElementById("closeDetailBtn");

  function openAccountDetail(cust) {
    currentDetailCustomerId = cust.id;
    document.getElementById("detailAvatar").textContent = getInitials(cust.first_name, cust.last_name);
    document.getElementById("detailName").textContent = ((cust.first_name || "") + " " + (cust.last_name || "")).trim() || "Unknown";
    document.getElementById("detailEmail").textContent = cust.email || "--";
    document.getElementById("detailPhone").textContent = cust.phone || "--";
    document.getElementById("detailAddress").textContent = cust.address || "--";
    document.getElementById("detailPackage").textContent = cust.package || "None";
    document.getElementById("detailStatus").textContent = (cust.status || "pending").charAt(0).toUpperCase() + (cust.status || "pending").slice(1);
    document.getElementById("detailCreated").textContent = formatDate(cust.created_at);

    // Populate warranty section
    var warrantyEl = document.getElementById("detailWarrantyContent");
    if (cust.warranty_package) {
      warrantyEl.innerHTML =
        '<div class="warranty-card">' +
          '<div class="warranty-header">' +
            '<div class="warranty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>' +
            '<div><div class="warranty-title">' + (cust.warranty_package || "Standard") + '</div>' +
            '<div class="warranty-subtitle">' + (cust.package || "--") + '</div></div>' +
          '</div>' +
          (cust.warranty_start && cust.warranty_end ?
            '<div class="warranty-dates"><span>Start: ' + formatDate(cust.warranty_start) + '</span><span>Expires: ' + formatDate(cust.warranty_end) + '</span></div>' : '') +
        '</div>';
    } else {
      warrantyEl.innerHTML = '<div class="accounts-empty" style="padding:var(--space-6) 0;">' +
        '<div style="color:var(--color-text-faint);">No warranty info available</div></div>';
    }

    // Populate service requests
    var serviceEl = document.getElementById("detailServiceContent");
    if (cust.service_requests && cust.service_requests.length > 0) {
      var shtml = '<div style="display:flex;flex-direction:column;gap:var(--space-3);">';
      cust.service_requests.forEach(function (sr) {
        var priorityColor = sr.priority === "urgent" ? "var(--color-error)" :
                            sr.priority === "high" ? "var(--color-warning)" : "var(--color-text-muted)";
        shtml += '<div style="background:var(--color-surface-2);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-weight:500;color:var(--color-text);font-size:var(--text-sm);">' + (sr.category || sr.title || "Service Request") + '</span>' +
            '<span class="badge ' + (sr.status === "completed" ? 'badge-completed' : sr.status === "in_progress" ? 'badge-scheduled' : 'badge-pending') + '">' + (sr.status || "Pending") + '</span>' +
          '</div>' +
          '<div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1);">' + formatDate(sr.created_at) +
            ' &middot; Priority: <span style="color:' + priorityColor + ';">' + (sr.priority || "medium") + '</span></div>' +
          (sr.description ? '<div style="font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-2);">' + sr.description + '</div>' : '') +
        '</div>';
      });
      shtml += '</div>';
      serviceEl.innerHTML = shtml;
    } else {
      serviceEl.innerHTML = '<div class="accounts-empty" style="padding:var(--space-6) 0;">' +
        '<div style="color:var(--color-text-faint);">No service requests</div></div>';
    }

    // Populate invoices
    var invoicesEl = document.getElementById("detailInvoicesContent");
    if (cust.invoices && cust.invoices.length > 0) {
      var ihtml = '<table class="data-table" style="font-size:var(--text-xs);"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
      cust.invoices.forEach(function (inv) {
        var isPaid = inv.status === "paid";
        ihtml += '<tr><td>' + formatDate(inv.date || inv.created_at) + '</td>' +
          '<td>' + (inv.description || "--") + '</td>' +
          '<td>$' + (inv.amount || "0") + '</td>' +
          '<td><span class="badge ' + (isPaid ? 'badge-completed' : 'badge-pending') + '">' + (inv.status || "Pending") + '</span></td>' +
          '<td>' + (isPaid ? '<span style="color:var(--color-text-faint);">--</span>'
            : '<button class="btn" style="font-size:var(--text-xs);padding:2px 8px;background:var(--color-success);color:#fff;margin-right:4px;" onclick="window._markInvoicePaid(' + inv.id + ',this)">Mark Paid</button>' +
              '<button class="btn" style="font-size:var(--text-xs);padding:2px 8px;background:var(--color-warning);color:#000;" onclick="window._sendInvoiceReminder(' + inv.id + ',this)">Remind</button>'
          ) + '</td></tr>';
      });
      ihtml += '</tbody></table>';
      invoicesEl.innerHTML = ihtml;
    } else {
      invoicesEl.innerHTML = '<div class="accounts-empty" style="padding:var(--space-6) 0;">' +
        '<div style="color:var(--color-text-faint);">No invoices found</div></div>';
    }

    // Reset detail tabs to warranty
    var detailTabs = document.querySelectorAll("[data-detail-tab]");
    detailTabs.forEach(function (t) { t.classList.remove("active"); });
    detailTabs[0].classList.add("active");
    document.getElementById("detail-warranty").classList.add("active");
    document.getElementById("detail-service").classList.remove("active");
    document.getElementById("detail-invoices").classList.remove("active");

    // Open panel
    if (detailPanel) detailPanel.classList.add("open");
    if (detailOverlay) detailOverlay.classList.add("open");
  }

  function closeAccountDetail() {
    if (detailPanel) detailPanel.classList.remove("open");
    if (detailOverlay) detailOverlay.classList.remove("open");
  }

  if (closeDetailBtn) closeDetailBtn.addEventListener("click", closeAccountDetail);
  if (detailOverlay) detailOverlay.addEventListener("click", closeAccountDetail);

  // Detail tabs
  document.querySelectorAll("[data-detail-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("[data-detail-tab]").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("detail-warranty").classList.remove("active");
      document.getElementById("detail-service").classList.remove("active");
      document.getElementById("detail-invoices").classList.remove("active");
      document.getElementById("detail-" + tab.dataset.detailTab).classList.add("active");
    });
  });

  /* ===== ADD CUSTOMER MODAL ===== */
  var addModal = document.getElementById("addCustomerOverlay");
  var addBtn = document.getElementById("addCustomerBtn");
  var closeAddBtn = document.getElementById("closeAddCustomerBtn");
  var cancelAddBtn = document.getElementById("cancelAddCustomerBtn");
  var addForm = document.getElementById("addCustomerForm");
  var addError = document.getElementById("addCustomerError");

  function openAddModal() {
    if (addModal) addModal.classList.add("open");
    if (addError) { addError.style.display = "none"; addError.textContent = ""; }
    if (addForm) addForm.reset();
  }
  function closeAddModal() {
    if (addModal) addModal.classList.remove("open");
  }

  if (addBtn) addBtn.addEventListener("click", openAddModal);
  if (closeAddBtn) closeAddBtn.addEventListener("click", closeAddModal);
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", closeAddModal);

  /* headerCTA routing handled in consolidated handler below */

  if (addForm) {
    addForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var submitBtn = document.getElementById("submitAddCustomerBtn");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating..."; }
      if (addError) { addError.style.display = "none"; }

      var payload = {
        first_name: (document.getElementById("newCustFirstName").value || "").trim(),
        last_name: (document.getElementById("newCustLastName").value || "").trim(),
        email: (document.getElementById("newCustEmail").value || "").trim(),
        phone: (document.getElementById("newCustPhone").value || "").trim(),
        password: document.getElementById("newCustPassword").value,
        address: (document.getElementById("newCustAddress").value || "").trim(),
        package: (document.getElementById("newCustPackage").value || ""),
      };

      apiPost("/api/portal/register", payload)
        .then(function () {
          closeAddModal();
          accountsPage = 0;
          loadPortalCustomers();
        })
        .catch(function (err) {
          if (addError) {
            addError.textContent = "Failed to create account. " + (err.message || "Please try again.");
            addError.style.display = "block";
          }
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create Account"; }
        });
    });
  }

  // Search and filter listeners
  var searchInput = document.getElementById("accountsSearchInput");
  var statusFilter = document.getElementById("accountsStatusFilter");
  var searchDebounce;
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(function () { renderAccountsTable(allCustomers); }, 250);
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", function () { renderAccountsTable(allCustomers); });
  }

  /* ===== INVOICE CREATION MODAL ===== */
  var invoiceModal = document.getElementById("invoiceModal");
  var closeInvoiceModalBtn = document.getElementById("closeInvoiceModalBtn");
  var cancelInvoiceBtn = document.getElementById("cancelInvoiceBtn");
  var createInvoiceForm = document.getElementById("createInvoiceForm");
  var createInvoiceError = document.getElementById("createInvoiceError");
  var invoiceCustSelect = document.getElementById("invoiceCustSelect");
  var createInvoiceForCustBtn = document.getElementById("createInvoiceForCustomerBtn");
  var currentDetailCustomerId = null;

  function openInvoiceModal(preselectedCustId) {
    if (!invoiceModal) return;
    if (createInvoiceError) { createInvoiceError.style.display = "none"; }
    if (createInvoiceForm) createInvoiceForm.reset();

    // Populate customer dropdown
    if (invoiceCustSelect && allCustomers.length > 0) {
      invoiceCustSelect.innerHTML = '<option value="">Select a customer...</option>';
      allCustomers.forEach(function (c) {
        var name = ((c.first_name || "") + " " + (c.last_name || "")).trim() || c.email;
        invoiceCustSelect.innerHTML += '<option value="' + c.id + '">' + name + ' (' + (c.email || "") + ')</option>';
      });
      if (preselectedCustId) {
        invoiceCustSelect.value = String(preselectedCustId);
      }
    }
    invoiceModal.classList.add("open");
  }

  function closeInvoiceModal() {
    if (invoiceModal) invoiceModal.classList.remove("open");
  }

  if (closeInvoiceModalBtn) closeInvoiceModalBtn.addEventListener("click", closeInvoiceModal);
  if (cancelInvoiceBtn) cancelInvoiceBtn.addEventListener("click", closeInvoiceModal);

  if (createInvoiceForCustBtn) {
    createInvoiceForCustBtn.addEventListener("click", function () {
      openInvoiceModal(currentDetailCustomerId);
    });
  }

  if (createInvoiceForm) {
    createInvoiceForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var submitBtn = document.getElementById("submitInvoiceBtn");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating..."; }
      if (createInvoiceError) createInvoiceError.style.display = "none";

      var payload = {
        customer_id: parseInt(invoiceCustSelect.value, 10),
        description: (document.getElementById("invoiceDesc").value || "").trim(),
        amount: parseFloat(document.getElementById("invoiceAmount").value) || 0,
        due_date: document.getElementById("invoiceDueDate").value || null,
      };

      apiPost("/api/admin/invoices", payload)
        .then(function (inv) {
          closeInvoiceModal();
          alert("Invoice " + (inv.invoice_number || "") + " created for $" + payload.amount.toFixed(2) + ". Customer will see it in their portal.");
          // Reload the detail panel if open
          if (currentDetailCustomerId) {
            var cust = allCustomers.find(function (c) { return c.id === currentDetailCustomerId; });
            if (cust) {
              api("/api/admin/customers/" + currentDetailCustomerId)
                .then(function (detail) { openAccountDetail(detail); })
                .catch(function () {});
            }
          }
        })
        .catch(function (err) {
          if (createInvoiceError) {
            createInvoiceError.textContent = "Failed to create invoice. " + (err.message || "");
            createInvoiceError.style.display = "block";
          }
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create & Send"; }
        });
    });
  }

  /* ===== QUOTE CALCULATOR (unchanged — all local) ===== */
  var packagePricing = {
    kitchen: { name: "Kitchen Guard", subtitle: "Waterdrop G5P500A — 500 GPD", base: 699, max: 849 },
    home: { name: "Home Shield", subtitle: "Waterdrop G3P800 — 800 GPD", base: 1799, max: 2199 },
    pure: { name: "Pure Life", subtitle: "Waterdrop X16 — 1600 GPD", base: 2699, max: 3199 },
  };
  var homeMultipliers = { apartment: 0, townhouse: 0.03, "house-small": 0.06, "house-large": 0.12 };
  var premiumZips = ["33139", "33137", "33140", "33141", "33109", "33154"];
  var currentQuoteTotal = 699;

  function recalcQuote() {
    var selectedRadio = document.querySelector('input[name="package"]:checked');
    var selectedPkg = selectedRadio ? selectedRadio.value : "kitchen";
    var pkg = packagePricing[selectedPkg];
    var homeTypeEl = document.getElementById("homeType");
    var homeType = homeTypeEl ? homeTypeEl.value : "house-small";
    var zipEl = document.getElementById("zipCode");
    var zip = zipEl ? zipEl.value : "";
    var wantWarranty = document.getElementById("addonWarranty") ? document.getElementById("addonWarranty").checked : false;
    var wantFilter = document.getElementById("addonFilter") ? document.getElementById("addonFilter").checked : false;
    var wantRush = document.getElementById("addonRush") ? document.getElementById("addonRush").checked : false;

    var basePrice = pkg.base;
    var homeAdj = Math.round(basePrice * (homeMultipliers[homeType] || 0));
    var areaSurcharge = premiumZips.indexOf(zip) !== -1 ? 100 : 0;
    var total = basePrice + homeAdj + areaSurcharge;
    if (wantWarranty) total += 149;
    if (wantFilter) total += 99;
    if (wantRush) total += 199;
    var capped = Math.min(total, pkg.max + (wantWarranty ? 149 : 0) + (wantFilter ? 99 : 0) + (wantRush ? 199 : 0));
    currentQuoteTotal = capped;

    var nameEl = document.getElementById("quotePkgName");
    if (nameEl) { nameEl.textContent = pkg.name; nameEl.nextElementSibling.textContent = pkg.subtitle; }

    var setVal = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = "$" + val.toLocaleString(); };
    setVal("quoteBase", basePrice);
    setVal("quoteHome", homeAdj);
    setVal("quoteArea", areaSurcharge);
    setVal("quoteTotal", capped);

    var showLine = function (id, show) { var el = document.getElementById(id); if (el) el.style.display = show ? "flex" : "none"; };
    showLine("addonWarrantyLine", wantWarranty);
    showLine("addonFilterLine", wantFilter);
    showLine("addonRushLine", wantRush);
  }

  var packageCards = document.querySelectorAll(".form-radio-card");
  packageCards.forEach(function (card) {
    card.addEventListener("click", function () {
      packageCards.forEach(function (c) { c.classList.remove("selected"); });
      card.classList.add("selected");
      var radio = card.querySelector("input");
      if (radio) radio.checked = true;
      recalcQuote();
    });
  });

  ["homeType", "bathrooms", "zipCode", "addonWarranty", "addonFilter", "addonRush"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("change", recalcQuote);
    if (el && el.type === "text") el.addEventListener("input", recalcQuote);
  });
  recalcQuote();

  /* Portal tabs removed — now handled by accounts detail panel logic above */

  /* ===== JOB BLOCK INTERACTION ===== */
  document.querySelectorAll(".job-block").forEach(function (block) {
    block.addEventListener("click", function () {
      var titleEl = block.querySelector(".job-block-title");
      var detailEl = block.querySelector(".job-block-detail");
      var title = titleEl ? titleEl.textContent : "";
      var detail = detailEl ? detailEl.textContent : "";
      alert("Job: " + title + "\n" + detail);
    });
  });

  /* ===== DISPATCH MAP (LEAFLET) — pulls from API ===== */
  function loadDispatchData() {
    api("/api/admin/dispatch")
      .then(function (data) {
        var stats = data.stats || {};
        var jobs = data.jobs || [];

        /* Update stats */
        var totalEl = document.getElementById("dispatchTotalJobs");
        var urgentEl = document.getElementById("dispatchUrgent");
        var apptsEl = document.getElementById("dispatchAppts");
        if (totalEl) totalEl.textContent = stats.total_open || 0;
        if (urgentEl) urgentEl.textContent = stats.urgent || 0;
        if (apptsEl) apptsEl.textContent = stats.appointments || 0;

        /* Update calendar time slots with real jobs */
        var timeSlots = document.querySelectorAll(".time-slot");
        timeSlots.forEach(function (slot) { slot.innerHTML = ""; });

        jobs.forEach(function (job, idx) {
          if (idx >= timeSlots.length) return;
          var colorClass = job.priority === "urgent" ? "pink" : (job.type === "warranty_claim" ? "violet" : "cyan");
          var html = '<div class="job-block ' + colorClass + '">' +
            '<div class="job-block-title">' + (job.category || job.type) + ' — ' + (job.customer_name || "Unassigned") + '</div>' +
            '<div class="job-block-detail">' + (job.customer_address || "No address") +
            (job.assigned_tech ? ' — ' + job.assigned_tech : '') + '</div></div>';
          timeSlots[idx].innerHTML = html;
        });
      })
      .catch(function (err) {
        console.error("Dispatch data load failed:", err);
      });
  }

  function initDispatchMap() {
    var mapContainer = document.getElementById("dispatchMap");
    if (!mapContainer || typeof L === "undefined") return;

    var map = L.map("dispatchMap", {
      center: [25.775, -80.195],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    /* Load today's appointments from API */
    api("/api/appointments?status=scheduled&limit=20")
      .then(function (appointments) {
        /* Plot appointment markers on map */
        if (appointments && appointments.length > 0) {
          appointments.forEach(function (appt, idx) {
            /* Offset markers slightly so they don't overlap */
            var lat = 25.775 + (Math.random() - 0.5) * 0.04;
            var lng = -80.195 + (Math.random() - 0.5) * 0.04;
            var color = chartColors.cyan;

            var icon = L.divIcon({
              className: "custom-job-marker",
              html: '<div style="width:14px;height:14px;background:' + color + ';border:2px solid #fff;border-radius:3px;box-shadow:0 0 8px ' + color + ';"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });

            L.marker([lat, lng], { icon: icon })
              .addTo(map)
              .bindPopup(
                '<div class="popup-title">' + (appt.service_type || "Appointment") + '</div>' +
                '<div class="popup-detail">' + appt.date + ' at ' + appt.start_time + '</div>'
              );
          });
        }
      })
      .catch(function () {
        /* Show demo markers as fallback */
        addDemoMapMarkers(map);
      });

    /* Always show tech markers */
    var techs = [
      { name: "Marco R.", status: "Available", lat: 25.776, lng: -80.212 },
      { name: "Ana T.", status: "Available", lat: 25.790, lng: -80.140 },
      { name: "Luis G.", status: "At Base", lat: 25.770, lng: -80.200 },
    ];
    techs.forEach(function (tech) {
      var icon = L.divIcon({
        className: "custom-tech-marker",
        html: '<div style="width:12px;height:12px;background:#FBBF24;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px #FBBF24;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker([tech.lat, tech.lng], { icon: icon })
        .addTo(map)
        .bindPopup('<div class="popup-title">' + tech.name + '</div><div class="popup-detail">' + tech.status + '</div>');
    });
  }

  function addDemoMapMarkers(map) {
    var jobs = [
      { name: "Kitchen Guard", lat: 25.778, lng: -80.215, color: "#00C9DB" },
      { name: "Water Test", lat: 25.795, lng: -80.128, color: "#5B6BF5" },
      { name: "Home Shield", lat: 25.782, lng: -80.188, color: "#E8439A" },
      { name: "Filter Change", lat: 25.762, lng: -80.192, color: "#34D399" },
      { name: "Pure Life", lat: 25.752, lng: -80.248, color: "#00C9DB" },
    ];
    jobs.forEach(function (job) {
      var icon = L.divIcon({
        className: "custom-job-marker",
        html: '<div style="width:14px;height:14px;background:' + job.color + ';border:2px solid #fff;border-radius:3px;box-shadow:0 0 8px ' + job.color + ';"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([job.lat, job.lng], { icon: icon }).addTo(map)
        .bindPopup('<div class="popup-title">' + job.name + '</div>');
    });
  }

  /* ===== STRIPE CHECKOUT MODAL ===== */
  var stripeModal = document.getElementById("stripeModal");
  var payDepositBtn = document.getElementById("payDepositBtn");
  var stripeModalClose = document.getElementById("stripeModalClose");
  var modalPayBtn = document.getElementById("modalPayBtn");
  var stripeForm = document.getElementById("stripeForm");
  var shareQuoteBtn = document.getElementById("shareQuoteBtn");

  function openStripeModal() {
    if (!stripeModal) return;
    var selectedRadio = document.querySelector('input[name="package"]:checked');
    var selectedPkg = selectedRadio ? selectedRadio.value : "kitchen";
    var pkg = packagePricing[selectedPkg];

    var wantWarranty = document.getElementById("addonWarranty") ? document.getElementById("addonWarranty").checked : false;
    var wantFilter = document.getElementById("addonFilter") ? document.getElementById("addonFilter").checked : false;
    var wantRush = document.getElementById("addonRush") ? document.getElementById("addonRush").checked : false;

    var modalPkgName = document.getElementById("modalPkgName");
    var modalPkgPrice = document.getElementById("modalPkgPrice");
    var modalTotal = document.getElementById("modalTotal");
    var modalDeposit = document.getElementById("modalDeposit");

    if (modalPkgName) modalPkgName.textContent = pkg.name;
    if (modalPkgPrice) modalPkgPrice.textContent = "$" + currentQuoteTotal.toLocaleString();

    var modalAddonWarranty = document.getElementById("modalAddonWarranty");
    var modalAddonFilter = document.getElementById("modalAddonFilter");
    var modalAddonRush = document.getElementById("modalAddonRush");
    if (modalAddonWarranty) modalAddonWarranty.style.display = wantWarranty ? "flex" : "none";
    if (modalAddonFilter) modalAddonFilter.style.display = wantFilter ? "flex" : "none";
    if (modalAddonRush) modalAddonRush.style.display = wantRush ? "flex" : "none";
    if (modalTotal) modalTotal.textContent = "$" + currentQuoteTotal.toLocaleString();

    var deposit = Math.ceil(currentQuoteTotal / 2);
    if (modalDeposit) modalDeposit.textContent = "$" + deposit.toLocaleString();
    if (modalPayBtn) modalPayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay $' + deposit.toLocaleString() + ' via Stripe';

    if (stripeForm) stripeForm.style.display = "block";
    var errEl = document.getElementById("stripeCheckoutError");
    if (errEl) errEl.style.display = "none";
    stripeModal.classList.add("open");
  }

  function closeStripeModal() {
    if (stripeModal) stripeModal.classList.remove("open");
  }

  if (payDepositBtn) payDepositBtn.addEventListener("click", openStripeModal);
  if (stripeModalClose) stripeModalClose.addEventListener("click", closeStripeModal);
  if (stripeModal) {
    stripeModal.addEventListener("click", function (e) {
      if (e.target === stripeModal) closeStripeModal();
    });
  }
  if (modalPayBtn) {
    modalPayBtn.addEventListener("click", function () {
      var selectedRadio = document.querySelector('input[name="package"]:checked');
      var selectedPkg = selectedRadio ? selectedRadio.value : "kitchen";
      var wantWarranty = document.getElementById("addonWarranty") ? document.getElementById("addonWarranty").checked : false;
      var wantFilter = document.getElementById("addonFilter") ? document.getElementById("addonFilter").checked : false;
      var wantRush = document.getElementById("addonRush") ? document.getElementById("addonRush").checked : false;
      var addons = [];
      if (wantWarranty) addons.push("warranty");
      if (wantFilter) addons.push("filter");
      if (wantRush) addons.push("rush");
      var emailField = document.getElementById("checkoutEmail");
      var custEmail = emailField ? emailField.value.trim() : "";
      var errEl = document.getElementById("stripeCheckoutError");

      modalPayBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;"><svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Redirecting to Stripe...</span>';
      modalPayBtn.disabled = true;

      var payload = {
        package: selectedPkg,
        total_amount: currentQuoteTotal,
        customer_email: custEmail || null,
        addons: addons,
      };

      apiPost("/api/stripe/create-checkout-session", payload)
        .then(function (data) {
          if (data.checkout_url) {
            window.open(data.checkout_url, "_blank");
            closeStripeModal();
          } else {
            throw new Error("No checkout URL returned");
          }
        })
        .catch(function (err) {
          if (errEl) {
            errEl.textContent = "Failed to create checkout session. " + (err.message || "Please try again.");
            errEl.style.display = "block";
          }
        })
        .finally(function () {
          var deposit = Math.ceil(currentQuoteTotal / 2);
          modalPayBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Pay $' + deposit.toLocaleString() + ' via Stripe';
          modalPayBtn.disabled = false;
        });
    });
  }
  if (shareQuoteBtn) {
    shareQuoteBtn.addEventListener("click", function () {
      var fakeId = "CF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      var fakeLink = "https://crystalflow.io/quote/" + fakeId;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fakeLink).then(function () {
          shareQuoteBtn.textContent = "Link Copied!";
          setTimeout(function () { shareQuoteBtn.textContent = "Share Quote Link"; }, 2000);
        });
      }
    });
  }

  /* ===== AUTOMATIONS VIEW ===== */
  var automationsData = [
    { id: 1, name: "Tech En Route", trigger: "Job status \u2192 In Progress", action: 'SMS to customer "Your technician [name] is on the way"', last: "Pending", fires: 0, on: true, type: "sms" },
    { id: 2, name: "Install Complete", trigger: "Job status \u2192 Completed", action: "Email customer with review request + warranty PDF", last: "Pending", fires: 0, on: true, type: "email" },
    { id: 3, name: "Appointment Reminder", trigger: "24h before appointment", action: "SMS + Email reminder with address and tech name", last: "Pending", fires: 0, on: true, type: "both" },
    { id: 4, name: "Quote Follow-Up", trigger: "48h after quote sent, no response", action: 'SMS "Hi [name], wanted to check if you had questions about your CrystalFlow quote."', last: "Pending", fires: 0, on: true, type: "sms" },
    { id: 5, name: "Filter Change Due", trigger: "6 months after install", action: "Email + SMS with scheduling link", last: "Pending", fires: 0, on: true, type: "both" },
    { id: 6, name: "New Lead Alert", trigger: "New lead created", action: "Push notification + email to Isaiah", last: "Active", fires: 0, on: true, type: "push" },
    { id: 7, name: "Review Request", trigger: "3 days after install", action: "SMS with Google review link", last: "Pending", fires: 0, on: false, type: "sms" },
    { id: 8, name: "Win-Back Campaign", trigger: "Lead lost for 30 days", action: "Email with 10% discount code", last: "Pending", fires: 0, on: false, type: "email" },
  ];

  var iconSVGs = {
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>',
    push: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    both: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
  };
  var typeBadgeLabels = { sms: "SMS", email: "Email", push: "Push", both: "SMS + Email" };
  var iconClasses = { sms: "sms", email: "email", push: "push", both: "both" };

  function renderAutomations() {
    var grid = document.getElementById("automationsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    automationsData.forEach(function (auto) {
      var card = document.createElement("div");
      card.className = "automation-card" + (auto.on ? "" : " off");
      card.innerHTML =
        '<div class="automation-card-top">' +
          '<div class="automation-icon ' + iconClasses[auto.type] + '">' + iconSVGs[auto.type] + '</div>' +
          '<div class="automation-info">' +
            '<div class="automation-name">' + auto.name + '</div>' +
            '<div class="automation-trigger">Trigger: ' + auto.trigger + '</div>' +
            '<div class="automation-action">Action: ' + auto.action + '</div>' +
          '</div>' +
          '<label class="toggle-switch">' +
            '<input type="checkbox"' + (auto.on ? " checked" : "") + ' data-auto-id="' + auto.id + '">' +
            '<span class="toggle-slider"></span>' +
          '</label>' +
        '</div>' +
        '<div class="automation-footer">' +
          '<div class="automation-stats">' +
            '<span>Status: ' + auto.last + '</span>' +
            '<span>Sent: ' + auto.fires + '</span>' +
          '</div>' +
          '<span class="automation-type-badge">' + typeBadgeLabels[auto.type] + '</span>' +
        '</div>';

      var toggle = card.querySelector('input[type="checkbox"]');
      toggle.addEventListener("change", function () {
        auto.on = toggle.checked;
        card.className = "automation-card" + (auto.on ? "" : " off");
      });
      grid.appendChild(card);
    });
  }

  renderAutomations();

  /* ===== HEADER CTA ACTIONS ===== */
  if (headerCTA) {
    headerCTA.addEventListener("click", function () {
      var activeView = document.querySelector(".view.active");
      if (!activeView) return;
      var viewId = activeView.id.replace("view-", "");

      if (viewId === "dashboard") {
        var name = prompt("Lead name:");
        if (name) {
          apiPost("/api/leads", { name: name, source: "direct", status: "new" })
            .then(function () {
              dashboardLoaded = false;
              loadDashboard();
              loadLeadsTable();
            })
            .catch(function () { alert("Failed to create lead."); });
        }
      } else if (viewId === "portal") {
        openAddModal();
      } else if (viewId === "warranty") {
        openNewWarrantyModal();
      } else if (viewId === "email" || viewId === "sms") {
        if (typeof openEmailBotModal === "function") openEmailBotModal();
      } else if (viewId === "quote") {
        /* Scroll to quote summary or trigger email of quote */
        var quoteResult = document.getElementById("quoteResult");
        if (quoteResult) quoteResult.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  /* ===== AUTO-REFRESH DASHBOARD EVERY 60s ===== */
  setInterval(function () {
    if (dashboardLoaded) {
      api("/api/admin/dashboard-full")
        .then(function (data) {
          updateKPIs(data);
          updateCharts(data);
          updateActivityFeed(data.recent_activity);
        })
        .catch(function () { /* silently fail */ });
    }
  }, 60000);

  /* ===== LEADS TABLE (DYNAMIC) ===== */
  var allLeads = [];

  function loadLeadsTable() {
    api("/api/leads?limit=20")
      .then(function (leads) {
        allLeads = leads || [];
        renderLeadsTable(allLeads);
      })
      .catch(function () {
        var tbody = document.getElementById("leadsTableBody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-faint);padding:var(--space-6);">No leads found</td></tr>';
      });
  }

  function leadStatusClass(status) {
    var s = (status || "").toLowerCase();
    if (s === "qualified") return "badge-qualified";
    if (s === "contacted") return "badge-contacted";
    if (s === "quoted") return "badge-quoted";
    if (s === "won") return "badge-won";
    if (s === "lost") return "badge-cancelled";
    return "badge-new";
  }

  function renderLeadsTable(leads) {
    var tbody = document.getElementById("leadsTableBody");
    if (!tbody) return;
    if (!leads || leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-faint);padding:var(--space-6);">No leads yet</td></tr>';
      return;
    }
    var html = "";
    leads.forEach(function (l) {
      var d = l.created_at ? new Date(l.created_at) : null;
      var dateStr = d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "--";
      var status = l.status || "new";
      html += '<tr data-lead-id="' + l.id + '">' +
        '<td>' + (l.name || "--") + '</td>' +
        '<td>' + (l.package_interest || "--") + '</td>' +
        '<td>' + (l.zip || "--") + '</td>' +
        '<td>' + (l.source || "--") + '</td>' +
        '<td><span class="badge ' + leadStatusClass(status) + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span></td>' +
        '<td>' + (l.quoted_price ? "$" + Number(l.quoted_price).toLocaleString() : "--") + '</td>' +
        '<td>' + dateStr + '</td>' +
        '<td><button class="view-row-btn delete-lead-btn" title="Delete lead" data-lid="' + l.id + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
        '</button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".delete-lead-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var lid = btn.dataset.lid;
        if (confirm("Delete this lead?")) {
          deleteLead(lid);
        }
      });
    });
  }

  function deleteLead(leadId) {
    fetch(API_BASE + "/api/leads/" + leadId, { method: "DELETE" })
      .then(function (r) {
        if (!r.ok && r.status !== 204) throw new Error("Delete failed");
        loadLeadsTable();
        dashboardLoaded = false;
        loadDashboard();
      })
      .catch(function () { alert("Failed to delete lead."); });
  }

  function deleteAllLeads() {
    if (!confirm("Are you sure you want to delete ALL leads? This cannot be undone.")) return;
    if (!allLeads || allLeads.length === 0) { alert("No leads to delete."); return; }
    var promises = allLeads.map(function (l) {
      return fetch(API_BASE + "/api/leads/" + l.id, { method: "DELETE" });
    });
    Promise.all(promises)
      .then(function () {
        allLeads = [];
        renderLeadsTable([]);
        dashboardLoaded = false;
        loadDashboard();
      })
      .catch(function () { alert("Some leads could not be deleted."); loadLeadsTable(); });
  }

  var deleteAllBtn = document.getElementById("deleteAllLeadsBtn");
  if (deleteAllBtn) deleteAllBtn.addEventListener("click", deleteAllLeads);

  var settingsDeleteAllBtn = document.getElementById("settingsDeleteAllLeads");
  if (settingsDeleteAllBtn) settingsDeleteAllBtn.addEventListener("click", deleteAllLeads);

  /* ===== EMAIL CAMPAIGNS ===== */
  function loadEmailSequences() {
    var container = document.getElementById("emailSequencesList");
    if (!container) return;
    container.innerHTML = '<div class="accounts-empty" style="padding:var(--space-10) var(--space-4);"><div style="color:var(--color-text-muted);">Loading...</div></div>';

    api("/api/email/automation/sequences")
      .then(function (sequences) {
        if (!sequences || sequences.length === 0) {
          container.innerHTML = '<div class="accounts-empty" style="padding:var(--space-10) var(--space-4);">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-faint);">' +
            '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>' +
            '<div style="color:var(--color-text-muted);margin-top:var(--space-3);">No active email sequences</div>' +
            '<div style="color:var(--color-text-faint);font-size:var(--text-xs);margin-top:var(--space-2);">Sequences are auto-created when new leads come in via Google Ads, Intercom, or the website chat.</div>' +
          '</div>';
          return;
        }
        var html = '';
        sequences.forEach(function (seq) {
          var created = seq.created_at ? new Date(seq.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";
          var statusClass = seq.active ? "badge-completed" : "badge-pending";
          var statusText = seq.active ? "Active" : "Completed";
          html += '<div class="sequence-card">' +
            '<div class="sequence-card-header">' +
              '<div class="sequence-card-icon email"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg></div>' +
              '<div class="sequence-card-info">' +
                '<div class="sequence-card-title">' + (seq.sequence_type || seq.type || "Welcome Sequence") + '</div>' +
                '<div class="sequence-card-sub">Lead #' + (seq.lead_id || "--") + ' &middot; Started ' + created + '</div>' +
              '</div>' +
              '<span class="badge ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="sequence-card-body">' +
              '<div class="profile-info-row"><span class="profile-info-label">Current Step</span><span class="profile-info-value">' + (seq.current_step || 0) + ' / ' + (seq.total_steps || "--") + '</span></div>' +
              (seq.next_send_at ? '<div class="profile-info-row"><span class="profile-info-label">Next Send</span><span class="profile-info-value">' + new Date(seq.next_send_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + '</span></div>' : '') +
            '</div>' +
            (seq.active ? '<div class="sequence-card-footer"><button class="btn" style="background:var(--color-error);color:#fff;font-size:var(--text-xs);" onclick="window._cancelEmailSeq(' + seq.id + ')">Cancel Sequence</button></div>' : '') +
          '</div>';
        });
        container.innerHTML = html;
      })
      .catch(function () {
        container.innerHTML = '<div class="accounts-empty" style="padding:var(--space-10) var(--space-4);">' +
          '<div style="color:var(--color-text-muted);">No active email sequences</div>' +
          '<div style="color:var(--color-text-faint);font-size:var(--text-xs);margin-top:var(--space-2);">Sequences are auto-created when new leads come in.</div></div>';
      });
  }

  window._cancelEmailSeq = function (seqId) {
    if (!confirm("Cancel this email sequence?")) return;
    fetch(API_BASE + "/api/email/automation/cancel/" + seqId, { method: "DELETE" })
      .then(function () { loadEmailSequences(); })
      .catch(function () { alert("Failed to cancel sequence."); });
  };

  var refreshEmailBtn = document.getElementById("refreshEmailBtn");
  if (refreshEmailBtn) refreshEmailBtn.addEventListener("click", loadEmailSequences);

  /* ===== SMS DRIPS ===== */
  function loadSmsSequences() {
    var container = document.getElementById("smsSequencesList");
    if (!container) return;
    container.innerHTML = '<div class="accounts-empty" style="padding:var(--space-10) var(--space-4);"><div style="color:var(--color-text-muted);">Loading...</div></div>';

    api("/api/sms/sequences")
      .then(function (sequences) {
        if (!sequences || sequences.length === 0) {
          container.innerHTML = '<div class="accounts-empty" style="padding:var(--space-10) var(--space-4);">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-faint);">' +
            '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
            '<div style="color:var(--color-text-muted);margin-top:var(--space-3);">No active SMS drip sequences</div>' +
            '<div style="color:var(--color-text-faint);font-size:var(--text-xs);margin-top:var(--space-2);">SMS drips auto-enroll when leads provide a phone number.</div>' +
          '</div>';
          return;
        }
        var html = '';
        sequences.forEach(function (seq) {
          var created = seq.created_at ? new Date(seq.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";
          var statusClass = seq.active ? "badge-completed" : "badge-pending";
          var statusText = seq.active ? "Active" : "Completed";
          html += '<div class="sequence-card">' +
            '<div class="sequence-card-header">' +
              '<div class="sequence-card-icon sms"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>' +
              '<div class="sequence-card-info">' +
                '<div class="sequence-card-title">' + (seq.sequence_type || "Follow-Up Drip") + '</div>' +
                '<div class="sequence-card-sub">Lead #' + (seq.lead_id || "--") + ' &middot; ' + (seq.phone || "") + ' &middot; Started ' + created + '</div>' +
              '</div>' +
              '<span class="badge ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
            '<div class="sequence-card-body">' +
              '<div class="profile-info-row"><span class="profile-info-label">Current Step</span><span class="profile-info-value">' + (seq.current_step || 0) + ' / ' + (seq.total_steps || "--") + '</span></div>' +
              (seq.next_send_at ? '<div class="profile-info-row"><span class="profile-info-label">Next Send</span><span class="profile-info-value">' + new Date(seq.next_send_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + '</span></div>' : '') +
            '</div>' +
            (seq.active ? '<div class="sequence-card-footer"><button class="btn" style="background:var(--color-error);color:#fff;font-size:var(--text-xs);" onclick="window._optOutSms(' + seq.id + ')">Opt Out</button></div>' : '') +
          '</div>';
        });
        container.innerHTML = html;
      })
      .catch(function () {
        container.innerHTML = '<div class="accounts-empty" style="padding:var(--space-10) var(--space-4);">' +
          '<div style="color:var(--color-text-muted);">No active SMS sequences</div>' +
          '<div style="color:var(--color-text-faint);font-size:var(--text-xs);margin-top:var(--space-2);">SMS drips auto-enroll when leads provide a phone number.</div></div>';
      });
  }

  window._optOutSms = function (seqId) {
    if (!confirm("Opt out of this SMS sequence?")) return;
    fetch(API_BASE + "/api/sms/opt-out/" + seqId, { method: "POST" })
      .then(function () { loadSmsSequences(); })
      .catch(function () { alert("Failed to opt out."); });
  };

  var refreshSmsBtn = document.getElementById("refreshSmsBtn");
  if (refreshSmsBtn) refreshSmsBtn.addEventListener("click", loadSmsSequences);

  /* ===== SETTINGS — HEALTH CHECK ===== */
  function checkSystemHealth() {
    var apiDot = document.getElementById("healthDotApi");
    var apiStatus = document.getElementById("healthApiStatus");
    var dbDot = document.getElementById("healthDotDb");
    var dbStatus = document.getElementById("healthDbStatus");

    fetch(API_BASE + "/api/health")
      .then(function (r) {
        if (r.ok) return r.json();
        throw new Error("down");
      })
      .then(function (data) {
        if (apiDot) apiDot.classList.add("connected");
        if (apiStatus) apiStatus.textContent = "Online";
        if (data.database === "connected" || data.db === "ok") {
          if (dbDot) dbDot.classList.add("connected");
          if (dbStatus) dbStatus.textContent = "Connected";
        } else {
          if (dbDot) { dbDot.classList.remove("connected"); dbDot.classList.add("disconnected"); }
          if (dbStatus) dbStatus.textContent = "Issue detected";
        }
      })
      .catch(function () {
        if (apiDot) { apiDot.classList.remove("connected"); apiDot.classList.add("disconnected"); }
        if (apiStatus) apiStatus.textContent = "Offline";
        if (dbDot) { dbDot.classList.remove("connected"); dbDot.classList.add("disconnected"); }
        if (dbStatus) dbStatus.textContent = "Unreachable";
      });
  }

  /* ===== WARRANTY CLAIMS ===== */
  var allWarrantyClaims = [];
  var currentWarrantyClaim = null;

  function apiPut(path, body) {
    return fetch(API_BASE + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error("API error: " + r.status);
      return r.json();
    });
  }

  function loadWarrantyClaims() {
    var tbody = document.getElementById("warrantyTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-faint);padding:var(--space-6);">Loading warranty claims...</td></tr>';

    var statusFilter = document.getElementById("warrantyStatusFilter");
    var filterVal = statusFilter ? statusFilter.value : "";
    var url = "/api/admin/warranty-claims";
    if (filterVal) url += "?status_filter=" + filterVal;

    api(url)
      .then(function (data) {
        allWarrantyClaims = data.warranty_claims || [];
        var badge = document.getElementById("warrantyBadge");
        if (badge) badge.textContent = data.total || allWarrantyClaims.length;
        renderWarrantyTable(allWarrantyClaims);
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-faint);padding:var(--space-6);">No warranty claims found</td></tr>';
      });
  }

  function renderWarrantyTable(claims) {
    var tbody = document.getElementById("warrantyTableBody");
    if (!tbody) return;

    if (!claims || claims.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--color-text-faint);padding:var(--space-6);">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;color:var(--color-text-faint);display:block;margin:0 auto var(--space-2);">' +
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
        'No warranty claims yet</td></tr>';
      return;
    }

    var html = '';
    claims.forEach(function (claim) {
      var created = claim.created_at ? new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";
      var statusBadgeClass = getWarrantyStatusBadge(claim.status);
      var priorityBadgeClass = getPriorityBadge(claim.priority);
      var categoryLabel = (claim.category || "other").replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });

      html += '<tr class="clickable-row" data-claim-id="' + claim.id + '">' +
        '<td style="font-weight:500;color:var(--color-cyan);">' + (claim.claim_number || "--") + '</td>' +
        '<td>' + (claim.customer_name || "Unknown") + '</td>' +
        '<td>' + categoryLabel + '</td>' +
        '<td><span class="badge ' + priorityBadgeClass + '">' + (claim.priority || "medium") + '</span></td>' +
        '<td><span class="badge ' + statusBadgeClass + '">' + formatStatus(claim.status) + '</span></td>' +
        '<td>' + created + '</td>' +
        '<td>' + (claim.assigned_tech || '<span style="color:var(--color-text-faint);">Unassigned</span>') + '</td>' +
        '<td><button class="btn-icon" title="View Details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M9 18l6-6-6-6"/></svg></button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll(".clickable-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var claimId = parseInt(row.dataset.claimId);
        openWarrantyDetail(claimId);
      });
    });
  }

  function getWarrantyStatusBadge(status) {
    var map = {
      submitted: "badge-new",
      under_review: "badge-contacted",
      approved: "badge-qualified",
      in_progress: "badge-scheduled",
      parts_ordered: "badge-contacted",
      scheduled: "badge-scheduled",
      resolved: "badge-completed",
      denied: "badge-lost",
      closed: "badge-completed",
    };
    return map[status] || "badge-pending";
  }

  function getPriorityBadge(priority) {
    var map = {
      low: "badge-completed",
      medium: "badge-contacted",
      high: "badge-scheduled",
      urgent: "badge-lost",
    };
    return map[priority] || "badge-pending";
  }

  function formatStatus(status) {
    if (!status) return "--";
    return status.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function openWarrantyDetail(claimId) {
    var claim = allWarrantyClaims.find(function (c) { return c.id === claimId; });
    if (!claim) return;
    currentWarrantyClaim = claim;

    document.getElementById("wcDetailClaim").textContent = claim.claim_number || "--";
    document.getElementById("wcDetailCustomer").textContent = (claim.customer_name || "Unknown") + (claim.customer_email ? " (" + claim.customer_email + ")" : "");
    document.getElementById("wcDetailCategory").textContent = formatStatus(claim.category);
    document.getElementById("wcDetailPriority").textContent = claim.priority || "medium";
    document.getElementById("wcDetailEquipment").textContent = claim.equipment_affected || "--";
    document.getElementById("wcDetailPlan").textContent = claim.warranty_plan_at_claim || "standard";
    document.getElementById("wcDetailExpiry").textContent = claim.warranty_expiry_at_claim ? new Date(claim.warranty_expiry_at_claim).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--";
    document.getElementById("wcDetailCreated").textContent = claim.created_at ? new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "--";
    document.getElementById("wcDetailDescription").textContent = claim.description || "No description provided.";

    var statusSelect = document.getElementById("wcUpdateStatus");
    if (statusSelect) statusSelect.value = claim.status || "submitted";

    var techSelect = document.getElementById("wcUpdateTech");
    if (techSelect) techSelect.value = claim.assigned_tech || "";

    var notesField = document.getElementById("wcUpdateNotes");
    if (notesField) notesField.value = claim.resolution_notes || "";

    document.getElementById("warrantyDetailOverlay").classList.add("open");
    document.getElementById("warrantyDetailPanel").classList.add("open");
  }

  function closeWarrantyDetail() {
    document.getElementById("warrantyDetailOverlay").classList.remove("open");
    document.getElementById("warrantyDetailPanel").classList.remove("open");
    currentWarrantyClaim = null;
  }

  var closeWcBtn = document.getElementById("closeWarrantyDetailBtn");
  var wcOverlay = document.getElementById("warrantyDetailOverlay");
  if (closeWcBtn) closeWcBtn.addEventListener("click", closeWarrantyDetail);
  if (wcOverlay) wcOverlay.addEventListener("click", closeWarrantyDetail);

  /* Save warranty claim changes */
  var wcSaveBtn = document.getElementById("wcSaveBtn");
  if (wcSaveBtn) {
    wcSaveBtn.addEventListener("click", function () {
      if (!currentWarrantyClaim) return;
      var payload = {
        status: document.getElementById("wcUpdateStatus").value,
        assigned_tech: document.getElementById("wcUpdateTech").value || null,
        resolution_notes: document.getElementById("wcUpdateNotes").value || null,
      };

      wcSaveBtn.disabled = true;
      wcSaveBtn.textContent = "Saving...";

      apiPut("/api/admin/warranty-claims/" + currentWarrantyClaim.id, payload)
        .then(function () {
          wcSaveBtn.textContent = "Saved";
          setTimeout(function () {
            wcSaveBtn.disabled = false;
            wcSaveBtn.textContent = "Save Changes";
          }, 1500);
          loadWarrantyClaims();
        })
        .catch(function () {
          wcSaveBtn.disabled = false;
          wcSaveBtn.textContent = "Save Changes";
          alert("Failed to update warranty claim.");
        });
    });
  }

  /* Email customer from warranty detail */
  var wcEmailBtn = document.getElementById("wcEmailCustomerBtn");
  if (wcEmailBtn) {
    wcEmailBtn.addEventListener("click", function () {
      if (!currentWarrantyClaim) return;
      openEmailBotModal();
      var purposeSelect = document.getElementById("ebPurpose");
      if (purposeSelect) purposeSelect.value = "warranty_update";

      /* Pre-select the customer */
      var recipientType = document.getElementById("ebRecipientType");
      if (recipientType) {
        recipientType.value = "customer";
        recipientType.dispatchEvent(new Event("change"));
      }
    });
  }

  /* Warranty status filter change */
  var wcStatusFilter = document.getElementById("warrantyStatusFilter");
  if (wcStatusFilter) {
    wcStatusFilter.addEventListener("change", function () {
      loadWarrantyClaims();
    });
  }

  /* Warranty search */
  var wcSearchInput = document.getElementById("warrantySearchInput");
  if (wcSearchInput) {
    var wcSearchTimeout;
    wcSearchInput.addEventListener("input", function () {
      clearTimeout(wcSearchTimeout);
      wcSearchTimeout = setTimeout(function () {
        var q = wcSearchInput.value.toLowerCase().trim();
        if (!q) {
          renderWarrantyTable(allWarrantyClaims);
          return;
        }
        var filtered = allWarrantyClaims.filter(function (c) {
          return (c.claim_number || "").toLowerCase().indexOf(q) > -1 ||
            (c.customer_name || "").toLowerCase().indexOf(q) > -1 ||
            (c.customer_email || "").toLowerCase().indexOf(q) > -1;
        });
        renderWarrantyTable(filtered);
      }, 300);
    });
  }

  /* ===== NEW WARRANTY CLAIM MODAL ===== */
  var newWcBtn = document.getElementById("newWarrantyClaimBtn");
  var newWcModal = document.getElementById("newWarrantyModal");
  var closeNewWcBtn = document.getElementById("closeNewWarrantyBtn");
  var cancelNewWcBtn = document.getElementById("cancelNewWarrantyBtn");
  var newWcForm = document.getElementById("newWarrantyForm");

  function openNewWarrantyModal() {
    if (!newWcModal) return;
    newWcModal.classList.add("open");
    populateCustomerDropdown("wcCustSelect");
  }

  function closeNewWarrantyModal() {
    if (!newWcModal) return;
    newWcModal.classList.remove("open");
    if (newWcForm) newWcForm.reset();
    var errEl = document.getElementById("newWarrantyError");
    if (errEl) errEl.style.display = "none";
  }

  if (newWcBtn) newWcBtn.addEventListener("click", openNewWarrantyModal);
  if (closeNewWcBtn) closeNewWcBtn.addEventListener("click", closeNewWarrantyModal);
  if (cancelNewWcBtn) cancelNewWcBtn.addEventListener("click", closeNewWarrantyModal);

  if (newWcForm) {
    newWcForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var errEl = document.getElementById("newWarrantyError");
      var submitBtn = document.getElementById("submitNewWarrantyBtn");

      var custId = document.getElementById("wcCustSelect").value;
      if (!custId) {
        if (errEl) { errEl.textContent = "Please select a customer."; errEl.style.display = "block"; }
        return;
      }

      var payload = {
        customer_id: parseInt(custId),
        category: document.getElementById("wcCategory").value,
        description: document.getElementById("wcDescription").value,
        equipment_affected: document.getElementById("wcEquipment").value || null,
        priority: document.getElementById("wcPriority").value,
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating...";
      if (errEl) errEl.style.display = "none";

      apiPost("/api/admin/warranty-claims", payload)
        .then(function () {
          closeNewWarrantyModal();
          loadWarrantyClaims();
        })
        .catch(function (err) {
          if (errEl) { errEl.textContent = "Failed to create claim. " + err.message; errEl.style.display = "block"; }
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Claim";
        });
    });
  }

  /* Shared: populate customer dropdown from API */
  function populateCustomerDropdown(selectId) {
    var select = document.getElementById(selectId);
    if (!select) return;

    /* Keep only the first (placeholder) option */
    while (select.options.length > 1) select.remove(1);

    api("/api/admin/customers")
      .then(function (data) {
        var customers = data.customers || [];
        customers.forEach(function (c) {
          var opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = (c.first_name || "") + " " + (c.last_name || "") + " — " + c.email;
          select.appendChild(opt);
        });
      })
      .catch(function () { /* silently fail */ });
  }

  /* ===== EMAIL BOT COMPOSE MODAL ===== */
  var ebModal = document.getElementById("emailBotModal");
  var closeEbBtn = document.getElementById("closeEmailBotBtn");
  var ebGenerateBtn = document.getElementById("ebGenerateBtn");
  var ebSendBtn = document.getElementById("ebSendBtn");
  var ebRegenerateBtn = document.getElementById("ebRegenerateBtn");
  var ebPreview = document.getElementById("ebPreview");
  var ebFooter = document.getElementById("ebFooter");
  var currentGeneratedEmail = null;

  function openEmailBotModal() {
    if (!ebModal) return;
    ebModal.classList.add("open");
    if (ebPreview) ebPreview.style.display = "none";
    if (ebFooter) ebFooter.style.display = "none";
    currentGeneratedEmail = null;
    populateRecipientDropdown();
  }

  function closeEmailBotModal() {
    if (!ebModal) return;
    ebModal.classList.remove("open");
    if (ebPreview) ebPreview.style.display = "none";
    if (ebFooter) ebFooter.style.display = "none";
    currentGeneratedEmail = null;
    var errEl = document.getElementById("emailBotError");
    if (errEl) errEl.style.display = "none";
  }

  if (closeEbBtn) closeEbBtn.addEventListener("click", closeEmailBotModal);

  /* Recipient type toggle — reload dropdown */
  var ebRecipientType = document.getElementById("ebRecipientType");
  if (ebRecipientType) {
    ebRecipientType.addEventListener("change", function () {
      populateRecipientDropdown();
    });
  }

  function populateRecipientDropdown() {
    var typeSelect = document.getElementById("ebRecipientType");
    var recipientSelect = document.getElementById("ebRecipientSelect");
    if (!typeSelect || !recipientSelect) return;

    while (recipientSelect.options.length > 1) recipientSelect.remove(1);

    var recipientType = typeSelect.value;
    if (recipientType === "customer") {
      api("/api/admin/customers")
        .then(function (data) {
          var customers = data.customers || [];
          customers.forEach(function (c) {
            var opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = (c.first_name || "") + " " + (c.last_name || "") + " — " + c.email;
            recipientSelect.appendChild(opt);
          });
        })
        .catch(function () { /* silently fail */ });
    } else {
      api("/api/leads")
        .then(function (data) {
          var leads = data.leads || data || [];
          leads.forEach(function (l) {
            var opt = document.createElement("option");
            opt.value = l.id;
            opt.textContent = (l.name || "Lead #" + l.id) + (l.email ? " — " + l.email : "");
            recipientSelect.appendChild(opt);
          });
        })
        .catch(function () { /* silently fail */ });
    }
  }

  /* Generate email */
  if (ebGenerateBtn) {
    ebGenerateBtn.addEventListener("click", function () {
      var recipientType = document.getElementById("ebRecipientType").value;
      var recipientId = document.getElementById("ebRecipientSelect").value;
      var purpose = document.getElementById("ebPurpose").value;
      var tone = document.getElementById("ebTone").value;
      var customInstructions = document.getElementById("ebCustomInstructions").value;
      var errEl = document.getElementById("emailBotError");

      if (!recipientId) {
        if (errEl) { errEl.textContent = "Please select a recipient."; errEl.style.display = "block"; }
        return;
      }
      if (errEl) errEl.style.display = "none";

      ebGenerateBtn.disabled = true;
      ebGenerateBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;animation:spin 1s linear infinite;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Generating...';

      apiPost("/api/admin/email-bot/generate", {
        recipient_type: recipientType,
        recipient_id: parseInt(recipientId),
        email_purpose: purpose,
        tone: tone,
        custom_instructions: customInstructions,
      })
        .then(function (data) {
          currentGeneratedEmail = data;
          document.getElementById("ebToEmail").value = data.recipient_email || "";
          document.getElementById("ebSubject").value = data.subject || "";
          document.getElementById("ebBodyPreview").innerHTML = data.body_html || data.body_text || "";

          if (ebPreview) ebPreview.style.display = "block";
          if (ebFooter) ebFooter.style.display = "flex";
        })
        .catch(function (err) {
          if (errEl) { errEl.textContent = "Failed to generate email. " + err.message; errEl.style.display = "block"; }
        })
        .finally(function () {
          ebGenerateBtn.disabled = false;
          ebGenerateBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg> Generate Email';
        });
    });
  }

  /* Regenerate = same as generate */
  if (ebRegenerateBtn) {
    ebRegenerateBtn.addEventListener("click", function () {
      if (ebGenerateBtn) ebGenerateBtn.click();
    });
  }

  /* Send email */
  if (ebSendBtn) {
    ebSendBtn.addEventListener("click", function () {
      if (!currentGeneratedEmail) return;
      var errEl = document.getElementById("emailBotError");

      var toEmail = document.getElementById("ebToEmail").value;
      var subject = document.getElementById("ebSubject").value;
      var bodyHtml = document.getElementById("ebBodyPreview").innerHTML;

      if (!toEmail || !subject) {
        if (errEl) { errEl.textContent = "Recipient email and subject are required."; errEl.style.display = "block"; }
        return;
      }

      ebSendBtn.disabled = true;
      ebSendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;animation:spin 1s linear infinite;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/></svg> Sending...';

      apiPost("/api/admin/email-bot/send", {
        to_email: toEmail,
        to_name: currentGeneratedEmail.recipient_name || "",
        subject: subject,
        body_html: bodyHtml,
      })
        .then(function () {
          ebSendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M20 6L9 17l-5-5"/></svg> Sent';
          setTimeout(function () {
            closeEmailBotModal();
            ebSendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Send Email';
            ebSendBtn.disabled = false;
          }, 1500);
        })
        .catch(function (err) {
          if (errEl) { errEl.textContent = "Failed to send. " + err.message; errEl.style.display = "block"; }
          ebSendBtn.disabled = false;
          ebSendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Send Email';
        });
    });
  }

  /* Open Email Bot from the sidebar or toolbar (add a global hook) */
  window._openEmailBot = openEmailBotModal;

  /* Email Bot button inside Email Campaigns view */
  var ebFromCampaignsBtn = document.getElementById("openEmailBotFromCampaigns");
  if (ebFromCampaignsBtn) {
    ebFromCampaignsBtn.addEventListener("click", openEmailBotModal);
  }

  /* ===== INVOICE MANAGEMENT — Mark Paid / Send Reminder ===== */
  window._markInvoicePaid = function (invoiceId, btnEl) {
    if (!confirm("Mark this invoice as paid?")) return;
    btnEl.textContent = "...";
    btnEl.disabled = true;
    fetch(API_BASE + "/api/admin/invoices/" + invoiceId + "/mark-paid", { method: "PUT" })
      .then(function (r) {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(function () {
        btnEl.textContent = "Paid";
        btnEl.style.background = "var(--color-text-faint)";
        /* Update the badge in the same row */
        var row = btnEl.closest("tr");
        if (row) {
          var badge = row.querySelector(".badge");
          if (badge) { badge.className = "badge badge-completed"; badge.textContent = "paid"; }
        }
      })
      .catch(function () {
        btnEl.textContent = "Mark Paid";
        btnEl.disabled = false;
        alert("Failed to mark invoice as paid.");
      });
  };

  window._sendInvoiceReminder = function (invoiceId, btnEl) {
    btnEl.textContent = "Sending...";
    btnEl.disabled = true;
    apiPost("/api/admin/invoices/" + invoiceId + "/send-reminder", {})
      .then(function (data) {
        btnEl.textContent = "Sent";
        btnEl.style.background = "var(--color-text-faint)";
        setTimeout(function () {
          btnEl.textContent = "Remind";
          btnEl.style.background = "var(--color-warning)";
          btnEl.disabled = false;
        }, 3000);
      })
      .catch(function () {
        btnEl.textContent = "Remind";
        btnEl.disabled = false;
        alert("Failed to send reminder.");
      });
  };

  /* ===== INITIAL LOAD ===== */
  if (!window.location.hash || window.location.hash === "#dashboard") {
    dashboardLoaded = true;
    loadDashboard();
    loadLeadsTable();
  }
})();
/* deploy trigger 1773126053 */
