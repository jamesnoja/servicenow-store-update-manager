function pad(value: number): string {
    return String(value).padStart(2, '0')
}

/**
 * Plan names are how a run is recognised later in Install History, so the
 * default carries the date and time rather than just the date.
 */
export function defaultPlanName(): string {
    const now = new Date()
    return `Store updates ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}
