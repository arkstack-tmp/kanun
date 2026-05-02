import { CountryCode } from 'libphonenumber-js/max'
import { PhoneRule } from './PhoneRule'
import { PhoneType } from './types'

/**
 * A class representing a phone number, providing methods for parsing, formatting, 
 * and validating phone numbers.
 */
export class Phone {
    /**
     * Creates a new instance of the PhoneRule class.
     * 
     * @returns 
     */
    static create (): PhoneRule {
        return new PhoneRule()
    }

    /**
     * Creates a new instance of the PhoneRule class with country-based validation criteria.
     * 
     * @param country 
     * @returns 
     */
    static country (country: CountryCode | CountryCode[]): PhoneRule {
        return Phone.create().country(country)
    }

    /**
     * Creates a new instance of the PhoneRule class with a country field-based 
     * validation criteria.
     * 
     * @param field 
     * @returns 
     */
    static countryField (field: string): PhoneRule {
        return Phone.create().countryField(field)
    }

    /**
     * Creates a new instance of the PhoneRule class with international phone number 
     * validation enabled.
     * 
     * @returns 
     */
    static international (): PhoneRule {
        return Phone.create().international()
    }

    /**
     * Creates a new instance of the PhoneRule class with a specific phone type validation.
     * 
     * @param type 
     * @returns 
     */
    static type (type: PhoneType): PhoneRule {
        return Phone.create().type(type)
    }

    /**
     * Creates a new instance of the PhoneRule class with a specific phone type exclusion.
     * 
     * @param type 
     * @returns 
     */
    static notType (type: PhoneType): PhoneRule {
        return Phone.create().notType(type)
    }

    /**
     * Creates a new instance of the PhoneRule class with lenient phone number 
     * validation enabled.
     * 
     * @returns 
     */
    static lenient (): PhoneRule {
        return Phone.create().lenient()
    }
}