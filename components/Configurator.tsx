"use client";

import { useMemo, useState } from "react";
import {
  fmtPrice,
  unitPriceCents,
  type CatalogItem,
  type SelectedOptions,
} from "@/lib/catalog";
import { useCart } from "@/lib/cart";

function OptionRow<T extends string | number>({
  label,
  values,
  selected,
  onSelect,
  hint,
}: {
  label: string;
  values: T[];
  selected: T;
  onSelect: (v: T) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-bold">{label}</span>
        {hint && <span className="text-xs text-black/40">{hint}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={String(v)}
            onClick={() => onSelect(v)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              selected === v
                ? "border-ink bg-ink text-paper"
                : "border-black/20 bg-white hover:border-ink"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Configurator({ item }: { item: CatalogItem }) {
  const { add } = useCart();
  const o = item.options!;
  const d = o.defaults ?? {};
  const [flex, setFlex] = useState(
    d.flex && o.flex.includes(d.flex) ? d.flex : o.flex[Math.floor(o.flex.length / 2)]
  );
  const [curve, setCurve] = useState(d.curve && o.curve.includes(d.curve) ? d.curve : o.curve[0]);
  const [hand, setHand] = useState(d.hand && o.hand.includes(d.hand) ? d.hand : o.hand[0]);
  const [color, setColor] = useState(
    d.color && o.colors.includes(d.color) ? d.color : o.colors[0]
  );
  const [length, setLength] = useState(
    o.length ? (d.length && o.length.includes(d.length) ? d.length : o.length[0]) : undefined
  );
  const [customName, setCustomName] = useState("");
  const [paddleSize, setPaddleSize] = useState(
    o.paddleSize
      ? d.paddleSize && o.paddleSize.includes(d.paddleSize)
        ? d.paddleSize
        : o.paddleSize[Math.floor(o.paddleSize.length / 2)]
      : undefined
  );
  const [added, setAdded] = useState(false);

  const sel: SelectedOptions = useMemo(
    () => ({
      flex: String(flex),
      curve,
      hand,
      color,
      length: o.length ? length : undefined,
      customName: customName.trim() || undefined,
      paddleSize: o.paddleSize ? paddleSize : undefined,
    }),
    [flex, curve, hand, color, length, customName, paddleSize, o.paddleSize, o.length]
  );

  const price = unitPriceCents(item, sel);

  const onAdd = () => {
    add(item, sel);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="space-y-6">
      <OptionRow label="Flex" values={o.flex} selected={flex} onSelect={setFlex} hint="Rule of thumb: half your body weight (lbs)" />
      <OptionRow label="Curve" values={o.curve} selected={curve} onSelect={setCurve} hint={o.curve.length > 1 ? "P92 = most popular all-rounder" : undefined} />
      <OptionRow label="Hand" values={o.hand} selected={hand} onSelect={setHand} />
      {o.length && length && (
        <OptionRow
          label="Length"
          values={o.length}
          selected={length}
          onSelect={setLength}
          hint="Uncut shaft length"
        />
      )}
      {o.paddleSize && paddleSize && (
        <OptionRow
          label="Paddle Size"
          values={o.paddleSize}
          selected={paddleSize}
          onSelect={setPaddleSize}
        />
      )}
      <OptionRow
        label="Color"
        values={o.colors}
        selected={color}
        onSelect={setColor}
        hint={`${o.colors[0]} standard · others +${fmtPrice(o.colorUpchargeCents)}`}
      />
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-bold">Name on shaft (optional)</span>
          <span className="text-xs text-black/40">+{fmtPrice(o.nameUpchargeCents)} · max 20 chars</span>
        </div>
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value.slice(0, 20))}
          placeholder="e.g. GRETZKY 99"
          className="mt-2 w-full rounded-lg border border-black/20 px-3 py-2 font-semibold uppercase tracking-wide"
        />
      </div>

      <div className="flex items-center justify-between border-t border-black/10 pt-5">
        <div>
          <div className="text-3xl font-black">{fmtPrice(price)}</div>
          <div className="text-xs text-black/50">Local STL pickup · no shipping</div>
        </div>
        <button
          onClick={onAdd}
          className={`rounded-full px-8 py-3 font-bold transition ${
            added ? "bg-volt text-ink" : "bg-ink text-paper hover:bg-ink/80"
          }`}
        >
          {added ? "Added to Cart ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
