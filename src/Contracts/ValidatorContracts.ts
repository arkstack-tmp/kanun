import { ValidationRuleName, ValidationRuleOutputTypeMap, ValidationRuleSet } from './ValidationRuleName'

/**
 * Parse rule names from rule string or string[] definitions
 */
export type ExtractRules<R> =
    R extends string
    ? R extends `${infer Head}|${infer Tail}`
    ? Head extends `${infer Rule}:${string}`
    ? Rule | ExtractRules<Tail>
    : Head | ExtractRules<Tail>
    : R extends `${infer Rule}:${string}`
    ? Rule
    : R
    : R extends string[]
    ? ExtractRules<R[number]>
    : never

type ValidatedData<T> = {
    [K in keyof T]: T[K]
}

type RuleOutputKey<T extends string> =
    T extends `${infer Root}.*${string}`
    ? Root
    : T extends `${infer Root}.${string}`
    ? Root
    : T

type RuleOutputKeys<R extends Record<string, any>> = RuleOutputKey<Extract<keyof R, string>>

type RuleOutputOverride<R> =
    'files' extends ExtractRules<R>
    ? ('files' extends keyof ValidationRuleOutputTypeMap ? ValidationRuleOutputTypeMap['files'] : never)
    : ValidationRuleOutputTypeMap[Extract<ExtractRules<R>, keyof ValidationRuleOutputTypeMap>]

type FieldOutputValue<
    D extends Record<string, any>,
    K extends string,
    FieldRules,
> = K extends keyof D
    ? [RuleOutputOverride<FieldRules>] extends [never]
        ? D[K]
        : D[K] extends RuleOutputOverride<FieldRules>
            ? D[K]
            : RuleOutputOverride<FieldRules>
    : [RuleOutputOverride<FieldRules>] extends [never]
        ? any
        : RuleOutputOverride<FieldRules>

export type ValidatedByRules<
    D extends Record<string, any>,
    R extends RulesForData<D>
> = ValidatedData<
    {
        [K in RuleOutputKeys<R>]: FieldOutputValue<D, K, K extends keyof R ? R[K] : never>
    }
>

/**
 * Flatten data structure into dot-notation keys
 * including wildcards (*) for arrays.
 */
export type DotPaths<T, Prefix extends string = ''> = {
    [K in keyof T & string]:
    T[K] extends (infer A)[]
    ? | `${Prefix}${K}`
    | `${Prefix}${K}.*`
    | (A extends Record<string, any>
        ? `${Prefix}${K}.*.${DotPaths<A>}`
        : never)
    : T[K] extends Record<string, any>
    ? | `${Prefix}${K}`
    | `${Prefix}${K}.${DotPaths<T[K]>}`
    : `${Prefix}${K}`
}[keyof T & string]

/**
* Builds message keys only for rules used on that field
*/
export type FieldMessages<Field extends string, R> =
    | `${Field}`
    | `${Field}.${ExtractRules<R> & ValidationRuleName}`

/**
* Build all valid message keys for a given rules object
*/
export type MessagesForRules<Rules extends Record<string, any>> = {
    [K in keyof Rules & string]: FieldMessages<K, Rules[K]>
}[keyof Rules & string]

/**
 * Make rules align with keys in the data object
 */
export type RulesForData<D extends Record<string, any>> = Partial<
    Record<DotPaths<D>, ValidationRuleSet>
>