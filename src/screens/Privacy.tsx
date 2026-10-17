import { useState } from 'preact/hooks';
import { forgetSettings } from '../lib/settings';
import './Numbers.css';

/** What paystream keeps and sends, in plain words (D1, rule 1). */
export function Privacy() {
  const [forgotten, setForgotten] = useState(false);
  return (
    <div class="screen">
      <header class="screen-header numbers-header">
        <a class="icon-button" href="/" aria-label="Back to the stream">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
        <h1 class="numbers-title">Privacy</h1>
      </header>

      <main class="screen-main numbers prose">
        <section class="card">
          <h2 class="card-title">What you type stays here</h2>
          <p>
            Every figure is worked out in your browser. Your salary, your rates and your things are never sent
            anywhere: not to us, not to an analytics service, not in a link.
          </p>
          <p>
            They are saved in this browser’s storage, so the page remembers them next time. Nobody else can
            see them, and they don’t follow you to another device.
          </p>
        </section>

        <section class="card">
          <h2 class="card-title">What the server sees</h2>
          <p>
            The page is a set of files served by Cloudflare. Like any web host, it sees that a browser asked
            for those files. It never sees what you type, because nothing you type is in any request. There
            are no cookies, no analytics and no third-party scripts; even the fonts come from here.
          </p>
        </section>

        <section class="card">
          <h2 class="card-title">Forget everything</h2>
          <p>Delete what this browser has saved and start again from a first visit.</p>
          <button
            type="button"
            class="button-quiet"
            disabled={forgotten}
            onClick={() => {
              forgetSettings();
              setForgotten(true);
            }}
          >
            {forgotten ? 'Forgotten' : 'Forget my numbers'}
          </button>
        </section>
      </main>

      <footer class="screen-footer">
        <p class="footnote">
          <a href="/numbers">Your numbers</a> · <a href="/">Back to the stream</a>
        </p>
      </footer>
    </div>
  );
}
