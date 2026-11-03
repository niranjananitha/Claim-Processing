"use client";

import React, { useEffect, useState } from "react";
import { vehiclesApi } from "../services/api";
import type { VehicleCatalog, VehicleCategory, VehicleInput } from "../services/types";

const CATEGORY_ICON: Record<VehicleCategory, string> = {
  two_wheeler: "two_wheeler",
  four_wheeler: "directions_car",
  cargo_truck: "local_shipping",
};

const inputCls =
  "w-full px-3 py-2.5 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg text-xs font-medium text-[#0b1c30] outline-none focus:border-[#4059aa] focus:bg-white";

export interface VehiclePickerValue {
  category: VehicleCategory | "";
  brand: string; // catalog brand, or OTHER
  model: string; // catalog model, or OTHER
  customMake: string;
  customModel: string;
  year: string;
  registration: string;
}

export const EMPTY_VEHICLE: VehiclePickerValue = {
  category: "",
  brand: "",
  model: "",
  customMake: "",
  customModel: "",
  year: "",
  registration: "",
};

const OTHER = "Other";

/** Validate the picker and build the API payload, or return an error message. */
export function toVehicleInput(v: VehiclePickerValue): VehicleInput | string {
  if (!v.category) return "Select your vehicle category.";
  if (!v.brand) return "Select the vehicle brand (or Other).";
  const isOtherBrand = v.brand === OTHER;
  const make = isOtherBrand ? v.customMake.trim() : v.brand;
  if (!make) return "Enter the vehicle brand.";
  const isOtherModel = isOtherBrand || v.model === OTHER;
  if (!isOtherBrand && !v.model) return "Select the vehicle model (or Other).";
  const model = isOtherModel ? v.customModel.trim() : v.model;
  if (!model) return "Enter the vehicle model.";
  const year = Number(v.year);
  const maxYear = new Date().getFullYear() + 1;
  if (!year || year < 1980 || year > maxYear) return `Enter a manufacturing year between 1980 and ${maxYear}.`;
  const reg = v.registration.replace(/[\s-]/g, "").toUpperCase();
  if (!/^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/.test(reg)) {
    return "Enter a valid registration number, e.g. TN 01 AB 1234.";
  }
  return { category: v.category, make, model, year, registration_number: reg };
}

export default function VehiclePicker({
  value,
  onChange,
}: {
  value: VehiclePickerValue;
  onChange: (v: VehiclePickerValue) => void;
}) {
  const [catalog, setCatalog] = useState<VehicleCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void vehiclesApi.catalog().then((res) => {
      if (res.ok && res.data) setCatalog(res.data);
      else setLoadError(res.error || "Could not load the vehicle catalog.");
    });
  }, []);

  const set = (patch: Partial<VehiclePickerValue>) => onChange({ ...value, ...patch });
  const brands = value.category && catalog ? Object.keys(catalog.brands[value.category]) : [];
  const models =
    value.category && catalog && value.brand && value.brand !== OTHER
      ? catalog.brands[value.category][value.brand] || []
      : [];
  const otherBrand = value.brand === OTHER;
  const otherModel = otherBrand || value.model === OTHER;

  if (loadError) return <p className="text-xs text-[#ba1a1a] font-semibold">{loadError}</p>;
  if (!catalog) return <p className="text-xs text-[#76777d]">Loading vehicle catalog…</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* Step 1: category */}
      <div>
        <span className="text-xs font-semibold text-[#0b1c30] block mb-1">Vehicle Category *</span>
        <div className="grid grid-cols-3 gap-2">
          {catalog.categories.map((c) => {
            const active = value.category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => set({ category: c.key, brand: "", model: "", customMake: "", customModel: "" })}
                className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? "bg-[#131b2e] text-white border-[#131b2e]"
                    : "bg-white text-[#0b1c30] border-[#d3e4fe] hover:bg-[#eff4ff]"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{CATEGORY_ICON[c.key]}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: brand + model from catalog, or Other */}
      {value.category && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#0b1c30]">
            Brand *
            <select
              value={value.brand}
              onChange={(e) => set({ brand: e.target.value, model: "", customMake: "", customModel: "" })}
              className={`${inputCls} mt-1`}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value={OTHER}>Other (not listed)</option>
            </select>
          </label>

          {!otherBrand && (
            <label className="text-xs font-semibold text-[#0b1c30]">
              Model *
              <select
                value={value.model}
                disabled={!value.brand}
                onChange={(e) => set({ model: e.target.value, customModel: "" })}
                className={`${inputCls} mt-1 disabled:opacity-60`}
              >
                <option value="">Select model</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value={OTHER}>Other (not listed)</option>
              </select>
            </label>
          )}

          {otherBrand && (
            <label className="text-xs font-semibold text-[#0b1c30]">
              Brand name *
              <input
                value={value.customMake}
                onChange={(e) => set({ customMake: e.target.value })}
                placeholder="Type the brand"
                maxLength={60}
                className={`${inputCls} mt-1`}
              />
            </label>
          )}

          {otherModel && (
            <label className="text-xs font-semibold text-[#0b1c30] sm:col-span-2">
              Model name *
              <input
                value={value.customModel}
                onChange={(e) => set({ customModel: e.target.value })}
                placeholder="Type the model"
                maxLength={60}
                className={`${inputCls} mt-1`}
              />
            </label>
          )}
        </div>
      )}

      {/* Step 3: identification */}
      {value.category && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#0b1c30]">
            Registration Number *
            <input
              value={value.registration}
              onChange={(e) => set({ registration: e.target.value.toUpperCase() })}
              placeholder="TN 01 AB 1234"
              maxLength={20}
              className={`${inputCls} mt-1 uppercase`}
            />
          </label>
          <label className="text-xs font-semibold text-[#0b1c30]">
            Manufacturing Year *
            <input
              type="number"
              inputMode="numeric"
              min={1980}
              max={new Date().getFullYear() + 1}
              value={value.year}
              onChange={(e) => set({ year: e.target.value })}
              placeholder={String(new Date().getFullYear())}
              className={`${inputCls} mt-1`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
