/* CrystalFlow Miami — Customer Self-Service Portal
   Wired to live API at crystalflow-api.onrender.com */

(function () {
  "use strict";

  var API_BASE = "https://crystalflow-api.onrender.com";

  /* ===== STATE ===== */
  var authToken = localStorage.getItem("cf_portal_token") || null;
  var currentCustomer = null;

  /* ===== DOM REFS ===== */
  var loginScreen = document.getElementById("loginScreen");
  var portalShell = document.getElementById("portalShell");
  var loginForm = document.getElementById("loginForm");
  var signOutBtn = document.getElementById("signOutBtn");
  var loginError = document.getElementById("loginError");
  var registerLink = document.getElementById("registerLink");
  var loginLink = document.getElementById("loginLink");
  var registerForm = document.getElementById("registerForm");
  var registerError = document.getElementById("registerError");
  var loginSection = document.getElementById("loginSection");
  var registerSection = document.getElementById("registerSection");

  /* ===== API HELPERS ===== */
  function apiPortal(path) {
    return fetch(API_BASE + path, {
      headers: { "Authorization": "Bearer " + authToken }
    }).then(function (r) {
      if (r.status === 401) { signOut(); throw new Error("Session expired"); }
      if (!r.ok) throw new Error("API error: " + r.status);
      return r.json();
    });
  }

  function apiPortalPost(path, body) {
    return fetch(API_BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (authToken || "")
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) {
        return r.json().then(function (data) {
          throw new Error(data.detail || "API error: " + r.status);
        }).catch(function (err) {
          if (err.message.indexOf("API error") === 0 || err.message.indexOf("detail") >= 0) throw err;
          throw new Error("API error: " + r.status);
        });
      }
      return r.json();
    });
  }

  /* ===== AUTH FLOW ===== */
  function showPortal() {
    if (loginScreen) loginScreen.classList.add("hidden");
    setTimeout(function () {
      if (portalShell) portalShell.classList.add("active");
    }, 200);
  }

  function showLogin() {
    if (portalShell) portalShell.classList.remove("active");
    setTimeout(function () {
      if (loginScreen) loginScreen.classList.remove("hidden");
    }, 200);
    /* Show login form, hide register */
    if (loginSection) loginSection.style.display = "block";
    if (registerSection) registerSection.style.display = "none";
  }

  function signOut() {
    authToken = null;
    currentCustomer = null;
    localStorage.removeItem("cf_portal_token");
    showLogin();
  }

  /* Login */
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailEl = loginForm.querySelector('input[type="email"]');
      var passEl = loginForm.querySelector('input[type="password"]');
      if (!emailEl || !passEl) return;

      var submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = "Signing in..."; submitBtn.disabled = true; }
      if (loginError) loginError.style.display = "none";

      apiPortalPost("/api/portal/login", {
        email: emailEl.value,
        password: passEl.value
      }).then(function (data) {
        authToken = data.access_token;
        localStorage.setItem("cf_portal_token", authToken);
        if (data.customer) {
          currentCustomer = data.customer;
          populateProfile(data.customer);
        }
        loadCustomerData();
        showPortal();
      }).catch(function (err) {
        if (loginError) {
          loginError.textContent = err.message === "API error: 401" ? "Invalid email or password" : err.message;
          loginError.style.display = "block";
        }
      }).finally(function () {
        if (submitBtn) { submitBtn.textContent = "Sign In"; submitBtn.disabled = false; }
      });
    });
  }

  /* Register */
  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameEl = registerForm.querySelector('input[name="name"]');
      var emailEl = registerForm.querySelector('input[type="email"]');
      var phoneEl = registerForm.querySelector('input[type="tel"]');
      var passEl = registerForm.querySelector('input[type="password"]');
      if (!emailEl || !passEl || !nameEl) return;

      var submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.textContent = "Creating account..."; submitBtn.disabled = true; }
      if (registerError) registerError.style.display = "none";

      var nameParts = nameEl.value.trim().split(" ");
      var firstName = nameParts[0] || "";
      var lastName = nameParts.slice(1).join(" ") || "";

      apiPortalPost("/api/portal/register", {
        first_name: firstName,
        last_name: lastName || firstName,
        email: emailEl.value,
        phone: phoneEl ? phoneEl.value : "",
        password: passEl.value
      }).then(function (data) {
        authToken = data.access_token;
        localStorage.setItem("cf_portal_token", authToken);
        if (data.customer) {
          currentCustomer = data.customer;
          populateProfile(data.customer);
        }
        loadCustomerData();
        showPortal();
      }).catch(function (err) {
        if (registerError) {
          registerError.textContent = err.message;
          registerError.style.display = "block";
        }
      }).finally(function () {
        if (submitBtn) { submitBtn.textContent = "Create Account"; submitBtn.disabled = false; }
      });
    });
  }

  /* Toggle login / register */
  if (registerLink) {
    registerLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (loginSection) loginSection.style.display = "none";
      if (registerSection) registerSection.style.display = "block";
    });
  }
  if (loginLink) {
    loginLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (registerSection) registerSection.style.display = "none";
      if (loginSection) loginSection.style.display = "block";
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", signOut);
  }

  /* ===== LOAD CUSTOMER DATA ===== */
  function loadCustomerData() {
    /* Load profile */
    apiPortal("/api/portal/me").then(function (customer) {
      currentCustomer = customer;
      populateProfile(customer);
    }).catch(function () { /* handle silently */ });

    /* Load appointments */
    apiPortal("/api/portal/appointments").then(function (data) {
      populateActivity(data);
    }).catch(function () { /* handle silently */ });

    /* Load invoices */
    apiPortal("/api/portal/invoices").then(function (data) {
      populateInvoices(data);
    }).catch(function () { /* handle silently */ });

    /* Load warranty */
    apiPortal("/api/portal/warranty").then(function (data) {
      populateWarranty(data);
    }).catch(function () { /* handle silently */ });

    /* Load system info */
    apiPortal("/api/portal/system").then(function (data) {
      populateSystem(data);
    }).catch(function () { /* handle silently */ });
  }

  /* ===== POPULATE PROFILE ===== */
  function populateProfile(customer) {
    var nameEl = document.querySelector(".profile-name");
    var emailEl = document.querySelector(".profile-email");
    var avatarEl = document.querySelector(".profile-avatar");
    var greetingEl = document.getElementById("portalGreetingName");

    var fullName = (customer.first_name || "") + " " + (customer.last_name || "");
    fullName = fullName.trim() || "Customer";
    if (nameEl) nameEl.textContent = fullName;
    if (emailEl) emailEl.textContent = customer.email || "";
    if (greetingEl) greetingEl.textContent = customer.first_name || "there";
    if (avatarEl) {
      var initials = (customer.first_name ? customer.first_name[0] : "") + (customer.last_name ? customer.last_name[0] : "");
      avatarEl.textContent = initials.toUpperCase() || "?";
    }

    /* Update profile info rows */
    var infoRows = document.querySelectorAll(".profile-info-row");
    infoRows.forEach(function (row) {
      var label = row.querySelector(".profile-info-label");
      var value = row.querySelector(".profile-info-value");
      if (!label || !value) return;
      var labelText = label.textContent.toLowerCase();
      if (labelText === "phone") value.textContent = customer.phone || "Not provided";
      else if (labelText === "address") value.textContent = (customer.address || "Not provided") + (customer.zip_code ? ", " + customer.zip_code : "");
      else if (labelText === "package") value.textContent = customer.package_installed || "Pending";
      else if (labelText.indexOf("install") >= 0) value.textContent = customer.install_date || "Not scheduled";
    });
  }

  /* ===== POPULATE ACTIVITY ===== */
  function populateActivity(appointments) {
    var timeline = document.querySelector("#portal-activity .timeline");
    if (!timeline || !appointments || appointments.length === 0) return;

    timeline.innerHTML = "";
    appointments.forEach(function (appt) {
      var item = document.createElement("div");
      item.className = "timeline-item";
      var dotClass = appt.status === "completed" ? "success" : (appt.status === "scheduled" ? "cyan" : "violet");
      var time = appt.date + (appt.start_time ? " at " + appt.start_time : "");
      item.innerHTML =
        '<div class="timeline-dot ' + dotClass + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
        '</div>' +
        '<div class="timeline-content">' +
          '<div class="timeline-title">' + (appt.service_type || "Appointment") + '</div>' +
          '<div class="timeline-desc">Status: ' + (appt.status || "Pending") + '</div>' +
          '<div class="timeline-time">' + time + '</div>' +
        '</div>';
      timeline.appendChild(item);
    });
  }

  /* ===== POPULATE INVOICES ===== */
  function populateInvoices(invoices) {
    var tbody = document.querySelector("#portal-invoices .data-table tbody");
    if (!tbody || !invoices || invoices.length === 0) return;

    tbody.innerHTML = "";
    invoices.forEach(function (inv) {
      var tr = document.createElement("tr");
      var statusClass = inv.status === "paid" ? "badge-completed" : "badge-pending";
      var statusText = inv.status === "paid" ? "Paid" : "Pending";
      tr.innerHTML =
        '<td>#' + (inv.invoice_number || inv.id) + '</td>' +
        '<td>' + (inv.date || inv.created_at || "") + '</td>' +
        '<td>' + (inv.description || "") + '</td>' +
        '<td>$' + (inv.amount ? Number(inv.amount).toLocaleString("en-US", {minimumFractionDigits: 2}) : "0.00") + '</td>' +
        '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>';
      tbody.appendChild(tr);
    });
  }

  /* ===== POPULATE WARRANTY ===== */
  function populateWarranty(warranty) {
    if (!warranty) return;
    var titleEl = document.querySelector("#portal-warranty .warranty-title");
    var subtitleEl = document.querySelector("#portal-warranty .warranty-subtitle");
    if (titleEl && warranty.type) titleEl.textContent = warranty.type;
    if (subtitleEl && warranty.system_name) subtitleEl.textContent = warranty.system_name;

    /* Update progress bar */
    var progressBar = document.querySelector("#portal-warranty .warranty-progress-bar");
    if (progressBar && warranty.start_date && warranty.end_date) {
      var start = new Date(warranty.start_date).getTime();
      var end = new Date(warranty.end_date).getTime();
      var now = Date.now();
      var pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
      progressBar.style.width = pct.toFixed(1) + "%";
    }

    /* Update dates */
    var dates = document.querySelector("#portal-warranty .warranty-dates");
    if (dates && warranty.start_date && warranty.end_date) {
      dates.innerHTML =
        '<span>Start: ' + formatDate(warranty.start_date) + '</span>' +
        '<span>Expires: ' + formatDate(warranty.end_date) + '</span>';
    }
  }

  /* ===== POPULATE SYSTEM ===== */
  function populateSystem(system) {
    if (!system) return;
    /* Update TDS reading if available */
    var tdsEl = document.querySelector(".tds-current-value");
    if (tdsEl && system.current_tds !== undefined) {
      tdsEl.textContent = system.current_tds + " ppm";
    }
  }

  /* ===== HELPER ===== */
  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          borderColor: "#00A5A8",
          backgroundColor: "rgba(0, 165, 168, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: "#00A5A8",
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

      var typeEl = serviceForm.querySelector("select");
      var descEl = serviceForm.querySelector("textarea");
      var submitBtn = serviceForm.querySelector('button[type="submit"]');

      if (submitBtn) { submitBtn.textContent = "Submitting..."; submitBtn.disabled = true; }

      apiPortalPost("/api/portal/service-requests", {
        category: typeEl ? typeEl.value : "general",
        description: descEl ? descEl.value : "Service request",
        priority: "medium"
      }).then(function () {
        if (serviceFormCard) serviceFormCard.style.display = "none";
        if (serviceSuccess) serviceSuccess.classList.add("visible");
      }).catch(function (err) {
        alert("Failed to submit request: " + err.message);
      }).finally(function () {
        if (submitBtn) { submitBtn.textContent = "Submit Request"; submitBtn.disabled = false; }
      });
    });
  }

  if (newRequestBtn) {
    newRequestBtn.addEventListener("click", function () {
      if (serviceSuccess) serviceSuccess.classList.remove("visible");
      if (serviceFormCard) serviceFormCard.style.display = "block";
      if (serviceForm) serviceForm.reset();
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
    if (payFormSection) payFormSection.style.display = "block";
    if (paySuccess) paySuccess.classList.remove("visible");
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
        if (payFormSection) payFormSection.style.display = "none";
        if (paySuccess) paySuccess.classList.add("visible");
        paySubmitBtn.textContent = "Pay $99.00";
        paySubmitBtn.disabled = false;
      }, 1500);
    });
  }

  /* ===== AUTO-LOGIN CHECK ===== */
  if (authToken) {
    /* Validate existing token */
    apiPortal("/api/portal/me").then(function (customer) {
      currentCustomer = customer;
      populateProfile(customer);
      showPortal();
      loadCustomerData();
    }).catch(function () {
      /* Token expired, show login */
      signOut();
    });
  }
})();
