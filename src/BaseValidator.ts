'use strict'

import {
    CustomAttributes,
    CustomErrors,
    CustomMessages,
    ErrorMessage,
    ImplicitAttributes,
    InitialRules,
    Rules,
    TRule
} from './Contracts/BaseContract'
import { getValidatorContext, useValidatorContext } from './Context'
import { deepFind, deepSet, dotify } from './utilities/object'
import { getFormattedAttribute, getKeyCombinations, getMessage } from './utilities/formatMessages'
import { getNumericRules, isImplicitRule } from './utilities/general'

import ErrorBag from './validators/errorBag'
import { GenericObject } from 'src/Contracts/IGeneric'
import Lang from './Lang'
import Password from './Rules/password'
import RuleContract from './Rules/IRuleContract'
import { buildValidationMethodName } from './utilities/build'
import { usePlugin, type ValidatorPlugin } from './Plugin'
import replaceAttributePayload from './payloads/replaceAttributePayload'
import replaceAttributes from './validators/replaceAttributes'
import validateAttributes from './validators/validateAttributes'
import validationData from './validators/validationData'
import validationRuleParser from './validators/validationRuleParser'
import { isObject } from './utilities/helpers'

export class BaseValidator<D extends GenericObject = GenericObject> {
    private excludedAttributes = new Set<string>()

    /**
     * The lang used to return error messages
     */
    private lang: string

    /**
     * The data object that will be validated
     */
    private data: D

    /**
     * The rules that will be used to check the validity of the data
     */
    private rules!: Rules

    /**
     * This is an unchanged version of the inital rules before being changed for wildcard validations
     */
    private initalRules: InitialRules<any>

    /**
     * The array of wildcard attributes with their asterisks expanded.
     */
    private implicitAttributes!: ImplicitAttributes

    /**
     * Hold the error messages
     */
    private messages: ErrorBag


    /**
     * Stores an instance of the validateAttributes class
     */
    private validateAttributes!: validateAttributes


    /**
     * Flag that defines wether or not validation should stop on first failure
     */
    private stopOnFirstFailureFlag!: boolean


    /**
     * Custom messages returned based on the error
     */
    customMessages: CustomMessages<D>

    /**
     * Object of custom attribute name;
     */
    customAttributes: CustomAttributes<D>

    /**
     * Arbitrary per-validator context for plugins.
     */
    private context: GenericObject = {}


    constructor(data: D, rules: InitialRules<D>, customMessages: CustomMessages<D> = {}, customAttributes: CustomAttributes<D> = {}) {
        this.data = data
        this.customMessages = dotify(customMessages)
        this.customAttributes = dotify(customAttributes)
        this.initalRules = rules
        this.lang = Lang.getDefaultLang()
        this.addRules(rules)
        this.messages = new ErrorBag()
    };

    static use (plugin: ValidatorPlugin): typeof BaseValidator {
        usePlugin(plugin)
        return this
    }

    static useContext (context: GenericObject = {}): typeof BaseValidator {
        useValidatorContext(context)
        return this
    }

    use (plugin: ValidatorPlugin): this {
        BaseValidator.use(plugin)
        return this
    }

    setData<ND extends GenericObject> (data: ND): BaseValidator<ND> {
        this.data = data as unknown as D
        this.addRules(this.initalRules as InitialRules<D>)
        return this as unknown as BaseValidator<ND>
    };

    setRules (rules: InitialRules<D>): this {
        this.addRules(rules)
        this.initalRules = rules
        return this
    };

    setLang (lang: string): this {
        this.lang = lang
        return this
    };


    /**
     * Set the validator's context.
     */
    withContext (context: GenericObject = {}): this {
        this.context = context
        return this
    }

    /**
     * Get the validator's context. 
     * This is useful for custom rules that need access to additional data or services.
     * 
     * @returns The current context object
     */
    getContext (): GenericObject {
        return {
            ...getValidatorContext(),
            ...this.context,
        }
    }

    /**
     * Get the current language used by the validator. 
     * 
     * @returns 
     */
    getLang (): string {
        return this.lang
    }

