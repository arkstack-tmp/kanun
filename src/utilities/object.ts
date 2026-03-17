'use strict'

import { isArrayOfRules, isRule } from './general'

import { GenericObject } from 'src/Contracts/IGeneric'

/**
 * Get value at path of object. If the resolved value is undifined, the returned result will be undefined
 * 
 * @param obj 
 * @param path 
 * @returns 
 */
export function deepFind (obj: GenericObject, path: string): any {

    const paths: string[] = path.split('.')

    for (let i = 0; i < paths.length; i++) {
        if (typeof obj[paths[i]] === 'undefined') {
            return undefined
        }
        obj = obj[paths[i]]
    }

    return obj

};

/**
 * Set value at path of object. 
 * 
 * @param target 
 * @param path 
 * @param value 
 */
export function deepSet (target: any, path: string | string[], value: any): void {
    const paths: string[] = typeof path === 'string' ? path.split('.') : path
    const segment: string = paths.shift()!

    if (segment === '*') {
        target = Array.isArray(target) ? target : []

        if (paths.length > 0) {
            target.forEach((inner: any) => deepSet(inner, [...paths], value))
        } else {
            for (let i = 0; i < target.length; i++) {
                target[i] = value
            }
        }
    } else if (paths.length > 0 && typeof segment === 'string') {
        if (typeof target[segment] !== 'object' || target[segment] === null) {
            target[segment] = {}
        }
        deepSet(target[segment], paths, value)
    } else {
        if (typeof target !== 'object' || target === null) {
            target = {}
        }

        target[segment] = value
    }
};

/**
 * Flatten a multi-dimensional associative array with dots.
 * 
 * @param obj 
 * @param ignoreRulesArray 
 * @param withBaseObjectType 
 * @returns 
 */
export function dotify (
    obj: GenericObject,
    ignoreRulesArray: boolean = false,
    withBaseObjectType: boolean = false
): GenericObject {
    const res: GenericObject = {};

    (function recurse (obj: GenericObject | any[], current: string = '') {
        for (const key in obj) {
            const value: any = obj[key as never]
            const newKey: string = (current ? `${current}.${key}` : key)

            if (value && typeof value === 'object' && !isRule(value) && !(value instanceof Date)) {
                // In the case we are dotifying the object of rules, we don't want the array of rules to be flattened
                if (ignoreRulesArray === true && Array.isArray(value) && isArrayOfRules(value)) {
                    res[newKey] = value
                } else {
                    // Since the dotify is being used for both array and objects in some cases we would like to distinguish between both
                    if (withBaseObjectType) {
                        res[newKey] = Array.isArray(value) ? 'array' : 'object'
                    }
                    recurse(value, newKey)
                }
            } else {
                res[newKey] = value
            }
        }
    })(obj)

    return res
};

/**
 * Check if objects are deep equal
 * 
 * @param firstParam 
 * @param secondParam 
 * @returns 
 */
export function deepEqual (firstParam: GenericObject, secondParam: GenericObject): boolean {
    const first = dotify(firstParam, false, true)
    const second = dotify(secondParam, false, true)

    if (Object.keys(first).length !== Object.keys(second).length) {
        return false
    }

    return Object.entries(first).every(([key, value]) => second[key] === value)
}