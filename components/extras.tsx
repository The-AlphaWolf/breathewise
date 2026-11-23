"use client";

import { useState } from "react";
import { estimateAvoidedKg, FACTORS_KG_PER_KM, type Vehicle } from "../lib/emissions.ts";

export function CommunityShare({ message }: { readonly message: string }) {
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Copy is not available here. Select the text and copy it manually.");
    }
  }

  return (
    <section className="extra-section" aria-labelledby="share-title">
      <p className="eyebrow">5 · Share with your community</p>
      <h2 id="share-title">Message for your school group or neighbourhood</h2>
      <p className="section-intro">Built only from the community actions in your approved plan. Edit it before you send.</p>
      <label className="visually-hidden" htmlFor="share-text">Community message</label>
      <textarea id="share-text" className="share-text" rows={9} readOnly value={message} />
      <button className="ai-button" type="button" onClick={() => void copy()}>Copy message</button>
      <p role="status" className="field-hint">{status}</p>
    </section>
  );
}

export function EmissionsEstimate() {
  const [vehicle, setVehicle] = useState<Vehicle>("car");
  const [km, setKm] = useState("10");
  const [trips, setTrips] = useState("3");
  const { perTripKg, weeklyKg } = estimateAvoidedKg(Number(km), Number(trips), vehicle);

  return (
    <section className="extra-section" aria-labelledby="estimate-title">
      <p className="eyebrow">6 · Illustrative emissions estimate</p>
      <h2 id="estimate-title">What could one avoided trip save?</h2>
      <p className="section-intro">
        For trips you skip, combine or share. This is a rough tailpipe CO₂ estimate, separate from your
        personal exposure.
      </p>
      <div className="estimate-grid">
        <div className="field">
          <label htmlFor="vehicle">Vehicle you would not use</label>
          <select id="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value as Vehicle)}>
            <option value="car">Petrol car</option>
            <option value="twoWheeler">Two-wheeler</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="km">Distance per avoided trip (km)</label>
          <input id="km" type="number" inputMode="decimal" min={0} max={100} value={km} onChange={(e) => setKm(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="trips">Avoided trips per week</label>
          <input id="trips" type="number" inputMode="numeric" min={0} max={14} value={trips} onChange={(e) => setTrips(e.target.value)} />
        </div>
      </div>
      <p className="estimate-result" aria-live="polite">
        About <strong>{perTripKg} kg CO₂</strong> per avoided trip, <strong>{weeklyKg} kg CO₂</strong> per week.
      </p>
      <p className="caveat">
        Assumptions: {FACTORS_KG_PER_KM.car} kg CO₂/km for a petrol car and {FACTORS_KG_PER_KM.twoWheeler} kg
        CO₂/km for a two-wheeler, rounded from Indian fleet averages (ICCT). Tailpipe CO₂ only: no particulate
        matter, no fuel production, no passengers or traffic effects. Illustrative, not a measurement. Fewer
        vehicle trips lowers household emissions; it does not by itself change how much polluted air you breathe.
      </p>
    </section>
  );
}
