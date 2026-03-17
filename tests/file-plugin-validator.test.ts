import { assert, describe, expectTypeOf, it } from 'vitest'
import {
    createFileValidatorPlugin,
    createWildcardFileRules,
    fileValidatorPlugin,
    syncRequestFilesToData,
    useExpressUploadContext,
    useFastifyUploadContext,
    useH3UploadContext,
    useHonoUploadContext,
    withExpressUploadContext,
    withFastifyUploadContext,
    withH3UploadContext,
    withHonoUploadContext,
} from '../packages/file/src'

import type { AddressInfo } from 'node:net'
import Fastify from 'fastify'
import { H3 } from 'h3'
import { Hono } from 'hono'
import type { RequestListener } from 'node:http'
import { Validator } from '../src'
import { createServer } from 'node:http'
import express from 'express'
import multer from 'multer'
import multipart from '@fastify/multipart'

const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0b8AAAAASUVORK5CYII=',
    'base64',
)

async function listenHttpServer (handler: RequestListener) {
    const server = createServer(handler)

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
            server.off('error', reject)
            resolve()
        })
    })

    const address = server.address()

    if (!address || typeof address === 'string') {
        throw new Error('Could not determine server address.')
    }

    return {
        close: async function () {
            await new Promise<void>((resolve, reject) => {
                server.close(error => {
                    if (error) {
                        reject(error)
                        return
                    }

                    resolve()
                })
            })
        },
        url: `http://127.0.0.1:${(address as AddressInfo).port}`,
    }
}

async function listenFastifyServer (app: ReturnType<typeof Fastify>) {
    await app.listen({ host: '127.0.0.1', port: 0 })

    const address = app.server.address()

    if (!address || typeof address === 'string') {
        throw new Error('Could not determine Fastify server address.')
    }

    return {
        close: async function () {
            await app.close()
        },
        url: `http://127.0.0.1:${(address as AddressInfo).port}`,
    }
}

Validator.use(createFileValidatorPlugin({
    resolveFiles: ({ attribute, context, value }) => {
        if (typeof value !== 'undefined') {
            return value
        }

        return context.requestFiles?.[attribute]
    },
}))

