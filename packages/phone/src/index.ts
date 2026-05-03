import {
    type CountryCode,
} from 'libphonenumber-js/max'

import { deepSet, definePlugin, type ValidatorPlugin } from 'kanun'
import { parsePhoneRuleOptions } from './helpers'
import { PhoneNumber } from './PhoneNumber'
import type { PhoneRuleOptions } from './types'

export type { PhoneCountry, PhoneNumberOptions, PhoneRuleOptions, PhoneType } from './types'
export { E164PhoneNumberCast } from './E164PhoneNumberCast'
export { Phone } from './Phone'
export { PhoneNumber } from './PhoneNumber'
export { PhoneRule } from './PhoneRule'
export { RawPhoneNumberCast } from './RawPhoneNumberCast'

declare module 'kanun' {
    interface ValidationRuleAutocompleteMap {
        phone: 'paramable'
    }

    interface ValidationRuleOutputTypeMap {
        phone: PhoneNumber
    }
}

interface PhoneRuleExecutionContext {
    data: Record<string, unknown>
}

function parseWithCountryCandidates (
    value: string,
    countries: CountryCode[] = [],
    international = false,
    lenient = false,
): PhoneNumber | null {
    const candidates = [...countries]

    if (international || candidates.length === 0 || value.trim().startsWith('+')) {
        candidates.unshift(undefined as unknown as CountryCode)
    }

    for (const country of candidates) {
        const parsed = PhoneNumber.parse(value, {
            country,
            lenient,
        })

        if (parsed) {
            return parsed
        }
    }

    return null
}

function passesTypeConstraint (
    phoneNumber: PhoneNumber,
    options: PhoneRuleOptions
): boolean {
    if (options.type && !phoneNumber.isOfType(options.type)) {
        return false
    }

    if (options.notType && phoneNumber.isOfType(options.notType)) {
        return false
    }

    return true
}



function createPhoneNumber (
    value: unknown,
    country?: CountryCode | string
): PhoneNumber | null {
    return PhoneNumber.parse(value, { country })
}

export const phone = Object.assign(createPhoneNumber, {
    format: (value: unknown, country?: CountryCode | string) => PhoneNumber.parse(value, { country })?.format() ?? null,
    formatE164: (value: unknown, country?: CountryCode | string) => PhoneNumber.parse(value, { country })?.formatE164() ?? null,
    formatInternational: (value: unknown, country?: CountryCode | string) => PhoneNumber.parse(value, { country })?.formatInternational() ?? null,
    formatNational: (value: unknown, country?: CountryCode | string) => PhoneNumber.parse(value, { country })?.formatNational() ?? null,
    formatNationalSignificant: (value: unknown, country?: CountryCode | string, stripSpaces: boolean = false) => PhoneNumber.parse(value, { country })?.formatNationalSignificant(stripSpaces) ?? null,
    parse: PhoneNumber.parse,
})

/**
 * Creates a phone validation plugin for Kanun that validates whether a given value 
 * is a valid phone number based on specified criteria such as country, type, and leniency. 
 * 
 * @returns 
 */
export function createPhoneValidatorPlugin (): ValidatorPlugin {
    return definePlugin({
        name: 'kanun-phone',
        install (api) {
            api.registerRule('phone', function (this: PhoneRuleExecutionContext, value: unknown, parameters: string[] = [], attribute?: string) {
                if (typeof value !== 'string' && typeof value !== 'number') {
                    return false
                }

                const options = parsePhoneRuleOptions(parameters, this.data)
                const parsed = parseWithCountryCandidates(
                    String(value),
                    options.countries,
                    options.international,
                    options.lenient,
                )

                if (!parsed) {
                    return false
                }

                if (options.countries?.length && !options.countries.includes(parsed.getCountry() as CountryCode)) {
                    return false
                }

                if (!passesTypeConstraint(parsed, options)) {
                    return false
                }

                if (attribute) {
                    deepSet(this.data, attribute, parsed)
                }

                return true
            }, (message, parameters, data, getDisplayableAttribute) => {
                const options = parsePhoneRuleOptions(parameters, data as Record<string, unknown>)
                const countryList = options.countries?.join(', ') ?? ''

                return message
                    .replace(':countries', countryList)
                    .replace(':country_field', options.countryField && getDisplayableAttribute ? getDisplayableAttribute(options.countryField) : options.countryField ?? '')
                    .replace(':type', options.type ?? options.notType ?? '')
            })

            api.extendTranslations({
                en: {
                    phone: 'The :attribute must be a valid phone number.',
                },
            })
        },
    })
}

export const phoneValidatorPlugin = createPhoneValidatorPlugin()

export default phoneValidatorPlugin
