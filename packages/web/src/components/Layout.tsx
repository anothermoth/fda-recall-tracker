import { Link, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <span>
              <span className="brand__title">FDA Drug Recall Tracker</span>
              <span className="brand__tag">openFDA enforcement data</span>
            </span>
          </Link>
        </div>
      </header>
      <main id="main" className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          Data comes from the public{" "}
          <a href="https://open.fda.gov/apis/drug/enforcement/">
            openFDA drug enforcement API
          </a>
          . It is not medical advice and should not be used to make care decisions.
        </p>
      </footer>
    </div>
  );
}
