# kanun-plugin-file

File validation plugin for Kanun.

`kanun-plugin-file` adds first-class file rules, request-context helpers, framework adapters, and wildcard utilities for upload-heavy validation flows.

## Features

- Adds `file`, `files`, `image`, `extensions`, `mimes`, `mimetypes`, and `dimensions` rules
- Extends built-in `min`, `max`, and `size` so file sizes are measured in kilobytes
- Supports direct file values, request-scoped uploads, and wildcard multi-file validation
- Ships adapters for Express, Fastify, Hono, and h3
- Supports custom file resolution through `createFileValidatorPlugin()`
- Returns validated files from `await validator.validate()`

## Installation

```bash
pnpm add kanun kanun-plugin-file
```

```bash
npm install kanun kanun-plugin-file
```

```bash
yarn add kanun kanun-plugin-file
```

## Registering The Plugin

Register the plugin once during application startup.

```ts
import { Validator } from 'kanun'
import { fileValidatorPlugin } from 'kanun-plugin-file'

Validator.use(fileValidatorPlugin)
```

If you need custom file lookup behavior, register your own instance instead:

```ts
import { Validator } from 'kanun'
import { createFileValidatorPlugin } from 'kanun-plugin-file'

Validator.use(createFileValidatorPlugin({
  resolveFiles: ({ attribute, context, value }) => {
    if (typeof value !== 'undefined') {
      return value
    }

    return context.requestFiles?.[attribute]
  },
}))
```

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

Example direct file value:

```ts
const avatar = {
  buffer,
  mimetype: 'image/png',
  originalname: 'avatar.png',
  size: 2048,
}

const validator = Validator.make(
  { avatar },
  { avatar: 'file|image|extensions:png|max:4' },
)

const passes = await validator.passes()
```

## Rule Reference

### `file`

Validates that the value resolves to exactly one file.

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file' },
)
```

### `files`

Validates that the value resolves to an array of files.

```ts
const validator = Validator.make(
  { attachments },
  { attachments: 'files' },
)
```

### `image`

Validates that all resolved files are images.

Image detection succeeds when either of these is true:

- the MIME type starts with `image/`
- the file extension is a known image extension such as `png`, `jpg`, `gif`, `webp`, or `svg`

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file|image' },
)
```

### `extensions:...`

Validates the filename or path suffix.

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file|extensions:png,jpg,jpeg' },
)
```

Use this when your rule should match the actual extension directly.

### `mimes:...`

Validates by resolved extension using the familiar Laravel-style rule syntax.

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file|mimes:png,jpg' },
)
```

Use this when you want extension-like validation but prefer the conventional `mimes` rule name.

### `mimetypes:...`

Validates the file MIME type.

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file|mimetypes:image/png,image/jpeg' },
)
```

### `dimensions:...`

Validates image dimensions using any combination of:

- `min_width`
- `max_width`
- `min_height`
- `max_height`
- `ratio`

`ratio` can be written as a number or fraction.

```ts
const validator = Validator.make(
  { avatar },
  {
    avatar:
      'file|image|dimensions:min_width=256,min_height=256,max_width=2048,max_height=2048,ratio=1',
  },
)
```

```ts
const validator = Validator.make(
  { banner },
  {
    banner: 'file|image|dimensions:min_width=1200,ratio=3/1',
  },
)
```

Dimension lookup works in this order:

- explicit `width` and `height` on the file object
- image data from `buffer`
- image data from `path`

## File Size Rules

The plugin extends Kanun's built-in `min`, `max`, and `size` rules for file values.

All file sizes are interpreted in kilobytes.

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file|min:1|max:2048' },
)
```

```ts
const validator = Validator.make(
  { avatar },
  { avatar: 'file|size:512' },
)
```

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
)

await validator.validate()
```

## Validating Request-Scoped Uploads With `.withContext()`

If files are not part of the data object, attach them through validator context.

```ts
const validator = Validator.make(
  {},
  { avatar: 'file|image|mimes:png' },
).withContext({
  requestFiles: {
    avatar,
  },
})

