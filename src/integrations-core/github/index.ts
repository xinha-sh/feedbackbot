import { registerIntegration } from '../registry'
import { githubDispatcher } from './dispatch'
import { githubManifest } from './manifest'

registerIntegration(githubDispatcher, githubManifest)
