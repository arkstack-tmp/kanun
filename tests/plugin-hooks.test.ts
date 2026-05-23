import { ValidationException, Validator, definePlugin } from '../src'
import { describe, expect, it } from 'vitest'

describe('Validator plugin hooks', () => {
    it('calls plugin success hooks after successful validation', async () => {
        const calls: string[] = []
        const plugin = definePlugin({
            name: 'success-hook-test',
            install: ({ onValidationSuccess }) => {
                onValidationSuccess((validator) => {
                    if (validator.getData().__plugin_hook_case === 'success')
                        calls.push(validator.validatedData().name)
                })
            },
        })

        Validator.use(plugin)

        const validator = Validator.make(
            { __plugin_hook_case: 'success', name: 'Jane' },
            { name: 'required|string' }
        )

        await expect(validator.validate()).resolves.toEqual({ name: 'Jane' })
        expect(calls).toEqual(['Jane'])
    })

    it('calls plugin error hooks after failed validation', async () => {
        const calls: string[] = []
        const plugin = definePlugin({
            name: 'error-hook-test',
            install: ({ onValidationError }) => {
                onValidationError((validator) => {
                    if (validator.getData().__plugin_hook_case === 'error')
                        calls.push(validator.errors().first('name'))
                })
            },
        })

        Validator.use(plugin)

        const validator = Validator.make(
            { __plugin_hook_case: 'error' },
            { name: 'required' } as never
        )

        await expect(validator.validate()).rejects.toThrow(ValidationException)
        expect(calls).toEqual(['The name field is required.'])
    })
})
