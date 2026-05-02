# Phone Validation Plugin

`@kanun-hq/plugin-phone` adds a `phone` rule, a fluent `Phone` rule builder, parsed `PhoneNumber` validated output, formatting helpers, and Arkormx-style casts.

The plugin uses `libphonenumber-js/max` for parsing, validation, country detection, formatting, and number type metadata.

## Installation

::: code-group

```bash [npm]
npm install kanun @kanun-hq/plugin-phone
```

```bash [pnpm]
pnpm add kanun @kanun-hq/plugin-phone
```

```bash [yarn]
yarn add kanun @kanun-hq/plugin-phone
```

:::

Register the plugin once during application startup:

```ts
import { Validator } from 'kanun';
import { phoneValidatorPlugin } from '@kanun-hq/plugin-phone';

Validator.use(phoneValidatorPlugin);
```

## Basic Validation

Use the `phone` rule without parameters when the input includes enough country information, such as an international number.

```ts
const validator = Validator.make(
  { my_input: '+32 12 34 56 78' },
  { my_input: 'phone' },
);
```

When the input is national, pass one or more country codes.

```ts
const validated = await Validator.make(
  { my_input: '012 34 56 78' },
  { my_input: 'phone:BE' },
).validate();

validated.my_input.formatE164(); // '+3212345678'
```

The same rule can be written with the fluent builder:

```ts
import { Phone } from '@kanun-hq/plugin-phone';

const validator = Validator.make(
  { my_input: '012 34 56 78' },
  { my_input: Phone.country(['US', 'BE']) },
);
```

## Validated Output

When the `phone` rule passes, `validate()` returns a parsed `PhoneNumber` instance for that field.

```ts
const validated = await Validator.make(
  { my_input: '012 34 56 78' },
  { my_input: 'phone:BE' },
).validate();

validated.my_input.formatE164(); // '+3212345678'
validated.my_input.getCountry(); // 'BE'
validated.my_input.getType(); // 'fixed_line'
```

## Country Field Validation

Use `phone:field_name` when another input field stores the country code.

```ts
const validated = await Validator.make(
  {
    my_input: '012 34 56 78',
    custom_country_field: 'BE',
  },
  {
    my_input: 'phone:custom_country_field',
    custom_country_field: 'required_with:my_input',
  },
).validate();

validated.my_input.formatE164(); // '+3212345678'
```

Builder form:

```ts
const validator = Validator.make(
  {
    my_input: '012 34 56 78',
    custom_country_field: 'BE',
  },
  {
    my_input: Phone.countryField('custom_country_field'),
    custom_country_field: 'required_with:my_input',
  },
);
```

## International Numbers

Use `INTERNATIONAL` to allow country detection from the phone number itself while still applying any country constraints that follow.

```ts
const validator = Validator.make(
  { my_input: '+32 12 34 56 78' },
  { my_input: 'phone:INTERNATIONAL,BE' },
);
```

Builder form:

```ts
const validator = Validator.make(
  { my_input: '+32 12 34 56 78' },
  { my_input: Phone.international().country('BE') },
);
```

## Phone Number Types

Use type parameters to require a specific number type.

```ts
const validator = Validator.make(
  { my_input: '+32 470 12 34 56' },
  { my_input: 'phone:mobile' },
);
```

Builder form:

```ts
const validator = Validator.make(
  { my_input: '+32 470 12 34 56' },
  { my_input: Phone.type('mobile') },
);
```

Use `!` to reject a type.

```ts
const validator = Validator.make(
  { my_input: '+32 2 555 12 12' },
  { my_input: 'phone:!mobile' },
);
```

Builder form:

```ts
const validator = Validator.make(
  { my_input: '+32 2 555 12 12' },
  { my_input: Phone.notType('mobile') },
);
```

Supported type names:

- `mobile`
- `fixed_line`
- `fixed_line_or_mobile`
- `toll_free`
- `voip`
- `premium_rate`
- `shared_cost`
- `personal_number`
- `pager`
- `uan`
- `unknown`
- `emergency`
- `voicemail`
- `short_code`
- `standard_rate`

Some type names depend on what `libphonenumber-js` metadata can identify. Unsupported metadata-specific types simply do not match `PhoneNumber.isOfType()`.

## Lenient Validation

Use `LENIENT` when you want possible phone numbers to pass even if they are not strictly valid according to numbering-plan metadata.

```ts
const validator = Validator.make(
  { my_input: '+1 200 123 0101' },
  { my_input: 'phone:LENIENT' },
);
```

Builder form:

```ts
const validator = Validator.make(
  { my_input: '+1 200 123 0101' },
  { my_input: Phone.lenient() },
);
```

## PhoneNumber Utility

Use `PhoneNumber` directly when you want parsing, normalization, formatting, and comparisons outside a validator.

```ts
import { PhoneNumber } from '@kanun-hq/plugin-phone';

const phoneNumber = new PhoneNumber('+3212/34.56.78');

phoneNumber.format(); // '+3212345678'
phoneNumber.formatE164(); // '+3212345678'
phoneNumber.formatInternational(); // '+32 12 34 56 78'
phoneNumber.formatRFC3966(); // 'tel:+3212345678'
phoneNumber.formatNational(); // '012 34 56 78'
phoneNumber.formatForCountry('BE'); // '012 34 56 78'
phoneNumber.formatForMobileDialingInCountry('US'); // '011 32 12 34 56 78'
phoneNumber.getType(); // 'fixed_line'
phoneNumber.isOfType('fixed_line'); // true
phoneNumber.getCountry(); // 'BE'
phoneNumber.isOfCountry('BE'); // true
phoneNumber.equals(new PhoneNumber('012 34 56 78', 'BE')); // true
phoneNumber.notEquals('+32 470 12 34 56'); // true
```

National numbers can be parsed with a country:

```ts
const phoneNumber = new PhoneNumber('012 34 56 78', 'BE');

phoneNumber.formatE164(); // '+3212345678'
```

Use the nullable parser when invalid input should not throw:

```ts
PhoneNumber.parse('not a phone number'); // null
```

## Phone Helper

The `phone` helper is a callable shortcut around `PhoneNumber.parse()` with common formatting helpers attached.

```ts
import { phone } from '@kanun-hq/plugin-phone';

const parsed = phone('012 34 56 78', 'BE');

parsed?.formatE164(); // '+3212345678'

phone.format('+3212/34.56.78'); // '+3212345678'
phone.formatE164('012 34 56 78', 'BE'); // '+3212345678'
phone.formatInternational('012 34 56 78', 'BE'); // '+32 12 34 56 78'
phone.formatNational('+3212345678'); // '012 34 56 78'
```

## Arkormx Casts

Use `RawPhoneNumberCast` or `E164PhoneNumberCast` for model cast definitions.

```ts
import { Model } from 'arkormx';
import { RawPhoneNumberCast } from '@kanun-hq/plugin-phone';

export class User extends Model {
  protected override casts = {
    phone: new RawPhoneNumberCast('country_field'),
  } as const;
}
```

You can pass a fixed country instead of a field name.

```ts
export class User extends Model {
  protected override casts = {
    phone: new RawPhoneNumberCast('BE'),
  } as const;
}
```

`E164PhoneNumberCast` always stores E.164 strings.

```ts
import { E164PhoneNumberCast } from '@kanun-hq/plugin-phone';

export class User extends Model {
  protected override casts = {
    phone: new E164PhoneNumberCast('BE'),
  } as const;
}
```
