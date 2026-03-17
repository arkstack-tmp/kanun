import { BaseValidationRuleClass, CustomValidationRules } from './Contracts/RuleBuilder'
import { DotPaths, MessagesForRules, RulesForData, type ValidatedByRules } from './Contracts/ValidatorContracts'
import { getValidatorContext, useValidatorContext } from './Context'
import { make, register } from './Core'
import { deepFind, deepSet } from './utilities/object'

import type BaseValidator from './BaseValidator'
import { ExtendedRules } from './Rules/ExtendedRules'
import type { IDatabaseDriver } from './Contracts/IDatabaseDriver'
import { IValidator } from './Contracts/IValidator'
import Lang from './Lang'
import { MessageBag } from './utilities/MessageBag'
import { usePlugin, type ValidatorPlugin } from './Plugin'
import { ValidationException } from './ValidationException'
import { ValidationRule } from './ValidationRule'
import { ValidationRuleSet } from './Contracts/ValidationRuleName'

export class Validator<
    D extends Record<string, any> = any,
    R extends RulesForData<D> = RulesForData<D>
> implements IValidator<D, R> {
    private static defaultDatabaseDriver?: IDatabaseDriver

    #messages: Partial<Record<MessagesForRules<R>, string>>
    #after: (() => void)[] = []

    private data: D
    private rules: R
    private _errors: MessageBag
    private passing: boolean = false
    private executed: boolean = false
    private instance?: BaseValidator
    private databaseDriver?: IDatabaseDriver
    private errorBagName = 'default'
    private registeredCustomRules: CustomValidationRules[] = [
        new ExtendedRules()
    ]
    private shouldStopOnFirstFailure = false
    private context: Record<string, any> = {}

    constructor(
        data: D,
        rules: R,
        messages: Partial<Record<MessagesForRules<R>, string>> = {}
    ) {

        register('telephone', function (value) {
            return /^\d{3}-\d{3}-\d{4}$/.test(value)
        })

        this.data = data
        this.rules = rules
        this.#messages = messages
        this._errors = new MessageBag()
        this.bindServices()
    }

    /**
     * Validate the data and return the instance
     */
    static make<
        D extends Record<string, any>,
        R extends RulesForData<D>
    > (
        data: D,
        rules: R,
        messages: Partial<Record<MessagesForRules<R>, string>> = {}
    ) {
        return new Validator(data, rules, messages)
    }

    static useDatabase (driver: IDatabaseDriver) {
        Validator.defaultDatabaseDriver = driver
        return Validator
    }

    /**
     * Set the validator's context.
     * 
     * @param context 
     * @returns 
     */
    static useContext (context: Record<string, any> = {}): typeof Validator {
        useValidatorContext(context)
        return this
    }

    /**
     * Register a plugin with the validator. 
     * Plugins can add rules, messages, and even override existing rules and messages.
     * 
     * @param plugin The plugin to register
     * @returns The Validator class for chaining
     */
    static use (plugin: ValidatorPlugin): typeof Validator {
        usePlugin(plugin)
        return this
    }

    /**
     * Register a plugin with the validator. 
     * Plugins can add rules, messages, and even override existing rules and messages.
     * 
     * @param plugin The plugin to register
     * @returns The Validator instance for chaining
     */
    use (plugin: ValidatorPlugin): this {
        Validator.use(plugin)
        return this
    }

    /**
     * Run the validator and store results.
     */
    public async passes (): Promise<boolean> {
        if (this.executed) return this._errors.isEmpty()

        const exec = (await this.execute())

        // Let's spin through all the "after" hooks on this validator and ire them off. 
        for (const after of this.#after) {
            after()
        }

        return exec.passing
    }

    /**
     * Opposite of passes()
     */
    public async fails (): Promise<boolean> {
        return !(await this.passes())
    }

    /**
     * Throw if validation fails, else return executed data
     * 
     * @throws ValidationException if validation fails
     */
    public async validate (): Promise<ValidatedByRules<D, R>> {
        const ok = await this.passes()

        if (!ok) {
            throw new ValidationException(this, JSON.stringify(this._errors.toArray()))
        }

        return this.validatedData()
    }

    /**
     * Run the validator's rules against its data.
     * @param bagName 
     * @returns 
     */
    async validateWithBag (bagName: string) {
        this.errorBagName = bagName
        return this.validate()
    }

    /**
     * Stop validation on first failure.
     */
    stopOnFirstFailure () {
        this.shouldStopOnFirstFailure = true
        return this
    }

    /**
     * Set the validator's context. 
     * This is useful for custom rules that need access to additional data or services.
     * 
     * @param context 
     * @returns 
     */
    withContext (context: Record<string, any> = {}): this {
        this.context = context
        return this
    }

    /**
     * Get the validator's context. 
     * This is useful for custom rules that need access to additional data or services.
     * 
     * @returns The current context object
     */
    getContext (): Record<string, any> {
        return {
            ...getValidatorContext(),
            ...this.context,
        }
    }


    /**
     * Get the data that passed validation.
     */
    public validatedData (): ValidatedByRules<D, R> {
        const validKeys = Object.keys(this.rules)
        const clean: Record<string, any> = {}

        for (const key of validKeys) {
            const value = deepFind(this.data, key)
            const resolvedValue = typeof value !== 'undefined'
                ? value
                : deepFind(this.getContext().requestFiles ?? {}, key)

            if (typeof resolvedValue !== 'undefined') {
                deepSet(clean, key, resolvedValue)
            }
        }

        return clean as ValidatedByRules<D, R>
    }


    /**
     * Return all validated input.
     */
    validated (): Partial<D> {
        return Object.fromEntries(
            Object.entries(this.data).filter(([key]) => key in this.rules)
        ) as Partial<D>
    }

    /**
     * Return a portion of validated input
     */
    safe () {
        const validated = this.validated()

        return {
            only: (keys: string[]) =>
                Object.fromEntries(Object.entries(validated).filter(([key]) => keys.includes(key))) as Partial<D>,
            except: (keys: string[]) =>
                Object.fromEntries(Object.entries(validated).filter(([key]) => !keys.includes(key))) as Partial<D>,
        }
    }

    /**
     * Get the message container for the validator.
     */
    public async messages () {
        if (!this.#messages) {
            await this.passes()
        }

        return this.#messages
    }

    /**
     * Add an after validation callback.
     *
     * @param  callback
     */
    public after<C extends ((validator: Validator<D, R>) => void) | BaseValidationRuleClass> (callback: C | C[]) {

        if (Array.isArray(callback)) {
            for (const rule of callback as any[]) {
                this.#after.push(() => rule.toString().startsWith('class') ? new rule(this) : rule(this))
            }
        } else if (typeof callback === 'function') {
            this.#after.push(() => callback(this))
        }

        return this
    }


    /**
     * Get all errors.
     */
    public errors (): MessageBag {
        return this._errors
    }

    public errorBag () {
        return this.errorBagName
    }

    /**
     * Reset validator with new data.
     */
    public setData (data: D): this {
        this.data = data
        this.executed = false
        return this
    }

    /**
     * Set validation rules.
     */
    public setRules (rules: R): this {
        this.rules = rules
        this.executed = false
        return this
    }

    /**
     * Add a single rule to existing rules.
     */
    public addRule (key: DotPaths<D>, rule: ValidationRuleSet): this {
        this.rules[key as never] = rule as never
        return this
    }

    /**
     * Merge additional rules.
     */
    public mergeRules (rules: Record<string, string>): this {
        this.rules = { ...this.rules, ...rules }
        return this
    }

    /**
     * Get current data.
     */
    public getData (): ValidatedByRules<D, R> {
        return this.data
    }

    /**
     * Get current rules.
     */
    public getRules (): R {
        return this.rules
    }

    database (driver: IDatabaseDriver): this {
        this.databaseDriver = driver
        Validator.defaultDatabaseDriver = driver
        return this
    }

    getDatabaseDriver (): IDatabaseDriver | undefined {
        return this.databaseDriver ?? Validator.defaultDatabaseDriver
    }

    /**
     * Bind all required services here.
     */
    private bindServices () {
        /**
         * Register all custom rules
         */
        for (const reged of this.registeredCustomRules) {
            if (reged instanceof ValidationRule) {
                if (reged.setData) reged.setData(this.data)
                if (reged.setValidator) reged.setValidator(this)
                for (const rule of reged.rules) {
                    register(rule.name, rule.validator)
                    if (rule.message) {
                        Lang.setTranslationObject({
                            en: {
                                [rule.name]: rule.message,
                            }
                        })
                    }
                }
            }
        }
        return this
    }

    private async execute () {
        const instance = make()
            .setData(this.data)
            .setRules(this.rules as never)
            .setCustomMessages(this.#messages)
            .withContext(this.getContext())
            .stopOnFirstFailure(this.shouldStopOnFirstFailure)

        this.passing = await instance.validateAsync()

        this.executed = true
        this.instance = instance

        if (!this.passing) {
            this._errors = new MessageBag(instance.errors().all())
        }

        return this
    }
}