    /**
     * Set custom error messages for the validator. 
     * 
     * @param customMessages 
     * @returns 
     */
    setCustomMessages (customMessages: CustomMessages<D> = {}): this {
        this.customMessages = dotify(customMessages)
        return this
    };

    /**
     * Set custom attribute names for the validator.
     * 
     * @param customAttributes 
     * @returns 
     */
    setCustomAttributes (customAttributes: CustomAttributes<D> = {}): this {
        this.customAttributes = dotify(customAttributes)
        return this
    };

    /**
     * Set whether the validator should stop validating after the first failure.
     * 
     * @param stopOnFirstFailure 
     * @returns 
     */
    stopOnFirstFailure (stopOnFirstFailure: boolean = true): this {
        this.stopOnFirstFailureFlag = stopOnFirstFailure
        return this
    };

    /**
     * Get the error messages related to the validation.
     * 
     * @returns 
     */
    errors (): ErrorBag {
        return this.messages
    };

    getExcludedAttributes (): string[] {
        return [...this.excludedAttributes]
    }

    /**
     * Clear the error messages for the given keys. 
     * If no keys are provided, all error messages will be cleared.
     * 
     * @param keys  The keys of the error messages to clear
     * @returns     The updated ErrorBag instance
     */
    clearErrors (keys: string[] = []): ErrorBag {
        this.messages = this.messages.clear(keys).clone()
        return this.messages
    }

    /**
     * Create a new ErrorBag instance and set the custom errors, thus removing previous error messages
     */
    setErrors (errors: CustomErrors): ErrorBag {
        this.messages = new ErrorBag()
        this.addCustomErrors(errors)
        return this.messages
    }

    /**
     * Append the error messages to the existing ErrorBag instance, thus preserving the old error messages if any
     */
    appendErrors (errors: CustomErrors): ErrorBag {
        this.addCustomErrors(errors, true)
        return this.messages.clone()
    }

    /**
     * Run the validator's rules against its data.
     */
    validate (key: string = '', value: any = undefined): boolean {
        if (!isObject(this.data)) {
            throw 'The data attribute must be an object'
        }
        this.validateAttributes = new validateAttributes(this.data, this.rules, this.getContext())

        if (!key) {
            this.runAllValidations()
            return this.messages.keys().length === 0
        } else {
            this.runSingleValidation(key, value)
            return !this.messages.has(key)
        }
    };

    /**
     * Run the validator's rules against its data asynchronously.
     */
    async validateAsync (key: string = '', value: any = undefined): Promise<boolean> {
        if (!isObject(this.data)) {
            throw 'The data attribute must be an object'
        }

        this.validateAttributes = new validateAttributes(this.data, this.rules, this.getContext())
        if (!key) {
            await this.runAllValidationsAsync()
            return this.messages.keys().length === 0
        } else {
            await this.runSingleValidationAsync(key, value)
            return !this.messages.has(key)
        }
    }


    /**
     * Get the displayable name of the attribute.
     * 
     * @param attribute 
     * @returns 
     */
    getDisplayableAttribute (attribute: string): string {
        const primaryAttribute: string = this.getPrimaryAttribute(attribute)
        const attributeCombinations: string[] = getKeyCombinations(attribute)
        const translatedAttributes = dotify(Lang.get(this.lang)['attributes'] || {})
        let expectedAttributes: string[] = attributeCombinations

        // Combine both attributes combinations in one array
        if (attribute !== primaryAttribute) {
            expectedAttributes = []
            const primaryAttributeCombinations: string[] = getKeyCombinations(primaryAttribute)

            for (let i = 0; i < attributeCombinations.length; i++) {
                expectedAttributes.push(attributeCombinations[i])
                if (attributeCombinations[i] !== primaryAttributeCombinations[i]) {
                    expectedAttributes.push(primaryAttributeCombinations[i])
                }
            }
        }

        let name: string = ''
        let line: string | undefined = ''
        for (let i = 0; i < expectedAttributes.length; i++) {
            name = expectedAttributes[i]
            // The developer may dynamically specify the object of custom attributes on this 
            // validator instance. If the attribute exists in the object it is used over 
            // the other ways of pulling the attribute name for this given attribute.   
            if (Object.prototype.hasOwnProperty.call(this.customAttributes, name)) {
                return this.customAttributes[name]
            }

            line = translatedAttributes[name]
            // We allow for a developer to specify language lines for any attribute
            if (typeof line === 'string') {
                return line
            }
        }

        void name
        void line

        return getFormattedAttribute(attribute)
    }

