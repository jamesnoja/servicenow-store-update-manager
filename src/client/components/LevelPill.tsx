import React from 'react'
import { LEVEL_LABEL, UpdateLevel } from '../utils/version'

/**
 * A major jump is the one that carries risk, so the three levels are separated
 * by colour as well as by word.
 */
export default function LevelPill({ level }: { level: UpdateLevel }) {
    return <span className={`sum-pill sum-pill--${level}`}>{LEVEL_LABEL[level]}</span>
}
