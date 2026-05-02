import { getCountries, isSupportedCountry, type CountryCode } from 'libphonenumber-js/max'
import { deepFind } from 'kanun'

import type { LibPhoneNumberType, PhoneRuleOptions, PhoneType, SupportedLibPhoneType } from './types'

export const PHONE_TYPE_MAP: Record<SupportedLibPhoneType, LibPhoneNumberType> = {
    fixed_line: 'FIXED_LINE',
    fixed_line_or_mobile: 'FIXED_LINE_OR_MOBILE',
    mobile: 'MOBILE',
    pager: 'PAGER',
    personal_number: 'PERSONAL_NUMBER',
    premium_rate: 'PREMIUM_RATE',
    shared_cost: 'SHARED_COST',
    toll_free: 'TOLL_FREE',
    uan: 'UAN',
    voicemail: 'VOICEMAIL',
    voip: 'VOIP',
}

const PHONE_TYPES = new Set<PhoneType>([
    'mobile',
    'fixed_line',
    'fixed_line_or_mobile',
    'toll_free',
    'voip',
    'premium_rate',
    'shared_cost',
    'personal_number',
    'pager',
    'uan',
    'unknown',
    'emergency',
    'voicemail',
    'short_code',
    'standard_rate',
])

const COUNTRIES = new Set<string>(getCountries())

export function normalizeCountry (country: unknown): CountryCode | undefined {
    if (typeof country !== 'string') {
        return undefined
    }

    const normalized = country.trim().toUpperCase()

    if (COUNTRIES.has(normalized) && isSupportedCountry(normalized)) {
        return normalized as CountryCode
    }

    return undefined
}

export function isPhoneType (value: string): value is PhoneType {
    return PHONE_TYPES.has(value.toLowerCase() as PhoneType)
}

export function isTypeSupportedByMetadata (type: PhoneType): type is SupportedLibPhoneType {
    return Object.prototype.hasOwnProperty.call(PHONE_TYPE_MAP, type)
}

export function parsePhoneRuleOptions (parameters: string[], data: Record<string, unknown> = {}): PhoneRuleOptions {
    const options: PhoneRuleOptions = {}

    for (const rawParameter of parameters) {
        const parameter = rawParameter.trim()

        if (!parameter) {
            continue
        }

        const upper = parameter.toUpperCase()
        const lower = parameter.toLowerCase()

        if (upper === 'INTERNATIONAL') {
            options.international = true
            continue
        }

        if (upper === 'LENIENT') {
            options.lenient = true
            continue
        }

        if (parameter.startsWith('!') && isPhoneType(parameter.slice(1))) {
            options.notType = parameter.slice(1).toLowerCase() as PhoneType
            continue
        }

        if (isPhoneType(lower)) {
            options.type = lower
            continue
        }

        const country = normalizeCountry(parameter)

        if (country) {
            options.countries = [...(options.countries ?? []), country]
            continue
        }

        const countryFromField = normalizeCountry(deepFind(data, parameter))

        if (countryFromField) {
            options.countryField = parameter
            options.countries = [...(options.countries ?? []), countryFromField]
            continue
        }

        options.countryField = parameter
    }

    return options
}
