/* CrystalFlow Miami — Customer Self-Service Portal */

(function () {
  "use strict";

  /* ===== LOGIN ===== */
  var loginScreen = document.getElementById("loginScreen");
  var portalShell = document.getElementById("portalShell");
  var loginForm = document.getElementById("loginForm");
  var signOutBtn = document.getElementById("signOutBtn");

  function showPortal() {
    loginScreen.classList.add("hidden");
    setTimeout(function () {
      portalShell.classList.add("active");
    }, 200);
  }

  function showLogin() {
    portalShell.classList.remove("active");
    setTimeout(function () {
      loginScreen.classList.remove("hidden");
    }, 200);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      showPortal();
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", function () {
      showLogin();
    });
  }

  /* ===== TAB NAVIGATION ===== */
  var navItems = document.querySelectorAll(".portal-nav-item[data-tab]");
  var tabViews = document.querySelectorAll(".portal-view");
  var tdsChartCreated = false;

  function switchTab(tabId) {
    navItems.forEach(function (item) { item.classList.remove("active"); });
    tabViews.forEach(function (view) { view.classList.remove("active"); });

    var navTarget = document.querySelector(".portal-nav-item[data-tab=\"" + tabId + "\"]");
    var viewTarget = document.getElementById("tab-" + tabId);

    if (navTarget) navTarget.classList.add("active");
    if (viewTarget) viewTarget.classList.add("active");

    /* Initialize TDS chart on first visit to system tab */
    if (tabId === "system" && !tdsChartCreated) {
      tdsChartCreated = true;
      setTimeout(initTDSChart, 100);
    }
  }

  navItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      switchTab(item.dataset.tab);
    });
  });

  /* Quick action buttons navigate to tabs */
  document.querySelectorAll(".quick-action-btn[data-action]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      switchTab(btn.dataset.action);
    });
  });

  /* ===== WATER QUALITY CHART ===== */
  function initTDSChart() {
    var ctx = document.getElementById("tdsChart");
    if (!ctx) return;

    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Before Install", "After Install", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026"],
        datasets: [{
          label: "TDS (ppm)",
          data: [380, 12, 12, 14, 11, 13],
          borderColor: "#00C9DB",
          backgroundColor: "rgba(0, 201, 219, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#00C9DB",
          pointBorderColor: "#FFFFFF",
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx2) { return ctx2.parsed.y + " ppm"; },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (v) { return v + " ppm"; },
              color: "#9B98B5",
            },
            grid: { color: "rgba(216, 218, 229, 0.5)" },
          },
          x: {
            ticks: { color: "#9B98B5", font: { size: 10 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  /* ===== SERVICE REQUEST FORM ===== */
  var serviceForm = document.getElementById("serviceForm");
  var serviceFormCard = document.getElementById("serviceFormCard");
  var serviceSuccess = document.getElementById("serviceSuccess");
  var newRequestBtn = document.getElementById("newRequestBtn");

  if (serviceForm) {
    serviceForm.addEventListener("submit", function (e) {
      e.preventDefault();
      serviceFormCard.style.display = "none";
      serviceSuccess.classList.add("visible");
    });
  }

  if (newRequestBtn) {
    newRequestBtn.addEventListener("click", function () {
      serviceSuccess.classList.remove("visible");
      serviceFormCard.style.display = "block";
      serviceForm.reset();
    });
  }

  /* ===== PAYMENT MODAL ===== */
  var payModal = document.getElementById("payModal");
  var payNowBtn = document.getElementById("payNowBtn");
  var payModalClose = document.getElementById("payModalClose");
  var paySubmitBtn = document.getElementById("paySubmitBtn");
  var payFormSection = document.getElementById("payFormSection");
  var paySuccess = document.getElementById("paySuccess");
  var paySuccessClose = document.getElementById("paySuccessClose");

  function openPayModal() {
    if (!payModal) return;
    payFormSection.style.display = "block";
    paySuccess.classList.remove("visible");
    payModal.classList.add("active");
  }

  function closePayModal() {
    if (payModal) payModal.classList.remove("active");
  }

  if (payNowBtn) payNowBtn.addEventListener("click", openPayModal);
  if (payModalClose) payModalClose.addEventListener("click", closePayModal);
  if (paySuccessClose) paySuccessClose.addEventListener("click", closePayModal);

  if (payModal) {
    payModal.addEventListener("click", function (e) {
      if (e.target === payModal) closePayModal();
    });
  }

  if (paySubmitBtn) {
    paySubmitBtn.addEventListener("click", function () {
      paySubmitBtn.textContent = "Processing...";
      paySubmitBtn.disabled = true;

      setTimeout(function () {
        payFormSection.style.display = "none";
        paySuccess.classList.add("visible");
        paySubmitBtn.textContent = "Pay $99.00";
        paySubmitBtn.disabled = false;
      }, 1500);
    });
  }
})();