    private addCustomErrors (errors: CustomErrors, shouldClearErrors = false) {
        let newErrors: string[]
        // If the flag is set to true, we will remove the existing messages if any before setting the new ones
        if (shouldClearErrors) {
            this.messages.clear(Object.keys(errors))
        }

        for (const key in errors) {
            newErrors = typeof errors[key] === 'string' ? [errors[key]] as string[] : errors[key] as string[]
            newErrors.forEach(error => {
                this.messages.add(key, { message: error, error_type: 'custom' })
            })
        }
    }

    /**
     * Replace all error message place-holders with actual values.
     */
    private makeReplacements (
        message: string, attribute: string, rule: string, parameters: string[] = [], hasNumericRule: boolean = false,
    ): string {

        message = message.replace(':attribute', attribute)
        const methodName = `replace${buildValidationMethodName(rule)}` as keyof typeof replaceAttributes

        if (typeof replaceAttributes[methodName] === 'function') {
            const payload = new replaceAttributePayload(
                this.data, message, parameters, hasNumericRule, ((attribute: string) => {
                    return this.getDisplayableAttribute(attribute)
                }).bind(this)
            )
            message = replaceAttributes[methodName](payload)
        }

        return message

    };

    /**
     * Loop through all rules and run validation against each one of them
     */
    private runAllValidations (): void {
        this.messages = new ErrorBag()
        this.validateAttributes = new validateAttributes(this.data, this.rules, this.getContext())
        this.excludedAttributes.clear()

        for (const property in this.rules) {
            if (this.runValidation(property) === false) {
                break
            }
        }
    }

    /**
     * Loop through all rules and run validation against each one of them asynchronously.
     */
    private async runAllValidationsAsync (): Promise<void> {
        this.messages = new ErrorBag()
        this.validateAttributes = new validateAttributes(this.data, this.rules, this.getContext())
        this.excludedAttributes.clear()

        for (const property in this.rules) {
            if (await this.runValidationAsync(property) === false) {
                break
            }
        }
    }

    /**
     * Run validation for one specific attribute
     */
    private runSingleValidation (key: string, value: any = undefined): void {
        this.clearErrors([key])

        if (typeof value !== 'undefined') {
            deepSet(this.data, key, value)
        }

        this.runValidation(key)
    }

    /**
     * Run validation for one specific attribute asynchronously.
     */
    private async runSingleValidationAsync (key: string, value: any = undefined): Promise<void> {
        this.clearErrors([key])

        if (typeof value !== 'undefined') {
            deepSet(this.data, key, value)
        }

        await this.runValidationAsync(key)
    }

    /**
     * Run validation rules for the specified property and stop validation if needed
     */
    private runValidation (property: string): boolean | void {
        if (Object.prototype.hasOwnProperty.call(this.rules, property) && Array.isArray(this.rules[property])) {
            if (validationRuleParser.hasRule(property, ['exclude'], this.rules)) {
                this.excludedAttributes.add(property)
                return
            }

            for (let i = 0; i < this.rules[property].length; i++) {
                this.validateAttribute(property, this.rules[property][i])

                if (this.messages.keys().length > 0 && this.stopOnFirstFailureFlag === true) {
                    return false
                }

                if (this.shouldStopValidating(property)) {
                    break
                }
            }
        }
    }

    /**
     * Run validation rules for the specified property asynchronously and stop validation if needed
     */
    private async runValidationAsync (property: string): Promise<boolean | void> {
        if (Object.prototype.hasOwnProperty.call(this.rules, property) && Array.isArray(this.rules[property])) {
            if (validationRuleParser.hasRule(property, ['exclude'], this.rules)) {
                this.excludedAttributes.add(property)
                return
            }

            for (let i = 0; i < this.rules[property].length; i++) {
                await this.validateAttribute(property, this.rules[property][i])

                if (this.messages.keys().length > 0 && this.stopOnFirstFailureFlag === true) {
                    return false
                }

                if (this.shouldStopValidating(property)) {
                    break
                }
            }
        }
    }

