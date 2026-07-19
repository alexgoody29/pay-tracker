/**
 * ============================================================
 * PayPilot Payroll Engine
 * File: payroll/constants.js
 * Version: 1.0.0
 *
 * Global constants used throughout the payroll engine.
 * ============================================================
 */

"use strict";

const PAYPILOT = {

    VERSION: "1.0.0",

    COUNTRY: "Australia",

    CURRENCY: "AUD",

    TAX_YEAR: "2026-27",

    PAY_FREQUENCY: Object.freeze({

        WEEKLY: "weekly",

        FORTNIGHTLY: "fortnightly",

        MONTHLY: "monthly"

    }),

    EMPLOYMENT_TYPE: Object.freeze({

        FULL_TIME: "full_time",

        PART_TIME: "part_time",

        CASUAL: "casual"

    }),

    RESIDENCY_STATUS: Object.freeze({

        RESIDENT: "resident",

        FOREIGN_RESIDENT: "foreign_resident",

        WORKING_HOLIDAY: "working_holiday"

    }),

    TAX_FREE_THRESHOLD: Object.freeze({

        CLAIMED: true,

        NOT_CLAIMED: false

    }),

    STUDY_LOAN: Object.freeze({

        NONE: "none",

        HELP: "help",

        SSL: "ssl",

        TSL: "tsl"

    }),

    SUPER: Object.freeze({

        DEFAULT_RATE: 0.12,

        MINIMUM_AGE: 18

    }),

    SHIFT_TYPE: Object.freeze({

        ORDINARY: "ordinary",

        OVERTIME: "overtime",

        PUBLIC_HOLIDAY: "public_holiday",

        SATURDAY: "saturday",

        SUNDAY: "sunday"

    }),

    ALLOWANCE_TYPE: Object.freeze({

        MEAL: "meal",

        TRAVEL: "travel",

        FIRST_AID: "first_aid",

        LAUNDRY: "laundry",

        TOOL: "tool",

        OTHER: "other"

    }),

    PAY_COMPONENT: Object.freeze({

        ORDINARY: "ordinary",

        PENALTY: "penalty",

        OVERTIME: "overtime",

        ALLOWANCE: "allowance",

        BONUS: "bonus",

        LEAVE: "leave"

    }),

    DAYS: Object.freeze([

        "Monday",

        "Tuesday",

        "Wednesday",

        "Thursday",

        "Friday",

        "Saturday",

        "Sunday"

    ]),

    MONTHS: Object.freeze([

        "January",

        "February",

        "March",

        "April",

        "May",

        "June",

        "July",

        "August",

        "September",

        "October",

        "November",

        "December"

    ])

};

Object.freeze(PAYPILOT);

window.PAYPILOT = PAYPILOT;