const validated = await validator.validate()
```

`validated` will include the file:

```ts
{
  avatar,
}
```

## Global Request Context With `Validator.useContext()`

If you register request-scoped data in middleware and create validators later in the same request lifecycle, use the static API.

```ts
import { Validator } from 'kanun'

Validator.useContext({
  requestFiles: {
    avatar,
  },
})

const validator = Validator.make({}, { avatar: 'file|image|mimes:png' })
const validated = await validator.validate()
```

## Returning Validated Files From `validate()`

`await validator.validate()` returns the validated values for rule keys.

That includes:

- files supplied directly in `data`
- files resolved from `context.requestFiles`
- file collections mirrored into data for wildcard validation

Example:

```ts
const validator = Validator.make(
  {},
  { avatar: 'file|image|extensions:png' },
).withContext({
  requestFiles: {
    avatar,
  },
})

const validated = await validator.validate()

validated.avatar
```

## Express

### Middleware-style usage

Use `useExpressUploadContext()` after middleware such as Multer has populated `req.file` or `req.files`.

```ts
import express from 'express'
import multer from 'multer'
import { Validator } from 'kanun'
import { fileValidatorPlugin, useExpressUploadContext } from 'kanun-plugin-file'

Validator.use(fileValidatorPlugin)

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.post('/profile', upload.single('avatar'), async (req, res) => {
  useExpressUploadContext(req)

  const validator = Validator.make({}, {
    avatar: 'file|image|mimes:png,jpg|max:2048',
  })

  const validated = await validator.validate()
  res.json(validated)
})
```

### Single validator instance usage

Use `withExpressUploadContext()` when you only want to enrich one validator instance.

```ts
import { withExpressUploadContext } from 'kanun-plugin-file'

const validator = withExpressUploadContext(
  Validator.make({}, { avatar: 'file|image|mimes:png' }),
  req,
)

await validator.validate()
```

## Fastify

### Hook or route usage

Use `useFastifyUploadContext()` with `@fastify/multipart`.

```ts
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { Validator } from 'kanun'
import { fileValidatorPlugin, useFastifyUploadContext } from 'kanun-plugin-file'

Validator.use(fileValidatorPlugin)

const app = Fastify()
await app.register(multipart)

app.addHook('preHandler', async (request) => {
  await useFastifyUploadContext(request)
})

app.post('/attachments', async () => {
  const validator = Validator.make({}, {
    attachments: 'files|mimes:png,jpg,pdf',
  })

  return await validator.validate()
})
```

`useFastifyUploadContext()` can normalize uploads from:

- `request.files()`
- `request.parts()`
- `request.file()`
- `request.body`
- `request.raw.files`

### Single validator instance usage

```ts
import { withFastifyUploadContext } from 'kanun-plugin-file'

const validator = await withFastifyUploadContext(
  Validator.make({}, { attachments: 'files|mimes:png,jpg' }),
  request,
)

await validator.validate()
```

## Hono

### Middleware-style usage

Use `useHonoUploadContext()` to read files from `c.req.parseBody({ all: true })`.

```ts
import { Hono } from 'hono'
import { Validator } from 'kanun'
import { fileValidatorPlugin, useHonoUploadContext } from 'kanun-plugin-file'

Validator.use(fileValidatorPlugin)

const app = new Hono()

app.use('/profile', async (c, next) => {
  await useHonoUploadContext(c)
  await next()
})

app.post('/profile', async (c) => {
  const validator = Validator.make({}, {
    avatar: 'file|image|mimetypes:image/png',
  })

  return c.json(await validator.validate())
})
```

### Single validator instance usage

```ts
import { withHonoUploadContext } from 'kanun-plugin-file'

const validator = await withHonoUploadContext(
  Validator.make({}, { avatar: 'file|image|mimetypes:image/png' }),
  c,
)

