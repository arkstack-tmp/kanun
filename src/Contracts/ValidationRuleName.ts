import type In from '../Rules/in'
import type NotIn from '../Rules/notIn'
import type Regex from '../Rules/regex'
import type RequiredIf from '../Rules/requiredIf'
import RuleContract from 'src/Rules/IRuleContract'

export type ValidationRuleAutocompleteKind = 'plain' | 'paramable'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ValidationRuleAutocompleteMap { }

/**
 * Backward-compatible alias for older plugin augmentations.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CustomValidationRuleNameMap { }

type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>)

type PluginValidationRuleNameMap = ValidationRuleAutocompleteMap & CustomValidationRuleNameMap

export type CustomParamableValidationRuleName = Extract<{
    [K in keyof PluginValidationRuleNameMap]: PluginValidationRuleNameMap[K] extends 'paramable' ? K : never
}[keyof PluginValidationRuleNameMap], string>

export type CustomPlainRuleName = Extract<{
    [K in keyof PluginValidationRuleNameMap]: PluginValidationRuleNameMap[K] extends 'plain' ? K : never
}[keyof PluginValidationRuleNameMap], string>

export type ParamableValidationRuleName =
    | 'accepted_if'
    | 'after'
    | 'after_or_equal'
    | 'before'
    | 'before_or_equal'
    | 'between'
    | 'date_equals'
    | 'datetime'
    | 'declined_if'
    | 'digits_between'
    | 'different'
    | 'email'
    | 'exists'
    | 'ends_with'
    | 'gt'
    | 'gte'
    | 'in'
    | 'includes'
    | 'lt'
    | 'lte'
    | 'max'
    | 'min'
    | 'not_in'
    | 'not_includes'
    | 'multiple_of'
    | 'prohibited_unless'
    | 'prohibits'
    | 'required_if'
    | 'required_unless'
    | 'required_with'
    | 'required_with_all'
    | 'required_without'
    | 'required_without_all'
    | 'same'
    | 'size'
    | 'starts_with'
    | 'unique'
    | CustomParamableValidationRuleName

export type PlainRuleName =
    | 'accepted'
    | 'alpha'
    | 'alpha_dash'
    | 'alpha_num'
    | 'array'
    | 'array_unique'
    | 'bail'
    | 'boolean'
    | 'confirmed'
    | 'date'
    | 'declined'
    | 'distinct'
    | 'digits'
    | 'email'
    | 'exclude'
    | 'filled'
    | 'ip'
    | 'ipv4'
    | 'ipv6'
    | 'integer'
    | 'json'
    | 'mac_address'
    | 'not_regex'
    | 'nullable'
    | 'numeric'
    | 'object'
    | 'present'
    | 'presentsame'
    | 'prohibited'
    | 'regex'
    | 'required'
    | 'sometimes'
    | 'string'
    | 'timezone'
    | 'url'
    | 'hex'
    | 'uuid'
    | CustomPlainRuleName

export type ValidationRuleName = ParamableValidationRuleName | PlainRuleName

type MethodRules = Regex | In | NotIn | RequiredIf

type ParamableRuleString = `${ParamableValidationRuleName}:${string}`

type ValidationRuleString = LiteralUnion<ValidationRuleName | ParamableRuleString>

/**
 * Single rule value (supports autocomplete + arbitrary strings + RuleContract instances)
 */
export type ValidationRuleEntry = ValidationRuleString | RuleContract | MethodRules

export type ValidationRuleSet =
    | ValidationRuleEntry
    | readonly ValidationRuleEntry[]
    | LiteralUnion<
        | `${ValidationRuleName}${string & `|${string}`}`
        | `${ParamableRuleString}${string & `|${string}`}`
    >