'use strict'

import BaseRule from '../Rules/baseRule'
import { GenericObject } from './IGeneric'
import RuleContract from '../Rules/IRuleContract'
import type { ValidationRuleEntry } from './ValidationRuleName'
import replaceAttributePayload from '../payloads/replaceAttributePayload'

export type InitialRule = ValidationRuleEntry | ValidationCallback | BaseRule;

export type TRule = string | RuleContract;

export type NestedStringMap = {
    [key: string]: string | NestedStringMap
}

type RuleLeaf = InitialRule | InitialRule[]

type KnownRulePaths<X extends GenericObject, Prefix extends string = ''> = {
    [K in keyof X & string]:
    X[K] extends (infer A)[]
    ? | `${Prefix}${K}`
    | `${Prefix}${K}.*`
    | (A extends GenericObject ? `${Prefix}${K}.*.${KnownRulePaths<A>}` : never)
    : X[K] extends GenericObject
    ? | `${Prefix}${K}`
    | `${Prefix}${K}.${KnownRulePaths<X[K]>}`
    : `${Prefix}${K}`
}[keyof X & string]

type LooseNestedRulePaths<X extends GenericObject> = {
    [K in keyof X & string]:
    X[K] extends (infer _A)[]
    ? `${K}.*.${string}`
    : X[K] extends GenericObject
    ? `${K}.${string}`
    : never
}[keyof X & string]

type ScopedInitialRules<X extends GenericObject> =
    & Partial<Record<KnownRulePaths<X> | LooseNestedRulePaths<X>, RuleLeaf>>
    & {
        [K in keyof X & string]?:
        X[K] extends (infer A)[]
        ? RuleLeaf | (A extends GenericObject ? ScopedInitialRules<A> : never)
        : X[K] extends GenericObject
        ? RuleLeaf | ScopedInitialRules<X[K]>
        : RuleLeaf
    }

export type InitialRules<X extends GenericObject = GenericObject> =
    ScopedInitialRules<keyof X extends never ? GenericObject : X>

export type Rules<X extends GenericObject = GenericObject> =
    & Partial<Record<Extract<keyof X, string>, TRule[]>>
    & Record<string, TRule[]>

export interface ImplicitAttributes {
    [key: string]: string[]
}

export type CustomMessages<_X extends GenericObject = GenericObject> = GenericObject

export type CustomAttributes<_X extends GenericObject = GenericObject> = GenericObject

export interface ErrorMessage {
    error_type?: string,
    message: string,
};

export interface Errors {
    [key: string]: ErrorMessage[]
};

export interface Messages {
    [key: string]: string[]
};

export interface CustomErrors {
    [key: string]: string | string[]
};

export interface ValidationRuleParserInterface {
    /**
     * Convert rules to array
     * 
     * @param rules 
     * @param data 
     * @returns 
     */
    explodeRules: (
        rules: Rules | InitialRule[],
        data?: GenericObject
    ) => { rules: Rules, implicitAttributes: ImplicitAttributes };

    /**
     * Define a set of rules that apply to each element in an array attribute.
     * 
     * @param results 
     * @param attribute 
     * @param data 
     * @param implicitAttributes 
     * @returns 
     */
    explodeWildCardRules: (
        results: GenericObject,
        attribute: string,
        data: GenericObject,
        implicitAttributes: ImplicitAttributes
    ) => GenericObject;

    /**
     * Explode rules that are in string format into array format.
     * 
     * @param rule 
     * @returns 
     */
    explodeExplicitRules: (
        rule: string | InitialRule[]
    ) => TRule[];

    /**
     * Prepare the given rule for validation.
     * 
     * @param rule 
     * @returns 
     */
    prepareRule: (rule: InitialRule) => TRule;

    /**
     * Merge the given rules with any existing rules for the attribute.
     * 
     * @param results 
     * @param attribute 
     * @param rules 
     * @returns 
     */
    mergeRulesForAttribute: (
        results: GenericObject,
        attribute: string,
        rules: string | InitialRule[]
    ) => GenericObject;

