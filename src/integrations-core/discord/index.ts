import { registerIntegration } from '../registry'
import { discordDispatcher } from './dispatch'
import { discordManifest } from './manifest'

registerIntegration(discordDispatcher, discordManifest)
