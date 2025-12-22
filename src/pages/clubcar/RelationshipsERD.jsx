import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import "./RelationshipsERD.css";

export default function RelationshipsERD() {
  const erdSrc = "/images/clubcar/mhsa_relationships_only_erd.png";

  // Quick scratchpad text (client-side only). Later you can persist server-side if desired.
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("mhsa_erd_notes");
    return saved ?? "";
  });

  const modelBullets = useMemo(
    () => [
      {
        title: "Core chain",
        lines: [
          "Location → Asset → Cart → CartPod → (Container OR Item) → ContainerContent",
          "This is the “where is this part?” backbone.",
        ],
      },
      {
        title: "Movement / history (append-only)",
        lines: [
          "AssetPositionEvent: where an asset was at time ts (x_px/y_px, optional location).",
          "CartAttachmentEvent: attach/detach + train order changes over time.",
          "CartPodEvent: load/unload changes over time (container or item + qty).",
        ],
      },
      {
        title: "Rules / constraints (from models.py)",
        lines: [
          "Cart (in_service): exactly one of current_location OR current_asset should be set.",
          "Container: should not be both at a location AND on a cartpod at the same time.",
        ],
      },
    ],
    []
  );

  const onNotesChange = (val) => {
    setNotes(val);
    localStorage.setItem("mhsa_erd_notes", val);
  };

  return (
    <div className="erd-page">
      <header className="erd-topbar">
        <div className="erd-title">
          <div className="erd-kicker">MHSA Reference</div>
          <div className="erd-h1">Relationships ERD</div>
        </div>

        <div className="erd-actions">
          <Link className="erd-link" to="/clubcar">
            ← MHSA Home
          </Link>
          <Link className="erd-link" to="/clubcar/tugger-map">
            Tugger Map
          </Link>
        </div>
      </header>

      <div className="erd-grid">
        {/* LEFT: ERD image */}
        <section className="erd-card">
          <div className="erd-card-head">
            <div className="erd-card-title">ERD Diagram</div>
            <a
              className="erd-link"
              href={erdSrc}
              target="_blank"
              rel="noreferrer"
            >
              Open full size
            </a>
          </div>

          <div className="erd-image-wrap">
            <img
              className="erd-image"
              src={erdSrc}
              alt="MHSA ERD"
              draggable={false}
            />
          </div>
        </section>

        {/* =========================
    SECTION 1: Executive / Layman's Explanation (React compliant)
   ========================= */}
        <div className="erd-section">
          <div className="erd-section-title">
            How MHSA answers “Where is it?” and “How many do we have?”
          </div>

          <p className="erd-p">
            MHSA treats physical material the way operations actually sees it:
            parts live inside <strong>containers</strong> (boxes, bins, totes,
            gaylords). Those containers are then placed somewhere in the
            world—either at a <strong>fixed location</strong> (rack, floor spot,
            staging lane) or in a <strong>position</strong> on a movable carrier
            (pallet, cart, trailer, presentation rack, sequenced carrier, etc.).
          </p>

          <p className="erd-p">
            This is the key idea: we don&apos;t try to “track every part
            floating in space.” We track{" "}
            <strong>the container that holds the part</strong>, and we track{" "}
            <strong>where that container is</strong>. That structure supports
            both:
          </p>

          <ul className="erd-ul">
            <li>
              <strong>Visual depiction:</strong> a container can be shown on a
              map at a location, or shown “in transit” because it is riding on a
              carrier attached to a moving asset (tugger, forklift, tractor,
              etc.).
            </li>
            <li>
              <strong>Numerical quantity:</strong> quantity is calculated from
              container contents: “this container contains these items with
              these quantities,” so totals can be rolled up by location, area,
              line-side, trailer, route, or any other grouping.
            </li>
          </ul>

          <div className="erd-callout">
            <div className="erd-callout-title">In one sentence</div>
            <div className="erd-p" style={{ margin: 0 }}>
              <strong>Items</strong> are inside <strong>Containers</strong>, and
              a container is either <strong>at a Location</strong> or{" "}
              <strong>in a Position on a Carrier</strong>—which is why MHSA can
              answer both <em>“where is it?”</em> and{" "}
              <em>“how many do we have?”</em> with high confidence.
            </div>
          </div>
        </div>

        <div className="erd-divider" />

        {/* =========================
    SECTION 2: Rules / Relational Notes (Engineering Reference)
   ========================= */}
        <div className="erd-section">
          <div className="erd-section-title">
            Rules MHSA must enforce (relational reference)
          </div>

          <div className="erd-caution">
            <div className="erd-caution-title">
              Caution: consistency rules (avoid “split brain” state)
            </div>

            <ol className="erd-ol">
              <li>
                <strong>Container placement is exclusive (XOR):</strong> A
                container must be in exactly one place:{" "}
                <code className="erd-code">container.current_location_id</code>{" "}
                <em>or</em>{" "}
                <code className="erd-code">container.current_cartpod_id</code>,
                but not both.
              </li>

              <li>
                <strong>One container per pod (occupancy):</strong> A{" "}
                <code className="erd-code">CartPod</code> represents a physical
                position/cell. At most one container may occupy a pod at a time.
              </li>

              <li>
                <strong>
                  Choose a single “source of truth” for container-on-pod:
                </strong>
                <ul className="erd-ul" style={{ marginTop: 6 }}>
                  <li>
                    <strong>On the Container:</strong>{" "}
                    <code className="erd-code">Container.current_cartpod</code>
                  </li>
                  <li>
                    <strong>On the CartPod:</strong>{" "}
                    <code className="erd-code">CartPod.current_container</code>
                  </li>
                </ul>
                <div className="erd-note">
                  <strong>Software rule:</strong> Either keep both fields
                  synchronized in every write path, or designate one as
                  canonical and treat the other as derived/cache. If they
                  diverge, queries and UI will disagree.
                </div>
              </li>

              <li>
                <strong>Cart placement rule (service-state):</strong> A cart can
                be parked at a location or inherit location from an asset when
                attached. When{" "}
                <code className="erd-code">cart.in_service = true</code>,
                enforce: exactly one of{" "}
                <code className="erd-code">cart.current_location_id</code> or{" "}
                <code className="erd-code">cart.current_asset_id</code> is set.
              </li>

              <li>
                <strong>Quantity precedence rule (for reporting):</strong>
                <ul className="erd-ul" style={{ marginTop: 6 }}>
                  <li>
                    <strong>Direct pod quantity:</strong>{" "}
                    <code className="erd-code">
                      cartpod.current_item_id + cartpod.current_qty
                    </code>
                  </li>
                  <li>
                    <strong>Container contents:</strong>{" "}
                    <code className="erd-code">
                      cartpod.current_container_id →
                      containercontent(container_id,item_id,qty)
                    </code>
                  </li>
                </ul>
                <div className="erd-note">
                  <strong>Recommended rule:</strong> if{" "}
                  <code className="erd-code">current_container_id</code> is set,
                  compute quantities from{" "}
                  <code className="erd-code">ContainerContent</code>; otherwise
                  fall back to the direct pod fields.
                </div>
              </li>

              <li>
                <strong>ContainerContent uniqueness:</strong> Enforce one row
                per (container, item):{" "}
                <code className="erd-code">UNIQUE(container_id, item_id)</code>.
                Never allow duplicate rows.
              </li>
            </ol>
          </div>

          <div className="erd-muted" style={{ marginTop: 10 }}>
            Tip: these rules are the difference between a map “animation” and a
            trustworthy system of record.
          </div>
        </div>

        {/* RIGHT: Notes + quick reference */}
        <aside className="erd-card">
          <div className="erd-card-head">
            <div className="erd-card-title">Scratchpad</div>
            <button
              className="erd-btn"
              type="button"
              onClick={() => onNotesChange("")}
              title="Clear notes (local only)"
            >
              Clear
            </button>
          </div>

          <textarea
            className="erd-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={
              "Use this as your working memory:\n\n- allowed values / rules\n- why a relationship exists\n- what question it answers\n- TODOs for next 5–10 days\n\n(saved to localStorage)"
            }
          />

          <div className="erd-divider" />

          <div className="erd-ref">
            <div className="erd-card-title">Current model anchors</div>

            {modelBullets.map((b) => (
              <div key={b.title} className="erd-bullet-block">
                <div className="erd-bullet-title">{b.title}</div>
                <ul className="erd-ul">
                  {b.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="erd-muted">
              Source of truth: <code>mhsa/models.py</code> (Django)
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
