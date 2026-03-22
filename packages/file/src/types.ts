export type MaybePromise<T> = T | Promise<T>

export interface FileLike {
    buffer?: ArrayBuffer | Buffer | Uint8Array
    filename?: string
    height?: number
    mimetype?: string
    name?: string
    originalname?: string
    path?: string
    size?: number
    type?: string
    width?: number
}

export interface ArrayBufferReadable {
    arrayBuffer: () => Promise<ArrayBuffer>
}

export interface FileRuleResolverArgs {
    attribute: string
    context: Record<string, any>
    data: Record<string, any>
    value: unknown
}

export interface FileValidatorPluginOptions {
    resolveFiles?: (args: FileRuleResolverArgs) => MaybePromise<unknown>
}

export interface FileRuleExecutionContext {
    context: Record<string, any>
    data: Record<string, any>
}

export interface DimensionConstraints {
    maxHeight?: number
    maxWidth?: number
    minHeight?: number
    minWidth?: number
    ratio?: number
}

export interface ValidatorWithData<TSelf = any> {
    getContext: () => Record<string, any>
    getData: () => Record<string, any>
    setData: (data: Record<string, any>) => TSelf
}

export type WildcardRuleInput = string | string[]

export interface ImageDimensions {
    height: number
    width: number
}