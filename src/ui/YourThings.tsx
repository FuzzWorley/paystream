import { thingViews } from '../lib/model';

/** Your things (D6), beside *Since you got here*: each one priced in take-home time. */
export function YourThings() {
  const things = thingViews.value;
  return (
    <section class="things" aria-labelledby="things-title">
      <div class="things-head">
        <h2 id="things-title" class="things-title">
          Your things
        </h2>
        <a class="things-edit" href="/numbers#things">
          {things.length > 0 ? 'edit' : 'add'}
        </a>
      </div>
      {things.length > 0 && (
        <ul class="things-list">
          {things.map((t, i) => (
            <li key={i} class="thing">
              <span class="thing-name">{t.name}</span>
              <span class="thing-every figures">{t.every ? `every ${t.every}` : 'never, at this rate'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
