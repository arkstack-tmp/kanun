import { assert, describe, expectTypeOf, it } from 'vitest'

import type { InitialRules } from '../src/Contracts/BaseContract'
import type { ValidationRuleEntry } from '../src/Contracts/ValidationRuleName'

declare module 'kanun' {
    interface ValidationRuleAutocompleteMap {
        plugin_array_rule: 'plain'
        plugin_param_rule: 'paramable'
    }
}

describe('Rule autocomplete typing', function () {
    it('supports plugin-augmented array rule entries in TypeScript', function () {
        const rules = {
            name: ['required', 'plugin_array_rule', 'plugin_param_rule:value'] as const,
        } satisfies InitialRules<{ name: string }>

        expectTypeOf(rules.name[0]).toEqualTypeOf<'required'>()
        expectTypeOf(rules.name[1]).toEqualTypeOf<'plugin_array_rule'>()
        expectTypeOf(rules.name[2]).toEqualTypeOf<'plugin_param_rule:value'>()
        assert.ok(Array.isArray(rules.name))
    })

    it('keeps array rule entries typed as rule literals instead of plain strings', function () {
        const entry = 'required' satisfies ValidationRuleEntry
        const pluginEntry = 'plugin_array_rule' satisfies ValidationRuleEntry
        const pluginParamEntry = 'plugin_param_rule:value' satisfies ValidationRuleEntry

        assert.equal(entry, 'required')
        assert.equal(pluginEntry, 'plugin_array_rule')
        assert.equal(pluginParamEntry, 'plugin_param_rule:value')
    })
})