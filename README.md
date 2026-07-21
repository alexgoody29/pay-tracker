# PayPilot

PayPilot is an Australian employee-focused payroll and pay verification application.

It is being designed to help workers:

- track shifts across multiple employers
- calculate expected gross pay
- calculate PAYG withholding per payment
- calculate superannuation on superable earnings
- apply award and enterprise agreement rules
- maintain year-to-date totals
- compare expected pay against actual payslips
- identify possible underpayments

## Project status

PayPilot is currently under active development.

The project is being built one module at a time, with payroll accuracy, auditability, historical rule preservation, and maintainability as core requirements.

## Core payroll architecture

The payroll engine is planned around the following modules:

```text
payroll/
├── constants.js
├── taxEngine.js
├── payEngine.js
├── superEngine.js
├── awardEngine.js
├── overtimeEngine.js
├── allowanceEngine.js
├── ytdEngine.js
├── auditEngine.js
├── validator.js
└── taxTables/