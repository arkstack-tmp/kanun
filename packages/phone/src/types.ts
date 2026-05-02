import type { CountryCode, PhoneNumber as LibPhoneNumber } from 'libphonenumber-js/max'

export type PhoneCountry = CountryCode | 'INTERNATIONAL'

export type PhoneType =
    | 'mobile'
    | 'fixed_line'
    | 'fixed_line_or_mobile'
    | 'toll_free'
    | 'voip'
    | 'premium_rate'
    | 'shared_cost'
    | 'personal_number'
    | 'pager'
    | 'uan'
    | 'unknown'
    | 'emergency'
    | 'voicemail'
    | 'short_code'
    | 'standard_rate'

export type SupportedLibPhoneType = Exclude<PhoneType, 'unknown' | 'emergency' | 'short_code' | 'standard_rate'>

export interface PhoneRuleOptions {
    countries?: CountryCode[]
    countryField?: string
    international?: boolean
    lenient?: boolean
    type?: PhoneType
    notType?: PhoneType
}

export interface PhoneNumberOptions {
    country?: CountryCode | string
    lenient?: boolean
}

export type LibPhoneNumberType = NonNullable<ReturnType<LibPhoneNumber['getType']>>
