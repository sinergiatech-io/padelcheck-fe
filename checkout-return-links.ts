import type { Plugin } from 'vite'

const returnPath = '/billing/return'

export function checkoutReturnLinks(androidSigners: string | undefined, appleAppId: string | undefined): Plugin {
  const fingerprints = androidSigners?.split(',').map(value => value.trim().toUpperCase()) ?? []
  if (fingerprints.some(value => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))) {
    throw new Error('Use colon-separated SHA-256 fingerprints for VITE_ANDROID_APP_LINK_SHA256')
  }
  if (appleAppId && !/^[A-Z0-9]{10}\.[a-zA-Z0-9.-]+$/.test(appleAppId)) {
    throw new Error('Use the signed application identifier for VITE_IOS_APP_LINK_ID')
  }

  return {
    name: 'checkout-return-links',
    apply: 'build',
    generateBundle() {
      if (fingerprints.length) {
        this.emitFile({
          type: 'asset',
          fileName: '.well-known/assetlinks.json',
          source: JSON.stringify([{
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: 'io.sinergiatech.padelcheck.mobile',
              sha256_cert_fingerprints: fingerprints,
            },
          }]),
        })
      }
      if (appleAppId) {
        this.emitFile({
          type: 'asset',
          fileName: '.well-known/apple-app-site-association',
          source: JSON.stringify({ applinks: { details: [{ appIDs: [appleAppId], components: [{ '/': returnPath }] }] } }),
        })
      }
    },
  }
}
