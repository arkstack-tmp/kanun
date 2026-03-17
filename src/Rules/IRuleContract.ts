'use strict'

import { GenericObject } from '../Contracts/IGeneric'
import { Lang } from '../Lang'
import { deepFindMessage } from 'src/utilities/helpers'

export default abstract class IRuleContract {
    /**
     * The validation error message.
     */
    message: string | object = ''

    /**
     * All of the data under validation.
     */
    data: object = {}

    /**
     * The lang used to return error messages
     */
    lang!: string

    /**
     *  Determine if the validation rule passes.
     */
    passes (_value: any, _attribute: string): boolean | Promise<boolean> {
        return true
    };

    /**
     * Get the validation error message.
     */
    getMessage (): string | object {
        return this.message
    };

    /**
     * Set the data under validation.
     */
    setData (data: object): this {
        this.data = data
        return this
    };

    /**
     * Set the tranlation language
     */
    setLang (lang: string): this {
        this.lang = lang
        return this
    };

    /**
     * Get the translated error message based on the specified path
     */
    trans (path: string, params: GenericObject = {}): string {

        const validatonMessages = Lang.get(this.lang)
        let message: string = deepFindMessage(validatonMessages, path) || ''

        if (!message) {
            return message
        }

        for (const key in params) {
            message = message.replace(`:${key}`, params[key])
        }

        return message
    }

}