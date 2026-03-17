import { register, registerImplicit } from './Rules/registerRule'

import { GenericObject } from './Contracts/IGeneric'
import Lang from './Lang'

export interface ValidationValueInspector {
    type: string
    matches: (value: any) => boolean
    size?: (value: any) => number
}

export interface ValidatorPluginApi {
    registerRule: typeof register
    registerImplicitRule: typeof registerImplicit
    registerValueInspector: (inspector: ValidationValueInspector) => void
    extendTranslations: (translations: GenericObject) => void
}

export interface ValidatorPlugin {
    name: string
    install: (api: ValidatorPluginApi) => void
}

const valueInspectors: ValidationValueInspector[] = []

const api: ValidatorPluginApi = {
    registerRule: register,
    registerImplicitRule: registerImplicit,
    registerValueInspector,
    extendTranslations: (translations: GenericObject) => {
        Lang.extendTranslationObject(translations)
    },
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