describe('File validator plugin', function () {
    it('validates a request-scoped uploaded image', async function () {
        const avatar = {
            buffer: png1x1,
            mimetype: 'image/png',
            originalname: 'avatar.png',
            size: 2048,
        }

        const validator = Validator.make(
            {},
            {
                avatar: 'file|image|mimes:png|mimetypes:image/png|dimensions:min_width=1,min_height=1,ratio=1|max:4',
            },
        ).withContext({
            requestFiles: {
                avatar,
            },
        })

        assert.equal(await validator.passes(), true)
    })

    it('uses file-specific size semantics for max and size rules', async function () {
        const avatar = {
            mimetype: 'image/png',
            originalname: 'avatar.png',
            size: 5120,
        }

        const maxValidator = Validator.make(
            { avatar },
            { avatar: 'file|max:4' },
        )

        assert.equal(await maxValidator.passes(), false)
        assert.equal(maxValidator.errors().first('avatar'), 'The avatar must not be greater than 4 kilobytes.')

        const sizeValidator = Validator.make(
            { avatar: { ...avatar, size: 2048 } },
            { avatar: 'file|size:2' },
        )

        assert.equal(await sizeValidator.passes(), true)
    })

    it('validates arrays of files with files and mimes rules', async function () {
        const attachments = [
            {
                mimetype: 'image/png',
                originalname: 'first.png',
                size: 1024,
            },
            {
                mimetype: 'image/jpeg',
                originalname: 'second.jpg',
                size: 1536,
            },
        ]

        const validator = Validator.make(
            { attachments },
            { attachments: 'files|mimes:png,jpg' },
        )

        assert.equal(await validator.passes(), true)
    })

    it('supports array-style rule definitions for file validation', async function () {
        const avatar = {
            buffer: png1x1,
            mimetype: 'image/png',
            originalname: 'avatar.png',
            size: 2048,
        }

        const validator = Validator.make(
            { avatar },
            {
                avatar: ['file', 'image', 'extensions:png', 'mimetypes:image/png', 'max:4'],
            },
        )

        assert.equal(await validator.passes(), true)
        assert.deepEqual(await validator.validate(), { avatar })
    })

    it('keeps array-style file rules type-safe in TypeScript', async function () {
        const avatar = {
            buffer: png1x1,
            mimetype: 'image/png',
            originalname: 'avatar.png',
            size: 2048,
        }

        const attachments = [
            {
                buffer: png1x1,
                mimetype: 'image/png',
                originalname: 'first.png',
                size: 1024,
            },
            {
                buffer: png1x1,
                mimetype: 'image/jpeg',
                originalname: 'second.jpg',
                size: 1536,
            },
        ]

        const validator = Validator.make(
            { avatar, attachments },
            {
                avatar: ['file', 'image', 'extensions:png'] as const,
                attachments: ['files', 'mimes:png,jpg'] as const,
            },
        )

        const validated = await validator.validate()

        expectTypeOf(validated.avatar).toEqualTypeOf<typeof avatar>()
        expectTypeOf(validated.attachments).toEqualTypeOf<typeof attachments>()

        assert.deepEqual(validated, { avatar, attachments })
    })

    it('returns validated request-scoped uploaded files from validate()', async function () {
        const avatar = {
            buffer: png1x1,
            mimetype: 'image/png',
            originalname: 'avatar.png',
            size: 2048,
        }

        const validator = Validator.make(
            {},
            { avatar: 'file|image|mimes:png' },
        ).withContext({
            requestFiles: {
                avatar,
            },
        })

        assert.deepEqual(await validator.validate(), { avatar })
    })

    it('returns validated request-scoped file arrays from validate()', async function () {
        const attachments = [
            {
                buffer: png1x1,
                mimetype: 'image/png',
                originalname: 'first.png',
                size: 1024,
            },
            {
                buffer: png1x1,
                mimetype: 'image/jpeg',
                originalname: 'second.jpg',
                size: 1024,
            },
        ]

        const validator = Validator.make(
            {},
            createWildcardFileRules('attachments', 'file|image|extensions:png,jpg'),
        ).withContext({
            requestFiles: {
                attachments,
            },
        })

        assert.deepEqual(await validator.validate(), { attachments })
    })

    it('supports wildcard helpers with array-style rule inputs', async function () {
        const attachments = [
            {
                buffer: png1x1,
                mimetype: 'image/png',
                originalname: 'first.png',
                size: 1024,
            },
            {
                buffer: png1x1,
                mimetype: 'image/jpeg',
                originalname: 'second.jpg',
                size: 1024,
            },
        ]

        const validator = Validator.make(
            { attachments },
            createWildcardFileRules(
                'attachments',
                ['file', 'image', 'extensions:png,jpg'],
                ['files'],
            ),
        )

        const validated = await validator.validate()

        expectTypeOf(validated.attachments).toEqualTypeOf<typeof attachments>()

        assert.deepEqual(validated, { attachments })
    })

    it('supports extensions as a dedicated rule', async function () {
        const validator = Validator.make(
            {
                avatar: {
                    mimetype: 'image/png',
                    originalname: 'avatar.png',
                    size: 2048,
                },
            },
            { avatar: 'file|extensions:png,jpg' },
        )

        assert.equal(await validator.passes(), true)
    })

    it('fails dimensions when the configured constraints are not met', async function () {
        const validator = Validator.make(
            {
                avatar: {
                    height: 200,
                    mimetype: 'image/png',
                    originalname: 'banner.png',
                    size: 1024,
                    width: 200,
                },
            },
            {
                avatar: 'file|dimensions:min_width=300,min_height=100,ratio=3/1',
            },
        )

        assert.equal(await validator.passes(), false)
        assert.equal(
            validator.errors().first('avatar'),
            'The avatar must satisfy the image dimension constraints. min_width=300, min_height=100, max_width=, max_height=, ratio=3/1.',
        )
    })

    it('supports dimensions max_width and max_height constraints', async function () {
        const validator = Validator.make(
            {
                avatar: {
                    height: 400,
                    mimetype: 'image/png',
                    originalname: 'banner.png',
                    size: 1024,
                    width: 500,
                },
            },
            {
                avatar: 'file|dimensions:max_width=450,max_height=300',
            },
        )

        assert.equal(await validator.passes(), false)
        assert.equal(
            validator.errors().first('avatar'),
            'The avatar must satisfy the image dimension constraints. min_width=, min_height=, max_width=450, max_height=300, ratio=.',
        )
    })
})

