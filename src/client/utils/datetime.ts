const TOKEN = /yyyy|MM|dd|HH|mm|ss/g

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')
}

/**
 * Reads a value the date picker produced back into a Date, using the same
 * pattern the picker was given.
 *
 * Only 24-hour patterns are handled: a 12-hour one needs am/pm parsing, and
 * this exists solely to power a soft warning, so returning null and staying
 * quiet is the right answer rather than guessing.
 *
 * The Date is built in the browser's zone, while the value means wall-clock in
 * the operator's ServiceNow zone. Close enough for "is this in the past" —
 * which is why it warns rather than blocks.
 */
export function parseByPattern(value: string, pattern: string): Date | null {
    if (!value || pattern.indexOf('HH') === -1) return null

    const order: string[] = []
    let source = ''
    let last = 0
    let match: RegExpExecArray | null

    TOKEN.lastIndex = 0
    while ((match = TOKEN.exec(pattern)) !== null) {
        source += escapeRegExp(pattern.slice(last, match.index))
        source += match[0] === 'yyyy' ? '(\\d{4})' : '(\\d{1,2})'
        order.push(match[0])
        last = match.index + match[0].length
    }
    source += escapeRegExp(pattern.slice(last))

    const found = new RegExp(`^${source}$`).exec(value.trim())
    if (!found) return null

    const parts: Record<string, number> = { yyyy: 1970, MM: 1, dd: 1, HH: 0, mm: 0, ss: 0 }
    order.forEach((token, index) => {
        parts[token] = parseInt(found[index + 1], 10)
    })

    const parsed = new Date(parts.yyyy, parts.MM - 1, parts.dd, parts.HH, parts.mm, parts.ss)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isInThePast(value: string, pattern: string): boolean {
    const parsed = parseByPattern(value, pattern)
    return parsed !== null && parsed.getTime() < Date.now()
}
