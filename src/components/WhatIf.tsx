import { useState } from 'react';
import type { CurrencyFormat } from '../types';
import { simulate, leanFatTargets, coastFireNumber } from '../analysis/fire';
import { ProjectionChart, type ProjectionLine } from './charts/ProjectionChart';
import { POS, BRAND_BRIGHT } from './charts/common';
import { formatYears, formatPct } from '../lib/format';
import { formatMoney } from '../lib/money';

const LEAN = 'oklch(72% 0.13 195)';
const FAT = 'oklch(80% 0.13 80)';

interface Props {
  currency: CurrencyFormat;
  netWorth: number;
  annualContribution: number;
  annualSpend: number;
  withdrawalRate: number;
  realReturn: number;
  yearsToRetireTarget: number;
}

/** Live what-if: drag the levers, watch the FIRE date move. */
export function WhatIf(props: Props) {
  const [contribution, setContribution] = useState(props.annualContribution);
  const [spend, setSpend] = useState(props.annualSpend);
  const [swr, setSwr] = useState(props.withdrawalRate);
  const [ret, setRet] = useState(props.realReturn);

  const result = simulate({
    netWorth: props.netWorth,
    annualContribution: contribution,
    annualSpend: spend,
    withdrawalRate: swr,
    realReturn: ret,
  });

  // FIRE milestones, recomputed live with the sliders.
  const targets = leanFatTargets(spend, swr);
  const coast = coastFireNumber(spend, swr, ret, props.yearsToRetireTarget);
  const lines: ProjectionLine[] = [
    { value: targets.lean, label: 'Lean', color: LEAN, dash: '3 3' },
    { value: result.fireNumber, label: 'FIRE', color: POS, dash: '5 3' },
    { value: targets.fat, label: 'Fat', color: FAT, dash: '3 3' },
    { value: coast, label: 'Coast', color: BRAND_BRIGHT, dash: '2 4' },
  ];

  const changed =
    contribution !== props.annualContribution ||
    spend !== props.annualSpend ||
    swr !== props.withdrawalRate ||
    ret !== props.realReturn;

  const reset = () => {
    setContribution(props.annualContribution);
    setSpend(props.annualSpend);
    setSwr(props.withdrawalRate);
    setRet(props.realReturn);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="label">Time to FIRE</div>
            <div className="num mt-1 text-3xl font-bold text-[var(--text)]">
              {formatYears(result.yearsToFire)}
            </div>
          </div>
          {changed && (
            <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={reset}>
              Reset
            </button>
          )}
        </div>

        <Slider
          label="Annual savings"
          value={contribution}
          min={0}
          max={Math.max(props.annualContribution * 3, spend, 1000_00)}
          step={1000_00}
          display={formatMoney(contribution, props.currency)}
          onChange={setContribution}
        />
        <Slider
          label="Annual spend"
          value={spend}
          min={1000_00}
          max={Math.max(props.annualSpend * 2, 10000_00)}
          step={1000_00}
          display={formatMoney(spend, props.currency)}
          onChange={setSpend}
        />
        <Slider
          label="Withdrawal rate"
          value={swr}
          min={0.025}
          max={0.06}
          step={0.0025}
          display={formatPct(swr)}
          onChange={setSwr}
        />
        <Slider
          label="Real return"
          value={ret}
          min={0}
          max={0.1}
          step={0.0025}
          display={formatPct(ret)}
          onChange={setRet}
        />

        <div className="text-xs text-[var(--text-dim)]">
          FIRE target:{' '}
          <span className="num font-medium text-[var(--text)]">
            {formatMoney(result.fireNumber, props.currency)}
          </span>
        </div>
      </div>

      <div>
        <ProjectionChart data={result.series} lines={lines} currency={props.currency} height={300} />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-[var(--text-dim)]">{label}</span>
        <span className="num text-sm font-semibold text-[var(--text)]">{display}</span>
      </div>
      <input
        className="aa-range w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