describe('File upload adapters', function () {
    Validator.use(fileValidatorPlugin)

    it('attaches Express uploads to validator context using a real app request', async function () {
        const app = express()
        const upload = multer({ storage: multer.memoryStorage() })

        app.post('/with-context', upload.single('avatar'), async function (request, response) {
            const validator = withExpressUploadContext(
                Validator.make({}, { avatar: 'file|image|mimes:png' }),
                request,
            )

            response.json({
                hasAvatar: validator.getContext().requestFiles.avatar != null,
                passes: await validator.passes(),
            })
        })

        const server = await listenHttpServer(app)

        try {
            const formData = new FormData()
            formData.append('avatar', new File([png1x1], 'avatar.png', { type: 'image/png' }))

            const response = await fetch(`${server.url}/with-context`, {
                body: formData,
                method: 'POST',
            })

            assert.equal(response.status, 200)
            assert.deepEqual(await response.json(), {
                hasAvatar: true,
                passes: true,
            })
        } finally {
            await server.close()
        }
    })

    it('attaches Fastify multipart uploads to validator context using a real app request', async function () {
        const app = Fastify()
        await app.register(multipart)

        app.post('/with-context', async function (request) {
            const validator = await withFastifyUploadContext(
                Validator.make({}, { attachments: 'files|mimes:png,jpg' }),
                request,
            )

            const attachments = validator.getContext().requestFiles.attachments

            return {
                attachmentCount: Array.isArray(attachments) ? attachments.length : 0,
                passes: await validator.passes(),
            }
        })

        const server = await listenFastifyServer(app)

        try {
            const formData = new FormData()
            formData.append('attachments', new File([png1x1], 'first.png', { type: 'image/png' }))
            formData.append('attachments', new File([png1x1], 'second.jpg', { type: 'image/jpeg' }))

            const response = await fetch(`${server.url}/with-context`, {
                body: formData,
                method: 'POST',
            })

            assert.equal(response.status, 200)
            assert.deepEqual(await response.json(), {
                attachmentCount: 2,
                passes: true,
            })
        } finally {
            await server.close()
        }
    })

    it('attaches Hono parsed body uploads to validator context using a real app request', async function () {
        const app = new Hono()

        app.post('/with-context', async function (context) {
            const validator = await withHonoUploadContext(
                Validator.make({}, { avatar: 'file|image|mimetypes:image/png' }),
                context,
            )

            return context.json({
                hasAvatar: validator.getContext().requestFiles.avatar != null,
                passes: await validator.passes(),
            })
        })

        const formData = new FormData()
        formData.append('avatar', new File([png1x1], 'avatar.png', { type: 'image/png' }))

        const response = await app.request('/with-context', {
            body: formData,
            method: 'POST',
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
            hasAvatar: true,
            passes: true,
        })
    })

    it('attaches h3 form-data uploads to validator context using a real app request', async function () {
        const app = new H3().post('/with-context', async function (event) {
            const validator = await withH3UploadContext(
                Validator.make({}, { avatar: 'file|image|mimetypes:image/png' }),
                event,
            )

            return {
                hasAvatar: validator.getContext().requestFiles.avatar != null,
                passes: await validator.passes(),
            }
        })

        const formData = new FormData()
        formData.append('avatar', new File([png1x1], 'avatar.png', { type: 'image/png' }))

        const response = await app.request('/with-context', {
            body: formData,
            method: 'POST',
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
            hasAvatar: true,
            passes: true,
        })
    })

    it('supports static Validator.useContext for middleware-populated uploads', async function () {
        Validator.useContext({
            requestFiles: {
                avatar: {
                    buffer: png1x1,
                    mimetype: 'image/png',
                    originalname: 'avatar.png',
                    size: 2048,
                },
            },
        })

        const validator = Validator.make({}, { avatar: 'file|image|mimes:png' })

        assert.equal(await validator.passes(), true)
    })

    it('supports Express middleware-style upload context with real middleware', async function () {
        const app = express()
        const upload = multer({ storage: multer.memoryStorage() })

        app.post(
            '/middleware-context',
            upload.single('avatar'),
            function (request, _response, next) {
                useExpressUploadContext(request)
                next()
            },
            async function (_request, response) {
                const validator = Validator.make({}, { avatar: 'file|image|mimes:png' })

                response.json({
                    passes: await validator.passes(),
                })
            },
        )

        const server = await listenHttpServer(app)

        try {
            const formData = new FormData()
            formData.append('avatar', new File([png1x1], 'avatar.png', { type: 'image/png' }))

            const response = await fetch(`${server.url}/middleware-context`, {
                body: formData,
                method: 'POST',
            })

            assert.equal(response.status, 200)
            assert.deepEqual(await response.json(), { passes: true })
        } finally {
            await server.close()
        }
    })

    it('supports Fastify middleware-style upload context with a real hook', async function () {
        const app = Fastify()
        await app.register(multipart)

        app.addHook('preHandler', async function (request) {
            if (request.url === '/middleware-context') {
                await useFastifyUploadContext(request)
            }
        })

        app.post('/middleware-context', async function () {
            const validator = Validator.make({}, { attachments: 'files|mimes:png' })

            return {
                passes: await validator.passes(),
            }
        })

        const server = await listenFastifyServer(app)

        try {
            const formData = new FormData()
            formData.append('attachments', new File([png1x1], 'first.png', { type: 'image/png' }))

            const response = await fetch(`${server.url}/middleware-context`, {
                body: formData,
                method: 'POST',
            })

            assert.equal(response.status, 200)
            assert.deepEqual(await response.json(), { passes: true })
        } finally {
            await server.close()
        }
    })

    it('supports Hono middleware-style upload context with real middleware', async function () {
        const app = new Hono()

        app.use('/middleware-context', async function (context, next) {
            await useHonoUploadContext(context)
            await next()
        })

        app.post('/middleware-context', async function (context) {
            const validator = Validator.make({}, { avatar: 'file|image|mimetypes:image/png' })

            return context.json({
                passes: await validator.passes(),
            })
        })

        const formData = new FormData()
        formData.append('avatar', new File([png1x1], 'avatar.png', { type: 'image/png' }))

        const response = await app.request('/middleware-context', {
            body: formData,
            method: 'POST',
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { passes: true })
    })

    it('supports h3 middleware-style upload context with real middleware', async function () {
        const app = new H3()

        app.use('/middleware-context', async function (event, next) {
            await useH3UploadContext(event)
            return next()
        })

        app.post('/middleware-context', async function () {
            const validator = Validator.make({}, { avatar: 'file|image|mimetypes:image/png' })

            return {
                passes: await validator.passes(),
            }
        })

        const formData = new FormData()
        formData.append('avatar', new File([png1x1], 'avatar.png', { type: 'image/png' }))

        const response = await app.request('/middleware-context', {
            body: formData,
            method: 'POST',
        })

        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), { passes: true })
    })

    it('supports wildcard multi-file validation helpers', async function () {
        useExpressUploadContext({
            files: [
                {
                    buffer: png1x1,
                    fieldname: 'attachments',
                    mimetype: 'image/png',
                    originalname: 'first.png',
                    size: 1024,
                },
                {
                    buffer: png1x1,
                    fieldname: 'attachments',
                    mimetype: 'image/jpeg',
                    originalname: 'second.jpg',
                    size: 1024,
                },
            ],
        })

        const validator = syncRequestFilesToData(
            Validator.make(
                {},
                createWildcardFileRules('attachments', 'file|image|extensions:png,jpg'),
            ),
            ['attachments'],
        )

        assert.equal(await validator.passes(), true)
        assert.equal(Array.isArray(validator.getContext().requestFiles.attachments), true)
    })
})