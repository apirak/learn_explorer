import MarketingLayout from '~/layouts/marketing'

export default function Forbidden() {
  return (
    <div className="home">
      <article className="prose-card">
        <div className="pc-top">
          <span className="pc-status mono tag" style={{ color: 'var(--subtle)' }}>
            <span className="dot" /> 403
          </span>
        </div>
        <div className="pc-lead">
          <span>No access.</span>
          <em>This area is for admins.</em>
        </div>
        <p className="pc-para">Ask the Owner to make you an admin, then reload the page.</p>
      </article>
    </div>
  )
}

Forbidden.layout = [MarketingLayout]
