type LegalPageProps = {
  title: string
  documentUrl: string
}

// Expose the existing policy document without requiring client-side JavaScript.
export default function LegalPage({ title, documentUrl }: LegalPageProps) {
  return (
    <main>
      <h1>{title}</h1>
      <p>
        <a href={documentUrl}>Read the {title} (PDF)</a>
      </p>
      <iframe
        title={title}
        src={documentUrl}
        style={{ width: '100%', height: '100vh', border: 0 }}
      />
    </main>
  )
}
