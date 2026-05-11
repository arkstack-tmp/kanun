import { assert, describe, it } from 'vitest'
import { fileValidatorPlugin, useExpressUploadContext } from '../src'

import type { AddressInfo } from 'node:net'
import type { RequestListener } from 'node:http'
import { Validator } from 'kanun'
import axios from 'axios'
import { createServer } from 'node:http'
import express from 'express'
import multer from 'multer'

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
        close: async () => {
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

Validator.use(fileValidatorPlugin)

describe('File upload adapters in browser environments', function () {
    it('supports browser-style axios multipart/form-data requests with generated files in Express', async () => {
        const app = express()
        const upload = multer({ storage: multer.memoryStorage() })

        app.use(function (_request, response, next) {
            response.setHeader('Access-Control-Allow-Origin', '*')
            next()
        })

        app.post(
            '/with-axios',
            upload.single('avatar'),
            function (request, _response, next) {
                useExpressUploadContext(request)
                next()
            },
            async function (request, response) {
                const validator = Validator.make(
                    {},
                    { avatar: 'required|file|image|mimetypes:image/jpeg' },
                )

                const validated = await validator.validate()
                const requestFiles = validator.getContext().requestFiles

                response.json({
                    bodyAvatar: request.body?.avatar ?? null,
                    filename: validated.avatar?.originalname ?? validated.avatar?.name ?? null,
                    hasAvatar: Object.prototype.hasOwnProperty.call(validated, 'avatar'),
                    requestFilesAvatarIsArray: Array.isArray(requestFiles.avatar),
                    requestFilesKeys: Object.keys(requestFiles),
                })
            },
        )

        const server = await listenHttpServer(app)
        const avatar = new File([png1x1], 'avatar.jpg', { type: 'image/jpeg' })

        try {
            const formData = new FormData()
            formData.append('avatar', avatar)

            const response = await axios.post(`${server.url}/with-axios`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            assert.equal(response.status, 200)
            assert.deepEqual(response.data, {
                bodyAvatar: null,
                filename: 'avatar.jpg',
                hasAvatar: true,
                requestFilesAvatarIsArray: false,
                requestFilesKeys: ['avatar'],
            })
        } finally {
            await server.close()
        }
    })
})
