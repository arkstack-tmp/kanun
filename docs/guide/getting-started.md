# Getting Started

## Installation

::: code-group

```bash [npm]
npm install kanun
```

```bash [pnpm]
pnpm add kanun
```

```bash [yarn]
yarn add kanun
```

:::

## Basic Usage

```ts
import { Validator } from 'kanun';

const validator = new Validator(
  { email: 'john@example.com', age: 20 },
  { email: 'required|email', age: 'required|numeric|min:18|max:60' },
);

const passes = await validator.passes();

if (!passes) {
  console.log(validator.errors().all());
}
```

## Throw on Failure

Use `validate()` when you prefer exceptions:

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

## Custom Messages

```ts
const validator = new Validator(
  { email: '' },
  { email: 'required|email' },
  {
    'email.required': 'Email is required.',
    'email.email': 'Email format is invalid.',
  },
);
```

## Nested Objects and Arrays

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

## Re-using a Validator

```ts
const validator = new Validator(
  { email: 'invalid' },
  { email: 'required|email' },
);

await validator.fails();

validator.setData({ email: 'valid@example.com' });

const passes = await validator.passes();
console.log(passes); // true
```

## Next Steps

- Learn all supported rules in [Validation Rules](/guide/validation-rules)
- Configure DB-backed `exists`/`unique` in [Database Driver](/guide/database-driver)
- Create reusable rule classes in [Custom Rules](/guide/custom-rules)
- Add installable extensions and file uploads in [Plugins](/guide/plugins)
- Handle and shape errors in [Error Handling](/guide/error-handling)
