import { assert, describe, expectTypeOf, it } from 'vitest'

import type { RulesForData } from '../../../src'
import { Validator } from '../../../src'
import {
    E164PhoneNumberCast,
    Phone,
    PhoneNumber,
    RawPhoneNumberCast,
    phone,
    phoneValidatorPlugin,
} from '../src'

Validator.use(phoneValidatorPlugin)

describe('Phone validator plugin', function () {
    it('keeps Phone rule builders assignable to typed Validator rules', () => {
        const rules = {
            my_input: Phone.country(['US', 'BE']),
        } satisfies RulesForData<{ my_input: string }>

        expectTypeOf(rules.my_input).toEqualTypeOf<ReturnType<typeof Phone.country>>()
    })

    it('validates phone numbers against explicit country parameters', async () => {
        const validator = Validator.make(
            { my_input: '012 34 56 78' },
            { my_input: 'phone:US,BE' },
        )

        assert.equal(await validator.passes(), true)

        const invalid = Validator.make(
            { my_input: '012 34 56 78' },
            { my_input: 'phone:US' },
        )

        assert.equal(await invalid.passes(), false)
        assert.equal(invalid.errors().first('my_input'), 'The my input must be a valid phone number.')
    })

    it('returns parsed PhoneNumber instances from validate()', async () => {
        const validator = Validator.make(
            { my_input: '012 34 56 78' },
            { my_input: 'phone:BE' },
        )

        const validated = await validator.validate()

        expectTypeOf(validated.my_input).toEqualTypeOf<PhoneNumber>()
        assert.instanceOf(validated.my_input, PhoneNumber)
        assert.equal(validated.my_input.formatE164(), '+3212345678')
        assert.equal(`${validated.my_input}`, '+3212345678')
        assert.equal(validated.my_input.getCountry(), 'BE')
    })

    it('returns parsed PhoneNumber instances from validate() with builder and country-field rules', async () => {
        const builderValidated = await Validator.make(
            { my_input: '012 34 56 78' },
            { my_input: Phone.country(['US', 'BE']) },
        ).validate()

        assert.instanceOf(builderValidated.my_input, PhoneNumber)
        assert.equal(builderValidated.my_input.formatE164(), '+3212345678')

        const fieldValidated = await Validator.make(
            { my_input: '012 34 56 78', custom_country_field: 'BE' },
            {
                my_input: Phone.countryField('custom_country_field'),
                custom_country_field: 'required_with:my_input',
            },
        ).validate()

        assert.instanceOf(fieldValidated.my_input, PhoneNumber)
        assert.equal(fieldValidated.my_input.formatE164(), '+3212345678')
        assert.equal(`${fieldValidated.my_input}`, '+3212345678')
        assert.equal(fieldValidated.custom_country_field, 'BE')
    })

    it('supports the Phone country and countryField rule builders', async () => {
        const countryList = Validator.make(
            { my_input: '012 34 56 78' },
            { my_input: Phone.country(['US', 'BE']) },
        )

        assert.equal(await countryList.passes(), true)

        const countryField = Validator.make(
            { my_input: '012 34 56 78', custom_country_field: 'BE' },
            {
                my_input: Phone.countryField('custom_country_field'),
                custom_country_field: 'required_with:my_input',
            },
        )

        assert.equal(await countryField.passes(), true)
    })

    it('supports international, type, negated type, and lenient parameters', async () => {
        assert.equal(await Validator.make(
            { my_input: '+32 12 34 56 78' },
            { my_input: 'phone:INTERNATIONAL,BE' },
        ).passes(), true)

        assert.equal(await Validator.make(
            { my_input: '+32 470 12 34 56' },
            { my_input: Phone.type('mobile') },
        ).passes(), true)

        assert.equal(await Validator.make(
            { my_input: '+32 2 555 12 12' },
            { my_input: 'phone:!mobile' },
        ).passes(), true)

        assert.equal(await Validator.make(
            { my_input: '+1 200 123 0101' },
            { my_input: 'phone' },
        ).passes(), false)

        assert.equal(await Validator.make(
            { my_input: '+1 200 123 0101' },
            { my_input: Phone.lenient() },
        ).passes(), true)
    })

    it('formats and compares phone numbers through the utility wrapper', () => {
        const parsed = new PhoneNumber('+3212/34.56.78')
        const local = new PhoneNumber('012 34 56 78', 'BE')

        assert.equal(parsed.format(), '+3212345678')
        assert.equal(parsed.formatE164(), '+3212345678')
        assert.equal(parsed.formatInternational(), '+32 12 34 56 78')
        assert.equal(parsed.formatRFC3966(), 'tel:+3212345678')
        assert.equal(parsed.formatNational(), '012 34 56 78')
        assert.equal(parsed.formatNationalSignificant(), '12 34 56 78')
        assert.equal(parsed.formatNationalSignificant(true), '12345678')
        assert.equal(parsed.formatForCountry('BE'), '012 34 56 78')
        assert.equal(parsed.formatForMobileDialingInCountry('US'), '011 32 12 34 56 78')
        assert.equal(parsed.getType(), 'fixed_line')
        assert.equal(parsed.isOfType('fixed_line'), true)
        assert.equal(parsed.getCountry(), 'BE')
        assert.equal(parsed.isOfCountry('BE'), true)
        assert.equal(parsed.equals(local), true)
        assert.equal(parsed.notEquals('+32 470 12 34 56'), true)
    })

    it('exposes a phone helper for parsing and common formatting', () => {
        const parsed = phone('012 34 56 78', 'BE')

        assert.instanceOf(parsed, PhoneNumber)
        assert.equal(phone.format('+3212/34.56.78'), '+3212345678')
        assert.equal(phone.formatE164('012 34 56 78', 'BE'), '+3212345678')
        assert.equal(phone.formatInternational('012 34 56 78', 'BE'), '+32 12 34 56 78')
        assert.equal(phone.formatNational('+3212345678'), '012 34 56 78')
        assert.equal(phone.formatNationalSignificant('+234 903 123 4567'), '903 123 4567')
        assert.equal(phone.formatNationalSignificant('+234 903 123 4567', undefined, true), '9031234567')
        assert.equal(phone.formatNationalSignificant('+1 415 555 2671'), '415 555 2671')
    })

    it('casts raw and E.164 phone number values', () => {
        const rawCast = new RawPhoneNumberCast('BE')
        const e164Cast = new E164PhoneNumberCast('BE')

        assert.instanceOf(rawCast.get('012 34 56 78'), PhoneNumber)
        assert.equal(rawCast.set('012 34 56 78'), '+3212345678')
        assert.equal(e164Cast.set('012 34 56 78'), '+3212345678')
        assert.equal(e164Cast.set('not a phone number'), null)
    })
})
