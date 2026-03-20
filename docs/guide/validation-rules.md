# Validation Rules

Kanun provides a single validation rule system. This page documents the full rule set and syntax.

## Rule Syntax

Use either a pipe-delimited string:

```ts
const rules = {
  email: 'required|email|max:255',
};
```

Or an array:

```ts
const rules = {
  email: ['required', 'email', 'max:255'],
};
```

## Nested and Wildcard Paths

```ts
const rules = {
  'user.name.first': 'required|min:2',
  'users.*.email': 'required|email',
};
```

## Available Validation Rules

Use this index to jump directly to each rule description.

### Rule Index

#### Booleans

- [accepted](#accepted)
- [accepted_if:field,value,...](#accepted_if)
- [boolean](#boolean)
- [declined](#declined)
- [declined_if:field,value,...](#declined_if)

#### Strings

- [alpha](#alpha)
- [alpha_dash](#alpha_dash)
- [alpha_num](#alpha_num)
- [email](#email)
- [email:rfc,dns,strict,spoof,filter](#email_options)
- [ends_with:value,...](#ends_with)
- [filled](#filled)
- [ip](#ip)
- [ipv4](#ipv4)
- [ipv6](#ipv6)
- [mac_address](#mac_address)
- [not_regex:pattern](#not_regex)
- [regex:pattern](#regex)
- [starts_with:value,...](#starts_with)
- [string](#string)
- [timezone](#timezone)
- [url](#url)

#### Numbers and Size

- [between:min,max](#between)
- [digits:value](#digits)
- [digits_between:min,max](#digits_between)
- [gt:field](#gt)
- [gte:field](#gte)
- [integer](#integer)
- [lt:field](#lt)
- [lte:field](#lte)
- [max:value](#max)
- [min:value](#min)
- [multiple_of:value](#multiple_of)
- [numeric](#numeric)
- [size:value](#size)

#### Arrays and Objects

- [array](#array)
- [array_unique](#array_unique)
- [distinct](#distinct)
- [distinct:strict](#distinct)
- [distinct:ignore_case](#distinct)
- [in:value,...](#in)
- [json](#json)
- [not_in:value,...](#not_in)
- [object](#object)

#### Dates

- [after:date](#after)
- [after_or_equal:date](#after_or_equal)
- [before:date](#before)
- [before_or_equal:date](#before_or_equal)
- [date](#date)
- [date_equals:date](#date_equals)

#### Database

- [exists:table,column](#exists)
- [unique:table,column,except,idColumn](#unique)

#### Utilities and Cross-field

- [bail](#bail)
- [confirmed](#confirmed)
- [different:field](#different)
- [exclude](#exclude)
- [nullable](#nullable)
- [present](#present)
- [presentsame](#presentsame)
- [prohibited](#prohibited)
- [prohibited_unless:field,value,...](#prohibited_unless)
- [prohibits:field,...](#prohibits)
- [required](#required)
- [required_if:field,value,...](#required_if)
- [required_unless:field,value,...](#required_unless)
- [required_with:field,...](#required_with)
- [required_with_all:field,...](#required_with_all)
- [required_without:field,...](#required_without)
- [required_without_all:field,...](#required_without_all)
- [same:field](#same)
- [sometimes](#sometimes)
- [strict](#strict)

#### Runtime

- [Runtime-registered rules](#runtime-registered-rules)

### accepted

The field must be accepted (`yes`, `on`, `1`, `true`).

<a id="accepted_if"></a>

### accepted_if:field,value,...

The field must be accepted when another field matches one of the provided values.

<a id="after"></a>

### after:date

The field must be a date after the provided date or field value.

<a id="after_or_equal"></a>

### after_or_equal:date

The field must be a date after or equal to the provided date or field value.

### alpha

The field must contain alphabetic characters only.

### alpha_dash

The field may contain letters, numbers, dashes, and underscores.

### alpha_num

The field must contain letters and numbers only.

### array

The field must be an array.

### array_unique

All values in the array must be unique.

### bail

Stop running validation rules on the field after the first failure.

<a id="before"></a>

### before:date

The field must be a date before the provided date or field value.

<a id="before_or_equal"></a>

### before_or_equal:date

The field must be a date before or equal to the provided date or field value.

<a id="between"></a>

### between:min,max

The field’s size or numeric value must be between `min` and `max`.

### boolean

The field must be a boolean-like value (`true`, `false`, `1`, `0`, `'1'`, `'0'`).

### confirmed

The field must match `field_confirmation` or `fieldConfirmation`.

### date

The field must be a valid date.

<a id="date_equals"></a>

### date_equals:date

The field must equal the provided date or date field.

### declined

The field must be declined (`no`, `off`, `0`, `false`).

<a id="declined_if"></a>

### declined_if:field,value,...

The field must be declined when another field matches one of the provided values.

<a id="different"></a>

### different:field

The field must have a different value than the given field.

<a id="digits"></a>

### digits:value

The field must be numeric and contain exactly `value` digits.

<a id="digits_between"></a>

### digits_between:min,max

The field must be numeric and contain between `min` and `max` digits.

### email

The field must be a valid email address.

<a id="email_options"></a>

### email:rfc,dns,strict,spoof,filter

The `email` rule also accepts comma-separated options:

```ts
const rules = {
  email: 'email:rfc,strict,dns,spoof,filter',
};
```

Supported options:

- `rfc`: enables the standard email format check
- `filter`: enables the default lightweight filter-style email validation
- `strict`: rejects malformed local parts and invalid hostname labels
- `dns`: requires a domain that passes strict hostname validation and IDNA normalization
- `spoof`: adds normalization and control-character safety checks

You can use a single option or combine several.

<a id="ends_with"></a>

### ends_with:value,...

The field must end with one of the provided values.

### filled

If the field is present, it must not be empty. Missing fields still pass.

<a id="exists"></a>

### exists:table,column

The field value must exist in the provided database `table` and `column`.

<a id="gt"></a>

### gt:field

The field must be greater than another field or comparison value.

<a id="gte"></a>

### gte:field

The field must be greater than or equal to another field or comparison value.

<a id="in"></a>

### in:value,...

The field must be one of the provided values.

### integer

The field must be an integer.

### ip

The field must be a valid IPv4 or IPv6 address.

### ipv4

The field must be a valid IPv4 address.

### ipv6

The field must be a valid IPv6 address.

### json

The field must be valid JSON.

### mac_address

The field must be a valid MAC address in colon-separated or hyphen-separated form.

<a id="lt"></a>

### lt:field

The field must be less than another field or comparison value.

<a id="lte"></a>

### lte:field

The field must be less than or equal to another field or comparison value.

<a id="max"></a>

### max:value

The field must not be greater than the provided maximum size or value.

<a id="min"></a>

### min:value

The field must be at least the provided minimum size or value.

<a id="multiple_of"></a>

### multiple_of:value

The numeric field must be an exact multiple of the provided value.

This also supports decimals such as `multiple_of:0.1`.

<a id="not_in"></a>

### not_in:value,...

The field must not be one of the provided values.

<a id="not_regex"></a>

### not_regex:pattern

The field must not match the given regular expression.

### nullable

Allow `null` values for non-implicit validations.

### numeric

The field must be numeric.

### object

The field must be a plain object.

### distinct

The field values must be unique.

This is most useful with wildcard rules:

```ts
const rules = {
  'users.*.email': 'distinct',
};
```

Options:

- `distinct:strict`: compare values using strict equality
- `distinct:ignore_case`: compare strings case-insensitively

### present

The field key must exist in the input data, even if empty.

### presentsame

Alias of `present`. The field key must exist in the input data, even if empty.

### prohibited

The field must be missing or empty.

<a id="prohibited_unless"></a>

### prohibited_unless:field,value,...

The field must be missing or empty unless another field matches one of the provided values.

<a id="prohibits"></a>

### prohibits:field,...

If the field is present and not empty, the listed fields must be missing or empty.

<a id="regex"></a>

### regex:pattern

The field must match the given regular expression.

### exclude

Exclude the field from validated output.

This is useful when a field may be accepted as input but should not appear in the result returned by `validate()` or `validated()`.

### required

The field must be present and not empty.

<a id="required_if"></a>

### required_if:field,value,...

The field is required when another field matches one of the provided values.

<a id="required_unless"></a>

### required_unless:field,value,...

The field is required unless another field matches one of the provided values.

<a id="required_with"></a>

### required_with:field,...

The field is required when any of the listed fields are present.

<a id="required_with_all"></a>

### required_with_all:field,...

The field is required when all listed fields are present.

<a id="required_without"></a>

### required_without:field,...

The field is required when any listed field is missing.

<a id="required_without_all"></a>

### required_without_all:field,...

The field is required when all listed fields are missing.

<a id="same"></a>

### same:field

The field must match the given field exactly.

<a id="size"></a>

### size:value

The field must have the exact size or value.

### sometimes

Only apply validation if the field key exists in input data.

<a id="starts_with"></a>

### starts_with:value,...

The field must start with one of the provided values.

### strict

Enables strict type checks for supported rules (for example `numeric`, `integer`, and `boolean`).

### string

The field must be a string.

### timezone

The field must be a valid IANA timezone identifier such as `UTC` or `Europe/Paris`.

<a id="unique"></a>

### unique:table,column,except,idColumn

The field value must be unique in the given table/column. Optionally pass `except` and `idColumn` when validating updates.

### url

The field must be a valid URL.

### Runtime-registered rules

Kanun also supports additional runtime rules (for example `hex`, `includes`, `not_includes`, `datetime`, or app-specific rules) via custom registration:

```ts
register('my_rule', (value) => value === 'ok');
```

## Fail-fast Mode

```ts
const validator = new Validator(data, rules).stopOnFirstFailure();
```

## Rule Message Keys

Custom messages can be set per field/rule:

```ts
const messages = {
  'email.required': 'Email is required.',
  'email.email': 'Email must be a valid address.',
};
```

Next: [Custom Rules](/guide/custom-rules) and [Error Handling](/guide/error-handling).
