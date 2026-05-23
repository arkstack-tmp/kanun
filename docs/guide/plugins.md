# Plugins

Kanun supports installable plugins so framework-specific or optional validation behavior can live outside the core package.

This keeps the base validator small while allowing packages to add new rules, messages, type inference, output transformations, request-context helpers, and framework adapters.

## Installing A Plugin

Install the core package and the plugin you need:

::: code-group

```bash [npm]
npm install kanun @kanun-hq/plugin-file
```

```bash [pnpm]
pnpm add kanun @kanun-hq/plugin-file
```

```bash [yarn]
yarn add kanun @kanun-hq/plugin-file
```

:::

Register the plugin once during app startup:

```ts
import { Validator } from 'kanun';
import { fileValidatorPlugin } from '@kanun-hq/plugin-file';

Validator.use(fileValidatorPlugin);
```

## Available Plugins

- [File Validation](./plugins/file.md): upload validation rules, file size semantics, wildcard helpers, and Express/Fastify/Hono/h3 adapters.
- [Phone Validation](./plugins/phone.md): phone number validation, parsed `PhoneNumber` output, formatting helpers, and Arkormˣ-style casts.

## Validator Context

Plugins can read extra runtime state through validator context.

```ts
const validator = Validator.make(data, rules).withContext({
  request,
  currentUser,
});
```

Context is useful when a rule depends on request-bound information such as uploaded files, authenticated users, or framework services.

If you want to register request-scoped context once in middleware and let validators created later pick it up automatically, use the static API:

```ts
import { Validator } from 'kanun';

Validator.useContext({
  request,
  currentUser,
});
```

## Writing Your Own Plugin

Kanun exposes a plugin API for packages that need to register rules or extend runtime behavior.

```ts
import { definePlugin } from 'kanun';

export const examplePlugin = definePlugin({
  name: 'example-plugin',
  install: ({ registerRule, extendTranslations, onValidationError, onValidationSuccess }) => {
    registerRule('starts_with_kanun', (value) => {
      return typeof value === 'string' && value.startsWith('kanun');
    });

    extendTranslations({
      en: {
        starts_with_kanun: 'The :attribute must start with kanun.',
      },
    });

    onValidationSuccess((validator) => {
      // Runs after a validator completes successfully.
    });

    onValidationError((validator) => {
      // Runs after a validator fails and the error bag has been populated.
      validator.errors().all();
    });
  },
});
```

### Validation Lifecycle Hooks

Plugins can register lifecycle hooks that run after each validator execution.

```ts
export const auditPlugin = definePlugin({
  name: 'audit-plugin',
  install: ({ onValidationSuccess, onValidationError }) => {
    onValidationSuccess((validator) => {
      const data = validator.validatedData();
      // send successful validation metadata to your integration
    });

    onValidationError((validator) => {
      const errors = validator.errors().all();
      // send failed validation metadata to your integration
    });
  },
});
```

`onValidationError(...)` runs after validation fails and the validator's
`MessageBag` has been populated. `onValidationSuccess(...)` runs after
validation passes, so plugins can safely read `validatedData()`.

### Add Rule Autocomplete For Plugin Users

If your plugin adds custom rules, you can augment Kanun's rule autocomplete so array-style rule definitions suggest your rule names in TypeScript.

```ts
declare module 'kanun' {
  interface ValidationRuleAutocompleteMap {
    starts_with_kanun: 'plain';
    kanun_format: 'paramable';
  }
}
```

Use `'plain'` for rules without parameters and `'paramable'` for rules used like `rule:value`.

That makes plugin rules show up in array syntax such as:

```ts
const rules = {
  name: ['required', 'starts_with_kanun', 'kanun_format:strict'],
};
```

This only affects TypeScript autocomplete and typing. You still need to register the runtime rule implementation inside your plugin with `registerRule(...)`.

If a plugin needs runtime state, document the expected shape of `.withContext()` and provide adapters when framework integration is common.
