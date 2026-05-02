import {
    parsePhoneNumberFromString,
    type CountryCode,
    type NumberFormat,
    type PhoneNumber as LibPhoneNumber,
} from 'libphonenumber-js/max'

import { PHONE_TYPE_MAP, isTypeSupportedByMetadata, normalizeCountry } from './helpers'
import type { PhoneNumberOptions, PhoneType } from './types'

/**
 * A class representing a phone number, providing methods for parsing, formatting, 
 * and validating phone numbers.
 */
export class PhoneNumber {
    readonly value: string
    readonly country?: CountryCode
    private readonly number: LibPhoneNumber

    constructor(
        value: string,
        country?: CountryCode | string,
        options: Omit<PhoneNumberOptions, 'country'> = {}
    ) {
        const parsed = PhoneNumber.parse(value, {
            ...options,
            country,
        })

        if (!parsed) {
            throw new Error('Invalid phone number.')
        }

        this.value = parsed.value
        this.country = parsed.country
        this.number = parsed.number
    }

    /**
     * Parses a phone number from a given input value.
     * 
     * @param value 
     * @param options 
     * @returns 
     */
    static parse (value: unknown, options: PhoneNumberOptions = {}): PhoneNumber | null {
        if (typeof value !== 'string' && typeof value !== 'number') {
            return null
        }

        const input = String(value)
        const country = normalizeCountry(options.country)
        const parsed = parsePhoneNumberFromString(input, country)

        if (parsed && (options.lenient ? parsed.isPossible() : parsed.isValid())) {
            return PhoneNumber.fromLibPhoneNumber(parsed)
        }

        return null
    }

    /**
     * Creates a PhoneNumber instance from a libphonenumber-js PhoneNumber object.
     * 
     * @param number 
     * @returns 
     */
    static fromLibPhoneNumber (number: LibPhoneNumber): PhoneNumber {
        const instance = Object.create(PhoneNumber.prototype) as PhoneNumber

        Object.defineProperties(instance, {
            country: {
                enumerable: true,
                value: number.country,
            },
            number: {
                value: number,
            },
            value: {
                enumerable: true,
                value: number.number,
            },
        })

        return instance
    }

    /**
     * Formats the phone number using the specified format.
     * 
     * @param format 
     * @returns 
     */
    format (format: NumberFormat = 'E.164'): string {
        return this.number.format(format)
    }

    /**
     * Formats the phone number in E.164 format.
     * 
     * @returns 
     */
    formatE164 (): string {
        return this.number.format('E.164')
    }

    /**
     * Formats the phone number in international format.
     * 
     * @returns 
     */
    formatInternational (): string {
        return this.number.formatInternational()
    }

    /**
     * Formats the phone number in RFC3966 format.
     * 
     * @returns 
     */
    formatRFC3966 (): string {
        return this.number.getURI()
    }

    /**
     * Formats the phone number in national format.
     * 
     * @returns 
     */
    formatNational (): string {
        return this.number.formatNational()
    }

    /**
     * Formats the phone number based on the specified country.
     * 
     * @param country 
     * @returns 
     */
    formatForCountry (country: CountryCode | string = this.country ?? 'US'): string {
        const normalizedCountry = normalizeCountry(country)

        if (normalizedCountry && normalizedCountry === this.country) {
            return this.formatNational()
        }

        return this.formatInternational()
    }

    /**
     * Formats the phone number for mobile dialing within a specified country.
     * 
     * @param country 
     * @returns 
     */
    formatForMobileDialingInCountry (country: CountryCode | string): string {
        const normalizedCountry = normalizeCountry(country)

        if (!normalizedCountry || normalizedCountry === this.country) {
            return this.formatNational()
        }

        return this.number.format('IDD', { fromCountry: normalizedCountry })
    }

    /**
     * Retrieves the type of the phone number (e.g., mobile, fixed_line, toll_free, etc.).
     * 
     * @returns 
     */
    getType (): PhoneType {
        const type = this.number.getType()

        if (!type) {
            return 'unknown'
        }

        return type.toLowerCase() as PhoneType
    }

    /**
     * Checks if the phone number is of a specific type.
     * 
     * @param type 
     * @returns 
     */
    isOfType (type: PhoneType): boolean {
        if (type === 'unknown') {
            return this.getType() === 'unknown'
        }

        if (!isTypeSupportedByMetadata(type)) {
            return false
        }

        return this.number.getType() === PHONE_TYPE_MAP[type]
    }

    /**
     * Retrieves the country code associated with the phone number, if available.
     * 
     * @returns 
     */
    getCountry (): CountryCode | undefined {
        return this.country
    }

    /**
     * Checks if the phone number belongs to a specific country.
     * 
     * @param country 
     * @returns 
     */
    isOfCountry (country: CountryCode | string): boolean {
        return normalizeCountry(country) === this.country
    }

    /**
     * Compares the phone number with another phone number or string representation of 
     * a phone number for equality.
     * 
     * @param other 
     * @returns 
     */
    equals (other: PhoneNumber | string): boolean {
        const parsed = typeof other === 'string' ? PhoneNumber.parse(other) : other

        return Boolean(parsed && this.value === parsed.value)
    }

    /**
     * Compares the phone number with another phone number.
     * 
     * @param other 
     * @returns 
     */
    notEquals (other: PhoneNumber | string): boolean {
        return !this.equals(other)
    }

    /**
     * Generates a string representation of the phone number.
     * 
     * @returns 
     */
    toString (): string {
        return this.formatE164()
    }

    /**
     * Generates a JSON representation of the phone number.
     * 
     * @returns 
     */
    toJSON (): string {
        return this.formatE164()
    }
}
