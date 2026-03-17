import { GenericObject } from 'src/Contracts/IGeneric'

/**
 * Pluralizes a word based on the count.
 * 
 * @param word 
 * @param count 
 * @returns 
 */
export const plural = (word: string, count: number): string => {
    return count === 1 ? word : `${word}s`
}

/**
 * Determine if a value is an object. Arrays and null are not considered objects.
 * 
 * @param value 
 * @returns 
 */
export function isObject (value: unknown): value is GenericObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Deeply merge two objects. 
 * The source object will overwrite the target object when there is a conflict.
 * Arrays and non-object values will be overwritten, not merged.
 * 
 * @param target 
 * @param source 
 * @returns 
 */
export function mergeDeep (target: GenericObject, source: GenericObject): GenericObject {
    const output = Object.assign({}, target)

    if (!isObject(target) || !isObject(source)) {
        return output
    }

    for (const key in source) {
        if (isObject(source[key])) {
            if (!target[key]) {
                Object.assign(output, { [key]: source[key] })
            } else {
                output[key] = mergeDeep(target[key], source[key])
            }
        } else {
            Object.assign(output, { [key]: source[key] })
        }
    }

    return output
}

/**
 * Deeply find a value in an object using a dot-notated path. 
 * Returns undefined if the path does not exist.
 * 
 * @param obj 
 * @param path 
 * @returns 
 */
export function deepFindMessage (obj: GenericObject, path: string): any {
    const paths = path.split('.')

    for (const segment of paths) {
        if (typeof obj[segment] === 'undefined') {
            return undefined
        }

        obj = obj[segment]
    }

    return obj
}