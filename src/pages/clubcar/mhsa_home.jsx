import { Link } from "react-router-dom";
import { useMemo } from "react";
import "./mhsa_home.css";

export default function MhsaHome() {
  // Menu hierarchy based on your Excel sheet
  const menu = useMemo(
    () => [
      {
        section: "Standard Searches",
        items: [
          { label: "PartID (Standard Search)", path: "/clubcar/search/part" },
          { label: "Description Search", path: "/clubcar/search/description" },
          { label: "Collecting Dust", path: "/clubcar/search/collecting-dust" },
          {
            label: "Hot Commodity",
            note: "Parts that have high touches",
            path: "/clubcar/search/hot-commodity",
          },
          { label: "Open Racks", path: "/clubcar/search/open-racks" },
          {
            label: "Warehouse Browse",
            path: "/clubcar/search/warehouse-browse",
          },
          { label: "Scan Events", path: "/clubcar/events/scans" },
          { label: "Transaction Events", path: "/clubcar/events/transactions" },
        ],
      },
      {
        section: "Consumption at the Line",
        items: [
          {
            label: "Which is the next part to run out",
            path: "/clubcar/line/next-to-run-out",
          },
          {
            label: "TLV Look Ahead",
            path: "/clubcar/line/tlv-look-ahead",
            children: [
              {
                label: "Next Hour",
                path: "/clubcar/line/tlv-look-ahead/next-hour",
              },
              {
                label: "SwitchOver",
                path: "/clubcar/line/tlv-look-ahead/switchover",
              },
              {
                label: "Refresh",
                path: "/clubcar/line/tlv-look-ahead/refresh",
                children: [
                  {
                    label: "Complexity",
                    path: "/clubcar/line/tlv-look-ahead/refresh/complexity",
                  },
                  {
                    label: "Criticality",
                    path: "/clubcar/line/tlv-look-ahead/refresh/criticality",
                  },
                ],
              },
              { label: "1 hr", path: "/clubcar/line/tlv-look-ahead/1hr" },
              {
                label: "Heat Map",
                path: "/clubcar/line/heat-map",
                children: [
                  {
                    label: "Hard to get parts",
                    path: "/clubcar/line/heat-map/hard-to-get",
                  },
                  {
                    label: "Most moving parts",
                    path: "/clubcar/line/heat-map/most-moving",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        section: "Order Break Out",
        items: [
          { label: "Next 15 min", path: "/clubcar/orders/next-15" },
          { label: "Next 30 min", path: "/clubcar/orders/next-30" },
        ],
      },
      {
        section: "MITZO Map",
        items: [
          {
            label: "Transactions HeatMap",
            path: "/clubcar/mitzo/transactions-heatmap",
            note: "Heat map",
          },
          {
            label: "Inventory Sensing",
            path: "/clubcar/mitzo/inventory-sensing",
            children: [
              {
                label: "# of red",
                path: "/clubcar/mitzo/inventory-sensing/red-count",
              },
              {
                label: "# of inputs",
                path: "/clubcar/mitzo/inventory-sensing/input-count",
              },
            ],
          },
        ],
      },
      {
        section: "Usage / Statistics",
        items: [
          {
            label: "Fork Transactions",
            path: "/clubcar/stats/fork-transactions",
          },
          {
            label: "Show Mitzo Requests!",
            path: "/clubcar/stats/mitzo-requests",
          },
          {
            label: "Show Manager Requests",
            path: "/clubcar/stats/manager-requests",
          },
          { label: "Show AI requests", path: "/clubcar/stats/ai-requests" },
        ],
      },

      // Your current live feature:
      {
        section: "Live Visualization",
        items: [
          {
            label: "Tugger Map (Live Demo)",
            path: "/clubcar/tugger-map",
            note: "Asset + cart + pod context",
          },
        ],
      },
    ],
    []
  );

  return (
    <div className="mhsa-home">
      <header className="mhsa-topbar">
        <div className="mhsa-brand">
          <div className="mhsa-brand-title">MHSA</div>
          <div className="mhsa-brand-subtitle">
            Material Handling Situational Awareness
          </div>
        </div>

        <nav className="mhsa-actions">
          <Link className="mhsa-link" to="/clubcar/tugger-map">
            Tugger Map
          </Link>
          <Link className="mhsa-link" to="/clubcar/relationships">
            ERD (login)
          </Link>
        </nav>
      </header>

      <section className="mhsa-hero">
        <div className="mhsa-hero-left">
          <h1 className="mhsa-h1">
            Operational questions deserve operational data.
          </h1>

          <p className="mhsa-p">
            <strong>Material Handling Situational Awareness (MHSA)</strong> is a
            facility-scale digital twin for material movement and inventory
            context.
          </p>

          <p className="mhsa-p">
            It answers questions that don&apos;t survive spreadsheets and siloed
            scanners:
            <span className="mhsa-em"> where is this part right now</span>, how
            many instances exist, what containers they live in, and what&apos;s
            staged at the line vs. in transit.
          </p>

          <p className="mhsa-p">
            The novelty is the relational backbone:{" "}
            <span className="mhsa-code">
              location → asset → cart → pod → container → item
            </span>
            . That model makes “where is this part?” a query — and also makes
            “show every instance of this part across warehouse / line / transit”
            equally solvable.
          </p>

          <div className="mhsa-cta-row">
            <Link
              className="mhsa-btn mhsa-btn-primary"
              to="/clubcar/tugger-map"
            >
              Open Tugger Map
            </Link>

            <Link
              className="mhsa-btn mhsa-btn-secondary"
              to="/clubcar/relationships"
            >
              View ERD (login)
            </Link>
          </div>
        </div>

        <div className="mhsa-hero-right">
          {/* Put your 1200x637 image into public/images/clubcar/ */}
          <img
            className="mhsa-hero-img"
            src="/images/clubcar/darkcarbackground.jpg"
            alt="Material Handling Situational Awareness"
            draggable={false}
          />
        </div>
      </section>

      <section className="mhsa-menu">
        <h2 className="mhsa-h2">Project Features</h2>
        <p className="mhsa-muted">
          Menu items will later support hover tooltips that explain value and
          expected outputs.
        </p>

        <div className="mhsa-menu-grid">
          {menu.map((group) => (
            <div key={group.section} className="mhsa-card">
              <div className="mhsa-card-title">{group.section}</div>
              <div className="mhsa-tree">
                {group.items.map((item) => (
                  <MenuItem key={item.label} item={item} depth={0} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mhsa-footer">
        <div className="mhsa-muted">
          Built by an engineer who needed answers before the organization could
          even articulate the questions.
        </div>
      </footer>
    </div>
  );
}

function MenuItem({ item, depth }) {
  return (
    <div className="mhsa-tree-item" style={{ marginLeft: depth * 14 }}>
      <div className="mhsa-tree-row">
        {item.path ? (
          <Link className="mhsa-tree-link" to={item.path}>
            {item.label}
          </Link>
        ) : (
          <span className="mhsa-tree-text">{item.label}</span>
        )}

        {item.note ? <span className="mhsa-pill">{item.note}</span> : null}
      </div>

      {item.children?.length ? (
        <div className="mhsa-tree-children">
          {item.children.map((c) => (
            <MenuItem key={c.label} item={c} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