    /**
     * Check if we should stop further validations on a given attribute.
     */
    private shouldStopValidating (attribute: string): boolean {
        if (this.excludedAttributes.has(attribute)) {
            return true
        }

        return this.messages.has(attribute) && validationRuleParser.hasRule(attribute, ['bail'], this.rules)
    };

    /**
     * Parse the given rules add assign them to the current rules
     */
    private addRules (rules: InitialRules<D>): void {

        // The primary purpose of this parser is to expand any "*" rules to the all
        // of the explicit rules needed for the given data. For example the rule
        // names.* would get expanded to names.0, names.1, etc. for this data.
        const response: { rules: Rules, implicitAttributes: ImplicitAttributes } =
            validationRuleParser.explodeRules(dotify(rules, true), this.data)

        this.rules = response.rules
        this.implicitAttributes = response.implicitAttributes
    };

    /**
     * validate a given attribute against a rule.
     */
    private validateAttribute (attribute: string, rule: TRule): void | Promise<void> {

        let parameters: string[] = [];

        [rule, parameters] = validationRuleParser.parse(rule)

        const keys: string[] = this.getExplicitKeys(attribute)

        if (keys.length > 0 && parameters.length > 0) {
            parameters = this.replaceAsterisksInParameters(parameters, keys)
        }

        const value = this.getAttributeValue(attribute)
        const validatable: boolean = this.isValidatable(attribute, value, rule)

        if (rule instanceof RuleContract) {
            return validatable
                ? this.validateUsingCustomRule(attribute, value, rule)
                : void 0
        }

        const method = `validate${buildValidationMethodName(rule)}`

        if (rule !== '' && typeof this.validateAttributes[method] === 'undefined') {
            throw `Rule ${rule} is not valid`
        }

        if (!validatable) {
            return
        }

        const validation = this.validateAttributes[method](
            value,
            parameters,
            attribute,
            this.getPrimaryAttribute(attribute),
        ) as boolean | Promise<boolean>

        if (validation instanceof Promise) {
            return validation.then(result => {
                if (!result) {
                    this.addFailure(attribute, rule as string, value, parameters)
                }
            })
        } else if (!validation) {
            this.addFailure(attribute, rule, value, parameters)
        }

    };

    /**
     * Validate an attribute using a custom rule object
     */
    private validateUsingCustomRule (attribute: string, value: any, rule: RuleContract): void | Promise<void> {

        rule.setData(this.data).setLang(this.lang)

        if (rule instanceof Password) {
            rule.setValidator(this)
        }

        const result = rule.passes(value, attribute)

        if (result instanceof Promise) {
            return result.then(validationResult => {
                if (!validationResult) {
                    this.setCustomRuleErrorMessages(attribute, rule)
                }
            })
        }

        if (!result) {
            return this.setCustomRuleErrorMessages(attribute, rule)
        }

    };

    /**
     * Set the error message linked to a custom validation rule 
     */
    private setCustomRuleErrorMessages (attribute: string, rule: RuleContract): void {
        const result: GenericObject | string = rule.getMessage()
        const messages: GenericObject = typeof result === 'string' ? [result] : result

        for (const key in messages) {
            this.messages.add(attribute, {
                error_type: rule.constructor.name, message: this.makeReplacements(
                    messages[key], this.getDisplayableAttribute(attribute), rule.constructor.name
                )
            })
        }
    }

