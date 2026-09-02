import React from 'react'
import { Button } from '@servicenow/react-components/Button'
import { Checkbox } from '@servicenow/react-components/Checkbox'
import { Input } from '@servicenow/react-components/Input'
import { LEVEL_LABEL, UpdateLevel } from '../utils/version'

export interface Filters {
    levels: UpdateLevel[]
    hideDependencies: boolean
    search: string
}

export const EMPTY_FILTERS: Filters = { levels: [], hideDependencies: true, search: '' }

const LEVELS: UpdateLevel[] = ['major', 'minor', 'patch']

interface Props {
    filters: Filters
    onChange: (next: Filters) => void
    total: number
    showing: number
    selected: number
    patchCount: number
    onSelectPatches: () => void
}

export default function FilterBar({
    filters,
    onChange,
    total,
    showing,
    selected,
    patchCount,
    onSelectPatches,
}: Props) {
    const toggleLevel = (level: UpdateLevel) => {
        const levels = filters.levels.includes(level)
            ? filters.levels.filter((item) => item !== level)
            : [...filters.levels, level]
        onChange({ ...filters, levels })
    }

    return (
        <section className="sum-filters" aria-label="Filter updates">
            <div className="sum-filters__group" role="group" aria-label="Update level">
                {LEVELS.map((level) => (
                    <Button
                        key={level}
                        label={LEVEL_LABEL[level]}
                        size="sm"
                        variant={filters.levels.includes(level) ? 'primary' : 'secondary'}
                        active={filters.levels.includes(level)}
                        onClicked={() => toggleLevel(level)}
                    />
                ))}
            </div>

            <div className="sum-filters__search">
                <Input
                    label="Search"
                    placeholder="Name or scope"
                    value={filters.search}
                    manageValue
                    onInput={(event) => onChange({ ...filters, search: String(event.detail.payload.fieldValue ?? '') })}
                    onValueSet={(event) => onChange({ ...filters, search: String(event.detail.payload.value ?? '') })}
                />
            </div>

            <Checkbox
                label="Hide apps installed as dependencies"
                checked={filters.hideDependencies}
                manageChecked
                onCheckedSet={(event) => onChange({ ...filters, hideDependencies: event.detail.payload.value })}
            />

            {patchCount > 0 && (
                <Button
                    label={`Select ${patchCount} ${patchCount === 1 ? 'patch' : 'patches'}`}
                    size="sm"
                    variant="tertiary"
                    tooltipContent="Patch releases are the low-risk bulk of the list"
                    onClicked={onSelectPatches}
                />
            )}

            <p className="sum-filters__count">
                Showing {showing} of {total}
                {selected > 0 ? ` · ${selected} selected` : ''}
            </p>
        </section>
    )
}
