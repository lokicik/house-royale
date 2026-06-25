import { Fragment } from 'react'
import AppShell from './AppShell'
import { useLocale } from '../contexts/localeContextValue'
import { legalDocuments } from '../i18n/legalDocuments'
import '../pages/Legal.css'

function renderInlineContent(parts) {
  return parts.map((part, index) => {
    if (typeof part === 'string') {
      return <Fragment key={index}>{part}</Fragment>
    }

    return (
      <a key={index} href={part.href}>
        {part.label}
      </a>
    )
  })
}

function renderListItem(item) {
  if (typeof item === 'string') return item
  return (
    <>
      <strong>{item.label}</strong> {item.text}
    </>
  )
}

export default function LegalDocument({ documentKey }) {
  const { locale } = useLocale()
  const document = legalDocuments[locale]?.[documentKey] ?? legalDocuments.tr[documentKey]

  return (
    <AppShell>
      <div className="legal-content">
        <h1>{document.title}</h1>
        <p className="legal-date">{document.updatedAt}</p>

        {document.blocks.map((block, index) => {
          if (block.type === 'h2') return <h2 key={index}>{block.text}</h2>
          if (block.type === 'h3') return <h3 key={index}>{block.text}</h3>
          if (block.type === 'ul') {
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderListItem(item)}</li>
                ))}
              </ul>
            )
          }

          if (block.content) {
            return <p key={index}>{renderInlineContent(block.content)}</p>
          }

          return <p key={index}>{block.text}</p>
        })}
      </div>
    </AppShell>
  )
}
