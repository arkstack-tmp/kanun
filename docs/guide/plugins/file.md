# File Validation Plugin

`@kanun-hq/plugin-file` adds first-class file rules, request-context helpers, framework adapters, and wildcard utilities for upload-heavy validation flows.

## Installation

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

If you need custom file lookup behavior, register your own instance instead:

```ts
import { Validator } from 'kanun';
import { createFileValidatorPlugin } from '@kanun-hq/plugin-file';

Validator.use(
  createFileValidatorPlugin({
    resolveFiles: ({ attribute, context, value }) => {
      if (typeof value !== 'undefined') {
        return value;
      }

      return context.requestFiles?.[attribute];
    },
  }),
);
```

## Rules

The file plugin adds these rules:

- `file`
- `files`
- `image`
- `extensions:jpg,png`
- `mimetypes:image/jpeg,video/mpeg`
- `mimes:jpg,png`
- `dimensions:min_width=256,min_height=256,max_width=2048,max_height=2048,ratio=1`

It also extends the built-in `min`, `max`, and `size` rules so file values are measured in kilobytes.

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

## Supported File Shapes

The plugin accepts file-like values that expose one or more of these properties:

- `buffer`
- `filename`
- `originalname`
- `name`
- `path`
- `mimetype`
- `type`
- `size`
- `width`
- `height`

That means these input styles work:

- Multer-style file objects
- Fastify multipart parts after normalization
- plain objects with `path`, `size`, and `mimetype`
- `File` and `Blob` values from `FormData`
- arrays of any supported file shape

## Validating Files Passed Directly In Data

If your application already has file objects on the data payload, you can validate them without any context helpers.

```ts
const validator = Validator.make(
  {
    avatar: {
      buffer,
      mimetype: 'image/png',
      originalname: 'avatar.png',
      size: 2048,
    },
  },
  {
    avatar: 'file|image|extensions:png|mimetypes:image/png|max:4',
  },
);

const validated = await validator.validate();
```

`validated.avatar` will be the resolved file object.

## Request-Scoped Uploads

If files are not part of the data object, attach them through validator context.

```ts
const validator = Validator.make(
  {},
  { avatar: 'file|image|mimes:png' },
).withContext({
  requestFiles: {
    avatar,
  },
});

const validated = await validator.validate();
```

`validated` will include the file:

```ts
{
  avatar,
}
```

## Wildcard Multi-file Rules

When you want to validate uploaded file arrays with wildcard rules such as `attachments.*`, you usually need two things:

- A collection rule for the parent field such as `attachments: files`
- Per-item rules for `attachments.*`

`@kanun-hq/plugin-file` includes helpers for that pattern:

```ts
import {
  createWildcardFileRules,
  syncRequestFilesToData,
  useExpressUploadContext,
} from '@kanun-hq/plugin-file';

useExpressUploadContext(req);

const validator = syncRequestFilesToData(
  Validator.make(
    {},
    createWildcardFileRules('attachments', 'file|image|extensions:png,jpg'),
  ),
  ['attachments'],
);

const passes = await validator.passes();
```

`createWildcardFileRules()` creates the parent and item rules together, and `syncRequestFilesToData()` mirrors `context.requestFiles` into validator data so wildcard expansion can discover each uploaded file.

## Upload Adapters

`@kanun-hq/plugin-file` ships adapters that populate `.withContext()` automatically by normalizing uploaded files into `context.requestFiles`.

### Express

Use `useExpressUploadContext()` in middleware for requests populated by middleware such as Multer.

```ts
import { Validator } from 'kanun';
import {
  fileValidatorPlugin,
  useExpressUploadContext,
} from '@kanun-hq/plugin-file';

Validator.use(fileValidatorPlugin);

useExpressUploadContext(req);

const validator = Validator.make({}, { avatar: 'file|image|mimes:png,jpg' });
```

### Fastify

Use `useFastifyUploadContext()` with `@fastify/multipart` inside middleware or hooks.

```ts
import { Validator } from 'kanun';
import {
  fileValidatorPlugin,
  useFastifyUploadContext,
} from '@kanun-hq/plugin-file';

Validator.use(fileValidatorPlugin);

await useFastifyUploadContext(request);

const validator = Validator.make(
  {},
  { attachments: 'files|image|mimes:png,jpg' },
);
```

### Hono

Use `useHonoUploadContext()` to consume files returned by `c.req.parseBody()` during middleware execution.

```ts
import { Validator } from 'kanun';
import {
  fileValidatorPlugin,
  useHonoUploadContext,
} from '@kanun-hq/plugin-file';

Validator.use(fileValidatorPlugin);

await useHonoUploadContext(c);

const validator = Validator.make(
  {},
  { avatar: 'file|image|mimetypes:image/png' },
);
```

### H3

Use `useH3UploadContext()` in middleware or route setup. It can read files from `event.context.requestFiles`, `request.formData()`, or multipart parsing when available.

```ts
import { Validator } from 'kanun';
import { fileValidatorPlugin, useH3UploadContext } from '@kanun-hq/plugin-file';

Validator.use(fileValidatorPlugin);

await useH3UploadContext(event);

const validator = Validator.make(
  {},
  { avatar: 'file|image|mimetypes:image/png' },
);
```

If you only want to enrich one validator instance, the existing `withExpressUploadContext()`, `withFastifyUploadContext()`, `withHonoUploadContext()`, and `withH3UploadContext()` helpers are still available.
