import React from "react";

import "./mhsa_mapping.css";
import "./MaterialHandlingCostTable.css";

const rows = [
  {
    activity: "‘cost-per-meter’- Tugger (4 pallets)",
    description: "",
    iconKey: "tugger",
    monthlyAverage: "",
  },
  {
    activity: "‘cost-per-meter’- Reach (4 pallets)",
    description: "",
    iconKey: "reach",
    monthlyAverage: "",
  },
  {
    activity: "‘cost-per-meter’- Fork (4 pallets)",
    description: "",
    iconKey: "fork",
    monthlyAverage: "",
  },
  {
    activity: "‘cost-per-meter’- Swing (4 pallets)",
    description: "",
    iconKey: "swing",
    monthlyAverage: "",
  },
  {
    activity: "Cost-to-transfer",
    description: "Fork places gaylord on transfer station",
    iconKey: "",
    monthlyAverage: "",
  },
  {
    activity: "Cost-to-drop",
    description: "Fork places gaylord on floor",
    iconKey: "",
    monthlyAverage: "",
  },
  {
    activity: "Cost-to-place",
    description: "Reachtruck places gaylord in warehouse racking",
    iconKey: "",
    monthlyAverage: "",
  },
  {
    activity: "Cost-to-Pick",
    description: "Reachtruck picks gaylord from warehouse racking",
    iconKey: "",
    monthlyAverage: "",
  },
  {
    activity:
      "Cost-for-intermodal-Change (i.e. Fork Places pallet on ‘daughter’ cart.",
    description: "Reachtruck places gaylord on daughter cart.",
    iconKey: "",
    monthlyAverage: "",
  },
  {
    activity: "‘cost-per-hour’- Tugger",
    description: "",
    iconKey: "tugger",
    monthlyAverage: "$29.73 / hr",
  },
  {
    activity: "‘cost-per-hour’- Reach",
    description: "",
    iconKey: "reach",
    monthlyAverage: "$42.32 / hr",
  },
  {
    activity: "‘cost-per-hour’- Fork",
    description: "",
    iconKey: "fork",
    monthlyAverage: "$45.15 / hr",
  },
  {
    activity: "‘cost-per-hour’- Swing",
    description: "",
    iconKey: "swing",
    monthlyAverage: "$55.25 / hr",
  },
];

function IconSlot({ iconKey }) {
  if (!iconKey) return null;

  return (
    <div className={`costsTable__iconSlot costsTable__iconSlot--${iconKey}`}>
      {/*
        Option A: hard-code background-image in CSS for each icon class
        Option B: replace this div with an <img> tag later if desired
      */}
    </div>
  );
}

export default function MaterialHandlingCostTable() {
  return (
    <div className="costsPage">
      <div className="costsPage__header">
        <h1 className="costsPage__title">Material Handling Cost Factors</h1>
        <p className="costsPage__subtitle">
          Representative cost model for in-plant transportation activities.
        </p>
      </div>

      <div className="costsPage__tableWrap">
        <table className="costsTable">
          <thead>
            <tr>
              <th className="costsTable__th costsTable__th--activity">
                ACTIVITY
              </th>
              <th className="costsTable__th costsTable__th--description">
                DESCRIPTION
              </th>
              <th className="costsTable__th costsTable__th--running">
                Running Cost
              </th>
              <th className="costsTable__th costsTable__th--mhsa">
                MHSA Calculated
              </th>
              <th className="costsTable__th costsTable__th--monthly">
                Monthly Average
              </th>
              <th className="costsTable__th costsTable__th--textbook">
                Textbook
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const isIconRow = Boolean(row.iconKey);

              return (
                <tr
                  key={`${row.activity}-${idx}`}
                  className={isIconRow ? "costsTable__row--icon" : ""}
                >
                  <td className="costsTable__td costsTable__td--activity">
                    {row.activity}
                  </td>

                  <td
                    className={[
                      "costsTable__td",
                      "costsTable__td--description",
                      isIconRow ? "costsTable__iconCell" : "",
                    ].join(" ")}
                  >
                    {isIconRow ? (
                      <IconSlot iconKey={row.iconKey} />
                    ) : (
                      row.description
                    )}
                  </td>

                  <td className="costsTable__td costsTable__td--running"></td>
                  <td className="costsTable__td costsTable__td--mhsa"></td>
                  <td className="costsTable__td costsTable__td--monthly">
                    {row.monthlyAverage}
                  </td>
                  <td className="costsTable__td costsTable__td--textbook"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
