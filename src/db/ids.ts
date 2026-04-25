import { customAlphabet } from 'nanoid'

// URL-safe, unambiguous alphabet (no 0/O/1/I/l).
const nano = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 16)

export const newId = {
  workspace: () => `ws_${nano()}`,
  ticket: () => `tkt_${nano()}`,
  comment: () => `cmt_${nano()}`,
  vote: () => `vot_${nano()}`,
  integration: () => `int_${nano()}`,
  route: () => `rte_${nano()}`,
  delivery: () => `dlv_${nano()}`,
  audit: () => `aud_${nano()}`,
  // short opaque token for DNS TXT verification (e.g. feedback-verify=<token>)
  verificationToken: () => nano(),
}
