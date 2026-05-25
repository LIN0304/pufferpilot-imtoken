import type { PreferenceEvent } from '../agent/agent-types'

export function rewardForReason(reason: PreferenceEvent['reason']): number {
  switch (reason) {
    case 'useful':
      return 0.12
    case 'clear':
      return 0.08
    case 'too_complex':
      return -0.08
    case 'too_risky':
      return -0.12
  }
}
