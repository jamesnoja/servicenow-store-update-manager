export type UpdateLevel = 'major' | 'minor' | 'patch' | 'other'

export const LEVEL_LABEL: Record<UpdateLevel, string> = {
    major: 'Major',
    minor: 'Minor',
    patch: 'Patch',
    other: 'Other',
}

function parts(version: string): number[] {
    return String(version || '')
        .split('.')
        .map((segment) => {
            const parsed = parseInt(segment, 10)
            return Number.isNaN(parsed) ? 0 : parsed
        })
}

/** Sorts ascending: -1 when a is older than b, 1 when newer, 0 when equal. */
export function compareVersions(a: string, b: string): number {
    const left = parts(a)
    const right = parts(b)
    const length = Math.max(left.length, right.length)
    for (let i = 0; i < length; i++) {
        const diff = (left[i] || 0) - (right[i] || 0)
        if (diff !== 0) return diff < 0 ? -1 : 1
    }
    return 0
}

/**
 * Classifies installed -> target. Derived at read time, never stored: the
 * platform records the two version strings and nothing else.
 */
export function updateLevel(installed: string, target: string): UpdateLevel {
    const from = parts(installed)
    const to = parts(target)
    if ((to[0] || 0) !== (from[0] || 0)) return 'major'
    if ((to[1] || 0) !== (from[1] || 0)) return 'minor'
    if ((to[2] || 0) !== (from[2] || 0)) return 'patch'
    return 'other'
}
