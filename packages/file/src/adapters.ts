import { getValidatorContext, useValidatorContext } from 'kanun'

export interface ValidatorWithContext<TSelf = any> {
    getContext: () => Record<string, any>
    withContext: (context: Record<string, any>) => TSelf
}

export interface ExpressLikeRequest {
    file?: unknown
    files?: unknown
}

export interface FastifyLikeRequest {
    body?: unknown
    file?: unknown
    files?: unknown
    parts?: (() => AsyncIterable<unknown>) | unknown
    raw?: unknown
}

export interface HonoLikeContext {
    req?: {
        parseBody?: (options?: Record<string, any>) => Promise<Record<string, unknown>>
    }
}

export interface H3LikeEvent {
    context?: Record<string, any>
    req?: {
        formData?: () => Promise<FormData>
    }
    request?: {
        formData?: () => Promise<FormData>
    }
}

type NamedFiles = Record<string, unknown>

const dynamicImport = new Function(
    'specifier',
    'return import(specifier)'
) as (specifier: string) => Promise<any>

function isRecord (value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBlobLike (value: unknown): value is Blob {
    return typeof Blob !== 'undefined' && value instanceof Blob
}

function isFileLike (value: unknown): boolean {
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
        'mimetype',
        'name',
        'originalname',
        'path',
        'size',
        'type',
    ].some(key => typeof value[key] !== 'undefined')
}

function isFileArray (value: unknown): value is unknown[] {
    return Array.isArray(value) && value.length > 0 && value.every(item => isFileLike(item))
}

function hasNamedFiles (value: NamedFiles): boolean {
    return Object.keys(value).length > 0
}

function appendNamedFile (target: NamedFiles, field: string, value: unknown): void {
    if (!field) {
        return
    }

    const current = target[field]

    if (typeof current === 'undefined') {
        target[field] = value
        return
    }

    if (Array.isArray(current)) {
        current.push(value)
        return
    }

    target[field] = [current, value]
}

function extractNamedFilesFromRecord (value: unknown): NamedFiles {
    if (!isRecord(value)) {
        return {}
    }

    const files: NamedFiles = {}

    for (const [key, entry] of Object.entries(value)) {
        if (isFileLike(entry) || isFileArray(entry)) {
            files[key] = entry
        }
    }

    return files
}

function extractFilesFromFormData (formData: FormData): NamedFiles {
    const files: NamedFiles = {}

    formData.forEach((entry, field) => {
        if (isBlobLike(entry)) {
            appendNamedFile(files, field, entry)
        }
    })

    return files
}

function mergeRequestFiles<TValidator extends ValidatorWithContext<TValidator>> (
    validator: TValidator,
    requestFiles: NamedFiles,
    extraContext: Record<string, any>,
): TValidator {
    const currentContext = validator.getContext()
    const existingRequestFiles = isRecord(currentContext.requestFiles)
        ? currentContext.requestFiles
        : {}

    return validator.withContext({
        ...currentContext,
        ...extraContext,
        requestFiles: {
            ...existingRequestFiles,
            ...requestFiles,
        },
    })
}

function useRequestFilesContext (requestFiles: NamedFiles, extraContext: Record<string, any>): Record<string, any> {
    const currentContext = getValidatorContext()
    const existingRequestFiles = isRecord(currentContext.requestFiles)
        ? currentContext.requestFiles
        : {}

    return useValidatorContext({
        ...extraContext,
        requestFiles: {
            ...existingRequestFiles,
            ...requestFiles,
        },
    })
}

function extractExpressRequestFiles (request: ExpressLikeRequest): NamedFiles {
    const requestFiles: NamedFiles = extractNamedFilesFromRecord(request.files)

    if (Array.isArray(request.files)) {
        for (const file of request.files) {
            const field = isRecord(file) && typeof file.fieldname === 'string'
                ? file.fieldname
                : 'file'

            appendNamedFile(requestFiles, field, file)
        }
    }

    if (typeof request.file !== 'undefined') {
        const field = isRecord(request.file) && typeof request.file.fieldname === 'string'
            ? request.file.fieldname
            : 'file'

        appendNamedFile(requestFiles, field, request.file)
    }

    return requestFiles
}

/**
 * Attaches uploaded files from an Express-like request object to the validator 
 * context under `requestFiles`. It supports both `request.file` 
 * and `request.files` properties, normalizing them into a consistent format. 
 * The original request object is also included in the context for plugin use.
 * 
 * @param validator     The validator instance to attach the files to.
 * @param request       The Express-like request object containing the uploaded files.
 * @returns             The validator instance with the updated context.
 */
