import React, { ReactNode } from 'react'
import { Button } from '@servicenow/react-components/Button'
import PageHeader from './PageHeader'

interface Props {
    title: string
    subtitle: string
    onBack: () => void
    children: ReactNode
}

export default function GuideLayout({ title, subtitle, onBack, children }: Props) {
    return (
        <main className="sum-page">
            <PageHeader
                title={title}
                subtitle={subtitle}
                actions={
                    <Button
                        label="Back to updates"
                        icon="arrow-left-outline"
                        variant="tertiary"
                        onClicked={onBack}
                    />
                }
            />
            <article className="sum-guide">{children}</article>
        </main>
    )
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
    return (
        <section className="sum-step">
            <span className="sum-step__number" aria-hidden="true">
                {n}
            </span>
            <div className="sum-step__body">
                <h2 className="sum-guide__h2">{title}</h2>
                {children}
            </div>
        </section>
    )
}

export function Question({ q, children }: { q: string; children: ReactNode }) {
    return (
        <section className="sum-qa">
            <h2 className="sum-qa__q">{q}</h2>
            <div className="sum-qa__a">{children}</div>
        </section>
    )
}
