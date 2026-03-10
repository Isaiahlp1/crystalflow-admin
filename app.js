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
    portal: "Customer Portal",
    dispatch: "Technician Dispatch",
    automations: "Automations",
  };

  var ctaLabels = {
    dashboard: "+ New Lead",
    quote: "Send Quote",
    portal: "Add Customer",
    dispatch: "New Job",
    automations: "+ New Automation",
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
    }
    if (viewId === "portal") {
      loadPortalCustomers();
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

  /* ===== PORTAL CUSTOMER LIST ===== */
  function loadPortalCustomers() {
    api("/api/admin/customers?limit=20")
      .then(function (data) {
        var badge = document.querySelector('.nav-item[data-view="portal"] .badge');
        if (badge) badge.textContent = data.total;
      })
      .catch(function () { /* ignore */ });
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

  /* ===== PORTAL TABS ===== */
  var portalTabs = document.querySelectorAll(".portal-tab");
  var portalContents = document.querySelectorAll(".portal-tab-content");
  portalTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      portalTabs.forEach(function (t) { t.classList.remove("active"); });
      portalContents.forEach(function (c) { c.classList.remove("active"); });
      tab.classList.add("active");
      var tabTarget = document.getElementById("portal-" + tab.dataset.portalTab);
      if (tabTarget) tabTarget.classList.add("active");
    });
  });

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
  var modalSuccess = document.getElementById("modalSuccess");
  var stripeForm = document.getElementById("stripeForm");
  var modalSuccessClose = document.getElementById("modalSuccessClose");
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
    if (modalPayBtn) modalPayBtn.textContent = "Pay $" + deposit.toLocaleString() + ".00";

    if (stripeForm) stripeForm.style.display = "block";
    if (modalSuccess) modalSuccess.style.display = "none";
    stripeModal.classList.add("active");
  }

  function closeStripeModal() {
    if (stripeModal) stripeModal.classList.remove("active");
  }

  if (payDepositBtn) payDepositBtn.addEventListener("click", openStripeModal);
  if (stripeModalClose) stripeModalClose.addEventListener("click", closeStripeModal);
  if (modalSuccessClose) modalSuccessClose.addEventListener("click", closeStripeModal);
  if (stripeModal) {
    stripeModal.addEventListener("click", function (e) {
      if (e.target === stripeModal) closeStripeModal();
    });
  }
  if (modalPayBtn) {
    modalPayBtn.addEventListener("click", function () {
      modalPayBtn.textContent = "Processing...";
      modalPayBtn.disabled = true;
      setTimeout(function () {
        if (stripeForm) stripeForm.style.display = "none";
        if (modalSuccess) modalSuccess.style.display = "block";
        modalPayBtn.disabled = false;
      }, 1500);
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
        /* Open new lead form or redirect */
        var name = prompt("Lead name:");
        if (name) {
          apiPost("/api/leads", { name: name, source: "direct", status: "new" })
            .then(function () {
              alert("Lead created! Refreshing dashboard...");
              dashboardLoaded = false;
              loadDashboard();
            })
            .catch(function () { alert("Failed to create lead."); });
        }
      } else {
        alert(ctaLabels[viewId] + " — coming soon!");
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

  /* ===== INITIAL LOAD ===== */
  if (!window.location.hash || window.location.hash === "#dashboard") {
    dashboardLoaded = true;
    loadDashboard();
  }
})();