    /**
     * Add a new error message to the messages object
     */
    private addFailure (attribute: string, rule: string, value: any, parameters: string[]): void {

        const hasNumericRule = validationRuleParser.hasRule(attribute, getNumericRules(), this.rules)
        const primaryAttribute: string = this.getPrimaryAttribute(attribute)
        const attributes: string[] = attribute !== primaryAttribute ?
            [attribute, primaryAttribute] : [attribute]

        const message: string = this.makeReplacements(
            getMessage(attributes, rule, value, this.customMessages, hasNumericRule, this.lang),
            this.getDisplayableAttribute(attribute), rule, parameters, hasNumericRule
        )

        const error: ErrorMessage = {
            error_type: rule,
            message
        }

        this.messages.add(attribute, error)
    };

    /**
     * Replace each field parameter which has asterisks with the given keys.
     *
     * Example: parameters = [name.*.first] and keys = [1], then the result will be name.1.first
     */
    private replaceAsterisksInParameters (parameters: string[], keys: string[]): string[] {
        return parameters.map(parameter => {
            let result: string = ''
            if (parameter.indexOf('*') !== -1) {
                const parameterArray: string[] = parameter.split('*')
                result = parameterArray[0]
                for (let i = 1; i < parameterArray.length; i++) {
                    result = result.concat((keys[i - 1] || '*') + parameterArray[i])
                }
            }
            return result || parameter
        })
    };

    /**
     * Determine if the attribute is validatable.
     */
    private isValidatable (attribute: string, value: any, rule: TRule): boolean {
        return this.presentOrRuleIsImplicit(attribute, value, rule) &&
            this.passesOptionalCheck(attribute) &&
            this.isNotNullIfMarkedAsNullable(attribute, value, rule)
    };


    /**
     * Determine if the field is present, or the rule implies required.
     */
    private presentOrRuleIsImplicit (attribute: string, value: any, rule: TRule) {
        if (typeof value === 'string' && value.trim() === '') {
            return isImplicitRule(rule)
        }

        return typeof value !== 'undefined' ||
            isImplicitRule(rule)
    }

    /**
     * Determine if the attribute passes any optional check.
     */
    private passesOptionalCheck (attribute: string): boolean {
        if (!validationRuleParser.hasRule(attribute, ['sometimes'], this.rules)) {
            return true
        }

        const data = validationData.initializeAndGatherData(attribute, this.data)
        const requestFiles = validationData.initializeAndGatherData(
            attribute,
            this.getContext().requestFiles ?? {},
        )

        return Object.prototype.hasOwnProperty.call(data, attribute)
            || Object.prototype.hasOwnProperty.call(this.data, attribute)
            || Object.prototype.hasOwnProperty.call(requestFiles, attribute)
            || Object.prototype.hasOwnProperty.call(this.getContext().requestFiles ?? {}, attribute)
    };

    /**
     * Determine if the attribute fails the nullable check.
     */
    private isNotNullIfMarkedAsNullable (attribute: string, value: any, rule: TRule): boolean {
        if (isImplicitRule(rule) || !validationRuleParser.hasRule(attribute, ['nullable'], this.rules)) {
            return true
        }

        return value !== null
    };

    /**
     * Resolve an attribute value from validator data first, then request-scoped file context.
     */
    private getAttributeValue (attribute: string): any {
        const dataValue = deepFind(this.data, attribute)

        if (typeof dataValue !== 'undefined') {
            return dataValue
        }

        return deepFind(this.getContext().requestFiles ?? {}, attribute)
    }


    /**
     * Get the primary attribute name
     *
     * Example:  if "name.0" is given, "name.*" will be returned
     */
    private getPrimaryAttribute (attribute: string): string {
        for (const unparsed in this.implicitAttributes) {
            if (this.implicitAttributes[unparsed].indexOf(attribute) !== -1) {
                return unparsed
            }
        }

        return attribute
    };

    /**
     * Get the explicit keys from an attribute flattened with dot notation.
     *
     * Example: 'foo.1.bar.spark.baz' -> [1, 'spark'] for 'foo.*.bar.*.baz'
     */
    private getExplicitKeys (attribute: string): string[] {

        const pattern: RegExp = new RegExp('^' + this.getPrimaryAttribute(attribute).replace(/\*/g, '([^.]*)'))
        const keys = attribute.match(pattern)

        if (keys) {
            keys.shift()
            return keys
        }

        return []

    };

}

export default BaseValidator
