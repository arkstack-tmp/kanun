import { statSync } from 'node:fs'
import { extname } from 'node:path'

import { imageSize } from 'image-size'
import { deepFind, definePlugin, deepSet, type ValidatorPlugin } from 'kanun'
import { ArrayBufferReadable, DimensionConstraints, FileLike, FileRuleExecutionContext, FileValidatorPluginOptions, ImageDimensions, ValidatorWithData, WildcardRuleInput } from './types'

export * from './adapters'

declare module 'kanun' {
    interface ValidationRuleAutocompleteMap {
        dimensions: 'paramable'
        extensions: 'paramable'
        file: 'plain'
        files: 'plain'
        image: 'plain'
        mimes: 'paramable'
        mimetypes: 'paramable'
    }
}

const IMAGE_EXTENSIONS = new Set([
    'avif',
    'bmp',
    'gif',
    'heic',
    'heif',
    'jpeg',
    'jpg',
    'png',
    'svg',
    'tiff',
    'webp',
])

const MIME_BY_EXTENSION: Record<string, string> = {
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    mpg: 'video/mpeg',
    mpeg: 'video/mpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    webp: 'image/webp',
}

let pluginOptions: FileValidatorPluginOptions = {}
let installed = false

/**
 * Check if the given value is a record (plain object).
 * 
 * @param value 
 * @returns 
 */
function isRecord (value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBlobLike (value: unknown): value is Blob {
    return typeof Blob !== 'undefined' && value instanceof Blob
}

function isArrayBufferReadable (value: unknown): value is ArrayBufferReadable {
    return isRecord(value) && typeof value.arrayBuffer === 'function'
}

/**
 * Check if the given value is a file or an array of files.
 * 
 * @param value 
 * @returns 
 */
function isFileLike (value: unknown): value is FileLike {
    if (isBlobLike(value)) {
        return true
    }

    if (!isRecord(value)) {
        return false
    }

    return [
        'buffer',
        'fieldname',
        'filename',
        'height',
        'lastModified',
        'mimetype',
        'name',
        'originalname',
        'path',
        'size',
        'type',
        'arrayBuffer',
        'width',
    ].some(key => typeof value[key] !== 'undefined')
}

/**
 * Normalize the given value into an array of files.
 * 
 * @param value     The value to normalize
 * @returns         An array of FileLike objects
 */
function normalizeFiles (value: unknown): FileLike[] {
    if (Array.isArray(value)) {
        return value.filter(isFileLike)
    }

    return isFileLike(value) ? [value] : []
}

function isResolvedFileCandidate (value: unknown): boolean {
    if (Array.isArray(value)) {
        return value.length > 0 && value.every(isFileLike)
    }

    return isFileLike(value)
}

/**
 * Resolve the candidate files for the given attribute and context. T
 * 
 * @param value 
 * @param attribute 
 * @param context 
 * @returns 
 */
async function resolveCandidateFiles (
    value: unknown,
    attribute: string,
    context: FileRuleExecutionContext,
): Promise<unknown> {
    if (isResolvedFileCandidate(value)) {
        return value
    }

    let resolvedValue: unknown

    if (pluginOptions.resolveFiles) {
        const resolved = await pluginOptions.resolveFiles({
            attribute,
            context: context.context,
            data: context.data,
            value,
        })

        if (isResolvedFileCandidate(resolved)) {
            return resolved
        }

        resolvedValue = resolved
    }

    const requestScopedValue = deepFind(context.context.requestFiles ?? {}, attribute)

    if (typeof requestScopedValue !== 'undefined') {
        return requestScopedValue
    }

    if (typeof resolvedValue !== 'undefined') {
        return resolvedValue
    }

    return value
}

async function resolveFiles (
    value: unknown,
    attribute: string,
    context: FileRuleExecutionContext,
): Promise<{ candidates: unknown, files: FileLike[] }> {
    const candidates = await resolveCandidateFiles(value, attribute, context)

    return {
        candidates,
        files: normalizeFiles(candidates),
    }
}

async function getBuffer (file: FileLike): Promise<Buffer | Uint8Array | undefined> {
    if (file.buffer instanceof Uint8Array || Buffer.isBuffer(file.buffer)) {
        return file.buffer
    }

    if (file.buffer instanceof ArrayBuffer) {
        return Buffer.from(file.buffer)
    }

    if (isBlobLike(file) || isArrayBufferReadable(file)) {
        return Buffer.from(await file.arrayBuffer())
    }

    return undefined
}

function getExtension (file: FileLike): string | undefined {
    const name = [file.originalname, file.filename, file.name, file.path]
        .find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)

    if (!name) {
        return undefined
    }

    return extname(name).replace('.', '').toLowerCase()
}

