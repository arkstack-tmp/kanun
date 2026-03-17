'use strict'

import { GenericObject } from './Contracts/IGeneric'
import locales from './locales/index'
import { mergeDeep } from './utilities/helpers'

export class Lang {

    /**
     * Default lang to be used, when lang is not specified 
     */
    static defaultLang: string = 'en'

    /**
     * Determines the locale to be used when tu current one is not available
     */
    static fallbackLang: string = 'en'

    /**
     * The existing langs that are supported by the library
     */
    static existingLangs: string[] = ['en']

    /**
     * Store the translations passed by the user
     */
    static translations: GenericObject = {}

    /**
     * Store translations contributed by plugins.
     */
    static translationExtensions: GenericObject = {}

    /**
     * Stores the messages that are already loaded
     */
    static messages: GenericObject = {}

    /**
     * Stores the default messages
     */
    static defaultMessages: GenericObject = {}

    /**
     * Stores the fallback messages
     */
    static fallbackMessages: GenericObject = locales.en

    /**
     * Get messages for lang 
     * 
     * @param lang 
     * @returns 
     */
    static get (lang?: string): GenericObject {
        lang ??= this.defaultLang
        this.load(lang)
        return this.messages[lang]
    }

    /**
     * Set the translation object passed by the user
     * 
     * @param translations 
     */
    static setTranslationObject (translations: GenericObject): void {
        this.translations = translations
        this.existingLangs = Array.from(new Set([...this.existingLangs, ...Object.keys(translations)]))
        this.resetLoadedMessages()
        this.setDefaultLang(this.defaultLang)
    }

    /**
     * Merge additional translations into the global catalog.
     */
    static extendTranslationObject (translations: GenericObject): void {
        this.translationExtensions = mergeDeep(this.translationExtensions, translations)
        this.existingLangs = Array.from(new Set([
            ...this.existingLangs,
            ...Object.keys(translations),
        ]))
        this.resetLoadedMessages()
        this.setDefaultLang(this.defaultLang)
    }

    /**
     * Set the default lang that should be used. And assign the default messages
     * 
     * @param lang 
     */
    static setDefaultLang (lang: string): void {
        this.defaultLang = lang
        this.load(lang)
    }

    /**
     * Set the fallback lang to be used. And assign the fallback messages
     * 
     * @param lang 
     */
    static setFallbackLang (lang: string): void {
        this.fallbackLang = lang
        this.fallbackMessages = locales.en

        // check if the lang translations exist in the library and load them
        if (Object.prototype.hasOwnProperty.call(locales, lang)) {
            this.fallbackMessages = mergeDeep(this.fallbackMessages, locales[lang as never])
        }

        if (Object.prototype.hasOwnProperty.call(this.translationExtensions, lang)) {
            this.fallbackMessages = mergeDeep(this.fallbackMessages, this.translationExtensions[lang])
        }

        // check if the lang translations exit in the object passed by the user
        if (Object.prototype.hasOwnProperty.call(this.translations, lang)) {
            this.fallbackMessages = mergeDeep(this.fallbackMessages, this.translations[lang])
        }
    }

    /**
     * Get the default language
     * 
     * @returns 
     */
    static getDefaultLang (): string {
        return this.defaultLang
    }

    /**
     * Load the messages based on the specified language
     * 
     * @param lang 
     * @returns 
     */
    static load (lang: string): void {

        if (this.messages[lang]) {
            return
        }

        // check if the lang translations exist in the library and load them
        if (Object.prototype.hasOwnProperty.call(locales, lang)) {
            this.messages[lang] = mergeDeep(this.fallbackMessages, locales[lang as never])
        } else {
            this.messages[lang] = mergeDeep({}, this.fallbackMessages)
        }

        if (Object.prototype.hasOwnProperty.call(this.translationExtensions, lang)) {
            this.messages[lang] = mergeDeep(this.messages[lang], this.translationExtensions[lang])
        }

        // check if the lang translations exist in the object passed by the user
        if (Object.prototype.hasOwnProperty.call(this.translations, lang)) {
            this.messages[lang] = mergeDeep(this.messages[lang], this.translations[lang])
        }
    }

    private static resetLoadedMessages (): void {
        this.messages = {}
        this.fallbackMessages = locales.en
    }
}

export default Lang