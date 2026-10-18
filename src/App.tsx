import { useEffect } from 'preact/hooks';
import { lazy, LocationProvider, Route, Router } from 'preact-iso';
import { Games } from './screens/Games';
import { Numbers } from './screens/Numbers';
import { Privacy } from './screens/Privacy';
import { Stream } from './screens/Stream';

// A game loads when it's opened, so the stream's first paint never waits on it.
const Paychinko = lazy(() => import('./screens/Paychinko').then((m) => m.Paychinko));
const Catcher = lazy(() => import('./screens/Catcher').then((m) => m.Catcher));
const Snake = lazy(() => import('./screens/Snake').then((m) => m.Snake));

/** Real paths (the Worker serves index.html for any of them); an unknown path shows the stream. */
export function App() {
  // The router reports changes, not the first load, so a deep link scrolls here.
  useEffect(scrollForRoute, []);
  return (
    <LocationProvider>
      <Router onRouteChange={scrollForRoute}>
        <Route path="/" component={Stream} />
        <Route path="/numbers" component={Numbers} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/games" component={Games} />
        <Route path="/games/paychinko" component={Paychinko} />
        <Route path="/games/catcher" component={Catcher} />
        <Route path="/games/snake" component={Snake} />
        <Route default component={Stream} />
      </Router>
    </LocationProvider>
  );
}

/** A new screen starts at its top, or at the section a link named ("/numbers#things"). */
function scrollForRoute(): void {
  requestAnimationFrame(() => {
    const id = location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  });
}
