"use strict";

/* =========================================================
   PAY TRACKER
   COMPLETE APPLICATION CONTROLLER
========================================================= */

(() => {
  /* =======================================================
     APPLICATION CONSTANTS
  ======================================================== */

  const APP_NAME = "Pay Tracker";

  const STORAGE_KEYS = {
    shifts: "payTracker.shifts",
    employers: "payTracker.employers",
    activeRoute: "payTracker.activeRoute",
    appearance: "payTracker.appearance"
  };

  const DEFAULT_EMPLOYERS = [
    {
      id: "seaworld",
      name: "SeaWorld",
      jobNumber: 1,
      employmentType: "casual",
      baseRate: 46.98,
      colour: "blue",
      claimsTaxFreeThreshold: true,
      withholdsTax: true
    },
    {
      id: "queensland-health",
      name: "Queensland Health",
      jobNumber: 2,
      employmentType: "casual",
      baseRate: 46.98,
      colour: "green",
      claimsTaxFreeThreshold: false,
      withholdsTax: true
    }
  ];

  const SAMPLE_SHIFTS = [
    {
      id: "example-health-shift",
      employerId: "queensland-health",
      date: "2026-07-06",
      startTime: "08:00",
      finishTime: "16:00",
      breakMinutes: 0,
      notes: "",
      paidHours: 8,
      grossPay: 375.84,
      taxWithheld: 0,
      isSample: true,
      createdAt: "2026-07-06T16:00:00.000Z"
    },
    {
      id: "example-seaworld-shift",
      employerId: "seaworld",
      date: "2026-07-11",
      startTime: "17:30",
      finishTime: "05:00",
      breakMinutes: 30,
      notes: "",
      paidHours: 11,
      grossPay: 516.78,
      taxWithheld: 0,
      isSample: true,
      createdAt: "2026-07-11T17:30:00.000Z"
    }
  ];

  const ROUTES = [
    "home",
    "shifts",
    "payroll",
    "reports",
    "settings"
  ];

  const DEFAULT_PAY_PERIOD = {
    start: "2026-06-29",
    end: "2026-07-12"
  };

  const SUPER_RATE = 0.12;

  /* =======================================================
     APPLICATION STATE
  ======================================================== */

  const state = {
    route: "home",
    employers: [],
    shifts: [],
    activeShiftId: null,
    activeEmployerId: null,
    confirmationAction: null
  };

  /* =======================================================
     DOM HELPERS
  ======================================================== */

  function getElement(id) {
    return document.getElementById(id);
  }

  function query(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function queryAll(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  function setText(id, value) {
    const element = getElement(id);

    if (element) {
      element.textContent = value;
    }
  }

  function safelyFocus(element) {
    if (!element || typeof element.focus !== "function") {
      return;
    }

    window.requestAnimationFrame(() => {
      element.focus();
    });
  }

  /* =======================================================
     GENERAL UTILITIES
  ======================================================== */

  function createId(prefix = "item") {
    const randomPart =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${randomPart}`;
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function roundCurrency(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return Math.round((numericValue + Number.EPSILON) * 100) / 100;
  }

  function roundHours(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return Math.round((numericValue + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    const numericValue = Number(value);

    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number.isFinite(numericValue) ? numericValue : 0);
  }

  function formatHours(value) {
    const numericValue = Number(value);

    return `${Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00"} hrs`;
  }

  function formatShiftCount(value) {
    const numericValue = Number(value) || 0;

    return `${numericValue} ${numericValue === 1 ? "shift" : "shifts"}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseDate(dateString) {
    if (!dateString) {
      return null;
    }

    const [year, month, day] = dateString
      .split("-")
      .map((part) => Number(part));

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

  function formatDateRangeDate(dateString) {
    const date = parseDate(dateString);

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function formatLongDate(dateString) {
    const date = parseDate(dateString);

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatTime(timeString) {
    if (!timeString || !timeString.includes(":")) {
      return "";
    }

    const [hours, minutes] = timeString
      .split(":")
      .map((part) => Number(part));

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  function getDateParts(dateString) {
    const date = parseDate(dateString);

    if (!date) {
      return {
        weekday: "",
        day: "",
        month: ""
      };
    }

    return {
      weekday: new Intl.DateTimeFormat("en-AU", {
        weekday: "short"
      }).format(date),

      day: new Intl.DateTimeFormat("en-AU", {
        day: "numeric"
      }).format(date),

      month: new Intl.DateTimeFormat("en-AU", {
        month: "short"
      }).format(date)
    };
  }

  function isDateInsideRange(dateString, startString, endString) {
    const date = parseDate(dateString);
    const start = parseDate(startString);
    const end = parseDate(endString);

    if (!date || !start || !end) {
      return false;
    }

    return date >= start && date <= end;
  }

  function compareShiftsNewestFirst(shiftA, shiftB) {
    const dateA = parseDate(shiftA.date);
    const dateB = parseDate(shiftB.date);

    if (!dateA || !dateB) {
      return 0;
    }

    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }

    return String(shiftB.startTime).localeCompare(
      String(shiftA.startTime)
    );
  }

  /* =======================================================
     STORAGE FALLBACK
  ======================================================== */

  function loadJson(key, fallbackValue) {
    try {
      const rawValue = localStorage.getItem(key);

      if (!rawValue) {
        return cloneData(fallbackValue);
      }

      const parsedValue = JSON.parse(rawValue);

      return parsedValue ?? cloneData(fallbackValue);
    } catch (error) {
      console.error(`Unable to load ${key}:`, error);
      return cloneData(fallbackValue);
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Unable to save ${key}:`, error);
      return false;
    }
  }

  function saveState() {
    saveJson(STORAGE_KEYS.employers, state.employers);
    saveJson(STORAGE_KEYS.shifts, state.shifts);
  }

  function loadState() {
    const savedEmployers = loadJson(
      STORAGE_KEYS.employers,
      DEFAULT_EMPLOYERS
    );

    const savedShifts = loadJson(
      STORAGE_KEYS.shifts,
      SAMPLE_SHIFTS
    );

    state.employers =
      Array.isArray(savedEmployers) && savedEmployers.length > 0
        ? savedEmployers
        : cloneData(DEFAULT_EMPLOYERS);

    state.shifts = Array.isArray(savedShifts)
      ? savedShifts
      : cloneData(SAMPLE_SHIFTS);

    const savedRoute = localStorage.getItem(
      STORAGE_KEYS.activeRoute
    );

    state.route = ROUTES.includes(savedRoute)
      ? savedRoute
      : "home";
  }

  /* =======================================================
     EMPLOYER UTILITIES
  ======================================================== */

  function getEmployer(employerId) {
    return (
      state.employers.find(
        (employer) => employer.id === employerId
      ) ?? null
    );
  }

  function getEmployerName(employerId) {
    return getEmployer(employerId)?.name ?? "Unknown employer";
  }

  function getEmployerRate(employerId) {
    const rate = Number(getEmployer(employerId)?.baseRate);

    return Number.isFinite(rate) && rate >= 0 ? rate : 0;
  }

  function getEmployerColour(employerId) {
    return getEmployer(employerId)?.colour ?? "blue";
  }

  function getEmployerShifts(employerId) {
    return state.shifts.filter(
      (shift) => shift.employerId === employerId
    );
  }

  /* =======================================================
     SHIFT CALCULATIONS
  ======================================================== */

  function timeToMinutes(timeString) {
    if (!timeString || !timeString.includes(":")) {
      return null;
    }

    const [hours, minutes] = timeString
      .split(":")
      .map((part) => Number(part));

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  function calculatePaidHours(
    startTime,
    finishTime,
    breakMinutes = 0
  ) {
    const startMinutes = timeToMinutes(startTime);
    let finishMinutes = timeToMinutes(finishTime);

    if (startMinutes === null || finishMinutes === null) {
      return 0;
    }

    if (finishMinutes <= startMinutes) {
      finishMinutes += 24 * 60;
    }

    const unpaidBreak = Math.max(
      0,
      Number(breakMinutes) || 0
    );

    const paidMinutes = Math.max(
      0,
      finishMinutes - startMinutes - unpaidBreak
    );

    return roundHours(paidMinutes / 60);
  }

  function calculateBasicGrossPay(employerId, paidHours) {
    const rate = getEmployerRate(employerId);

    return roundCurrency(rate * paidHours);
  }

  function calculateEstimatedTax(grossPay) {
    const gross = Math.max(0, Number(grossPay) || 0);

    if (gross <= 700) {
      return 0;
    }

    if (gross <= 1500) {
      return roundCurrency((gross - 700) * 0.19);
    }

    if (gross <= 3000) {
      return roundCurrency(
        152 + (gross - 1500) * 0.325
      );
    }

    return roundCurrency(
      639.5 + (gross - 3000) * 0.37
    );
  }

  function calculateShiftValues(shiftInput) {
    const paidHours = calculatePaidHours(
      shiftInput.startTime,
      shiftInput.finishTime,
      shiftInput.breakMinutes
    );

    const grossPay = calculateBasicGrossPay(
      shiftInput.employerId,
      paidHours
    );

    return {
      paidHours,
      grossPay
    };
  }

  /* =======================================================
     PAY PERIOD
  ======================================================== */

  function getCurrentPayPeriod() {
    return {
      start: DEFAULT_PAY_PERIOD.start,
      end: DEFAULT_PAY_PERIOD.end
    };
  }

  function getCurrentPayPeriodShifts() {
    const period = getCurrentPayPeriod();

    return state.shifts.filter((shift) =>
      isDateInsideRange(
        shift.date,
        period.start,
        period.end
      )
    );
  }

  function getFortnightProgress() {
    const period = getCurrentPayPeriod();

    const start = parseDate(period.start);
    const end = parseDate(period.end);
    const today = new Date();

    if (!start || !end) {
      return 0;
    }

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    if (startOfToday <= start) {
      return 0;
    }

    if (startOfToday >= end) {
      return 100;
    }

    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration =
      startOfToday.getTime() - start.getTime();

    return Math.max(
      0,
      Math.min(
        100,
        Math.round((elapsedDuration / totalDuration) * 100)
      )
    );
  }

  function getPayPeriodDaysRemaining() {
    const period = getCurrentPayPeriod();
    const end = parseDate(period.end);
    const today = new Date();

    if (!end) {
      return 0;
    }

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const difference =
      end.getTime() - todayStart.getTime();

    return Math.max(
      0,
      Math.ceil(difference / 86400000)
    );
  }

  /* =======================================================
     PAYROLL SUMMARIES
  ======================================================== */

  function createEmptySummary() {
    return {
      grossPay: 0,
      paidHours: 0,
      shiftCount: 0,
      taxWithheld: 0,
      superEstimate: 0,
      netEstimate: 0
    };
  }

  function summariseShifts(shifts) {
    const summary = shifts.reduce(
      (result, shift) => {
        const paidHours = Number(shift.paidHours) || 0;
        const grossPay = Number(shift.grossPay) || 0;
        const taxWithheld =
          Number(shift.taxWithheld) || 0;

        result.paidHours += paidHours;
        result.grossPay += grossPay;
        result.taxWithheld += taxWithheld;
        result.shiftCount += 1;

        return result;
      },
      createEmptySummary()
    );

    summary.paidHours = roundHours(summary.paidHours);
    summary.grossPay = roundCurrency(summary.grossPay);
    summary.taxWithheld = roundCurrency(
      summary.taxWithheld
    );
    summary.superEstimate = roundCurrency(
      summary.grossPay * SUPER_RATE
    );

    return summary;
  }

  function getDashboardSummary() {
    const currentShifts = getCurrentPayPeriodShifts();

    const employerSummaries = {};

    state.employers.forEach((employer) => {
      const employerShifts = currentShifts.filter(
        (shift) => shift.employerId === employer.id
      );

      employerSummaries[employer.id] =
        summariseShifts(employerShifts);
    });

    const combinedSummary = summariseShifts(currentShifts);

    const estimatedCombinedTax = calculateEstimatedTax(
      combinedSummary.grossPay
    );

    combinedSummary.estimatedCombinedTax =
      estimatedCombinedTax;

    combinedSummary.netEstimate = roundCurrency(
      combinedSummary.grossPay - estimatedCombinedTax
    );

    return {
      employerSummaries,
      combinedSummary
    };
  }

  /* =======================================================
     NAVIGATION
  ======================================================== */

  function navigateTo(route, options = {}) {
    const nextRoute = ROUTES.includes(route)
      ? route
      : "home";

    state.route = nextRoute;

    localStorage.setItem(
      STORAGE_KEYS.activeRoute,
      nextRoute
    );

    queryAll("[data-screen]").forEach((screen) => {
      const isActive =
        screen.dataset.screen === nextRoute;

      screen.classList.toggle("is-active", isActive);
      screen.hidden = !isActive;
    });

    queryAll("[data-route]").forEach((button) => {
      const isActive =
        button.dataset.route === nextRoute;

      if (
        button.classList.contains(
          "bottom-navigation-item"
        ) ||
        button.classList.contains("side-menu-link")
      ) {
        button.classList.toggle("is-active", isActive);
      }

      if (
        button.classList.contains(
          "bottom-navigation-item"
        )
      ) {
        if (isActive) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      }
    });

    closeMenu();

    if (nextRoute === "shifts") {
      renderAllShifts();
    }

    if (nextRoute === "payroll") {
      renderPayrollScreen();
    }

    if (nextRoute === "settings") {
      renderEmployerSettingsList();
    }

    if (!options.preserveScroll) {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  }

  /* =======================================================
     SIDE MENU
  ======================================================== */

  function openMenu() {
    const menu = getElement("side-menu");
    const overlay = getElement("menu-overlay");
    const menuButton = getElement("menu-button");

    if (!menu || !overlay) {
      return;
    }

    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");

    overlay.classList.add("is-visible");
    overlay.tabIndex = 0;

    menuButton?.setAttribute("aria-expanded", "true");

    document.body.classList.add("menu-open");

    safelyFocus(getElement("close-menu-button"));
  }

  function closeMenu() {
    const menu = getElement("side-menu");
    const overlay = getElement("menu-overlay");
    const menuButton = getElement("menu-button");

    if (!menu || !overlay) {
      return;
    }

    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");

    overlay.classList.remove("is-visible");
    overlay.tabIndex = -1;

    menuButton?.setAttribute("aria-expanded", "false");

    document.body.classList.remove("menu-open");
  }

  /* =======================================================
     MODALS
  ======================================================== */

  function getOpenDialogs() {
    return queryAll("dialog[open]");
  }

  function openModal(modalId) {
    const modal = getElement(modalId);

    if (!modal || !(modal instanceof HTMLDialogElement)) {
      return;
    }

    getOpenDialogs().forEach((openDialog) => {
      if (openDialog !== modal) {
        openDialog.close();
      }
    });

    closeMenu();

    try {
      modal.showModal();
    } catch (error) {
      modal.setAttribute("open", "");
    }

    document.body.classList.add("modal-open");

    const firstInput = query(
      "input:not([type='hidden']), select, textarea, button",
      modal
    );

    safelyFocus(firstInput);
  }

  function closeModal(modal) {
    const targetModal =
      typeof modal === "string"
        ? getElement(modal)
        : modal;

    if (
      !targetModal ||
      !(targetModal instanceof HTMLDialogElement)
    ) {
      return;
    }

    try {
      targetModal.close();
    } catch (error) {
      targetModal.removeAttribute("open");
    }

    if (getOpenDialogs().length === 0) {
      document.body.classList.remove("modal-open");
    }
  }

  function closeAllModals() {
    getOpenDialogs().forEach((modal) => {
      closeModal(modal);
    });
  }

  /* =======================================================
     TOAST NOTIFICATIONS
  ======================================================== */

  function showToast({
    title,
    message = "",
    type = "default",
    duration = 3500
  }) {
    const container = getElement("toast-container");

    if (!container) {
      return;
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");

    const iconMap = {
      success: "✓",
      error: "×",
      warning: "!",
      default: "i"
    };

    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">
        ${iconMap[type] ?? iconMap.default}
      </div>

      <div class="toast-content">
        <strong>${escapeHtml(title)}</strong>
        ${
          message
            ? `<p>${escapeHtml(message)}</p>`
            : ""
        }
      </div>
    `;

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("is-leaving");

      window.setTimeout(() => {
        toast.remove();
      }, 200);
    }, duration);
  }

  /* =======================================================
     CONFIRMATION MODAL
  ======================================================== */

  function requestConfirmation({
    title,
    message,
    confirmText = "Confirm",
    onConfirm
  }) {
    const modal = getElement("confirmation-modal");

    if (!modal) {
      return;
    }

    setText("confirmation-title", title);
    setText("confirmation-message", message);
    setText(
      "confirmation-confirm-button",
      confirmText
    );

    state.confirmationAction =
      typeof onConfirm === "function"
        ? onConfirm
        : null;

    openModal("confirmation-modal");
  }

  function handleConfirmationConfirm() {
    const action = state.confirmationAction;

    state.confirmationAction = null;
    closeModal("confirmation-modal");

    if (typeof action === "function") {
      action();
    }
  }

  function handleConfirmationCancel() {
    state.confirmationAction = null;
    closeModal("confirmation-modal");
  }

  /* =======================================================
     HOME DASHBOARD RENDERING
  ======================================================== */

  function renderPayPeriod() {
    const period = getCurrentPayPeriod();

    setText(
      "current-pay-period-dates",
      `${formatDateRangeDate(period.start)} – ${formatDateRangeDate(period.end)}`
    );

    const daysRemaining = getPayPeriodDaysRemaining();

    const countdownText =
      daysRemaining === 0
        ? "Pay period complete"
        : `${daysRemaining} ${
            daysRemaining === 1 ? "day" : "days"
          } to go`;

    setText(
      "pay-period-countdown",
      countdownText
    );

    const progress = getFortnightProgress();

    const progressBar = getElement(
      "fortnight-progress-bar"
    );

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    const progressTrack = query(
      ".progress-track"
    );

    progressTrack?.setAttribute(
      "aria-valuenow",
      String(progress)
    );

    setText(
      "fortnight-progress-percentage",
      `${progress}%`
    );
  }

  function renderSummaryCard(
    employerId,
    summary
  ) {
    if (employerId === "seaworld") {
      setText(
        "seaworld-gross-pay",
        formatCurrency(summary.grossPay)
      );

      setText(
        "seaworld-hours",
        formatHours(summary.paidHours)
      );

      setText(
        "seaworld-shifts",
        formatShiftCount(summary.shiftCount)
      );

      setText(
        "seaworld-tax",
        formatCurrency(summary.taxWithheld)
      );

      return;
    }

    if (employerId === "queensland-health") {
      setText(
        "health-gross-pay",
        formatCurrency(summary.grossPay)
      );

      setText(
        "health-hours",
        formatHours(summary.paidHours)
      );

      setText(
        "health-shifts",
        formatShiftCount(summary.shiftCount)
      );

      setText(
        "health-tax",
        formatCurrency(summary.taxWithheld)
      );
    }
  }

  function renderDashboardTotals() {
    const {
      employerSummaries,
      combinedSummary
    } = getDashboardSummary();

    state.employers.forEach((employer) => {
      renderSummaryCard(
        employer.id,
        employerSummaries[employer.id] ??
          createEmptySummary()
      );
    });

    setText(
      "total-gross-pay-value",
      combinedSummary.grossPay.toLocaleString(
        "en-AU",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );

    setText(
      "total-net-pay-value",
      formatCurrency(combinedSummary.netEstimate)
    );

    setText(
      "total-tax-value",
      formatCurrency(
        combinedSummary.estimatedCombinedTax
      )
    );

    setText(
      "total-super-value",
      formatCurrency(
        combinedSummary.superEstimate
      )
    );

    setText(
      "total-hours-value",
      formatHours(combinedSummary.paidHours)
    );

    setText(
      "combined-gross-pay",
      formatCurrency(combinedSummary.grossPay)
    );

    setText(
      "combined-hours",
      formatHours(combinedSummary.paidHours)
    );

    setText(
      "combined-shifts",
      formatShiftCount(combinedSummary.shiftCount)
    );

    setText(
      "combined-tax",
      formatCurrency(
        combinedSummary.estimatedCombinedTax
      )
    );

    const firstEmployer =
      state.employers.find(
        (employer) => employer.jobNumber === 1
      ) ?? state.employers[0];

    const secondEmployer =
      state.employers.find(
        (employer) => employer.jobNumber === 2
      ) ?? state.employers[1];

    const firstTax =
      employerSummaries[firstEmployer?.id]
        ?.taxWithheld ?? 0;

    const secondTax =
      employerSummaries[secondEmployer?.id]
        ?.taxWithheld ?? 0;

    const totalWithheld = roundCurrency(
      firstTax + secondTax
    );

    setText(
      "job-one-tax-overview",
      formatCurrency(firstTax)
    );

    setText(
      "job-two-tax-overview",
      formatCurrency(secondTax)
    );

    setText(
      "total-withheld-overview",
      formatCurrency(totalWithheld)
    );

    setText(
      "combined-tax-estimate-overview",
      formatCurrency(
        combinedSummary.estimatedCombinedTax
      )
    );

    renderTaxStatus(
      totalWithheld,
      combinedSummary.estimatedCombinedTax
    );
  }

  function renderTaxStatus(
    totalWithheld,
    estimatedTax
  ) {
    const difference = roundCurrency(
      totalWithheld - estimatedTax
    );

    const message = getElement(
      "tax-status-message"
    );

    if (!message) {
      return;
    }

    const messageParagraph = query("p", message);

    if (!messageParagraph) {
      return;
    }

    if (difference < -1) {
      messageParagraph.textContent =
        `Your combined estimate suggests approximately ${formatCurrency(
          Math.abs(difference)
        )} more tax may need to be withheld.`;
      return;
    }

    if (difference > 1) {
      messageParagraph.textContent =
        `Your employers have withheld approximately ${formatCurrency(
          difference
        )} more than the current combined estimate.`;
      return;
    }

    messageParagraph.textContent =
      "Combined income is approximately aligned with the tax currently withheld across your jobs.";
  }

  function renderRecentShifts() {
    const container = getElement(
      "recent-shifts-list"
    );

    const emptyState = getElement(
      "recent-shifts-empty-state"
    );

    if (!container || !emptyState) {
      return;
    }

    const recentShifts = [...state.shifts]
      .sort(compareShiftsNewestFirst)
      .slice(0, 4);

    if (recentShifts.length === 0) {
      container.innerHTML = "";
      container.hidden = true;
      emptyState.hidden = false;
      return;
    }

    container.hidden = false;
    emptyState.hidden = true;

    container.innerHTML = recentShifts
      .map((shift) =>
        createShiftCardHtml(shift, "recent")
      )
      .join("");
  }

  function renderDashboard() {
    renderPayPeriod();
    renderDashboardTotals();
    renderRecentShifts();
  }

  /* =======================================================
     SHIFT CARD HTML
  ======================================================== */

  function createShiftCardHtml(
    shift,
    displayType = "recent"
  ) {
    const employer = getEmployer(
      shift.employerId
    );

    const employerName =
      employer?.name ?? "Unknown employer";

    const colour =
      employer?.colour === "green"
        ? "green"
        : "blue";

    const dateParts = getDateParts(shift.date);

    const breakText =
      Number(shift.breakMinutes) > 0
        ? `${Number(
            shift.breakMinutes
          )} min unpaid break`
        : "No unpaid break";

    const shiftClass =
      displayType === "all"
        ? "recent-shift-card all-shift-card"
        : "recent-shift-card";

    return `
      <article
        class="${shiftClass}"
        data-shift-id="${escapeHtml(shift.id)}"
      >
        <div class="shift-date shift-date-${colour}">
          <span class="shift-day-name">
            ${escapeHtml(dateParts.weekday)}
          </span>

          <strong class="shift-day-number">
            ${escapeHtml(dateParts.day)}
          </strong>

          <span class="shift-month">
            ${escapeHtml(dateParts.month)}
          </span>
        </div>

        <div class="shift-information">
          <h3>${escapeHtml(employerName)}</h3>

          <p>
            <span>
              ${escapeHtml(
                formatTime(shift.startTime)
              )}
              –
              ${escapeHtml(
                formatTime(shift.finishTime)
              )}
            </span>

            <span aria-hidden="true">•</span>

            <span>
              ${escapeHtml(
                formatHours(shift.paidHours)
              )}
            </span>
          </p>

          <p>${escapeHtml(breakText)}</p>
        </div>

        <div class="shift-earnings">
          <strong>
            ${escapeHtml(
              formatCurrency(shift.grossPay)
            )}
          </strong>

          <button
            class="shift-details-button"
            type="button"
            aria-label="View ${escapeHtml(
              employerName
            )} shift details"
            data-shift-id="${escapeHtml(shift.id)}"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </article>
    `;
  }

  /* =======================================================
     ALL SHIFTS SCREEN
  ======================================================== */

  function getFilteredShifts() {
    const employerFilter = getElement(
      "shift-filter-employer"
    )?.value ?? "all";

    const periodFilter = getElement(
      "shift-filter-period"
    )?.value ?? "current-fortnight";

    let filteredShifts = [...state.shifts];

    if (employerFilter !== "all") {
      filteredShifts = filteredShifts.filter(
        (shift) =>
          shift.employerId === employerFilter
      );
    }

    if (periodFilter === "current-fortnight") {
      const period = getCurrentPayPeriod();

      filteredShifts = filteredShifts.filter(
        (shift) =>
          isDateInsideRange(
            shift.date,
            period.start,
            period.end
          )
      );
    }

    if (periodFilter === "previous-fortnight") {
      const currentPeriod = getCurrentPayPeriod();
      const currentStart = parseDate(
        currentPeriod.start
      );

      if (currentStart) {
        const previousEnd = new Date(
          currentStart
        );

        previousEnd.setDate(
          previousEnd.getDate() - 1
        );

        const previousStart = new Date(
          previousEnd
        );

        previousStart.setDate(
          previousStart.getDate() - 13
        );

        filteredShifts = filteredShifts.filter(
          (shift) => {
            const shiftDate = parseDate(
              shift.date
            );

            return (
              shiftDate &&
              shiftDate >= previousStart &&
              shiftDate <= previousEnd
            );
          }
        );
      }
    }

    if (periodFilter === "current-month") {
      const today = new Date();

      filteredShifts = filteredShifts.filter(
        (shift) => {
          const shiftDate = parseDate(
            shift.date
          );

          return (
            shiftDate &&
            shiftDate.getFullYear() ===
              today.getFullYear() &&
            shiftDate.getMonth() ===
              today.getMonth()
          );
        }
      );
    }

    return filteredShifts.sort(
      compareShiftsNewestFirst
    );
  }

  function renderAllShifts() {
    const container = getElement(
      "all-shifts-list"
    );

    const emptyState = getElement(
      "all-shifts-empty-state"
    );

    const countLabel = getElement(
      "shift-count-label"
    );

    if (!container || !emptyState) {
      return;
    }

    const shifts = getFilteredShifts();

    if (countLabel) {
      countLabel.textContent =
        formatShiftCount(shifts.length);
    }

    if (shifts.length === 0) {
      container.innerHTML = "";
      container.hidden = true;
      emptyState.hidden = false;
      return;
    }

    container.hidden = false;
    emptyState.hidden = true;

    container.innerHTML = shifts
      .map((shift) =>
        createShiftCardHtml(shift, "all")
      )
      .join("");
  }

  /* =======================================================
     ADD SHIFT FORM
  ======================================================== */

  function resetAddShiftForm() {
    const form = getElement("add-shift-form");

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    form.reset();

    const dateInput = getElement("shift-date");

    if (dateInput) {
      const today = new Date();

      dateInput.value = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(
          2,
          "0"
        ),
        String(today.getDate()).padStart(
          2,
          "0"
        )
      ].join("-");
    }

    const breakInput = getElement(
      "shift-break-minutes"
    );

    if (breakInput) {
      breakInput.value = "0";
    }

    setText("preview-paid-hours", "0.00 hrs");
    setText("preview-gross-pay", "$0.00");

    const error = getElement("add-shift-error");

    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
  }

  function updateShiftPreview() {
    const employerId =
      getElement("shift-employer")?.value ?? "";

    const startTime =
      getElement("shift-start-time")?.value ?? "";

    const finishTime =
      getElement("shift-finish-time")?.value ?? "";

    const breakMinutes =
      Number(
        getElement("shift-break-minutes")?.value
      ) || 0;

    if (
      !employerId ||
      !startTime ||
      !finishTime
    ) {
      setText(
        "preview-paid-hours",
        "0.00 hrs"
      );

      setText(
        "preview-gross-pay",
        "$0.00"
      );

      return;
    }

    const paidHours = calculatePaidHours(
      startTime,
      finishTime,
      breakMinutes
    );

    const grossPay = calculateBasicGrossPay(
      employerId,
      paidHours
    );

    setText(
      "preview-paid-hours",
      formatHours(paidHours)
    );

    setText(
      "preview-gross-pay",
      formatCurrency(grossPay)
    );
  }

  function validateShiftInput(input) {
    if (!input.employerId) {
      return "Select an employer.";
    }

    if (!getEmployer(input.employerId)) {
      return "The selected employer could not be found.";
    }

    if (!input.date) {
      return "Select the date of the shift.";
    }

    if (!input.startTime) {
      return "Enter the shift start time.";
    }

    if (!input.finishTime) {
      return "Enter the shift finish time.";
    }

    const paidHours = calculatePaidHours(
      input.startTime,
      input.finishTime,
      input.breakMinutes
    );

    if (paidHours <= 0) {
      return "The shift must contain at least some paid time.";
    }

    if (paidHours > 24) {
      return "A shift cannot exceed 24 paid hours.";
    }

    return "";
  }

  function handleAddShiftSubmit(event) {
    event.preventDefault();

    const errorElement = getElement(
      "add-shift-error"
    );

    const input = {
      employerId:
        getElement("shift-employer")?.value ??
        "",

      date:
        getElement("shift-date")?.value ?? "",

      startTime:
        getElement("shift-start-time")?.value ??
        "",

      finishTime:
        getElement("shift-finish-time")?.value ??
        "",

      breakMinutes:
        Number(
          getElement("shift-break-minutes")?.value
        ) || 0,

      notes:
        getElement("shift-notes")?.value
          ?.trim() ?? ""
    };

    const validationError =
      validateShiftInput(input);

    if (validationError) {
      if (errorElement) {
        errorElement.textContent =
          validationError;
        errorElement.hidden = false;
      }

      return;
    }

    if (errorElement) {
      errorElement.hidden = true;
      errorElement.textContent = "";
    }

    const calculatedValues =
      calculateShiftValues(input);

    const shift = {
      id: createId("shift"),
      employerId: input.employerId,
      date: input.date,
      startTime: input.startTime,
      finishTime: input.finishTime,
      breakMinutes: input.breakMinutes,
      notes: input.notes,
      paidHours:
        calculatedValues.paidHours,
      grossPay: calculatedValues.grossPay,
      taxWithheld: 0,
      isSample: false,
      createdAt: new Date().toISOString()
    };

    state.shifts.push(shift);

    saveState();
    renderApplication();

    closeModal("add-shift-modal");
    resetAddShiftForm();

    showToast({
      title: "Shift saved",
      message: `${getEmployerName(
        shift.employerId
      )} · ${formatCurrency(
        shift.grossPay
      )}`,
      type: "success"
    });
  }

  /* =======================================================
     SHIFT DETAILS
  ======================================================== */

  function openShiftDetails(shiftId) {
    const shift = state.shifts.find(
      (item) => item.id === shiftId
    );

    if (!shift) {
      showToast({
        title: "Shift unavailable",
        message:
          "The selected shift could not be found.",
        type: "error"
      });

      return;
    }

    state.activeShiftId = shift.id;

    const employer = getEmployer(
      shift.employerId
    );

    const content = getElement(
      "shift-details-content"
    );

    if (!content) {
      return;
    }

    const breakText =
      Number(shift.breakMinutes) > 0
        ? `${shift.breakMinutes} minutes`
        : "No unpaid break";

    content.innerHTML = `
      <section class="dashboard-card">
        <p class="card-label">Employer</p>
        <h3 style="margin-top: 4px;">
          ${escapeHtml(
            employer?.name ?? "Unknown employer"
          )}
        </h3>
      </section>

      <dl class="payroll-breakdown-list">
        <div>
          <dt>Date</dt>
          <dd>${escapeHtml(
            formatLongDate(shift.date)
          )}</dd>
        </div>

        <div>
          <dt>Start time</dt>
          <dd>${escapeHtml(
            formatTime(shift.startTime)
          )}</dd>
        </div>

        <div>
          <dt>Finish time</dt>
          <dd>${escapeHtml(
            formatTime(shift.finishTime)
          )}</dd>
        </div>

        <div>
          <dt>Unpaid break</dt>
          <dd>${escapeHtml(breakText)}</dd>
        </div>

        <div>
          <dt>Paid hours</dt>
          <dd>${escapeHtml(
            formatHours(shift.paidHours)
          )}</dd>
        </div>

        <div>
          <dt>Estimated gross pay</dt>
          <dd>${escapeHtml(
            formatCurrency(shift.grossPay)
          )}</dd>
        </div>
      </dl>

      ${
        shift.notes
          ? `
            <section
              class="dashboard-card"
              style="margin-top: 18px;"
            >
              <p class="card-label">Notes</p>
              <p style="margin-top: 7px;">
                ${escapeHtml(shift.notes)}
              </p>
            </section>
          `
          : ""
      }
    `;

    openModal("shift-details-modal");
  }

  function deleteActiveShift() {
    const shiftId = state.activeShiftId;

    if (!shiftId) {
      return;
    }

    const shift = state.shifts.find(
      (item) => item.id === shiftId
    );

    if (!shift) {
      return;
    }

    requestConfirmation({
      title: "Delete this shift?",
      message:
        "The shift and its earnings will be permanently removed.",
      confirmText: "Delete Shift",

      onConfirm: () => {
        state.shifts = state.shifts.filter(
          (item) => item.id !== shiftId
        );

        state.activeShiftId = null;

        saveState();
        closeModal("shift-details-modal");
        renderApplication();

        showToast({
          title: "Shift deleted",
          message: `${getEmployerName(
            shift.employerId
          )} shift removed.`,
          type: "success"
        });
      }
    });
  }

  /* =======================================================
     EMPLOYER DETAILS
  ======================================================== */

  function openEmployerDetails(employerId) {
    const employer = getEmployer(employerId);

    if (!employer) {
      return;
    }

    state.activeEmployerId = employer.id;

    const currentShifts =
      getCurrentPayPeriodShifts().filter(
        (shift) =>
          shift.employerId === employer.id
      );

    const summary = summariseShifts(
      currentShifts
    );

    setText(
      "employer-details-title",
      employer.name
    );

    const content = getElement(
      "employer-details-content"
    );

    if (!content) {
      return;
    }

    content.innerHTML = `
      <section class="dashboard-card">
        <p class="card-label">
          Job ${escapeHtml(
            employer.jobNumber
          )} · ${escapeHtml(
            employer.employmentType
          )}
        </p>

        <p class="large-money-value">
          ${escapeHtml(
            formatCurrency(summary.grossPay)
          )}
        </p>

        <p class="secondary-caption">
          Current fortnight gross pay
        </p>
      </section>

      <dl class="payroll-breakdown-list">
        <div>
          <dt>Base hourly rate</dt>
          <dd>${escapeHtml(
            formatCurrency(employer.baseRate)
          )}</dd>
        </div>

        <div>
          <dt>Hours worked</dt>
          <dd>${escapeHtml(
            formatHours(summary.paidHours)
          )}</dd>
        </div>

        <div>
          <dt>Shifts worked</dt>
          <dd>${escapeHtml(
            formatShiftCount(summary.shiftCount)
          )}</dd>
        </div>

        <div>
          <dt>Estimated super</dt>
          <dd>${escapeHtml(
            formatCurrency(summary.superEstimate)
          )}</dd>
        </div>

        <div>
          <dt>Tax-free threshold</dt>
          <dd>
            ${
              employer.claimsTaxFreeThreshold
                ? "Claimed"
                : "Not claimed"
            }
          </dd>
        </div>
      </dl>
    `;

    openModal("employer-details-modal");
  }

  function renderEmployerSettingsList() {
    const container = getElement(
      "employer-settings-list"
    );

    if (!container) {
      return;
    }

    container.innerHTML = [...state.employers]
      .sort(
        (employerA, employerB) =>
          Number(employerA.jobNumber) -
          Number(employerB.jobNumber)
      )
      .map(
        (employer) => `
          <button
            class="settings-row"
            type="button"
            data-edit-employer="${escapeHtml(
              employer.id
            )}"
          >
            <span>
              <strong>${escapeHtml(
                employer.name
              )}</strong>

              <small>
                Job ${escapeHtml(
                  employer.jobNumber
                )}
                ·
                ${escapeHtml(
                  employer.employmentType
                )}
                ·
                ${escapeHtml(
                  formatCurrency(
                    employer.baseRate
                  )
                )}/hr
              </small>
            </span>

            <span aria-hidden="true">›</span>
          </button>
        `
      )
      .join("");
  }

  function prepareEmployerForm(
    employerId = null
  ) {
    const form = getElement("employer-form");

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    form.reset();

    const employer = employerId
      ? getEmployer(employerId)
      : null;

    setText(
      "employer-form-title",
      employer ? "Edit Employer" : "Add Employer"
    );

    const employerIdInput =
      getElement("employer-id");

    if (employerIdInput) {
      employerIdInput.value =
        employer?.id ?? "";
    }

    const nameInput =
      getElement("employer-name");

    if (nameInput) {
      nameInput.value =
        employer?.name ?? "";
    }

    const jobNumberInput = getElement(
      "employer-job-number"
    );

    if (jobNumberInput) {
      jobNumberInput.value = String(
        employer?.jobNumber ??
          Math.min(
            state.employers.length + 1,
            4
          )
      );
    }

    const employmentTypeInput =
      getElement("employment-type");

    if (employmentTypeInput) {
      employmentTypeInput.value =
        employer?.employmentType ?? "casual";
    }

    const baseRateInput = getElement(
      "employer-base-rate"
    );

    if (baseRateInput) {
      baseRateInput.value =
        employer?.baseRate ?? "";
    }

    const taxFreeThresholdInput =
      getElement(
        "employer-tax-free-threshold"
      );

    if (taxFreeThresholdInput) {
      taxFreeThresholdInput.checked =
        Boolean(
          employer?.claimsTaxFreeThreshold
        );
    }

    const withholdsTaxInput = getElement(
      "employer-withholds-tax"
    );

    if (withholdsTaxInput) {
      withholdsTaxInput.checked =
        employer
          ? employer.withholdsTax !== false
          : true;
    }

    const error = getElement(
      "employer-form-error"
    );

    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
  }

  function handleEmployerSubmit(event) {
    event.preventDefault();

    const employerId =
      getElement("employer-id")?.value ?? "";

    const name =
      getElement("employer-name")?.value
        ?.trim() ?? "";

    const jobNumber = Number(
      getElement("employer-job-number")?.value
    );

    const employmentType =
      getElement("employment-type")?.value ??
      "casual";

    const baseRate = Number(
      getElement("employer-base-rate")?.value
    );

    const claimsTaxFreeThreshold = Boolean(
      getElement(
        "employer-tax-free-threshold"
      )?.checked
    );

    const withholdsTax = Boolean(
      getElement("employer-withholds-tax")
        ?.checked
    );

    const error = getElement(
      "employer-form-error"
    );

    if (!name) {
      if (error) {
        error.textContent =
          "Enter the employer name.";
        error.hidden = false;
      }

      return;
    }

    if (
      !Number.isFinite(baseRate) ||
      baseRate < 0
    ) {
      if (error) {
        error.textContent =
          "Enter a valid hourly rate.";
        error.hidden = false;
      }

      return;
    }

    if (error) {
      error.hidden = true;
      error.textContent = "";
    }

    if (employerId) {
      const employer = getEmployer(
        employerId
      );

      if (employer) {
        employer.name = name;
        employer.jobNumber = jobNumber;
        employer.employmentType =
          employmentType;
        employer.baseRate =
          roundCurrency(baseRate);
        employer.claimsTaxFreeThreshold =
          claimsTaxFreeThreshold;
        employer.withholdsTax =
          withholdsTax;
      }
    } else {
      const availableColours = [
        "blue",
        "green",
        "purple",
        "orange"
      ];

      state.employers.push({
        id: createId(
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") ||
            "employer"
        ),
        name,
        jobNumber,
        employmentType,
        baseRate: roundCurrency(baseRate),
        colour:
          availableColours[
            state.employers.length %
              availableColours.length
          ],
        claimsTaxFreeThreshold,
        withholdsTax
      });
    }

    saveState();
    renderApplication();

    closeModal("add-employer-modal");

    showToast({
      title: employerId
        ? "Employer updated"
        : "Employer added",
      message: name,
      type: "success"
    });
  }

  /* =======================================================
     PAYROLL SCREEN
  ======================================================== */

  function createPayrollEmployerCard(
    employer,
    summary
  ) {
    const estimatedTax =
      employer.withholdsTax === false
        ? 0
        : calculateEstimatedTax(
            summary.grossPay
          );

    const netEstimate = roundCurrency(
      summary.grossPay - estimatedTax
    );

    return `
      <article class="payroll-breakdown-card">
        <div class="payroll-breakdown-heading">
          <div>
            <p class="job-number">
              Job ${escapeHtml(
                employer.jobNumber
              )}
            </p>

            <h3>${escapeHtml(
              employer.name
            )}</h3>
          </div>

          <span
            class="colour-dot colour-dot-${
              employer.colour === "green"
                ? "green"
                : "blue"
            }"
          ></span>
        </div>

        <dl class="payroll-breakdown-list">
          <div>
            <dt>Gross pay</dt>
            <dd>${escapeHtml(
              formatCurrency(summary.grossPay)
            )}</dd>
          </div>

          <div>
            <dt>Estimated tax</dt>
            <dd>${escapeHtml(
              formatCurrency(estimatedTax)
            )}</dd>
          </div>

          <div>
            <dt>Super</dt>
            <dd>${escapeHtml(
              formatCurrency(
                summary.superEstimate
              )
            )}</dd>
          </div>

          <div>
            <dt>Estimated net</dt>
            <dd>${escapeHtml(
              formatCurrency(netEstimate)
            )}</dd>
          </div>
        </dl>
      </article>
    `;
  }

  function renderPayrollScreen() {
    const {
      employerSummaries,
      combinedSummary
    } = getDashboardSummary();

    setText(
      "payroll-combined-gross",
      formatCurrency(combinedSummary.grossPay)
    );

    const container = getElement(
      "payroll-job-breakdown"
    );

    if (container) {
      container.innerHTML = [...state.employers]
        .sort(
          (employerA, employerB) =>
            Number(employerA.jobNumber) -
            Number(employerB.jobNumber)
        )
        .map((employer) =>
          createPayrollEmployerCard(
            employer,
            employerSummaries[
              employer.id
            ] ?? createEmptySummary()
          )
        )
        .join("");
    }

    const totalTaxWithheld =
      combinedSummary.taxWithheld;

    const estimatedTax =
      combinedSummary.estimatedCombinedTax;

    const difference = roundCurrency(
      totalTaxWithheld - estimatedTax
    );

    setText(
      "tax-withheld-by-employers",
      formatCurrency(totalTaxWithheld)
    );

    setText(
      "estimated-combined-income-tax",
      formatCurrency(estimatedTax)
    );

    setText(
      "estimated-tax-difference",
      formatCurrency(difference)
    );

    let guidance =
      "Your current withholding is approximately aligned with the combined income estimate.";

    if (difference < -1) {
      guidance =
        `The combined estimate suggests approximately ${formatCurrency(
          Math.abs(difference)
        )} more tax may need to be withheld.`;
    }

    if (difference > 1) {
      guidance =
        `Approximately ${formatCurrency(
          difference
        )} more tax has been withheld than the current estimate.`;
    }

    setText(
      "combined-tax-guidance",
      guidance
    );
  }

  /* =======================================================
     PAYSLIP FILE SELECTOR
  ======================================================== */

  function handlePayslipFileChange(event) {
    const input = event.currentTarget;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0] ?? null;

    setText(
      "selected-payslip-file",
      file ? file.name : "No file selected"
    );

    const analyseButton = getElement(
      "analyse-payslip-button"
    );

    if (analyseButton) {
      analyseButton.disabled = !file;
    }
  }

  function handlePayslipSubmit(event) {
    event.preventDefault();

    const input = getElement(
      "payslip-file-input"
    );

    const file = input?.files?.[0] ?? null;

    if (!file) {
      return;
    }

    showToast({
      title: "Payslip selected",
      message:
        "Payslip analysis will be connected in a later build step.",
      type: "default"
    });

    closeModal("scan-payslip-modal");
  }

  /* =======================================================
     DATA MANAGEMENT
  ======================================================== */

  function exportApplicationData() {
    const exportData = {
      application: APP_NAME,
      exportedAt: new Date().toISOString(),
      version: 1,
      employers: state.employers,
      shifts: state.shifts
    };

    const fileContent = JSON.stringify(
      exportData,
      null,
      2
    );

    const blob = new Blob([fileContent], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download =
      `pay-tracker-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast({
      title: "Backup exported",
      message:
        "Your Pay Tracker data was downloaded.",
      type: "success"
    });
  }

  function triggerImportApplicationData() {
    getElement("import-data-file")?.click();
  }

  async function importApplicationData(event) {
    const input = event.currentTarget;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      const importedData = JSON.parse(fileText);

      if (
        !Array.isArray(
          importedData.employers
        ) ||
        !Array.isArray(importedData.shifts)
      ) {
        throw new Error(
          "Invalid Pay Tracker backup."
        );
      }

      state.employers =
        importedData.employers;

      state.shifts = importedData.shifts;

      saveState();
      renderApplication();

      showToast({
        title: "Backup restored",
        message:
          "Your employers and shifts were imported.",
        type: "success"
      });
    } catch (error) {
      console.error(error);

      showToast({
        title: "Import failed",
        message:
          "The selected file is not a valid Pay Tracker backup.",
        type: "error"
      });
    } finally {
      input.value = "";
    }
  }

  function clearAllShifts() {
    requestConfirmation({
      title: "Delete every shift?",
      message:
        "All recorded shifts and earnings will be permanently removed.",
      confirmText: "Delete All Shifts",

      onConfirm: () => {
        state.shifts = [];

        saveState();
        renderApplication();

        showToast({
          title: "All shifts deleted",
          message:
            "Your employer settings were kept.",
          type: "success"
        });
      }
    });
  }

  function resetApplication() {
    requestConfirmation({
      title: "Reset Pay Tracker?",
      message:
        "All shifts, employers and settings will be returned to their original state.",
      confirmText: "Reset App",

      onConfirm: () => {
        Object.values(STORAGE_KEYS).forEach(
          (key) => {
            localStorage.removeItem(key);
          }
        );

        state.employers = cloneData(
          DEFAULT_EMPLOYERS
        );

        state.shifts = [];
        state.route = "home";

        saveState();
        closeAllModals();
        renderApplication();
        navigateTo("home");

        showToast({
          title: "Pay Tracker reset",
          message:
            "The application has been returned to its default settings.",
          type: "success"
        });
      }
    });
  }

  /* =======================================================
     APPEARANCE
  ======================================================== */

  function applyAppearanceSettings() {
    const settings = loadJson(
      STORAGE_KEYS.appearance,
      {
        theme: "system",
        reducedMotion: false
      }
    );

    const html = document.documentElement;

    if (settings.theme === "dark") {
      html.dataset.theme = "dark";
    } else if (settings.theme === "light") {
      html.dataset.theme = "light";
    } else {
      delete html.dataset.theme;
    }

    html.classList.toggle(
      "reduce-motion",
      Boolean(settings.reducedMotion)
    );

    const selectedThemeInput = query(
      `input[name="theme"][value="${settings.theme}"]`
    );

    if (selectedThemeInput) {
      selectedThemeInput.checked = true;
    }

    const reducedMotionInput = getElement(
      "appearance-reduced-motion"
    );

    if (reducedMotionInput) {
      reducedMotionInput.checked =
        Boolean(settings.reducedMotion);
    }
  }

  function handleAppearanceSubmit(event) {
    event.preventDefault();

    const theme =
      query(
        'input[name="theme"]:checked'
      )?.value ?? "system";

    const reducedMotion = Boolean(
      getElement(
        "appearance-reduced-motion"
      )?.checked
    );

    saveJson(STORAGE_KEYS.appearance, {
      theme,
      reducedMotion
    });

    applyAppearanceSettings();
    closeModal("appearance-modal");

    showToast({
      title: "Appearance updated",
      type: "success"
    });
  }

  /* =======================================================
     REPORT CONTROLS
  ======================================================== */

  function handleReportPeriodSelection(button) {
    queryAll(".report-period-button").forEach(
      (periodButton) => {
        periodButton.classList.toggle(
          "is-active",
          periodButton === button
        );
      }
    );

    showToast({
      title: `${button.textContent.trim()} report selected`,
      message:
        "Detailed charts will be connected when the reporting engine is built.",
      type: "default"
    });
  }

  function handleReportExport() {
    window.print();
  }

  /* =======================================================
     EVENT DELEGATION
  ======================================================== */

  function handleDocumentClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const routeButton =
      target.closest("[data-route]");

    if (routeButton) {
      event.preventDefault();

      navigateTo(routeButton.dataset.route);
      return;
    }

    const modalOpenButton =
      target.closest("[data-open-modal]");

    if (modalOpenButton) {
      event.preventDefault();

      const modalId =
        modalOpenButton.dataset.openModal;

      if (modalId === "add-shift-modal") {
        resetAddShiftForm();
      }

      if (modalId === "add-employer-modal") {
        prepareEmployerForm();
      }

      openModal(modalId);
      return;
    }

    const modalCloseButton =
      target.closest("[data-close-modal]");

    if (modalCloseButton) {
      event.preventDefault();

      const modal =
        modalCloseButton.closest("dialog");

      closeModal(modal);
      return;
    }

    const shiftButton =
      target.closest("[data-shift-id]");

    if (
      shiftButton &&
      (
        shiftButton.classList.contains(
          "shift-details-button"
        ) ||
        shiftButton.classList.contains(
          "recent-shift-card"
        )
      )
    ) {
      const shiftId =
        shiftButton.dataset.shiftId;

      if (shiftId) {
        openShiftDetails(shiftId);
      }

      return;
    }

    const employerButton =
      target.closest("[data-employer]");

    if (employerButton) {
      openEmployerDetails(
        employerButton.dataset.employer
      );

      return;
    }

    const employerEditButton =
      target.closest("[data-edit-employer]");

    if (employerEditButton) {
      prepareEmployerForm(
        employerEditButton.dataset.editEmployer
      );

      openModal("add-employer-modal");
      return;
    }

    const reportPeriodButton =
      target.closest(".report-period-button");

    if (reportPeriodButton) {
      handleReportPeriodSelection(
        reportPeriodButton
      );
    }
  }

  function handleDialogBackdropClick(event) {
    const dialog = event.target;

    if (!(dialog instanceof HTMLDialogElement)) {
      return;
    }

    const rectangle =
      dialog.getBoundingClientRect();

    const clickedOutside =
      event.clientX < rectangle.left ||
      event.clientX > rectangle.right ||
      event.clientY < rectangle.top ||
      event.clientY > rectangle.bottom;

    if (clickedOutside) {
      closeModal(dialog);
    }
  }

  function handleKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (
      getElement("side-menu")?.classList.contains(
        "is-open"
      )
    ) {
      closeMenu();
    }
  }

  /* =======================================================
     DIRECT EVENT LISTENERS
  ======================================================== */

  function bindDirectEvents() {
    getElement("menu-button")?.addEventListener(
      "click",
      openMenu
    );

    getElement(
      "close-menu-button"
    )?.addEventListener("click", closeMenu);

    getElement("menu-overlay")?.addEventListener(
      "click",
      closeMenu
    );

    getElement("add-shift-form")?.addEventListener(
      "submit",
      handleAddShiftSubmit
    );

    [
      "shift-employer",
      "shift-start-time",
      "shift-finish-time",
      "shift-break-minutes"
    ].forEach((id) => {
      getElement(id)?.addEventListener(
        "input",
        updateShiftPreview
      );

      getElement(id)?.addEventListener(
        "change",
        updateShiftPreview
      );
    });

    getElement(
      "delete-shift-button"
    )?.addEventListener(
      "click",
      deleteActiveShift
    );

    getElement(
      "confirmation-confirm-button"
    )?.addEventListener(
      "click",
      handleConfirmationConfirm
    );

    getElement(
      "confirmation-cancel-button"
    )?.addEventListener(
      "click",
      handleConfirmationCancel
    );

    getElement(
      "payslip-file-input"
    )?.addEventListener(
      "change",
      handlePayslipFileChange
    );

    getElement(
      "scan-payslip-form"
    )?.addEventListener(
      "submit",
      handlePayslipSubmit
    );

    getElement(
      "employer-form"
    )?.addEventListener(
      "submit",
      handleEmployerSubmit
    );

    getElement(
      "appearance-form"
    )?.addEventListener(
      "submit",
      handleAppearanceSubmit
    );

    getElement(
      "shift-filter-employer"
    )?.addEventListener(
      "change",
      renderAllShifts
    );

    getElement(
      "shift-filter-period"
    )?.addEventListener(
      "change",
      renderAllShifts
    );

    getElement(
      "export-data-button"
    )?.addEventListener(
      "click",
      exportApplicationData
    );

    getElement(
      "import-data-button"
    )?.addEventListener(
      "click",
      triggerImportApplicationData
    );

    getElement(
      "import-data-file"
    )?.addEventListener(
      "change",
      importApplicationData
    );

    getElement(
      "clear-shifts-button"
    )?.addEventListener(
      "click",
      clearAllShifts
    );

    getElement(
      "reset-app-button"
    )?.addEventListener(
      "click",
      resetApplication
    );

    getElement(
      "export-report-button"
    )?.addEventListener(
      "click",
      handleReportExport
    );

    queryAll("dialog").forEach((dialog) => {
      dialog.addEventListener(
        "click",
        handleDialogBackdropClick
      );

      dialog.addEventListener(
        "close",
        () => {
          if (getOpenDialogs().length === 0) {
            document.body.classList.remove(
              "modal-open"
            );
          }
        }
      );
    });

    document.addEventListener(
      "click",
      handleDocumentClick
    );

    document.addEventListener(
      "keydown",
      handleKeydown
    );
  }

  /* =======================================================
     APPLICATION RENDERING
  ======================================================== */

  function renderApplication() {
    renderDashboard();
    renderAllShifts();
    renderPayrollScreen();
    renderEmployerSettingsList();
  }

  /* =======================================================
     LOADING SCREEN
  ======================================================== */

  function hideLoadingScreen() {
    const loadingScreen = getElement(
      "loading-screen"
    );

    if (!loadingScreen) {
      return;
    }

    loadingScreen.classList.add("is-hidden");

    window.setTimeout(() => {
      loadingScreen.remove();
    }, 300);
  }

  /* =======================================================
     APPLICATION INITIALISATION
  ======================================================== */

  function initialiseApplication() {
    try {
      applyAppearanceSettings();
      loadState();
      bindDirectEvents();
      renderApplication();

      navigateTo(state.route, {
        preserveScroll: true
      });

      resetAddShiftForm();
    } catch (error) {
      console.error(
        "Pay Tracker failed to initialise:",
        error
      );

      showToast({
        title: "Application error",
        message:
          "Some parts of Pay Tracker could not be loaded.",
        type: "error",
        duration: 6000
      });
    } finally {
      window.setTimeout(
        hideLoadingScreen,
        350
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialiseApplication,
      {
        once: true
      }
    );
  } else {
    initialiseApplication();
  }
})();