export function withExpressUploadContext<TValidator extends ValidatorWithContext<TValidator>> (
    validator: TValidator,
    request: ExpressLikeRequest,
): TValidator {
    const requestFiles = extractExpressRequestFiles(request)

    return mergeRequestFiles(validator, requestFiles, {
        express: request,
        request,
    })
}

/**
 * Attaches uploaded files from an Express-like request object to the validator 
 * context for use within validation rules. 
 * 
 * @param request   The Express-like request object containing the uploaded files.
 * @returns         A context object containing the uploaded files and the original request.
 */
export function useExpressUploadContext (request: ExpressLikeRequest): Record<string, any> {
    return useRequestFilesContext(extractExpressRequestFiles(request), {
        express: request,
        request,
    })
}

/**
 * Normalizes a multipart file part from Fastify into a consistent file-like object. 
 * 
 * @param part 
 * @returns 
 */
async function normalizeFastifyMultipartFile (part: any): Promise<unknown> {
    if (!isRecord(part)) {
        return part
    }

    if (typeof part.toBuffer === 'function') {
        const buffer = await part.toBuffer()

        return {
            buffer,
            encoding: part.encoding,
            fieldname: part.fieldname,
            filename: part.filename,
            mimetype: part.mimetype,
            originalname: part.filename,
            size: buffer.byteLength,
            type: part.mimetype,
        }
    }

    return part
}

/**
 * Extracts uploaded files from a Fastify-like request object, supporting various ways that files may be provided (e.g., `request.files()`, `request.parts()`, `request.file()`, and nested `request.raw.files`). 
 * 
 * @param request 
 * @returns 
 */
async function extractFastifyRequestFiles (request: FastifyLikeRequest): Promise<NamedFiles> {
    const requestFiles: NamedFiles = extractNamedFilesFromRecord(request.body)

    if (typeof request.files === 'function') {
        for await (const part of request.files()) {
            const normalized = await normalizeFastifyMultipartFile(part)
            const field = isRecord(normalized) && typeof normalized.fieldname === 'string'
                ? normalized.fieldname
                : 'file'

            appendNamedFile(requestFiles, field, normalized)
        }

        return requestFiles
    }

    if (typeof request.parts === 'function') {
        for await (const part of request.parts()) {
            if (isRecord(part) && (part.type === 'file' || typeof part.filename === 'string' || typeof part.toBuffer === 'function')) {
                const normalized = await normalizeFastifyMultipartFile(part)
                const field = isRecord(normalized) && typeof normalized.fieldname === 'string'
                    ? normalized.fieldname
                    : 'file'

                appendNamedFile(requestFiles, field, normalized)
            }
        }

        return requestFiles
    }

    Object.assign(requestFiles, extractNamedFilesFromRecord(request.files))
    Object.assign(
        requestFiles,
        extractNamedFilesFromRecord(isRecord(request.raw) ? request.raw.files : undefined),
    )

    const singleFile = typeof request.file === 'function'
        ? await request.file()
        : request.file

    if (typeof singleFile !== 'undefined') {
        const normalized = await normalizeFastifyMultipartFile(singleFile)
        const field = isRecord(normalized) && typeof normalized.fieldname === 'string'
            ? normalized.fieldname
            : 'file'

        appendNamedFile(requestFiles, field, normalized)
    }

    return requestFiles
}

/**
 * Attaches uploaded files from a Fastify-like request object to the validator context under `requestFiles`. 
 * It supports multiple ways that files may be provided (e.g., `request.files()`, 
 * `request.parts()`, `request.file()`, and nested `request.raw.files`), normalizing 
 * them into a consistent format. The original request object is also included in 
 * the context for plugin use.
 * 
 * @param validator 
 * @param request 
 * @returns 
 */
export async function withFastifyUploadContext<TValidator extends ValidatorWithContext<TValidator>> (
    validator: TValidator,
    request: FastifyLikeRequest,
): Promise<TValidator> {
    const requestFiles = await extractFastifyRequestFiles(request)

    return mergeRequestFiles(validator, requestFiles, {
        fastify: request,
        request,
    })
}

/**
 * Attaches uploaded files from a Fastify-like request object to the validator 
 * context for use within validation rules.
 * 
 * @param request 
 * @returns 
 */
export async function useFastifyUploadContext (request: FastifyLikeRequest): Promise<Record<string, any>> {
    return useRequestFilesContext(await extractFastifyRequestFiles(request), {
        fastify: request,
        request,
    })
}

