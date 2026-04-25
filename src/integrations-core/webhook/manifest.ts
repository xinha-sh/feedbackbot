import type { IntegrationManifest } from '../registry'

export const webhookManifest: IntegrationManifest = {
  kind: 'webhook',
  displayName: 'Webhook',
  tagline:
    'POST signed JSON to any HTTPS endpoint. Bring your own receiver.',
  setup: 'manual',
  docsUrl: 'https://usefeedbackbot.com/docs/webhooks',
  iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-6 12-6-4 2-4-4-2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="10" r="2"/><circle cx="12" cy="18" r="2"/></svg>`,
}
