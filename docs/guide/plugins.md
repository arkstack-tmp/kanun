# Plugins

Kanun supports installable plugins so framework-specific or optional validation behavior can live outside the core package.

This keeps the base validator small while allowing packages such as `kanun-plugin-file` to add new rules, messages, and runtime helpers.

## Installing a Plugin

Install the core package and the plugin you need:

::: code-group

```bash [npm]
npm install kanun kanun-plugin-file
```

```bash [pnpm]
pnpm add kanun kanun-plugin-file
```

```bash [yarn]
yarn add kanun kanun-plugin-file
```

:::

Register the plugin once during app startup:

```ts
import { Validator } from 'kanun';
import { fileValidatorPlugin } from 'kanun-plugin-file';

Validator.use(fileValidatorPlugin);
```

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

## File Validation Plugin

The file plugin adds these rules:

- `file`
- `files`
- `image`
- `extensions:jpg,png`
- `mimetypes:image/jpeg,video/mpeg`
- `mimes:jpg,png`
- `dimensions:min_width=256,min_height=256,max_width=2048,max_height=2048,ratio=1`

It also extends the built-in `min`, `max`, and `size` rules so file values are measured in kilobytes.

Example:

```ts
const validator = Validator.make(
  {
    avatar: {
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 2048,
    },
  },
  {
    avatar:
      'file|image|extensions:png|mimetypes:image/png|max:4|dimensions:min_width=1,min_height=1,max_width=512,max_height=512,ratio=1',
  },
);

const passes = await validator.passes();
```

Use `extensions` when you want to validate filename suffixes directly. `mimes` remains available when you want the same extension-style syntax in existing rule sets.

## Wildcard Multi-file Rules

When you want to validate uploaded file arrays with wildcard rules such as `attachments.*`, you usually need two things:

- A collection rule for the parent field such as `attachments: files`
- Per-item rules for `attachments.*`

`kanun-plugin-file` includes helpers for that pattern:

```ts
import {
  createWildcardFileRules,
  syncRequestFilesToData,
  useExpressUploadContext,
} from 'kanun-plugin-file';

useExpressUploadContext(req);

const validator = syncRequestFilesToData(
  Validator.make(
    {},
    createWildcardFileRules(
      'attachments',
      'file|image|extensions:png,jpg',
    ),
  ),
  ['attachments'],
);

const passes = await validator.passes();
```

`createWildcardFileRules()` creates the parent and item rules together, and `syncRequestFilesToData()` mirrors `context.requestFiles` into validator data so wildcard expansion can discover each uploaded file.

## Upload Adapters

`kanun-plugin-file` also ships adapters that populate `.withContext()` automatically by normalizing uploaded files into `context.requestFiles`.

### Express

Use `useExpressUploadContext()` in middleware for requests populated by middleware such as Multer.

```ts
import { Validator } from 'kanun';
import {
  fileValidatorPlugin,
  useExpressUploadContext,
} from 'kanun-plugin-file';

Validator.use(fileValidatorPlugin);

useExpressUploadContext(req);

const validator = Validator.make({}, { avatar: 'file|image|mimes:png,jpg' });

const passes = await validator.passes();
```

### Fastify

Use `useFastifyUploadContext()` with `@fastify/multipart` inside middleware or hooks.

```ts
import { Validator } from 'kanun';
import {
  fileValidatorPlugin,
  useFastifyUploadContext,
} from 'kanun-plugin-file';

Validator.use(fileValidatorPlugin);

await useFastifyUploadContext(request);

const validator = Validator.make(
  {},
  { attachments: 'files|image|mimes:png,jpg' },
);

const passes = await validator.passes();
```

### Hono

Use `useHonoUploadContext()` to consume files returned by `c.req.parseBody()` during middleware execution.

```ts
import { Validator } from 'kanun';
import { fileValidatorPlugin, useHonoUploadContext } from 'kanun-plugin-file';

Validator.use(fileValidatorPlugin);

await useHonoUploadContext(c);

const validator = Validator.make(
  {},
  { avatar: 'file|image|mimetypes:image/png' },
);

const passes = await validator.passes();
```

### H3

Use `useH3UploadContext()` in middleware or route setup. It can read files from `event.context.requestFiles`, `request.formData()`, or multipart parsing when available.

```ts
import { Validator } from 'kanun';
import { fileValidatorPlugin, useH3UploadContext } from 'kanun-plugin-file';

Validator.use(fileValidatorPlugin);

await useH3UploadContext(event);

const validator = Validator.make(
  {},
  { avatar: 'file|image|mimetypes:image/png' },
);

const passes = await validator.passes();
```

If you only want to enrich one validator instance, the existing `withExpressUploadContext()`, `withFastifyUploadContext()`, `withHonoUploadContext()`, and `withH3UploadContext()` helpers are still available.

## Writing Your Own Plugin

Kanun exposes a plugin API for packages that need to register rules or extend runtime behavior.

```ts
import { definePlugin } from 'kanun';

export const examplePlugin = definePlugin({
  name: 'example-plugin',
  install: ({ registerRule, extendTranslations }) => {
    registerRule('starts_with_kanun', (value) => {
      return typeof value === 'string' && value.startsWith('kanun');
    });

    extendTranslations({
      en: {
        starts_with_kanun: 'The :attribute must start with kanun.',
      },
    });
  },
});
```

If a plugin needs runtime state, document the expected shape of `.withContext()` and provide adapters when framework integration is common.
