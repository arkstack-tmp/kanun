import { MessageBag } from './utilities/MessageBag'
import { Validator } from './Validator'
import { plural } from './utilities/helpers'

export class ValidationException extends Error {
    public validator: Validator<any, any>
    public response?: any
    public status: number = 422
    public statusCode: number = 422
    public errorBag: string = 'default'
    public redirectTo?: string
    public name: string = 'ValidationException'

    constructor(validator: Validator<any, any>, response: any = null, errorBag = 'default') {
        super(ValidationException.summarize(validator))

        this.validator = validator
        this.response = response
        this.errorBag = errorBag
        Object.setPrototypeOf(this, ValidationException.prototype)
    }

    /**
     * Send a custom response body for this exception
     * 
     * @param request 
     * @returns 
     */
    public toResponse () {
        // if the request doesn't expect JSON, we can assume it's a web request and redirect back with the errors in the session flash data
        // if (!request.expectsJson()) { 
        // }

        return {
            message: this.message,
            errors: this.errors(),
        }
    }

    /**
     * Create a new validation exception from a plain array of messages.
     */
    public static withMessages (
        messages: Record<string, string[] | string>
    ): ValidationException {
        const validator = new Validator({}, {})
        const bag = new MessageBag()

        for (const [key, value] of Object.entries(messages)) {
            const list = Array.isArray(value) ? value : [value]
            for (const message of list) {
                bag.add(key, message)
            }
        }

        (validator as any)._errors = bag

        return new ValidationException(validator)
    }

    /**
     * Create a readable summary message from the validation errors.
     */
    protected static summarize (validator: Validator<any, any>): string {
        const messages = validator.errors().all()

        if (!messages.length || typeof messages[0] !== 'string') {
            return 'The given data was invalid.'
        }

        let message = messages.shift()!
        const count = messages.length

        if (count > 0) {
            message += ` (and ${count} more ${plural('error', count)})`
        }

        return message
    }

    /**
     * Get all of the validation error messages.
     */
    public errors (): Record<string, string[]> {
        return this.validator.errors().getMessages()
    }

    /**
     * Set the HTTP status code to be used for the response.
     */
    public setStatus (status: number): this {
        this.status = status
        return this
    }

    /**
     * Set the error bag on the exception.
     */
    public setErrorBag (errorBag: string): this {
        this.errorBag = errorBag
        return this
    }

    /**
     * Set the URL to redirect to on a validation error.
     */
    public setRedirectTo (url: string): this {
        this.redirectTo = url
        return this
    }

    /**
     * Get the underlying response instance.
     */
    public getResponse (): any {
        return this.response
    }
}