function getMimeType (file: FileLike): string | undefined {
    const explicit = [file.mimetype, file.type]
        .find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)

    if (explicit) {
        return explicit.toLowerCase()
    }

    const extension = getExtension(file)

    if (!extension) {
        return undefined
    }

    return MIME_BY_EXTENSION[extension]
}

function getFileSizeInKilobytes (file: FileLike): number {
    if (typeof file.size === 'number' && Number.isFinite(file.size)) {
        return file.size / 1024
    }

    if (typeof file.path === 'string') {
        try {
            return statSync(file.path).size / 1024
        } catch {
            return -1
        }
    }

    return -1
}

async function getImageDimensions (file: FileLike): Promise<ImageDimensions | undefined> {
    if (
        typeof file.width === 'number' && Number.isFinite(file.width)
        && typeof file.height === 'number' && Number.isFinite(file.height)
    ) {
        return {
            height: file.height,
            width: file.width,
        }
    }

    const buffer = await getBuffer(file)
    const source = buffer ?? file.path

    if (!source) {
        return undefined
    }

    try {
        const dimensions = imageSize(source as never)

        if (typeof dimensions.width === 'number' && typeof dimensions.height === 'number') {
            return {
                height: dimensions.height,
                width: dimensions.width,
            }
        }
    } catch {
        return undefined
    }

    return undefined
}

function isImageFile (file: FileLike): boolean {
    const mimeType = getMimeType(file)

    if (mimeType?.startsWith('image/')) {
        return true
    }

    const extension = getExtension(file)

    return typeof extension === 'string' && IMAGE_EXTENSIONS.has(extension)
}

function parseNumericConstraint (value: string): number | undefined {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

function parseRatio (value: string): number | undefined {
    if (value.includes('/')) {
        const [left, right] = value.split('/', 2).map(Number)

        if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) {
            return undefined
        }

        return left / right
    }

    return parseNumericConstraint(value)
}

/**
 * Parse the dimension constraints from the given parameters. Supported parameters are:
 * - min_width
 * - max_width
 * - min_height
 * - max_height
 * - ratio (can be a single number or a ratio in the form of "width/height")
 * 
 * @param parameters 
 * @returns 
 */
function parseDimensionConstraints (parameters: string[]): DimensionConstraints {
    const constraints: DimensionConstraints = {}

    for (const parameter of parameters) {
        const [name, rawValue] = parameter.split('=', 2)

        if (!name || !rawValue) {
            continue
        }

        if (name === 'min_width') {
            constraints.minWidth = parseNumericConstraint(rawValue)
        }

        if (name === 'max_width') {
            constraints.maxWidth = parseNumericConstraint(rawValue)
        }

        if (name === 'min_height') {
            constraints.minHeight = parseNumericConstraint(rawValue)
        }

        if (name === 'max_height') {
            constraints.maxHeight = parseNumericConstraint(rawValue)
        }

        if (name === 'ratio') {
            constraints.ratio = parseRatio(rawValue)
        }
    }

    return constraints
}

/**
 * Check if the given image dimensions satisfy the given constraints.
 * 
 * @param dimensions    The dimensions of the image.
 * @param constraints   The constraints to check against.
 * @returns             True if the dimensions satisfy the constraints, false otherwise.
 */
