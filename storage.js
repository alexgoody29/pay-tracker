"use strict";

/* =========================================================
   PAY TRACKER
   COMPLETE STORAGE SERVICE
========================================================= */

(() => {
  /* =======================================================
     STORAGE CONFIGURATION
  ======================================================== */

  const APP_NAMESPACE = "payTracker";
  const CURRENT_SCHEMA_VERSION = 1;

  const STORAGE_KEYS = Object.freeze({
    schemaVersion: `${APP_NAMESPACE}.schemaVersion`,
    employers: `${APP_NAMESPACE}.employers`,
    shifts: `${APP_NAMESPACE}.shifts`,
    taxSettings: `${APP_NAMESPACE}.taxSettings`,
    superSettings: `${APP_NAMESPACE}.superSettings`,
    appearance: `${APP_NAMESPACE}.appearance`,
    preferences: `${APP_NAMESPACE}.preferences`,
    activeRoute: `${APP_NAMESPACE}.activeRoute`,
    backup: `${APP_NAMESPACE}.backup`,
    metadata: `${APP_NAMESPACE}.metadata`
  });

  const VALID_ROUTES = Object.freeze([
    "home",
    "shifts",
    "payroll",
    "reports",
    "settings"
  ]);

  const VALID_EMPLOYMENT_TYPES = Object.freeze([
    "casual",
    "part-time",
    "full-time",
    "contractor"
  ]);

  const VALID_COLOURS = Object.freeze([
    "blue",
    "green",
    "purple",
    "orange"
  ]);

  const VALID_THEMES = Object.freeze([
    "system",
    "light",
    "dark"
  ]);

  const VALID_PAY_FREQUENCIES = Object.freeze([
    "weekly",
    "fortnightly",
    "monthly"
  ]);

  const VALID_RESIDENCY_STATUSES = Object.freeze([
    "resident",
    "foreign-resident",
    "working-holiday-maker"
  ]);

  const DEFAULT_EMPLOYERS = Object.freeze([
    {
      id: "seaworld",
      name: "SeaWorld",
      jobNumber: 1,
      employmentType: "casual",
      baseRate: 46.98,
      colour: "blue",
      claimsTaxFreeThreshold: true,
      withholdsTax: true,
      isActive: true,
      createdAt: null,
      updatedAt: null
    },
    {
      id: "queensland-health",
      name: "Queensland Health",
      jobNumber: 2,
      employmentType: "casual",
      baseRate: 46.98,
      colour: "green",
      claimsTaxFreeThreshold: false,
      withholdsTax: true,
      isActive: true,
      createdAt: null,
      updatedAt: null
    }
  ]);

  const DEFAULT_TAX_SETTINGS = Object.freeze({
    residencyStatus: "resident",
    payFrequency: "fortnightly",
    hasHelpDebt: false,
    hasMedicareExemption: false,
    medicareExemptionType: "none",
    extraWithholdingEnabled: false,
    extraWithholdingAmount: 0,
    financialYear: null,
    updatedAt: null
  });

  const DEFAULT_SUPER_SETTINGS = Object.freeze({
    defaultRate: 12,
    includeSuperInGrossPay: false,
    trackEmployerContributions: true,
    fundName: "",
    memberNumber: "",
    updatedAt: null
  });

  const DEFAULT_APPEARANCE = Object.freeze({
    theme: "system",
    reducedMotion: false,
    compactMode: false,
    showCents: true,
    updatedAt: null
  });

  const DEFAULT_PREFERENCES = Object.freeze({
    activeRoute: "home",
    defaultEmployerId: "",
    defaultBreakMinutes: 0,
    defaultReportPeriod: "fortnight",
    showSampleData: false,
    onboardingCompleted: false,
    updatedAt: null
  });

  const DEFAULT_METADATA = Object.freeze({
    appVersion: "1.0.0",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: null,
    updatedAt: null,
    lastBackupAt: null,
    lastImportAt: null
  });

  /* =======================================================
     BASIC UTILITIES
  ======================================================== */

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function isNonEmptyString(value) {
    return (
      typeof value === "string" &&
      value.trim().length > 0
    );
  }

  function normaliseString(value, fallback = "") {
    if (typeof value !== "string") {
      return fallback;
    }

    return value.trim();
  }

  function normaliseBoolean(value, fallback = false) {
    return typeof value === "boolean"
      ? value
      : fallback;
  }

  function normaliseNumber(
    value,
    fallback = 0,
    minimum = -Infinity,
    maximum = Infinity
  ) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.min(
      maximum,
      Math.max(minimum, numericValue)
    );
  }

  function roundCurrency(value) {
    return (
      Math.round(
        (normaliseNumber(value, 0) +
          Number.EPSILON) *
          100
      ) / 100
    );
  }

  function roundHours(value) {
    return (
      Math.round(
        (normaliseNumber(value, 0) +
          Number.EPSILON) *
          100
      ) / 100
    );
  }

  function createTimestamp() {
    return new Date().toISOString();
  }

  function createId(prefix = "item") {
    const safePrefix =
      normaliseString(prefix, "item")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "item";

    const uniquePart =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;

    return `${safePrefix}-${uniquePart}`;
  }

  function isValidIsoDate(value) {
    if (typeof value !== "string") {
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function isValidTime(value) {
    if (typeof value !== "string") {
      return false;
    }

    return /^([01]\d|2[0-3]):[0-5]\d$/.test(
      value
    );
  }

  function isValidTimestamp(value) {
    if (value === null || value === "") {
      return true;
    }

    if (typeof value !== "string") {
      return false;
    }

    return !Number.isNaN(Date.parse(value));
  }

  function normaliseTimestamp(
    value,
    fallback = null
  ) {
    return isValidTimestamp(value)
      ? value || fallback
      : fallback;
  }

  /* =======================================================
     STORAGE AVAILABILITY
  ======================================================== */

  function isLocalStorageAvailable() {
    try {
      const testKey = `${APP_NAMESPACE}.storageTest`;

      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);

      return true;
    } catch (error) {
      console.error(
        "Pay Tracker local storage is unavailable:",
        error
      );

      return false;
    }
  }

  function getStorageUsage() {
    let totalBytes = 0;
    let appBytes = 0;

    if (!isLocalStorageAvailable()) {
      return {
        available: false,
        totalBytes: 0,
        appBytes: 0,
        keyCount: 0
      };
    }

    let keyCount = 0;

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key = localStorage.key(index);

      if (!key) {
        continue;
      }

      const value = localStorage.getItem(key) ?? "";
      const bytes = new Blob([
        `${key}${value}`
      ]).size;

      totalBytes += bytes;

      if (key.startsWith(`${APP_NAMESPACE}.`)) {
        appBytes += bytes;
        keyCount += 1;
      }
    }

    return {
      available: true,
      totalBytes,
      appBytes,
      keyCount
    };
  }

  /* =======================================================
     LOW-LEVEL STORAGE OPERATIONS
  ======================================================== */

  function readRaw(key) {
    if (!isLocalStorageAvailable()) {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(
        `Unable to read storage key "${key}":`,
        error
      );

      return null;
    }
  }

  function writeRaw(key, value) {
    if (!isLocalStorageAvailable()) {
      return false;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(
        `Unable to write storage key "${key}":`,
        error
      );

      dispatchStorageEvent("error", {
        operation: "write",
        key,
        message:
          error instanceof Error
            ? error.message
            : "Unknown storage error"
      });

      return false;
    }
  }

  function removeRaw(key) {
    if (!isLocalStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(
        `Unable to remove storage key "${key}":`,
        error
      );

      return false;
    }
  }

  function readJson(key, fallbackValue) {
    const rawValue = readRaw(key);

    if (rawValue === null) {
      return clone(fallbackValue);
    }

    try {
      const parsedValue = JSON.parse(rawValue);

      return parsedValue === null
        ? clone(fallbackValue)
        : parsedValue;
    } catch (error) {
      console.error(
        `Storage key "${key}" contains invalid JSON:`,
        error
      );

      preserveCorruptedValue(key, rawValue);

      return clone(fallbackValue);
    }
  }

  function writeJson(key, value) {
    try {
      return writeRaw(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(
        `Unable to serialise storage key "${key}":`,
        error
      );

      return false;
    }
  }

  function preserveCorruptedValue(
    originalKey,
    rawValue
  ) {
    if (!rawValue) {
      return;
    }

    const safeKey = originalKey.replace(
      /[^a-zA-Z0-9.-]/g,
      "-"
    );

    const backupKey =
      `${APP_NAMESPACE}.corrupt.` +
      `${safeKey}.${Date.now()}`;

    writeRaw(backupKey, rawValue);
    removeRaw(originalKey);
  }

  /* =======================================================
     STORAGE EVENTS
  ======================================================== */

  function dispatchStorageEvent(
    eventName,
    detail = {}
  ) {
    if (
      typeof window === "undefined" ||
      typeof CustomEvent !== "function"
    ) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        `paytracker:storage:${eventName}`,
        {
          detail: clone(detail)
        }
      )
    );
  }

  /* =======================================================
     EMPLOYER VALIDATION
  ======================================================== */

  function normaliseEmployer(
    employer,
    fallbackIndex = 0
  ) {
    const source = isPlainObject(employer)
      ? employer
      : {};

    const now = createTimestamp();

    const name = normaliseString(
      source.name,
      `Job ${fallbackIndex + 1}`
    );

    const fallbackId =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      `employer-${fallbackIndex + 1}`;

    const employmentType =
      VALID_EMPLOYMENT_TYPES.includes(
        source.employmentType
      )
        ? source.employmentType
        : "casual";

    const colour = VALID_COLOURS.includes(
      source.colour
    )
      ? source.colour
      : VALID_COLOURS[
          fallbackIndex % VALID_COLOURS.length
        ];

    return {
      id: normaliseString(
        source.id,
        fallbackId
      ),
      name,
      jobNumber: Math.max(
        1,
        Math.round(
          normaliseNumber(
            source.jobNumber,
            fallbackIndex + 1,
            1
          )
        )
      ),
      employmentType,
      baseRate: roundCurrency(
        normaliseNumber(
          source.baseRate,
          0,
          0
        )
      ),
      colour,
      claimsTaxFreeThreshold:
        normaliseBoolean(
          source.claimsTaxFreeThreshold,
          false
        ),
      withholdsTax: normaliseBoolean(
        source.withholdsTax,
        true
      ),
      isActive: normaliseBoolean(
        source.isActive,
        true
      ),
      createdAt: normaliseTimestamp(
        source.createdAt,
        now
      ),
      updatedAt: normaliseTimestamp(
        source.updatedAt,
        now
      )
    };
  }

  function normaliseEmployers(value) {
    if (!Array.isArray(value)) {
      return clone(DEFAULT_EMPLOYERS).map(
        normaliseEmployer
      );
    }

    const normalisedEmployers = value
      .map(normaliseEmployer)
      .filter((employer) =>
        isNonEmptyString(employer.id)
      );

    const seenIds = new Set();

    return normalisedEmployers.filter(
      (employer) => {
        if (seenIds.has(employer.id)) {
          return false;
        }

        seenIds.add(employer.id);
        return true;
      }
    );
  }

  /* =======================================================
     SHIFT VALIDATION
  ======================================================== */

  function normaliseShift(shift) {
    const source = isPlainObject(shift)
      ? shift
      : {};

    const now = createTimestamp();

    return {
      id: normaliseString(
        source.id,
        createId("shift")
      ),
      employerId: normaliseString(
        source.employerId
      ),
      date: isValidIsoDate(source.date)
        ? source.date
        : "",
      startTime: isValidTime(
        source.startTime
      )
        ? source.startTime
        : "",
      finishTime: isValidTime(
        source.finishTime
      )
        ? source.finishTime
        : "",
      breakMinutes: Math.round(
        normaliseNumber(
          source.breakMinutes,
          0,
          0,
          1440
        )
      ),
      notes: normaliseString(
        source.notes
      ),
      paidHours: roundHours(
        normaliseNumber(
          source.paidHours,
          0,
          0,
          24
        )
      ),
      grossPay: roundCurrency(
        normaliseNumber(
          source.grossPay,
          0,
          0
        )
      ),
      taxWithheld: roundCurrency(
        normaliseNumber(
          source.taxWithheld,
          0,
          0
        )
      ),
      superAmount: roundCurrency(
        normaliseNumber(
          source.superAmount,
          0,
          0
        )
      ),
      allowances: roundCurrency(
        normaliseNumber(
          source.allowances,
          0,
          0
        )
      ),
      overtimePay: roundCurrency(
        normaliseNumber(
          source.overtimePay,
          0,
          0
        )
      ),
      penaltyPay: roundCurrency(
        normaliseNumber(
          source.penaltyPay,
          0,
          0
        )
      ),
      isSample: normaliseBoolean(
        source.isSample,
        false
      ),
      createdAt: normaliseTimestamp(
        source.createdAt,
        now
      ),
      updatedAt: normaliseTimestamp(
        source.updatedAt,
        now
      )
    };
  }

  function isUsableShift(shift) {
    return (
      isNonEmptyString(shift.id) &&
      isNonEmptyString(shift.employerId) &&
      isValidIsoDate(shift.date) &&
      isValidTime(shift.startTime) &&
      isValidTime(shift.finishTime)
    );
  }

  function normaliseShifts(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const seenIds = new Set();

    return value
      .map(normaliseShift)
      .filter(isUsableShift)
      .filter((shift) => {
        if (seenIds.has(shift.id)) {
          return false;
        }

        seenIds.add(shift.id);
        return true;
      });
  }

  /* =======================================================
     SETTINGS VALIDATION
  ======================================================== */

  function normaliseTaxSettings(value) {
    const source = isPlainObject(value)
      ? value
      : {};

    return {
      residencyStatus:
        VALID_RESIDENCY_STATUSES.includes(
          source.residencyStatus
        )
          ? source.residencyStatus
          : DEFAULT_TAX_SETTINGS.residencyStatus,

      payFrequency:
        VALID_PAY_FREQUENCIES.includes(
          source.payFrequency
        )
          ? source.payFrequency
          : DEFAULT_TAX_SETTINGS.payFrequency,

      hasHelpDebt: normaliseBoolean(
        source.hasHelpDebt,
        DEFAULT_TAX_SETTINGS.hasHelpDebt
      ),

      hasMedicareExemption:
        normaliseBoolean(
          source.hasMedicareExemption,
          DEFAULT_TAX_SETTINGS
            .hasMedicareExemption
        ),

      medicareExemptionType:
        normaliseString(
          source.medicareExemptionType,
          DEFAULT_TAX_SETTINGS
            .medicareExemptionType
        ),

      extraWithholdingEnabled:
        normaliseBoolean(
          source.extraWithholdingEnabled,
          DEFAULT_TAX_SETTINGS
            .extraWithholdingEnabled
        ),

      extraWithholdingAmount:
        roundCurrency(
          normaliseNumber(
            source.extraWithholdingAmount,
            DEFAULT_TAX_SETTINGS
              .extraWithholdingAmount,
            0
          )
        ),

      financialYear: normaliseString(
        source.financialYear,
        DEFAULT_TAX_SETTINGS.financialYear
      ),

      updatedAt: normaliseTimestamp(
        source.updatedAt,
        createTimestamp()
      )
    };
  }

  function normaliseSuperSettings(value) {
    const source = isPlainObject(value)
      ? value
      : {};

    return {
      defaultRate: roundCurrency(
        normaliseNumber(
          source.defaultRate,
          DEFAULT_SUPER_SETTINGS.defaultRate,
          0,
          100
        )
      ),

      includeSuperInGrossPay:
        normaliseBoolean(
          source.includeSuperInGrossPay,
          DEFAULT_SUPER_SETTINGS
            .includeSuperInGrossPay
        ),

      trackEmployerContributions:
        normaliseBoolean(
          source.trackEmployerContributions,
          DEFAULT_SUPER_SETTINGS
            .trackEmployerContributions
        ),

      fundName: normaliseString(
        source.fundName,
        DEFAULT_SUPER_SETTINGS.fundName
      ),

      memberNumber: normaliseString(
        source.memberNumber,
        DEFAULT_SUPER_SETTINGS.memberNumber
      ),

      updatedAt: normaliseTimestamp(
        source.updatedAt,
        createTimestamp()
      )
    };
  }

  function normaliseAppearance(value) {
    const source = isPlainObject(value)
      ? value
      : {};

    return {
      theme: VALID_THEMES.includes(
        source.theme
      )
        ? source.theme
        : DEFAULT_APPEARANCE.theme,

      reducedMotion: normaliseBoolean(
        source.reducedMotion,
        DEFAULT_APPEARANCE.reducedMotion
      ),

      compactMode: normaliseBoolean(
        source.compactMode,
        DEFAULT_APPEARANCE.compactMode
      ),

      showCents: normaliseBoolean(
        source.showCents,
        DEFAULT_APPEARANCE.showCents
      ),

      updatedAt: normaliseTimestamp(
        source.updatedAt,
        createTimestamp()
      )
    };
  }

  function normalisePreferences(value) {
    const source = isPlainObject(value)
      ? value
      : {};

    const route = VALID_ROUTES.includes(
      source.activeRoute
    )
      ? source.activeRoute
      : DEFAULT_PREFERENCES.activeRoute;

    return {
      activeRoute: route,

      defaultEmployerId: normaliseString(
        source.defaultEmployerId,
        DEFAULT_PREFERENCES.defaultEmployerId
      ),

      defaultBreakMinutes: Math.round(
        normaliseNumber(
          source.defaultBreakMinutes,
          DEFAULT_PREFERENCES
            .defaultBreakMinutes,
          0,
          1440
        )
      ),

      defaultReportPeriod:
        normaliseString(
          source.defaultReportPeriod,
          DEFAULT_PREFERENCES
            .defaultReportPeriod
        ),

      showSampleData: normaliseBoolean(
        source.showSampleData,
        DEFAULT_PREFERENCES.showSampleData
      ),

      onboardingCompleted:
        normaliseBoolean(
          source.onboardingCompleted,
          DEFAULT_PREFERENCES
            .onboardingCompleted
        ),

      updatedAt: normaliseTimestamp(
        source.updatedAt,
        createTimestamp()
      )
    };
  }

  function normaliseMetadata(value) {
    const source = isPlainObject(value)
      ? value
      : {};

    const now = createTimestamp();

    return {
      appVersion: normaliseString(
        source.appVersion,
        DEFAULT_METADATA.appVersion
      ),

      schemaVersion: Math.round(
        normaliseNumber(
          source.schemaVersion,
          CURRENT_SCHEMA_VERSION,
          1
        )
      ),

      createdAt: normaliseTimestamp(
        source.createdAt,
        now
      ),

      updatedAt: normaliseTimestamp(
        source.updatedAt,
        now
      ),

      lastBackupAt: normaliseTimestamp(
        source.lastBackupAt,
        null
      ),

      lastImportAt: normaliseTimestamp(
        source.lastImportAt,
        null
      )
    };
  }

  /* =======================================================
     EMPLOYER STORAGE
  ======================================================== */

  function getEmployers() {
    const storedEmployers = readJson(
      STORAGE_KEYS.employers,
      DEFAULT_EMPLOYERS
    );

    const employers = normaliseEmployers(
      storedEmployers
    );

    writeJson(
      STORAGE_KEYS.employers,
      employers
    );

    return clone(employers);
  }

  function saveEmployers(employers) {
    const normalisedEmployers =
      normaliseEmployers(employers);

    const success = writeJson(
      STORAGE_KEYS.employers,
      normalisedEmployers
    );

    if (success) {
      updateMetadata();

      dispatchStorageEvent(
        "employers-changed",
        {
          employers: normalisedEmployers
        }
      );
    }

    return success;
  }

  function getEmployerById(employerId) {
    const safeId = normaliseString(
      employerId
    );

    return (
      getEmployers().find(
        (employer) =>
          employer.id === safeId
      ) ?? null
    );
  }

  function saveEmployer(employer) {
    const employers = getEmployers();
    const normalisedEmployer =
      normaliseEmployer(
        employer,
        employers.length
      );

    const existingIndex =
      employers.findIndex(
        (item) =>
          item.id ===
          normalisedEmployer.id
      );

    const now = createTimestamp();

    if (existingIndex >= 0) {
      normalisedEmployer.createdAt =
        employers[existingIndex]
          .createdAt ?? now;

      normalisedEmployer.updatedAt = now;

      employers[existingIndex] =
        normalisedEmployer;
    } else {
      normalisedEmployer.createdAt = now;
      normalisedEmployer.updatedAt = now;

      employers.push(normalisedEmployer);
    }

    return saveEmployers(employers)
      ? clone(normalisedEmployer)
      : null;
  }

  function deleteEmployer(
    employerId,
    options = {}
  ) {
    const safeId = normaliseString(
      employerId
    );

    if (!safeId) {
      return false;
    }

    const employers = getEmployers();

    const employerExists =
      employers.some(
        (employer) =>
          employer.id === safeId
      );

    if (!employerExists) {
      return false;
    }

    const remainingEmployers =
      employers.filter(
        (employer) =>
          employer.id !== safeId
      );

    if (!saveEmployers(remainingEmployers)) {
      return false;
    }

    if (options.deleteShifts === true) {
      const remainingShifts =
        getShifts().filter(
          (shift) =>
            shift.employerId !== safeId
        );

      saveShifts(remainingShifts);
    }

    dispatchStorageEvent(
      "employer-deleted",
      {
        employerId: safeId,
        shiftsDeleted:
          options.deleteShifts === true
      }
    );

    return true;
  }

  /* =======================================================
     SHIFT STORAGE
  ======================================================== */

  function getShifts() {
    const storedShifts = readJson(
      STORAGE_KEYS.shifts,
      []
    );

    const shifts = normaliseShifts(
      storedShifts
    );

    writeJson(STORAGE_KEYS.shifts, shifts);

    return clone(shifts);
  }

  function saveShifts(shifts) {
    const normalisedShifts =
      normaliseShifts(shifts);

    const success = writeJson(
      STORAGE_KEYS.shifts,
      normalisedShifts
    );

    if (success) {
      updateMetadata();

      dispatchStorageEvent(
        "shifts-changed",
        {
          shifts: normalisedShifts
        }
      );
    }

    return success;
  }

  function getShiftById(shiftId) {
    const safeId = normaliseString(
      shiftId
    );

    return (
      getShifts().find(
        (shift) => shift.id === safeId
      ) ?? null
    );
  }

  function saveShift(shift) {
    const shifts = getShifts();
    const normalisedShift =
      normaliseShift(shift);

    if (!isUsableShift(normalisedShift)) {
      throw new Error(
        "The shift does not contain valid employer, date and time information."
      );
    }

    const existingIndex =
      shifts.findIndex(
        (item) =>
          item.id === normalisedShift.id
      );

    const now = createTimestamp();

    if (existingIndex >= 0) {
      normalisedShift.createdAt =
        shifts[existingIndex].createdAt ??
        now;

      normalisedShift.updatedAt = now;

      shifts[existingIndex] =
        normalisedShift;
    } else {
      normalisedShift.createdAt = now;
      normalisedShift.updatedAt = now;

      shifts.push(normalisedShift);
    }

    return saveShifts(shifts)
      ? clone(normalisedShift)
      : null;
  }

  function deleteShift(shiftId) {
    const safeId = normaliseString(
      shiftId
    );

    if (!safeId) {
      return false;
    }

    const shifts = getShifts();

    const shiftExists = shifts.some(
      (shift) => shift.id === safeId
    );

    if (!shiftExists) {
      return false;
    }

    const remainingShifts =
      shifts.filter(
        (shift) => shift.id !== safeId
      );

    const success =
      saveShifts(remainingShifts);

    if (success) {
      dispatchStorageEvent(
        "shift-deleted",
        {
          shiftId: safeId
        }
      );
    }

    return success;
  }

  function deleteAllShifts() {
    const success = saveShifts([]);

    if (success) {
      dispatchStorageEvent(
        "all-shifts-deleted"
      );
    }

    return success;
  }

  function getShiftsByEmployer(
    employerId
  ) {
    const safeId = normaliseString(
      employerId
    );

    return getShifts().filter(
      (shift) =>
        shift.employerId === safeId
    );
  }

  function getShiftsByDateRange(
    startDate,
    endDate
  ) {
    if (
      !isValidIsoDate(startDate) ||
      !isValidIsoDate(endDate)
    ) {
      return [];
    }

    return getShifts().filter(
      (shift) =>
        shift.date >= startDate &&
        shift.date <= endDate
    );
  }

  /* =======================================================
     SETTINGS STORAGE
  ======================================================== */

  function getTaxSettings() {
    const settings =
      normaliseTaxSettings(
        readJson(
          STORAGE_KEYS.taxSettings,
          DEFAULT_TAX_SETTINGS
        )
      );

    writeJson(
      STORAGE_KEYS.taxSettings,
      settings
    );

    return clone(settings);
  }

  function saveTaxSettings(settings) {
    const normalisedSettings =
      normaliseTaxSettings({
        ...settings,
        updatedAt: createTimestamp()
      });

    const success = writeJson(
      STORAGE_KEYS.taxSettings,
      normalisedSettings
    );

    if (success) {
      updateMetadata();

      dispatchStorageEvent(
        "tax-settings-changed",
        normalisedSettings
      );
    }

    return success;
  }

  function getSuperSettings() {
    const settings =
      normaliseSuperSettings(
        readJson(
          STORAGE_KEYS.superSettings,
          DEFAULT_SUPER_SETTINGS
        )
      );

    writeJson(
      STORAGE_KEYS.superSettings,
      settings
    );

    return clone(settings);
  }

  function saveSuperSettings(settings) {
    const normalisedSettings =
      normaliseSuperSettings({
        ...settings,
        updatedAt: createTimestamp()
      });

    const success = writeJson(
      STORAGE_KEYS.superSettings,
      normalisedSettings
    );

    if (success) {
      updateMetadata();

      dispatchStorageEvent(
        "super-settings-changed",
        normalisedSettings
      );
    }

    return success;
  }

  function getAppearance() {
    const settings =
      normaliseAppearance(
        readJson(
          STORAGE_KEYS.appearance,
          DEFAULT_APPEARANCE
        )
      );

    writeJson(
      STORAGE_KEYS.appearance,
      settings
    );

    return clone(settings);
  }

  function saveAppearance(settings) {
    const normalisedSettings =
      normaliseAppearance({
        ...settings,
        updatedAt: createTimestamp()
      });

    const success = writeJson(
      STORAGE_KEYS.appearance,
      normalisedSettings
    );

    if (success) {
      updateMetadata();

      dispatchStorageEvent(
        "appearance-changed",
        normalisedSettings
      );
    }

    return success;
  }

  function getPreferences() {
    const storedPreferences =
      readJson(
        STORAGE_KEYS.preferences,
        DEFAULT_PREFERENCES
      );

    const legacyRoute = readRaw(
      STORAGE_KEYS.activeRoute
    );

    if (
      legacyRoute &&
      VALID_ROUTES.includes(legacyRoute)
    ) {
      storedPreferences.activeRoute =
        legacyRoute;
    }

    const preferences =
      normalisePreferences(
        storedPreferences
      );

    writeJson(
      STORAGE_KEYS.preferences,
      preferences
    );

    writeRaw(
      STORAGE_KEYS.activeRoute,
      preferences.activeRoute
    );

    return clone(preferences);
  }

  function savePreferences(preferences) {
    const normalisedPreferences =
      normalisePreferences({
        ...preferences,
        updatedAt: createTimestamp()
      });

    const success = writeJson(
      STORAGE_KEYS.preferences,
      normalisedPreferences
    );

    if (success) {
      writeRaw(
        STORAGE_KEYS.activeRoute,
        normalisedPreferences.activeRoute
      );

      updateMetadata();

      dispatchStorageEvent(
        "preferences-changed",
        normalisedPreferences
      );
    }

    return success;
  }

  function getActiveRoute() {
    return getPreferences().activeRoute;
  }

  function saveActiveRoute(route) {
    const safeRoute =
      VALID_ROUTES.includes(route)
        ? route
        : "home";

    const preferences =
      getPreferences();

    preferences.activeRoute = safeRoute;

    return savePreferences(preferences);
  }

  /* =======================================================
     METADATA
  ======================================================== */

  function getMetadata() {
    const metadata =
      normaliseMetadata(
        readJson(
          STORAGE_KEYS.metadata,
          DEFAULT_METADATA
        )
      );

    writeJson(
      STORAGE_KEYS.metadata,
      metadata
    );

    return clone(metadata);
  }

  function saveMetadata(metadata) {
    return writeJson(
      STORAGE_KEYS.metadata,
      normaliseMetadata(metadata)
    );
  }

  function updateMetadata(changes = {}) {
    const currentMetadata =
      getMetadata();

    const updatedMetadata =
      normaliseMetadata({
        ...currentMetadata,
        ...changes,
        schemaVersion:
          CURRENT_SCHEMA_VERSION,
        updatedAt: createTimestamp()
      });

    saveMetadata(updatedMetadata);

    return updatedMetadata;
  }

  /* =======================================================
     COMPLETE APPLICATION STATE
  ======================================================== */

  function getApplicationData() {
    return {
      application: "Pay Tracker",
      schemaVersion:
        CURRENT_SCHEMA_VERSION,
      employers: getEmployers(),
      shifts: getShifts(),
      taxSettings: getTaxSettings(),
      superSettings:
        getSuperSettings(),
      appearance: getAppearance(),
      preferences: getPreferences(),
      metadata: getMetadata()
    };
  }

  function saveApplicationData(data) {
    if (!isPlainObject(data)) {
      throw new Error(
        "Application data must be an object."
      );
    }

    const validatedData = {
      employers: normaliseEmployers(
        data.employers
      ),

      shifts: normaliseShifts(
        data.shifts
      ),

      taxSettings:
        normaliseTaxSettings(
          data.taxSettings
        ),

      superSettings:
        normaliseSuperSettings(
          data.superSettings
        ),

      appearance:
        normaliseAppearance(
          data.appearance
        ),

      preferences:
        normalisePreferences(
          data.preferences
        ),

      metadata: normaliseMetadata({
        ...data.metadata,
        schemaVersion:
          CURRENT_SCHEMA_VERSION,
        updatedAt: createTimestamp()
      })
    };

    createAutomaticBackup();

    const operations = [
      saveEmployers(
        validatedData.employers
      ),

      saveShifts(validatedData.shifts),

      saveTaxSettings(
        validatedData.taxSettings
      ),

      saveSuperSettings(
        validatedData.superSettings
      ),

      saveAppearance(
        validatedData.appearance
      ),

      savePreferences(
        validatedData.preferences
      ),

      saveMetadata(
        validatedData.metadata
      ),

      writeRaw(
        STORAGE_KEYS.schemaVersion,
        String(CURRENT_SCHEMA_VERSION)
      )
    ];

    const successful =
      operations.every(Boolean);

    if (!successful) {
      throw new Error(
        "One or more application data sections could not be saved."
      );
    }

    dispatchStorageEvent(
      "application-data-changed",
      validatedData
    );

    return clone(validatedData);
  }

  /* =======================================================
     BACKUPS
  ======================================================== */

  function createAutomaticBackup() {
    const backup = {
      application: "Pay Tracker",
      type: "automatic-backup",
      schemaVersion:
        CURRENT_SCHEMA_VERSION,
      createdAt: createTimestamp(),
      data: getApplicationData()
    };

    const success = writeJson(
      STORAGE_KEYS.backup,
      backup
    );

    if (success) {
      updateMetadata({
        lastBackupAt: backup.createdAt
      });

      dispatchStorageEvent(
        "backup-created",
        {
          createdAt: backup.createdAt
        }
      );
    }

    return success
      ? clone(backup)
      : null;
  }

  function getAutomaticBackup() {
    const backup = readJson(
      STORAGE_KEYS.backup,
      null
    );

    if (
      !isPlainObject(backup) ||
      !isPlainObject(backup.data)
    ) {
      return null;
    }

    return clone(backup);
  }

  function restoreAutomaticBackup() {
    const backup = getAutomaticBackup();

    if (!backup) {
      throw new Error(
        "No automatic backup is available."
      );
    }

    const restoredData =
      saveApplicationData(backup.data);

    dispatchStorageEvent(
      "backup-restored",
      {
        createdAt: backup.createdAt
      }
    );

    return restoredData;
  }

  /* =======================================================
     EXPORT AND IMPORT
  ======================================================== */

  function createExportData() {
    return {
      application: "Pay Tracker",
      exportFormat: "pay-tracker-backup",
      exportVersion: 1,
      schemaVersion:
        CURRENT_SCHEMA_VERSION,
      exportedAt: createTimestamp(),
      data: getApplicationData()
    };
  }

  function createExportJson() {
    return JSON.stringify(
      createExportData(),
      null,
      2
    );
  }

  function downloadExportFile() {
    const json = createExportJson();

    const blob = new Blob([json], {
      type: "application/json"
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    link.href = url;
    link.download =
      `pay-tracker-backup-${date}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);

    dispatchStorageEvent(
      "data-exported",
      {
        exportedAt: createTimestamp()
      }
    );

    return true;
  }

  function validateImportData(value) {
    if (!isPlainObject(value)) {
      throw new Error(
        "The selected file does not contain a valid Pay Tracker backup."
      );
    }

    let importedData = value;

    if (
      value.exportFormat ===
        "pay-tracker-backup" &&
      isPlainObject(value.data)
    ) {
      importedData = value.data;
    }

    if (
      !Array.isArray(
        importedData.employers
      ) ||
      !Array.isArray(
        importedData.shifts
      )
    ) {
      throw new Error(
        "The backup is missing employer or shift information."
      );
    }

    return {
      employers: normaliseEmployers(
        importedData.employers
      ),

      shifts: normaliseShifts(
        importedData.shifts
      ),

      taxSettings:
        normaliseTaxSettings(
          importedData.taxSettings
        ),

      superSettings:
        normaliseSuperSettings(
          importedData.superSettings
        ),

      appearance:
        normaliseAppearance(
          importedData.appearance
        ),

      preferences:
        normalisePreferences(
          importedData.preferences
        ),

      metadata: normaliseMetadata({
        ...importedData.metadata,
        schemaVersion:
          CURRENT_SCHEMA_VERSION,
        lastImportAt: createTimestamp(),
        updatedAt: createTimestamp()
      })
    };
  }

  function importFromJson(jsonText) {
    if (typeof jsonText !== "string") {
      throw new Error(
        "Import content must be JSON text."
      );
    }

    let parsedData;

    try {
      parsedData = JSON.parse(jsonText);
    } catch (error) {
      throw new Error(
        "The selected file does not contain valid JSON."
      );
    }

    const validatedData =
      validateImportData(parsedData);

    const savedData =
      saveApplicationData(
        validatedData
      );

    updateMetadata({
      lastImportAt: createTimestamp()
    });

    dispatchStorageEvent(
      "data-imported",
      {
        employerCount:
          savedData.employers.length,
        shiftCount:
          savedData.shifts.length
      }
    );

    return savedData;
  }

  async function importFromFile(file) {
    if (!(file instanceof File)) {
      throw new Error(
        "Select a valid backup file."
      );
    }

    const maximumSize =
      10 * 1024 * 1024;

    if (file.size > maximumSize) {
      throw new Error(
        "The backup file is larger than 10 MB."
      );
    }

    const text = await file.text();

    return importFromJson(text);
  }

  /* =======================================================
     MIGRATIONS
  ======================================================== */

  function getStoredSchemaVersion() {
    const rawVersion = readRaw(
      STORAGE_KEYS.schemaVersion
    );

    const numericVersion =
      Number(rawVersion);

    return Number.isFinite(
      numericVersion
    )
      ? Math.max(
          0,
          Math.floor(numericVersion)
        )
      : 0;
  }

  function migrateVersionZeroToOne() {
    const employers =
      normaliseEmployers(
        readJson(
          STORAGE_KEYS.employers,
          DEFAULT_EMPLOYERS
        )
      );

    const shifts = normaliseShifts(
      readJson(
        STORAGE_KEYS.shifts,
        []
      )
    );

    const legacyAppearance =
      readJson(
        STORAGE_KEYS.appearance,
        DEFAULT_APPEARANCE
      );

    const legacyRoute = readRaw(
      STORAGE_KEYS.activeRoute
    );

    saveEmployers(employers);
    saveShifts(shifts);

    saveTaxSettings(
      getTaxSettings()
    );

    saveSuperSettings(
      getSuperSettings()
    );

    saveAppearance(
      normaliseAppearance(
        legacyAppearance
      )
    );

    savePreferences({
      ...getPreferences(),
      activeRoute:
        VALID_ROUTES.includes(
          legacyRoute
        )
          ? legacyRoute
          : "home"
    });

    updateMetadata({
      schemaVersion: 1
    });

    writeRaw(
      STORAGE_KEYS.schemaVersion,
      "1"
    );
  }

  function runMigrations() {
    let version =
      getStoredSchemaVersion();

    if (
      version >
      CURRENT_SCHEMA_VERSION
    ) {
      console.warn(
        "Pay Tracker data was created by a newer application version."
      );

      return version;
    }

    while (
      version <
      CURRENT_SCHEMA_VERSION
    ) {
      if (version === 0) {
        migrateVersionZeroToOne();
        version = 1;
        continue;
      }

      throw new Error(
        `No migration path exists from schema version ${version}.`
      );
    }

    writeRaw(
      STORAGE_KEYS.schemaVersion,
      String(CURRENT_SCHEMA_VERSION)
    );

    return version;
  }

  /* =======================================================
     INITIALISATION AND RESET
  ======================================================== */

  function initialiseStorage() {
    if (!isLocalStorageAvailable()) {
      return {
        available: false,
        initialised: false
      };
    }

    runMigrations();

    if (
      readRaw(STORAGE_KEYS.employers) ===
      null
    ) {
      saveEmployers(
        clone(DEFAULT_EMPLOYERS)
      );
    }

    if (
      readRaw(STORAGE_KEYS.shifts) ===
      null
    ) {
      saveShifts([]);
    }

    if (
      readRaw(
        STORAGE_KEYS.taxSettings
      ) === null
    ) {
      saveTaxSettings(
        clone(DEFAULT_TAX_SETTINGS)
      );
    }

    if (
      readRaw(
        STORAGE_KEYS.superSettings
      ) === null
    ) {
      saveSuperSettings(
        clone(DEFAULT_SUPER_SETTINGS)
      );
    }

    if (
      readRaw(
        STORAGE_KEYS.appearance
      ) === null
    ) {
      saveAppearance(
        clone(DEFAULT_APPEARANCE)
      );
    }

    if (
      readRaw(
        STORAGE_KEYS.preferences
      ) === null
    ) {
      savePreferences(
        clone(DEFAULT_PREFERENCES)
      );
    }

    if (
      readRaw(STORAGE_KEYS.metadata) ===
      null
    ) {
      saveMetadata({
        ...clone(DEFAULT_METADATA),
        createdAt: createTimestamp(),
        updatedAt: createTimestamp()
      });
    }

    dispatchStorageEvent(
      "initialised",
      {
        schemaVersion:
          CURRENT_SCHEMA_VERSION
      }
    );

    return {
      available: true,
      initialised: true,
      schemaVersion:
        CURRENT_SCHEMA_VERSION
    };
  }

  function resetApplicationData(
    options = {}
  ) {
    const preserveBackup =
      options.preserveBackup === true;

    const backup = preserveBackup
      ? getAutomaticBackup()
      : null;

    Object.values(STORAGE_KEYS).forEach(
      (key) => {
        removeRaw(key);
      }
    );

    if (backup) {
      writeJson(
        STORAGE_KEYS.backup,
        backup
      );
    }

    initialiseStorage();

    dispatchStorageEvent(
      "application-reset",
      {
        preservedBackup:
          Boolean(backup)
      }
    );

    return getApplicationData();
  }

  function clearAllPayTrackerKeys() {
    if (!isLocalStorageAvailable()) {
      return false;
    }

    const keysToDelete = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key = localStorage.key(index);

      if (
        key &&
        key.startsWith(
          `${APP_NAMESPACE}.`
        )
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(removeRaw);

    dispatchStorageEvent(
      "storage-cleared",
      {
        deletedKeyCount:
          keysToDelete.length
      }
    );

    return true;
  }

  /* =======================================================
     PUBLIC STORAGE API
  ======================================================== */

  const storageApi = Object.freeze({
    version: CURRENT_SCHEMA_VERSION,
    keys: STORAGE_KEYS,

    initialise: initialiseStorage,
    isAvailable:
      isLocalStorageAvailable,
    getUsage: getStorageUsage,

    getApplicationData,
    saveApplicationData,

    getEmployers,
    saveEmployers,
    getEmployerById,
    saveEmployer,
    deleteEmployer,

    getShifts,
    saveShifts,
    getShiftById,
    saveShift,
    deleteShift,
    deleteAllShifts,
    getShiftsByEmployer,
    getShiftsByDateRange,

    getTaxSettings,
    saveTaxSettings,

    getSuperSettings,
    saveSuperSettings,

    getAppearance,
    saveAppearance,

    getPreferences,
    savePreferences,
    getActiveRoute,
    saveActiveRoute,

    getMetadata,
    updateMetadata,

    createAutomaticBackup,
    getAutomaticBackup,
    restoreAutomaticBackup,

    createExportData,
    createExportJson,
    downloadExportFile,
    validateImportData,
    importFromJson,
    importFromFile,

    resetApplicationData,
    clearAllPayTrackerKeys,

    utilities: Object.freeze({
      createId,
      clone,
      roundCurrency,
      roundHours,
      isValidIsoDate,
      isValidTime
    })
  });

  Object.defineProperty(
    window,
    "PayTrackerStorage",
    {
      value: storageApi,
      writable: false,
      configurable: false,
      enumerable: true
    }
  );

  initialiseStorage();
})();
