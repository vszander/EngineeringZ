/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Popover } from "bootstrap";
import { Link } from "react-router-dom";
import "../../components/mhsa.theme.clubcar.css";
import "./mhsa_home.css";
import MhsaNav from "../../components/MhsaNav";

const backendURL = import.meta.env.VITE_BACKEND_URL;

function HelpPopoverButton({
  title,
  content,
  placement = "left",
  className = "",
}) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!btnRef.current) return undefined;

    const pop = new Popover(btnRef.current, {
      trigger: "click",
      html: true,
      placement,
      customClass: "mhsa-popover mhsa-popover--info",
      sanitize: false,
      title,
      content,
      container: "body",
    });

    return () => {
      pop.dispose();
    };
  }, [title, content, placement]);

  return (
    <button
      ref={btnRef}
      type="button"
      className={`mhsa-help-trigger ${className}`}
      aria-label={`Help for ${title}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span className="material-symbols-outlined">help</span>
    </button>
  );
}

function MenuItem({ item, depth }) {
  const helpButton = item.help ? (
    <HelpPopoverButton
      title={item.help.title || item.label}
      content={item.help.content}
      placement={item.help.placement || "left"}
    />
  ) : null;

  if (item.external) {
    return (
      <div className="mhsa-tree-item" style={{ marginLeft: depth * 14 }}>
        <div className="mhsa-tree-row">
          <div className="mhsa-tree-main">
            <a
              className="mhsa-tree-link"
              href={item.path}
              target="_blank"
              rel="noreferrer"
            >
              {item.label}
            </a>
            {item.note ? <span className="mhsa-pill">{item.note}</span> : null}
          </div>

          {helpButton}
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

  return (
    <div className="mhsa-tree-item" style={{ marginLeft: depth * 14 }}>
      <div className="mhsa-tree-row">
        <div className="mhsa-tree-main">
          {item.path ? (
            <Link className="mhsa-tree-link" to={item.path}>
              {item.label}
            </Link>
          ) : (
            <span className="mhsa-tree-text">{item.label}</span>
          )}

          {item.note ? <span className="mhsa-pill">{item.note}</span> : null}
        </div>

        {helpButton}
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

export default function MhsaHome() {
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    isStaff: false,
    username: null,
  });

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
          { label: "Scan Events", path: "/clubcar/scan-events" },
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
                label: "Anticipation",
                path: "/clubcar/anticipation",
                note: "NEW",
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
            label: "Inventory Sensing",
            path: `${backendURL}/mhsa/inventory-sensing`,
            external: true,
            note: "NEW",
            help: {
              title: "Inventory Sensing",
              content: `
                <div class="mhsa-help-body">
                  <p>This is the primary screen a MITZO uses.  It allows frictionless, error-free 'signaling' of observed inventory levels.</p>
                  <p>These are the source for HUD 'sticky pins'</p>
                </div>
              `,
            },
            children: [],
          },
          {
            label: "Fill Cart (Scanner)",
            external: true,
            popout: true,
            path: `${backendURL}/mhsa/fillcart/`,
            note: "Operator barcode workflow",
          },

          {
            label: "Material Handling Scoreboard",
            path: "/clubcar/scoreboard",
          },
          {
            label: "CCDC Signals Dashboard",
            path: "/clubcar/signals",

            help: {
              title: "Signals Dashboard",
              content: `
                <div class="mhsa-help-body">
                  <p><strong>The Signals Dashboard</strong> allows teams to monitor order fulfillment 'signals' throughout the lifecycle.</p>
                  <p>Intended to be displayed on a large, publicly viewable monitor.</p>
                </div>
              `,
            },
          },
          {
            label: "Transactions HeatMap",
            path: "/clubcar/mitzo/transactions-heatmap",
            help: {
              title: "Transactions HeatMap",
              content: `
                <div class="mhsa-help-body">
                  <p><strong>Transactions HeatMap</strong> shows where material handling activity (intermodal) is concentrated.</p>
                  <p>Useful for spotting congestion, idle zones, and workflow hotspots.</p>
                </div>
              `,
            },
          },
        ],
      },
      {
        section: "Usage / Statistics",
        items: [
          {
            label: "MHSA Utilization Metrics",
            path: "/clubcar/CostTable",
          },
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
      {
        section: "Live Visualization",
        items: [
          {
            label: "MHSA HUD (Live Demo)",
            path: "/clubcar/hud",
          },
          {
            label: "Cockpit (Live Demo)",
            path: "/clubcar/cockpit",
            note: "Asset + cart + pod + scanner signals context",
          },
        ],
      },
    ],
    [],
  );

  useEffect(() => {
    fetch(`${backendURL}/auth/status/`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((auth) => {
        setAuthStatus({
          isAuthenticated: !!auth.isAuthenticated,
          isStaff: !!auth.isStaff,
          username: auth.username ?? null,
        });
      })
      .catch(() => {
        // stay unauthenticated on error
      });
  }, []);

  return (
    <div className="mhsa-dark">
      <div className="mhsa-home">
        <MhsaNav authStatus={authStatus} />

        <section className="mhsa-hero">
          <div className="mhsa-hero-left">
            <h1 className="mhsa-h1">
              Operational questions deserve operational data.
            </h1>

            <p className="mhsa-p">
              <strong>Material Handling Situational Awareness (MHSA)</strong> is
              a facility-scale <span className="mhsa-em">digital twin</span> for
              material movement and inventory context. When{" "}
              <span className="mhsa-em">informed</span>, MHSA is anticipitory
              and optimizes LEAN manufacturing.
            </p>

            <p className="mhsa-p">
              It answers questions that don&apos;t survive spreadsheets and
              siloed scanners:
              <span className="mhsa-em"> where is this part right now</span>,
              how many instances exist, what containers they live in, and
              what&apos;s staged at the line vs in transit. Built for tomorrow,
              MHSA already leverages Machine Learning and AI to enable the
              material handler.
            </p>

            <p className="mhsa-p">
              The novelty is the relational backbone:{" "}
              <span className="mhsa-code">
                location → asset → cart → pod → container → item
              </span>
              .
            </p>

            <div className="mhsa-cta-row">
              <Link className="mhsa-btn mhsa-btn-primary" to="/clubcar/hud">
                Heads-Up Display
              </Link>

              <button
                className="mhsa-btn mhsa-btn-secondary"
                onClick={() => {
                  window.open(
                    `${backendURL}/mhsa/inventory-sensing`,
                    "_blank",
                    "width=1200,height=800,resizable=yes,scrollbars=yes",
                  );
                }}
              >
                Inventory Scanning
              </button>
            </div>
          </div>

          <div className="mhsa-hero-right">
            <img
              className="mhsa-hero-img"
              src="/images/clubcar/darkcarbackground.jpg"
              alt="Material Handling Situational Awareness"
              draggable={false}
            />
          </div>
        </section>

        <section className="mhsa-menu">
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
            Built to enable the material handler. Better Information → Informed
            Decisions
          </div>
        </footer>
      </div>
    </div>
  );
}
