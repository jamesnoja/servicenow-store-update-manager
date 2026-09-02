import React from 'react'
import { Button } from '@servicenow/react-components/Button'

interface Props {
    count: number
    onClear: () => void
    onReview: () => void
}

export default function SelectionBar({ count, onClear, onReview }: Props) {
    if (count === 0) return null

    return (
        <div className="sum-selection" role="region" aria-label="Selected updates">
            <p className="sum-selection__count">
                {count} {count === 1 ? 'update' : 'updates'} selected
            </p>
            <div className="sum-selection__actions">
                <Button label="Clear" variant="tertiary" onClicked={onClear} />
                <Button label={`Review ${count}`} icon="arrow-right-outline" variant="primary" onClicked={onReview} />
            </div>
        </div>
    )
}