function matchesDimensions (
    dimensions: ImageDimensions,
    constraints: DimensionConstraints
): boolean {
    if (typeof constraints.minWidth === 'number' && dimensions.width < constraints.minWidth) {
        return false
    }

    if (typeof constraints.maxWidth === 'number' && dimensions.width > constraints.maxWidth) {
        return false
    }

    if (typeof constraints.minHeight === 'number' && dimensions.height < constraints.minHeight) {
        return false
    }

    if (typeof constraints.maxHeight === 'number' && dimensions.height > constraints.maxHeight) {
        return false
    }

    if (typeof constraints.ratio === 'number') {
        const actualRatio = dimensions.width / dimensions.height

        if (Math.abs(actualRatio - constraints.ratio) > 0.01) {
            return false
        }
    }

    return true
}

/**
 * Replace the placeholders in the dimensions message with the actual constraint values.
 * 
 * @param message 
 * @param parameters 
 * @returns 
 */
function replaceDimensionsMessage (message: string, parameters: string[]): string {
    const values = Object.fromEntries(
        parameters
            .map(parameter => parameter.split('=', 2))
            .filter(([key, value]) => key && value),
    )

    return message
        .replace(':min_width', values.min_width ?? '')
        .replace(':min_height', values.min_height ?? '')
        .replace(':max_width', values.max_width ?? '')
        .replace(':max_height', values.max_height ?? '')
        .replace(':ratio', values.ratio ?? '')
}

/**
 * Normalize the given rule input into an array of rules. 
 * 
 * @param rules 
 * @returns 
 */
function normalizeRuleInput (rules: WildcardRuleInput): string[] {
    if (Array.isArray(rules)) {
        return rules.flatMap(rule => rule.split('|')).filter(Boolean)
    }

    return rules.split('|').filter(Boolean)
}

/**
 * Create the validation rules for a wildcard attribute based on the given item and 
 * collection rules. 
 * 
 * @param attribute             The name of the attribute.
 * @param itemRules             The rules to apply to each individual file.
 * @param collectionRules       The rules to apply to the array of files as a whole.
 * @returns                     An object containing the normalized rules for the attribute.
 */
export function createWildcardFileRules<TAttribute extends string> (
    attribute: TAttribute,
    itemRules: WildcardRuleInput,
    collectionRules: WildcardRuleInput = 'files',
): Record<TAttribute | `${TAttribute}.*`, string[]> {
    return {
        [attribute]: normalizeRuleInput(collectionRules),
        [`${attribute}.*`]: normalizeRuleInput(itemRules),
    } as Record<TAttribute | `${TAttribute}.*`, string[]>
}

/**
 * Sync the files from the request context to the validator's data.
 * 
 * @param validator 
 * @param attributes 
 * @returns 
 */
export function syncRequestFilesToData<TValidator extends ValidatorWithData<TValidator>> (
    validator: TValidator,
    attributes?: string[],
): TValidator {
    const requestFiles = validator.getContext().requestFiles ?? {}
    const nextData = {
        ...validator.getData(),
    }

    const keys = attributes && attributes.length > 0
        ? attributes
        : Object.keys(requestFiles)

    for (const key of keys) {
        const fileValue = deepFind(requestFiles, key)

        if (typeof fileValue !== 'undefined' && typeof deepFind(nextData, key) === 'undefined') {
            deepSet(nextData, key, fileValue)
        }
    }

    return validator.setData(nextData)
}

/**
 * Create the file validator plugin with the given options.
 * 
 * @param options 
 * @returns 
 */
