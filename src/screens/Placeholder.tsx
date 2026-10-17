import './Placeholder.css';

// Decorative only: no figures are claimed until the core exists (phase 1).
const lanes = [
  { label: 'You', token: '--you', seconds: 2.4 },
  { label: 'Federal', token: '--federal', seconds: 4.6 },
  { label: 'Social Security', token: '--social-security', seconds: 6.1 },
  { label: 'State', token: '--state', seconds: 7.3 },
  { label: 'Medicare', token: '--medicare', seconds: 11 },
];

export function Placeholder() {
  return (
    <div class="ph">
      <header class="ph-header">
        <span class="ph-wordmark">
          pay<span>stream</span>
        </span>
      </header>

      <main class="ph-main">
        <p class="ph-eyebrow">Coming soon</p>
        <h1 class="ph-title">Watch your pay arrive, a penny at a time.</h1>
        <p class="ph-lede">
          Type a salary and see it stream in by the second, with federal, state, Social Security and Medicare
          taking their share beside it.
        </p>

        <div class="ph-lanes" aria-hidden="true">
          {lanes.map((l) => (
            <div key={l.label} class="ph-lane" style={{ '--c': `var(${l.token})`, '--t': `${l.seconds}s` }}>
              <span class="ph-lane-label">{l.label}</span>
              <span class="ph-track">
                <span class="ph-drop" />
                <span class="ph-drop" />
              </span>
            </div>
          ))}
        </div>

        <p class="ph-private">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Stays in your browser. Nothing you type is sent anywhere.
        </p>
      </main>

      <footer class="ph-footer">
        <span>Estimates for illustration, not tax advice.</span>
        <a href="https://github.com/FuzzWorley/paystream">Source on GitHub</a>
      </footer>
    </div>
  );
}
