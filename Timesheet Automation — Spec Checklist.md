# Timesheet Automation — Spec Checklist

Checklist of things to verify / set up in the timesheet automation repo before writing `.spec.js` files, following the exact format used in the config repo.

## 1. File Naming & Location Rules

| # | Check |
|---|---|
| 1.1 | All test files use `.spec.js` suffix — not `.test.js` |
| 1.2 | Unit test files are co-located next to the module: `src/<module>.spec.js` sits alongside `src/<module>.js` |
| 1.3 | Integration / validation test files live in a top-level `test/` folder: `test/<suite-name>.spec.js` |
| 1.4 | Describe block label matches the function or module name: `describe('validateHours', () => { ... })` |
| 1.5 | Test case labels are full English sentences: `test('negative hours fails', () => { ... })` |

## 2. Jest Infrastructure to Replicate

| # | Check |
|---|---|
| 2.1 | `jest.config.js` exists with `moduleNameMapper` for aliases (e.g. `@src`, `@services`, `@utils`) |
| 2.2 | `babel.config.js` has `@babel/preset-env` so Jest can parse ES6 `import` / `export` |
| 2.3 | `test/setup/jest.setup.js` exists — mocks external services (logger, DB, mailer) on every test run |
| 2.4 | `package.json` has `"test": "jest --no-cache --no-coverage"` or equivalent |
| 2.5 | `jest-expect-message` plugin installed and loaded in setup file for custom failure messages |

## 3. Code Patterns to Match

| # | Check |
|---|---|
| 3.1 | Use `import` syntax (not `require`) in every spec file |
| 3.2 | Use named `describe` + `test` blocks (not `it`) |
| 3.3 | Nested `describe` groups behavior: `describe('allow', () => { ... })` + `describe('deny', () => { ... })` |
| 3.4 | Factory helper with `overrides` used for test data: `const entry = (overrides = {}) => ({ ...defaults, ...overrides })` |
| 3.5 | Custom failure messages via `jest-expect-message`: `expect(result, JSON.stringify({ input })).toEqual(expected)` |
| 3.6 | Snapshot tests only for large static outputs (integration), not unit tests |
| 3.7 | Mocked modules use `jest.mock('./config', () => mockConfigModule)` pattern |

## 4. Spec Structure Template (Per File)

| # | Check |
|---|---|
| 4.1 | Top of file: `import { functionName } from './moduleName'` |
| 4.2 | After imports: helper factory / mock setup |
| 4.3 | Outer `describe('<ModuleOrFunction>', () => { ... })` wraps all tests |
| 4.4 | inner `describe('<behavior-group>', () => { ... })` groups related cases |
| 4.5 | Each `test('<descriptive sentence>', () => { ... })` contains a single assertion or a short chain |

## 5. Things to Verify in Timesheet Repo Before Writing Tests

| # | Check |
|---|---|
| 5.1 | Identify pure functions (date helpers, hour calculators, CSV parsers) — easiest to unit test |
| 5.2 | Identify side-effect code (DB writes, API calls, file I/O) — these need mocks in `jest.setup.js` |
| 5.3 | Decide module aliases: `@src`, `@services`, `@utils`, `@api` — map them in `jest.config.js` |
| 5.4 | Confirm `babel-jest` transform is configured so `import` statements work in tests |
| 5.5 | Create `test/fixtures/` folder for sample CSV / JSON inputs used by integration tests |

## 6. Example Skeletal Spec File

```js
import { validateHours, isOvertime } from './validateHours';

const entry = (overrides = {}) => ({
	employeeId: 'E001',
	date: '2026-05-12',
	hours: 8,
	...overrides,
});

describe('validateHours', () => {
	describe('valid entries', () => {
		test('standard 8-hour shift passes', () => {
			expect(validateHours(entry())).toEqual({ valid: true });
		});
	});

	describe('invalid entries', () => {
		test('negative hours fails', () => {
			expect(validateHours(entry({ hours: -2 })))
				.toEqual({ valid: false, reason: 'negative hours' });
		});
	});
});
```

---

Once you review and confirm this checklist, we can proceed to implement the same setup in your timesheet automation repo.