/**
 * Extracts the parsed body from a Hono-like context, which may contain uploaded files. 
 * 
 * @param context 
 * @returns 
 */
async function extractHonoParsedBody (context: HonoLikeContext): Promise<Record<string, unknown>> {
    return typeof context.req?.parseBody === 'function'
        ? await context.req.parseBody({ all: true })
        : {}
}


/**
 * Attaches uploaded files from a Hono-like context to the validator context under `requestFiles`.
 * 
 * @param validator 
 * @param context 
 * @returns 
 */
export async function withHonoUploadContext<TValidator extends ValidatorWithContext<TValidator>> (
    validator: TValidator,
    context: HonoLikeContext,
): Promise<TValidator> {
    const parsedBody = await extractHonoParsedBody(context)

    return mergeRequestFiles(validator, extractNamedFilesFromRecord(parsedBody), {
        hono: context,
        request: context.req,
    })
}

/**
 * Attaches uploaded files from a Hono-like context to the validator context for use within validation rules.
 * 
 * @param context 
 * @returns 
 */
export async function useHonoUploadContext (context: HonoLikeContext): Promise<Record<string, any>> {
    const parsedBody = await extractHonoParsedBody(context)

    return useRequestFilesContext(extractNamedFilesFromRecord(parsedBody), {
        hono: context,
        request: context.req,
    })
}

/**
 * Extracts uploaded files from an H3-like event, supporting multiple sources such as 
 * `event.context.requestFiles`, `request.formData()`, and multipart parsing when available. 
 * It normalizes the files into a consistent format for use in the validator context.
 * 
 * @param event 
 * @returns 
 */
async function readH3MultipartFiles (event: H3LikeEvent): Promise<NamedFiles> {
    try {
        const h3 = await dynamicImport('h3')
        const parts = typeof h3.readMultipartFormData === 'function'
            ? await h3.readMultipartFormData(event)
            : undefined

        if (!Array.isArray(parts)) {
            return {}
        }

        const files: NamedFiles = {}

        for (const part of parts) {
            if (!part || typeof part.name !== 'string') {
                continue
            }

            appendNamedFile(files, part.name, {
                buffer: part.data,
                filename: part.filename,
                mimetype: part.type,
                name: part.name,
                originalname: part.filename,
                size: part.data?.byteLength,
                type: part.type,
            })
        }

        return files
    } catch {
        return {}
    }
}

/**
 * Extracts uploaded files from an H3-like event, checking multiple sources such as 
 * `event.context.requestFiles`, `request.formData()`, and multipart parsing when available. 
 * It normalizes the files into a consistent format for use in the validator context.
 * 
 * @param event 
 * @returns 
 */
async function extractH3RequestFiles (event: H3LikeEvent): Promise<NamedFiles> {
    let requestFiles = extractNamedFilesFromRecord(event.context?.requestFiles)

    if (!hasNamedFiles(requestFiles)) {
        const request = event.req ?? event.request

        if (typeof request?.formData === 'function') {
            requestFiles = extractFilesFromFormData(await request.formData())
        }
    }

    if (!hasNamedFiles(requestFiles)) {
        requestFiles = await readH3MultipartFiles(event)
    }

    return requestFiles
}

/**
 * Read files from multiple sources on the 
 * event, including `event.context.requestFiles`, `request.formData()`, and multipart 
 * parsing when available. It merges found files into the validator context 
 * under `requestFiles` and also attaches the original event and request for plugin use.
 * 
 * @param validator     The validator instance to which the files will be added.
 * @param event         The H3 event containing potential file uploads.
 * @returns             The validator instance with the merged file context.
 */
export async function withH3UploadContext<TValidator extends ValidatorWithContext<TValidator>> (
    validator: TValidator,
    event: H3LikeEvent,
): Promise<TValidator> {
    const requestFiles = await extractH3RequestFiles(event)

    return mergeRequestFiles(validator, requestFiles, {
        h3: event,
        request: event.req ?? event.request,
    })
}

/**
 * Uses files from multiple sources on the event, including
 * `event.context.requestFiles`, `request.formData()`, and multipart parsing when available. 
 * 
 * @param event 
 * @returns 
 */
export async function useH3UploadContext (event: H3LikeEvent): Promise<Record<string, any>> {
    return useRequestFilesContext(await extractH3RequestFiles(event), {
        h3: event,
        request: event.req ?? event.request,
    })
}