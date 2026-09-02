import React, { ReactNode } from 'react'
import { Heading } from '@servicenow/react-components/Heading'

interface Props {
    title: string
    subtitle?: string
    actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
    return (
        <header className="sum-header">
            <div className="sum-header__text">
                <Heading label={title} level={1} variant="header-primary" hasNoMargin />
                {subtitle && <p className="sum-header__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="sum-header__actions">{actions}</div>}
        </header>
    )
}
