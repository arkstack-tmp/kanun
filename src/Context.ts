import { AsyncLocalStorage } from 'node:async_hooks'

type ValidatorContext = Record<string, any>

const validatorContextStorage = new AsyncLocalStorage<ValidatorContext>()

/**
 * Get the current validator context. 
 * 
 * @returns 
 */
export function getValidatorContext (): ValidatorContext {
    return validatorContextStorage.getStore() ?? {}
}

/**
 * Use a context for the current validator instance and all of its children.
 * 
 * @param context 
 * @returns 
 */
export function useValidatorContext (context: ValidatorContext = {}): ValidatorContext {
    const currentContext = validatorContextStorage.getStore()

    if (currentContext) {
        Object.assign(currentContext, context)
        return currentContext
    }

    const nextContext = {
        ...context,
    }

    validatorContextStorage.enterWith(nextContext)

    return nextContext
}

/**
 * Run a function with a given validator context.
 * 
 * @param context The context to use during the execution of the callback
 * @param callback The function to execute with the given context
 */
export function runWithValidatorContext<T> (context: ValidatorContext, callback: () => T): T {
    return validatorContextStorage.run({
        ...getValidatorContext(),
        ...context,
    }, callback)
}