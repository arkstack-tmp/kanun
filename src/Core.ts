import type { CustomAttributes, CustomMessages, InitialRule, InitialRules } from './Contracts/BaseContract'

import BaseValidator from './BaseValidator'
import ErrorBag from './validators/errorBag'
import { getValidatorContext, runWithValidatorContext, useValidatorContext } from './Context'
import { GenericObject } from 'src/Contracts/IGeneric'
import { default as PasswordRule } from './Rules/password'
import { usePlugin } from './Plugin'

export class Password extends PasswordRule { };

export function make<D extends GenericObject = GenericObject> (
    data: D = {} as D,
    rules: InitialRules<D> = {} as InitialRules<D>,
    customMessages: CustomMessages<D> = {} as CustomMessages<D>,
    customAttributes: CustomAttributes<D> = {} as CustomAttributes<D>
): BaseValidator<D> {
    return new BaseValidator<D>(data, rules, customMessages, customAttributes)
}

export {
    InitialRules,
    InitialRule,
    ErrorBag,
    getValidatorContext,
    runWithValidatorContext,
    usePlugin,
    useValidatorContext,
}

export * from './Rules/registerRule'
export * from './rule'