export function createFileValidatorPlugin (
    options: FileValidatorPluginOptions = {}
): ValidatorPlugin {
    pluginOptions = options

    return definePlugin({
        name: '@kanun-hq/plugin-file',
        install: ({ extendTranslations, registerRule, registerValueInspector }) => {
            registerValueInspector({
                type: 'file',
                matches: isFileLike,
                size: (value) => getFileSizeInKilobytes(value as FileLike),
            })

            if (!installed) {
                extendTranslations({
                    en: {
                        dimensions: 'The :attribute must satisfy the image dimension constraints. min_width=:min_width, min_height=:min_height, max_width=:max_width, max_height=:max_height, ratio=:ratio.',
                        extensions: 'The :attribute must have one of the following extensions: :values.',
                        file: 'The :attribute must be a valid file.',
                        files: 'The :attribute must contain valid files.',
                        image: 'The :attribute must be an image.',
                        max: {
                            file: 'The :attribute must not be greater than :max kilobytes.',
                        },
                        mimes: 'The :attribute must be a file of type: :values.',
                        mimetypes: 'The :attribute must be a file of type: :values.',
                        min: {
                            file: 'The :attribute must be at least :min kilobytes.',
                        },
                        size: {
                            file: 'The :attribute must be :size kilobytes.',
                        },
                    },
                })

                registerRule('file', async function (this: FileRuleExecutionContext, value, _parameters, attribute = '') {
                    const { candidates, files } = await resolveFiles(value, attribute, this)
                    return !Array.isArray(candidates) && files.length === 1
                })

                registerRule('files', async function (this: FileRuleExecutionContext, value, _parameters, attribute = '') {
                    const { candidates, files } = await resolveFiles(value, attribute, this)
                    return Array.isArray(candidates) && files.length > 0 && files.length === candidates.length
                })

                registerRule('image', async function (this: FileRuleExecutionContext, value, _parameters, attribute = '') {
                    const { files } = await resolveFiles(value, attribute, this)

                    return files.length > 0 && files.every(file => isImageFile(file))
                })

                registerRule(
                    'extensions',
                    async function (this: FileRuleExecutionContext, value, parameters = [], attribute = '') {
                        const { files } = await resolveFiles(value, attribute, this)
                        const allowed = new Set(parameters.map(parameter => parameter.toLowerCase().replace('.', '')))

                        return files.length > 0 && files.every(file => {
                            const extension = getExtension(file)
                            return typeof extension === 'string' && allowed.has(extension)
                        })
                    },
                    (message, parameters) => message.replace(':values', parameters.join(', ')),
                )

                registerRule(
                    'mimetypes',
                    async function (this: FileRuleExecutionContext, value, parameters = [], attribute = '') {
                        const { files } = await resolveFiles(value, attribute, this)
                        const allowed = new Set(parameters.map(parameter => parameter.toLowerCase()))

                        return files.length > 0 && files.every(file => {
                            const mimeType = getMimeType(file)
                            return typeof mimeType === 'string' && allowed.has(mimeType)
                        })
                    },
                    (message, parameters) => message.replace(':values', parameters.join(', ')),
                )

                registerRule(
                    'mimes',
                    async function (this: FileRuleExecutionContext, value, parameters = [], attribute = '') {
                        const { files } = await resolveFiles(value, attribute, this)
                        const allowed = new Set(parameters.map(parameter => parameter.toLowerCase().replace('.', '')))

                        return files.length > 0 && files.every(file => {
                            const extension = getExtension(file)
                            return typeof extension === 'string' && allowed.has(extension)
                        })
                    },
                    (message, parameters) => message.replace(':values', parameters.join(', ')),
                )

                registerRule(
                    'dimensions',
                    async function (this: FileRuleExecutionContext, value, parameters = [], attribute = '') {
                        const { files } = await resolveFiles(value, attribute, this)

                        if (files.length === 0) {
                            return false
                        }

                        const constraints = parseDimensionConstraints(parameters)

                        for (const file of files) {
                            const dimensions = await getImageDimensions(file)

                            if (!dimensions || !matchesDimensions(dimensions, constraints)) {
                                return false
                            }
                        }

                        return true
                    },
                    replaceDimensionsMessage,
                )

                installed = true
            }
        },
    })
}

export const fileValidatorPlugin = createFileValidatorPlugin()