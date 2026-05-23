import { register, registerImplicit } from './Rules/registerRule'

import { GenericObject } from './Contracts/IGeneric'
import Lang from './Lang'
import type { Validator } from './Validator'

export interface ValidationValueInspector {
    type: string
    matches: (value: any) => boolean
    size?: (value: any) => number
}

export type ValidationLifecycleHook = (validator: Validator<any, any>) => void | Promise<void>

export interface ValidatorPluginApi {
    registerRule: typeof register
    registerImplicitRule: typeof registerImplicit
    registerValueInspector: (inspector: ValidationValueInspector) => void
    extendTranslations: (translations: GenericObject) => void
    onValidationError: (hook: ValidationLifecycleHook) => void
    onValidationSuccess: (hook: ValidationLifecycleHook) => void
}

export interface ValidatorPlugin {
    name: string
    install: (api: ValidatorPluginApi) => void
}

const valueInspectors: ValidationValueInspector[] = []
const validationErrorHooks: ValidationLifecycleHook[] = []
const validationSuccessHooks: ValidationLifecycleHook[] = []

const api: ValidatorPluginApi = {
    registerRule: register,
    registerImplicitRule: registerImplicit,
    registerValueInspector,
    extendTranslations: (translations: GenericObject) => {
        Lang.extendTranslationObject(translations)
    },
    onValidationError: registerValidationErrorHook,
    onValidationSuccess: registerValidationSuccessHook,
}

export function definePlugin (plugin: ValidatorPlugin): ValidatorPlugin {
    return plugin
}

export function usePlugin (plugin: ValidatorPlugin): void {
    plugin.install(api)
}

export function registerValueInspector (inspector: ValidationValueInspector): void {
    const existing = valueInspectors.findIndex(candidate => candidate.type === inspector.type)

    if (existing >= 0) {
        valueInspectors.splice(existing, 1, inspector)
        return
    }

    valueInspectors.push(inspector)
}

export function registerValidationErrorHook (hook: ValidationLifecycleHook): void {
    validationErrorHooks.push(hook)
}

export function registerValidationSuccessHook (hook: ValidationLifecycleHook): void {
    validationSuccessHooks.push(hook)
}

export async function dispatchValidationErrorHooks (validator: Validator<any, any>): Promise<void> {
    for (const hook of validationErrorHooks)
        await hook(validator)
}

export async function dispatchValidationSuccessHooks (validator: Validator<any, any>): Promise<void> {
    for (const hook of validationSuccessHooks)
        await hook(validator)
}

export function getValidationValueInspector (value: any): ValidationValueInspector | undefined {
    return valueInspectors.find(inspector => inspector.matches(value))
}

export function getValidationMessageType (value: any, hasNumericRule: boolean = false): string {
    if (typeof value === 'number' || typeof value === 'undefined' || (isNaN(value) === false && hasNumericRule === true)) {
        return 'number'
    }

    const inspector = getValidationValueInspector(value)

    if (inspector) {
        return inspector.type
    }

    if (Array.isArray(value)) {
        return 'array'
    }

    return typeof value
}

export function getValidationSize (value: any, hasNumericRule: boolean = false): number {
    if (typeof value === 'number' || (isNaN(value) === false && hasNumericRule === true)) {
        return Number(value)
    }

    const inspector = getValidationValueInspector(value)

    if (inspector?.size) {
        return inspector.size(value)
    }

    if (typeof value === 'string' || Array.isArray(value)) {
        return value.length
    }

    if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length
    }

    return -1
}
