/* CrystalFlow Miami — Command Center App Logic */

(function () {
  "use strict";

  /* ===== VIEW NAVIGATION ===== */
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const views = document.querySelectorAll(".view");
  const pageTitle = document.getElementById("pageTitle");
  const headerCTA = document.getElementById("headerCTA");

  const viewTitles = {
    dashboard: "Analytics Dashboard",
    quote: "Instant Quote Calculator",
    portal: "Customer Portal",
    dispatch: "Technician Dispatch",
    automations: "Automations",
  };

  const ctaLabels = {
    dashboard: "+ New Lead",
    quote: "Send Quote",
    portal: "Add Customer",
    dispatch: "New Job",
    automations: "+ New Automation",
  };

  var dispatchMapInitialized = false;

  function switchView(viewId) {
    navItems.forEach(function (item) { item.classList.remove("active"); });
    views.forEach(function (v) { v.classList.remove("active"); });

    var target = document.querySelector(".nav-item[data-view=\"" + viewId + "\"]");
    var view = document.getElementById("view-" + viewId);

    if (target) target.classList.add("active");
    if (view) view.classList.add("active");
    if (pageTitle) pageTitle.textContent = viewTitles[viewId] || viewId;
    if (headerCTA) headerCTA.textContent = ctaLabels[viewId] || "+ New";

    /* Initialize dispatch map on first view */
    if (viewId === "dispatch" && !dispatchMapInitialized) {
      dispatchMapInitialized = true;
      setTimeout(initDispatchMap, 100);
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

  /* ===== KPI COUNT-UP ANIMATION ===== */
  function animateCountUp() {
    document.querySelectorAll(".kpi-value[data-count]").forEach(function (el) {
      var target = parseInt(el.dataset.count, 10);
      var suffix = el.dataset.suffix || "";
      var prefix = el.textContent.startsWith("$") ? "$" : "";
      var duration = 1200;
      var start = performance.now();

      function step(now) {
        var progress = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(target * eased);
        el.textContent =
          prefix +
          current.toLocaleString("en-US") +
          suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* Intersection observer — animate when visible */
  var dashView = document.getElementById("view-dashboard");
  var kpiAnimated = false;

  function tryAnimateKPI() {
    if (!kpiAnimated && dashView && dashView.classList.contains("active")) {
      kpiAnimated = true;
      animateCountUp();
    }
  }

  /* initial fire */
  setTimeout(tryAnimateKPI, 300);

  /* ===== CHARTS ===== */
  var chartColors = {
    cyan: "#00C9DB",
    pink: "#E8439A",
    violet: "#5B6BF5",
    success: "#34D399",
    warning: "#FBBF24",
    cyanAlpha: "rgba(0, 201, 219, 0.15)",
    pinkAlpha: "rgba(232, 67, 154, 0.15)",
    violetAlpha: "rgba(91, 107, 245, 0.15)",
  };

  Chart.defaults.color = "#9B98B5";
  Chart.defaults.borderColor = "rgba(45, 43, 74, 0.5)";
  Chart.defaults.font.family = "'Space Grotesk', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 16;

  /* Revenue Line Chart */
  var revenueCtx = document.getElementById("revenueChart");
  if (revenueCtx) {
    new Chart(revenueCtx, {
      type: "line",
      data: {
        labels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
        datasets: [
          {
            label: "Revenue",
            data: [18200, 24500, 31000, 28400, 38900, 47850],
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
            data: [25000, 25000, 25000, 25000, 25000, 25000],
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
            ticks: {
              callback: function (v) { return "$" + (v / 1000).toFixed(0) + "k"; },
            },
            grid: { color: "rgba(45, 43, 74, 0.3)" },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });
  }

  /* Lead Sources Doughnut */
  var sourcesCtx = document.getElementById("sourcesChart");
  if (sourcesCtx) {
    new Chart(sourcesCtx, {
      type: "doughnut",
      data: {
        labels: ["Google Ads", "Instagram", "Referral", "Intercom", "Facebook"],
        datasets: [
          {
            data: [38, 24, 18, 12, 8],
            backgroundColor: [
              chartColors.cyan,
              chartColors.pink,
              chartColors.violet,
              chartColors.success,
              chartColors.warning,
            ],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.label + ": " + ctx.parsed + "%"; },
            },
          },
        },
      },
    });
  }

  /* Pipeline Funnel (horizontal bar) */
  var funnelCtx = document.getElementById("funnelChart");
  if (funnelCtx) {
    new Chart(funnelCtx, {
      type: "bar",
      data: {
        labels: ["New Leads", "Contacted", "Qualified", "Quoted", "Won"],
        datasets: [
          {
            data: [34, 22, 15, 9, 5],
            backgroundColor: [
              chartColors.cyan,
              chartColors.violet,
              chartColors.pink,
              chartColors.warning,
              chartColors.success,
            ],
            borderRadius: 6,
            barThickness: 32,
          },
        ],
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

  /* Package Mix (bar chart) */
  var packageCtx = document.getElementById("packageChart");
  if (packageCtx) {
    new Chart(packageCtx, {
      type: "bar",
      data: {
        labels: ["Kitchen Guard", "Home Shield", "Pure Life"],
        datasets: [
          {
            label: "Units Sold",
            data: [18, 9, 5],
            backgroundColor: [chartColors.cyan, chartColors.violet, chartColors.pink],
            borderRadius: 6,
            barThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(45, 43, 74, 0.3)" },
            ticks: { stepSize: 5 },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /* ===== QUOTE CALCULATOR ===== */
  var packagePricing = {
    kitchen: {
      name: "Kitchen Guard",
      subtitle: "Waterdrop G5P500A — 500 GPD",
      base: 699,
      max: 849,
    },
    home: {
      name: "Home Shield",
      subtitle: "Waterdrop G3P800 — 800 GPD",
      base: 1799,
      max: 2199,
    },
    pure: {
      name: "Pure Life",
      subtitle: "Waterdrop X16 — 1600 GPD",
      base: 2699,
      max: 3199,
    },
  };

  var homeMultipliers = {
    apartment: 0,
    townhouse: 0.03,
    "house-small": 0.06,
    "house-large": 0.12,
  };

  var premiumZips = ["33139", "33137", "33140", "33141", "33109", "33154"];

  /* Track current total for modal */
  var currentQuoteTotal = 699;

  function recalcQuote() {
    var selectedRadio = document.querySelector("input[name=\"package\"]:checked");
    var selectedPkg = selectedRadio ? selectedRadio.value : "kitchen";
    var pkg = packagePricing[selectedPkg];
    var homeTypeEl = document.getElementById("homeType");
    var homeType = homeTypeEl ? homeTypeEl.value : "house-small";
    var zipEl = document.getElementById("zipCode");
    var zip = zipEl ? zipEl.value : "";
    var warrantyEl = document.getElementById("addonWarranty");
    var wantWarranty = warrantyEl ? warrantyEl.checked : false;
    var filterEl = document.getElementById("addonFilter");
    var wantFilter = filterEl ? filterEl.checked : false;
    var rushEl = document.getElementById("addonRush");
    var wantRush = rushEl ? rushEl.checked : false;

    var basePrice = pkg.base;
    var homeAdj = Math.round(basePrice * (homeMultipliers[homeType] || 0));
    var areaSurcharge = premiumZips.indexOf(zip) !== -1 ? 100 : 0;

    var total = basePrice + homeAdj + areaSurcharge;
    if (wantWarranty) total += 149;
    if (wantFilter) total += 99;
    if (wantRush) total += 199;

    /* cap at max */
    var capped = Math.min(total, pkg.max + (wantWarranty ? 149 : 0) + (wantFilter ? 99 : 0) + (wantRush ? 199 : 0));

    currentQuoteTotal = capped;

    /* Update DOM */
    var nameEl = document.getElementById("quotePkgName");
    if (nameEl) {
      nameEl.textContent = pkg.name;
      nameEl.nextElementSibling.textContent = pkg.subtitle;
    }

    var setVal = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = "$" + val.toLocaleString();
    };

    setVal("quoteBase", basePrice);
    setVal("quoteHome", homeAdj);
    setVal("quoteArea", areaSurcharge);
    setVal("quoteTotal", capped);

    var showLine = function (id, show) {
      var el = document.getElementById(id);
      if (el) el.style.display = show ? "flex" : "none";
    };

    showLine("addonWarrantyLine", wantWarranty);
    showLine("addonFilterLine", wantFilter);
    showLine("addonRushLine", wantRush);
  }

  /* Package radio card selection */
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

  /* Bind all quote inputs */
  ["homeType", "bathrooms", "zipCode", "addonWarranty", "addonFilter", "addonRush"].forEach(
    function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", recalcQuote);
      if (el && el.type === "text") el.addEventListener("input", recalcQuote);
    }
  );

  /* Initial calc */
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

  /* ===== DISPATCH MAP (LEAFLET) ===== */
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

    /* Job markers */
    var jobs = [
      { name: "Kitchen Guard", customer: "C. Diaz", address: "1220 NW 12th Ave", time: "8:00 AM", tech: "Marco R.", lat: 25.778, lng: -80.215, color: "#00C9DB" },
      { name: "Water Test", customer: "P. Johnson", address: "445 Collins Ave", time: "9:00 AM", tech: "Ana T.", lat: 25.795, lng: -80.128, color: "#5B6BF5" },
      { name: "Home Shield", customer: "J. Rodriguez", address: "900 Biscayne Blvd", time: "10:00 AM", tech: "Marco R.", lat: 25.782, lng: -80.188, color: "#E8439A" },
      { name: "Filter Change", customer: "M. Santos", address: "1842 Brickell Ave", time: "1:00 PM", tech: "Ana T.", lat: 25.762, lng: -80.192, color: "#34D399" },
      { name: "Pure Life", customer: "N. Thompson", address: "3200 Coral Way", time: "2:00 PM", tech: "Luis G.", lat: 25.752, lng: -80.248, color: "#00C9DB" },
    ];

    jobs.forEach(function (job) {
      var icon = L.divIcon({
        className: "custom-job-marker",
        html: "<div style=\"width:14px;height:14px;background:" + job.color + ";border:2px solid #fff;border-radius:3px;box-shadow:0 0 8px " + job.color + ";\"></div>",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([job.lat, job.lng], { icon: icon })
        .addTo(map)
        .bindPopup(
          "<div class=\"popup-title\">" + job.name + " — " + job.customer + "</div>" +
          "<div class=\"popup-detail\">" + job.address + "</div>" +
          "<div class=\"popup-detail\">" + job.time + " · " + job.tech + "</div>"
        );
    });

    /* Technician markers (circle style) */
    var techs = [
      { name: "Marco R.", status: "On Job", lat: 25.776, lng: -80.212, color: "#FBBF24" },
      { name: "Ana T.", status: "Traveling", lat: 25.790, lng: -80.140, color: "#FBBF24" },
      { name: "Luis G.", status: "At Base", lat: 25.770, lng: -80.200, color: "#FBBF24" },
    ];

    techs.forEach(function (tech) {
      var icon = L.divIcon({
        className: "custom-tech-marker",
        html: "<div style=\"width:12px;height:12px;background:" + tech.color + ";border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px " + tech.color + ";\"></div>",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      L.marker([tech.lat, tech.lng], { icon: icon })
        .addTo(map)
        .bindPopup(
          "<div class=\"popup-title\">" + tech.name + "</div>" +
          "<div class=\"popup-detail\">" + tech.status + "</div>"
        );
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

    /* Populate modal with current quote data */
    var selectedRadio = document.querySelector("input[name=\"package\"]:checked");
    var selectedPkg = selectedRadio ? selectedRadio.value : "kitchen";
    var pkg = packagePricing[selectedPkg];
    var warrantyEl = document.getElementById("addonWarranty");
    var wantWarranty = warrantyEl ? warrantyEl.checked : false;
    var filterEl = document.getElementById("addonFilter");
    var wantFilter = filterEl ? filterEl.checked : false;
    var rushEl = document.getElementById("addonRush");
    var wantRush = rushEl ? rushEl.checked : false;

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

    /* Reset form state */
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

  /* Close modal on overlay click */
  if (stripeModal) {
    stripeModal.addEventListener("click", function (e) {
      if (e.target === stripeModal) closeStripeModal();
    });
  }

  /* Handle payment */
  if (modalPayBtn) {
    modalPayBtn.addEventListener("click", function () {
      /* Simulate processing */
      modalPayBtn.textContent = "Processing...";
      modalPayBtn.disabled = true;

      setTimeout(function () {
        if (stripeForm) stripeForm.style.display = "none";
        if (modalSuccess) modalSuccess.style.display = "block";
        modalPayBtn.disabled = false;
      }, 1500);
    });
  }

  /* Share Quote Link */
  if (shareQuoteBtn) {
    shareQuoteBtn.addEventListener("click", function () {
      var fakeId = "CF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      var fakeLink = "https://crystalflow.io/quote/" + fakeId;

      /* Try to copy to clipboard */
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fakeLink).then(function () {
          shareQuoteBtn.textContent = "Link Copied!";
          setTimeout(function () { shareQuoteBtn.textContent = "Share Quote Link"; }, 2000);
        });
      } else {
        shareQuoteBtn.textContent = "Link: " + fakeLink;
        setTimeout(function () { shareQuoteBtn.textContent = "Share Quote Link"; }, 3000);
      }
    });
  }

  /* ===== AUTOMATIONS VIEW ===== */
  var automationsData = [
    { id: 1, name: "Tech En Route", trigger: "Job status \u2192 In Progress", action: "SMS to customer \u201CYour technician [name] is on the way to [address]\u201D", last: "8:02 AM today", fires: 47, on: true, type: "sms" },
    { id: 2, name: "Install Complete", trigger: "Job status \u2192 Completed", action: "Email customer with review request + warranty PDF", last: "Yesterday 3:15 PM", fires: 32, on: true, type: "email" },
    { id: 3, name: "Appointment Reminder", trigger: "24h before appointment", action: "SMS + Email reminder with address and tech name", last: "Today 7:00 AM", fires: 89, on: true, type: "both" },
    { id: 4, name: "Quote Follow-Up", trigger: "48h after quote sent, no response", action: "SMS \u201CHi [name], wanted to check if you had questions about your CrystalFlow quote.\u201D", last: "Mar 8", fires: 15, on: true, type: "sms" },
    { id: 5, name: "Filter Change Due", trigger: "6 months after install", action: "Email + SMS with scheduling link", last: "Mar 5", fires: 8, on: true, type: "both" },
    { id: 6, name: "New Lead Alert", trigger: "New lead created", action: "Push notification + email to Isaiah", last: "Today 12:45 AM", fires: 127, on: true, type: "push" },
    { id: 7, name: "Review Request", trigger: "3 days after install", action: "SMS with Google review link", last: "Mar 7", fires: 22, on: false, type: "sms" },
    { id: 8, name: "Win-Back Campaign", trigger: "Lead lost for 30 days", action: "Email with 10% discount code", last: "Feb 28", fires: 5, on: false, type: "email" },
  ];

  var iconSVGs = {
    sms: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z\"/></svg>",
    email: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z\"/><path d=\"M22 6l-10 7L2 6\"/></svg>",
    push: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 01-3.46 0\"/></svg>",
    both: "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z\"/></svg>",
  };

  var typeBadgeLabels = {
    sms: "SMS",
    email: "Email",
    push: "Push",
    both: "SMS + Email",
  };

  var iconClasses = {
    sms: "sms",
    email: "email",
    push: "push",
    both: "both",
  };

  function renderAutomations() {
    var grid = document.getElementById("automationsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    automationsData.forEach(function (auto) {
      var card = document.createElement("div");
      card.className = "automation-card" + (auto.on ? "" : " off");
      card.innerHTML =
        "<div class=\"automation-card-top\">" +
          "<div class=\"automation-icon " + iconClasses[auto.type] + "\">" + iconSVGs[auto.type] + "</div>" +
          "<div class=\"automation-info\">" +
            "<div class=\"automation-name\">" + auto.name + "</div>" +
            "<div class=\"automation-trigger\">Trigger: " + auto.trigger + "</div>" +
            "<div class=\"automation-action\">Action: " + auto.action + "</div>" +
          "</div>" +
          "<label class=\"toggle-switch\">" +
            "<input type=\"checkbox\"" + (auto.on ? " checked" : "") + " data-auto-id=\"" + auto.id + "\">" +
            "<span class=\"toggle-slider\"></span>" +
          "</label>" +
        "</div>" +
        "<div class=\"automation-footer\">" +
          "<div class=\"automation-stats\">" +
            "<span>Last: " + auto.last + "</span>" +
            "<span>Total: " + auto.fires + "</span>" +
          "</div>" +
          "<span class=\"automation-type-badge\">" + typeBadgeLabels[auto.type] + "</span>" +
        "</div>";

      /* Toggle handler */
      var toggle = card.querySelector("input[type=\"checkbox\"]");
      toggle.addEventListener("change", function () {
        auto.on = toggle.checked;
        card.className = "automation-card" + (auto.on ? "" : " off");
      });

      grid.appendChild(card);
    });
  }

  /* Initialize automations on load */
  renderAutomations();

  /* Header CTA actions */
  if (headerCTA) {
    headerCTA.addEventListener("click", function () {
      var activeView = document.querySelector(".view.active");
      if (!activeView) return;
      var viewId = activeView.id.replace("view-", "");
      if (viewId === "automations") {
        alert("New automation builder coming soon!");
      } else if (viewId === "dispatch") {
        alert("New job scheduler coming soon!");
      } else {
        alert(ctaLabels[viewId] + " — coming soon!");
      }
    });
  }
})();