await validator.validate()
```

## h3

### Middleware-style usage

Use `useH3UploadContext()` inside middleware or handlers.

```ts
import { H3 } from 'h3'
import { Validator } from 'kanun'
import { fileValidatorPlugin, useH3UploadContext } from 'kanun-plugin-file'

Validator.use(fileValidatorPlugin)

const app = new H3()

app.use('/profile', async (event, next) => {
  await useH3UploadContext(event)
  return next()
})

app.post('/profile', async () => {
  const validator = Validator.make({}, {
    avatar: 'file|image|mimetypes:image/png',
  })

  return await validator.validate()
})
```

`useH3UploadContext()` can resolve files from:

- `event.context.requestFiles`
- `event.req.formData()`
- `event.request.formData()`
- multipart parsing when available

### Single validator instance usage

```ts
import { withH3UploadContext } from 'kanun-plugin-file'

const validator = await withH3UploadContext(
  Validator.make({}, { avatar: 'file|image|mimetypes:image/png' }),
  event,
)

await validator.validate()
```

## Wildcard Multi-file Validation

Use `createWildcardFileRules()` when you want both collection-level and item-level rules.

```ts
import { createWildcardFileRules } from 'kanun-plugin-file'

const rules = createWildcardFileRules(
  'attachments',
  'file|image|extensions:png,jpg',
)
```

This produces rules equivalent to:

```ts
{
  attachments: ['files'],
  'attachments.*': ['file', 'image', 'extensions:png,jpg'],
}
```

If your uploads live in `requestFiles` rather than `data`, mirror them into the validator data before validation so wildcard expansion can see the collection.

```ts
import {
  createWildcardFileRules,
  syncRequestFilesToData,
  useExpressUploadContext,
} from 'kanun-plugin-file'

useExpressUploadContext(req)

const validator = syncRequestFilesToData(
  Validator.make(
    {},
    createWildcardFileRules(
      'attachments',
      'file|image|extensions:png,jpg',
      'files',
    ),
  ),
  ['attachments'],
)

const validated = await validator.validate()
```

`validated.attachments` will contain the uploaded files.

## Custom File Resolution

If your framework or upload pipeline stores files somewhere other than `context.requestFiles`, provide a custom resolver.

```ts
import { Validator } from 'kanun'
import { createFileValidatorPlugin } from 'kanun-plugin-file'

Validator.use(createFileValidatorPlugin({
  resolveFiles: ({ attribute, context, data, value }) => {
    if (typeof value !== 'undefined') {
      return value
    }

    if (context.uploads?.[attribute]) {
      return context.uploads[attribute]
    }

    return data[`__files.${attribute}`]
  },
}))
```

Resolver arguments:

- `attribute`: the rule key being validated
- `context`: the validator context
- `data`: the validator data object
- `value`: the current field value from `data`, if present

## Common Patterns

### Validate one avatar upload

```ts
const validator = Validator.make({}, {
  avatar: 'file|image|extensions:png,jpg|max:2048',
}).withContext({
  requestFiles: { avatar },
})

await validator.validate()
```

### Validate many attachments

```ts
const validator = Validator.make({ attachments }, {
  attachments: 'files|mimes:png,jpg,pdf',
})

await validator.validate()
```

### Validate an image banner with dimensions

```ts
const validator = Validator.make({}, {
  banner:
    'file|image|mimetypes:image/png|dimensions:min_width=1200,max_width=2400,ratio=3/1',
}).withContext({
  requestFiles: { banner },
})

await validator.validate()
```

### Validate request uploads and return them

```ts
const validated = await Validator.make({}, {
  avatar: 'file|image|extensions:png',
}).withContext({
  requestFiles: { avatar },
}).validate()

validated.avatar
```

## Notes

- Register the plugin once at startup, not per request.
- `file` expects a single file, while `files` expects an array.
- `min`, `max`, and `size` use kilobytes for file values.
- `dimensions` only makes sense for image inputs.
- Wildcard file validation usually needs `syncRequestFilesToData()` when the source of truth is request context.

## License

MIT