    /**
     * Parse a rule into its name and parameters.
     * 
     * @param rule 
     * @returns 
     */
    parse: (rule: TRule) => [TRule, string[]];

    /**
     * Parse a string rule into its name and parameters.
     * 
     * @param rule 
     * @returns 
     */
    parseStringRule: (rule: string) => [string, string[]];

    /**
     * Get a specific rule from the ruleset for an attribute.
     * 
     * @param attribute 
     * @param searchRules 
     * @param availableRules 
     * @returns 
     */
    getRule: (
        attribute: string,
        searchRules: string | string[],
        availableRules: Rules
    ) => Partial<[string, string[]]>;

    /**
     * Determine if a rule exists in the ruleset for an attribute.
     * 
     * @param attribute 
     * @param searchRules 
     * @param availableRules 
     * @returns 
     */
    hasRule: (
        attribute: string,
        searchRules: string | string[],
        availableRules: Rules
    ) => boolean;
};

export interface ValidationDataInterface {
    initializeAndGatherData: (attribute: string, masterData: object) => object;
    initializeAttributeOnData: (attribute: string, masterData: object) => object;
    extractValuesFromWildCards: (masterData: object, data: object, attribute: string) => object;
    getLeadingExplicitAttributePath: (attribute: string) => string;
    extractDataFromPath: (path: string, masterData: object) => object;
};

export interface ReplaceAttributeInterface {
    replaceAcceptedIf: (payload: replaceAttributePayload) => string;
    replaceBefore: (payload: replaceAttributePayload) => string;
    replaceBeforeOrEqual: (payload: replaceAttributePayload) => string;
    replaceAfter: (payload: replaceAttributePayload) => string;
    replaceAfterOrEqual: (payload: replaceAttributePayload) => string;
    replaceBetween: (payload: replaceAttributePayload) => string;
    replaceDateEquals: (payload: replaceAttributePayload) => string;
    replaceDatetime: (payload: replaceAttributePayload) => string;
    replaceDeclinedIf: (payload: replaceAttributePayload) => string;
    replaceDigits: (payload: replaceAttributePayload) => string;
    replaceDigitsBetween: (payload: replaceAttributePayload) => string;
    replaceDifferent: (payload: replaceAttributePayload) => string;
    replaceEndsWith: (payload: replaceAttributePayload) => string;
    replaceExists: (payload: replaceAttributePayload) => string;
    replaceIn: (payload: replaceAttributePayload) => string;
    replaceIncludes: (payload: replaceAttributePayload) => string;
    replaceMin: (payload: replaceAttributePayload) => string;
    replaceMax: (payload: replaceAttributePayload) => string;
    replaceNotIncludes: (payload: replaceAttributePayload) => string;
    replaceRequiredWith: (payload: replaceAttributePayload) => string;
    replaceRequiredWithAll: (payload: replaceAttributePayload) => string;
    replaceRequiredWithout: (payload: replaceAttributePayload) => string;
    replaceRequiredWithoutAll: (payload: replaceAttributePayload) => string;
    replaceGt: (payload: replaceAttributePayload) => string;
    replaceLt: (payload: replaceAttributePayload) => string;
    replaceGte: (payload: replaceAttributePayload) => string;
    replaceLte: (payload: replaceAttributePayload) => string;
    replaceRequiredIf: (payload: replaceAttributePayload) => string;
    replaceStartsWith: (payload: replaceAttributePayload) => string;
    replaceRequiredUnless: (payload: replaceAttributePayload) => string;
    replaceSame: (payload: replaceAttributePayload) => string;
    replaceSize: (payload: replaceAttributePayload) => string;
    replaceUnique: (payload: replaceAttributePayload) => string;
};

export type ValidationCallback = (
    value: any,
    fail: (message: string) => void,
    attribute: string
) => void;