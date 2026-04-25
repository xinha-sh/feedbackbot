import { registerIntegration } from '../registry'
import { slackDispatcher } from './dispatch'
import { slackManifest } from './manifest'

registerIntegration(slackDispatcher, slackManifest)

export * from './oauth'
