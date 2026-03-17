import { addImplicitRule, buildValidationMethodName } from 'kanun'

import { GenericCallable } from 'src/Contracts/IGeneric'
import replaceAttributePayload from '../payloads/replaceAttributePayload'
import replaceAttributes from '../validators/replaceAttributes'
import validateAttributes from '../validators/validateAttributes'

export function register (
    rule: string,
    validate: (value: any, parameters?: string[], attribute?: string) => boolean | Promise<boolean>,
    replaceMessage?: (message: string, paramters: string[], data?: object, getDisplayableAttribute?: GenericCallable) => string,
): boolean {
    const method: string = buildValidationMethodName(rule)

    const validateAttribute = new validateAttributes()
    if (validateAttribute[`validate${method}`]) {
        return false
    }

    validateAttributes.prototype[`validate${method}`] = validate

    if (typeof replaceMessage === 'function') {
        replaceAttributes[`replace${method}` as keyof typeof replaceAttributes] =
            ({ message, parameters, data, getDisplayableAttribute }: replaceAttributePayload) => replaceMessage(message, parameters, data, getDisplayableAttribute)
    }

    return true
};

export function registerImplicit (
    rule: string,
    validate: (value: any, parameters?: string[] | number[], attribute?: string) => boolean | Promise<boolean>,
    replaceMessage?: (message: string, paramters: string[], data?: object, getDisplayableAttribute?: GenericCallable) => string,
): void {
    if (register(rule, validate, replaceMessage) === true) {
        addImplicitRule(rule)
    }
};


