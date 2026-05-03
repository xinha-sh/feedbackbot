// Import side-effect: each subfolder's index.ts registers its
// dispatcher + manifest. Add a new integration by importing a new
// subfolder here.
import './webhook'
import './slack'
import './discord'
import './github'

export {
  getDispatcher,
  getManifest,
  listManifests,
} from './registry'
export type {
  DispatchResult,
  IntegrationDispatcher,
  IntegrationManifest,
} from './registry'
