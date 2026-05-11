import { RawPhoneNumberCast } from './RawPhoneNumberCast'

/**
 * A class that extends the RawPhoneNumberCast for casting phone numbers to E.164 format.
 */
export class E164PhoneNumberCast extends RawPhoneNumberCast {
    /**
     * Initializes the E164PhoneNumberCast with an optional country code.
     * 
     * @param value 
     * @returns 
     */
    override set (value: unknown): string | null {
        return this.get(value)?.formatE164() ?? null
    }

    /**
     * Initializes the E164PhoneNumberCast with an optional country code.
     * 
     * @param value 
     * @returns 
     */
    static override  set (value: unknown): string | null {
        return this.get(value)?.formatE164() ?? null
    }
}