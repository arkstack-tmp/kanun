# Kanun

[![Validation Package Version][i1]][l1]
[![Downloads][d1]][l1]
[![Tests][tei]][tel]
[![License][lini]][linl]

Framework-agnostic TypeScript-first validation library. Provides a rich set of built-in rules, custom rule support, nested data validation, conditional rules, localized error messages, and a flexible API for validating complex data structures in Node.js applications.

## Installation

```bash
npm install kanun
```

For file validation, install the separate plugin package:

```bash
npm install kanun @kanun-hq/plugin-file
```

## Features

- Rule-based validation — Supports common rules like required, min, max, email, url, numeric, boolean, in, regex, etc.
- Nested data validation — Dot notation for nested objects (user.email, items.\*.price).
- Custom error messages — Per-rule and per-field message overrides.
- Batch validation — Validate multiple datasets or groups in one call.
- Conditional validation — Rules that only apply when other fields meet conditions (required_if, sometimes, exclude_unless).
- Implicit rules — Rules that run even when attributes are missing (e.g., accepted, required).

- Custom rules — Define user-provided validation rules as functions or classes.
- Async rules — Support for async validation (e.g., checking uniqueness in a database).
- Attribute sanitization — Optional transformation (e.g., trimming, normalizing case) before validation.
- Dynamic rule sets — Rules can be generated at runtime (e.g., based on user roles).
- Dependent rules — Rules that reference other fields dynamically.

- Localized error messages — Built-in support for localization and i18n message templates.
- Structured errors — Validation errors returned as structured objects or flat key–message pairs.
- Fail-fast mode — Option to stop at the first failure or collect all errors.
- Human-readable summaries — Helper for formatting readable validation reports.

- TypeScript-first design — Full type inference for rules, messages, and validated data.
- Chainable API — Optional fluent syntax for building validators.
- Plugin system — Install optional rule packs without expanding the core bundle.

## Usage

### Quick Start

```ts
import { Validator } from 'kanun';

const validator = new Validator(
  { email: 'john@example.com', age: 20 },
  { email: 'required|email', age: 'required|numeric|min:18' },
);

const passes = await validator.passes();

if (!passes) {
  console.log(validator.errors().all());
}
```

### Throwing Validation Errors

```ts
import { Validator, ValidationException } from 'kanun';

const validator = Validator.make({ email: '' }, { email: 'required|email' });

try {
  const data = await validator.validate();
  console.log(data);
} catch (error) {
  if (error instanceof ValidationException) {
    console.log(error.errors());
  }
}
```

### Custom Messages

```ts
const validator = new Validator(
  { email: '' },
  { email: 'required|email' },
  {
    'email.required': 'Email is required.',
    'email.email': 'Email must be valid.',
  },
);
```

### Nested and Array Validation

```ts
const validator = new Validator(
  {
    user: { name: { first: 'John', last: '' } },
    users: [{ email: 'good@example.com' }, { email: 'bad' }],
  },
  {
    'user.name.first': 'required|min:2',
    'user.name.last': 'required|min:2',
    'users.*.email': 'required|email',
  },
);
```

### Custom Rule Class

```ts
import { ValidationRule, Validator } from 'kanun';

class StartsWithKanun extends ValidationRule {
  validate(
    attribute: string,
    value: any,
    fail: (message: string) => void,
  ): void {
    if (typeof value !== 'string' || !value.startsWith('kanun')) {
      fail(`The ${attribute} must start with kanun.`);
    }
  }
}

const validator = new Validator(
  { slug: 'kanun' },
  { slug: ['required', new StartsWithKanun()] },
);
```

### Database-backed `exists` and `unique`

```ts
import { IDatabaseDriver, Validator } from 'kanun';

class AppDatabaseDriver extends IDatabaseDriver {
  async exists({ table, column, value, ignore }) {
    const row = await db.table(table).where(column, value).first();
    if (!row) return false;
    if (ignore != null && String(row.id) === String(ignore)) return false;
    return true;
  }
}

const driver = new AppDatabaseDriver();

Validator.useDatabase(driver);

const validator = new Validator(
  { username: 'legacy' },
  { username: 'unique:users,username' },
);
```

### Plugins

Kanun supports installable plugins such as `@kanun-hq/plugin-file`.

Plugin usage, file validation rules, and framework upload adapters are fully documented:

- https://arkstack-tmp.github.io/kanun/guide/plugins

For the complete guide and API reference, visit the docs site: https://arkstack-tmp.github.io/kanun

## Code of Conduct

In order to ensure that the Kanun community is welcoming to all, please review and abide by the [Code of Conduct](https://arkstack-tmp.github.io/code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Kanun, please send an e-mail to Legacy via hi@toneflix.net. All security vulnerabilities will be promptly addressed.

## License

Kanun and all Arkstack packages are open source and licensed under the [MIT license](LICENSE).

[i1]: https://img.shields.io/npm/v/kanun?style=flat-square&label=kanun&color=%230970ce
[l1]: https://www.npmjs.com/package/kanun
[d1]: https://img.shields.io/npm/dt/kanun?style=flat-square&label=Downloads&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fkanun
[linl]: https://github.com/arkstack-tmp/kanun/blob/main/LICENSE
[lini]: https://img.shields.io/github/license/arkstack-tmp/kanun
[tel]: https://github.com/arkstack-tmp/kanun/actions/workflows/ci.yml
[tei]: https://github.com/arkstack-tmp/kanun/actions/workflows/ci.yml/badge.svg
