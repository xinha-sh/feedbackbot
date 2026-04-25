import { registerIntegration } from '../registry'
import { webhookDispatcher } from './dispatch'
import { webhookManifest } from './manifest'

registerIntegration(webhookDispatcher, webhookManifest)
