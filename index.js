'use strict'
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const stat = promisify(fs.stat)
const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)

class ServerlessPlugin {
	constructor(serverless, options) {
		this.serverless = serverless
		this.options = options
		this.path = './.ahaless'
		console.log(this.options)

		if (this.options.gf) {
			this.gfHandler().catch(err => {
				this.serverless.cli.log(err.message)
			})
		}
	}

	async gfHandler() {
		try {
			this.serverless.cli.log('Generating functions ...')
			require('ts-node').register({ module: 'commonjs' })
			require('tsconfig-paths').register()

			const servicePath = path.join(this.serverless.config.servicePath, '/handler.ts')
			const Handler = require(servicePath).default

			const metadata = Handler.metadata.reduce((acc, value) => {
				acc[value.fnName] = {
					handler: `handler.${value.fnName}`,
						events: [
						{
							http: {
								method: value.method,
								path: value.path ? value.path : value.fnName
							}
						}
					]
				}

				return acc
			}, {})

			const data = JSON.stringify(metadata, null, 2)

			const stats = await stat(this.path).catch(e => {
				this.serverless.cli.log(e.message)
				this.serverless.cli.log('Directory not found. Create one')
			})

			if (!stats) {
				await mkdir(this.path)
			}

			await writeFile(
				`${this.path}/functions.sls.json`,
				data
			)

			this.serverless.cli.log('Generate functions successfully!')
		} catch (e) {
			this.serverless.cli.log(e.message)
		}
	}
}

module.exports = ServerlessPlugin