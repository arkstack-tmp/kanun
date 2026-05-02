import { PhoneRuleOptions, PhoneType } from './types'

import { BaseRule } from 'kanun'
import { CountryCode } from 'libphonenumber-js'

/**
 * A validation rule class for validating phone numbers.
 */
export class PhoneRule extends BaseRule {
    private options: PhoneRuleOptions = {}

    /**
     * Adds country-based validation criteria to the phone rule. 
     * 
     * @param country 
     * @returns 
     */
    country (country: CountryCode | CountryCode[]): this {
        this.options.countries = [
            ...(this.options.countries ?? []),
            ...Array.isArray(country) ? country : [country],
        ]
        return this
    }

    /**
     * Adds a country field-based validation criteria to the phone rule, allowing the rule
     * to dynamically determine the country for validation based on another field's value 
     * in the data.
     * 
     * @param field 
     * @returns 
     */
    countryField (field: string): this {
        this.options.countryField = field
        return this
    }

    /**
     * Enables international phone number validation, allowing the rule to accept 
     * phone numbers in international format.
     * 
     * @returns 
     */
    international (): this {
        this.options.international = true
        return this
    }

    /**
     * Enables lenient phone number validation, allowing the rule to accept phone numbers
     * that may not strictly adhere to the standard format.
     * 
     * @returns 
     */
    lenient (): this {
        this.options.lenient = true
        return this
    }

    /**
     * Adds a type-based validation criteria to the phone rule, allowing the rule 
     * to validate phone numbers of a specific type.
     * 
     * @param type 
     * @returns 
     */
    type (type: PhoneType): this {
        this.options.type = type
        return this
    }

    /**
     * Adds a negated type-based validation criteria to the phone rule, allowing the 
     * rule to invalidate phone numbers of a specific type.
     * 
     * @param type 
     * @returns 
     */
    notType (type: PhoneType): this {
        this.options.notType = type
        return this
    }

    /**
     * Generates a string representation of the phone rule.
     * 
     * @returns 
     */
    toString (): string {
        const parameters: string[] = []

        if (this.options.international) {
            parameters.push('INTERNATIONAL')
        }

        if (this.options.countries) {
            parameters.push(...this.options.countries)
        }

        if (this.options.countryField) {
            parameters.push(this.options.countryField)
        }

        if (this.options.type) {
            parameters.push(this.options.type)
        }

        if (this.options.notType) {
            parameters.push(`!${this.options.notType}`)
        }

        if (this.options.lenient) {
            parameters.push('LENIENT')
        }

        return parameters.length > 0 ? `phone:${parameters.join(',')}` : 'phone'
    }
}