import { CountryCode } from 'libphonenumber-js/max'
import { PhoneNumber } from './PhoneNumber'

/**
 * A class that provides methods to cast raw phone number inputs into a standardized 
 * format based on a specified country.
 */
export class RawPhoneNumberCast {
    constructor(private readonly country: CountryCode | string) { }

    /**
     * Casts the input value to a standardized phone number format based on the 
     * specified country.
     * 
     * @param value 
     * @returns 
     */
    get (value: unknown): PhoneNumber | null {
        return PhoneNumber.parse(value, { country: this.country })
    }

    /**
     * Casts the input value to a standardized phone number format and returns it as 
     * a string.
     * 
     * @param value 
     * @returns 
     */
    set (value: unknown): string | null {
        return PhoneNumber.parse(value, { country: this.country })?.format() ?? null
    }
}