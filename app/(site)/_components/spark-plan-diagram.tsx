import type { CSSProperties } from "react";

const delay = (value: string) => ({ "--sc-delay": value }) as CSSProperties;

/**
 * Spark to confirmed plan.
 *
 * Loose ideas on the left pass through a single approval point and land as an
 * ordered schedule on the right. Same line language as the Stewardship Capital
 * homepage, applied to what this product actually does.
 */
export function SparkToPlanDiagram() {
  return (
    <svg
      className="sc-spark-plan"
      viewBox="0 0 900 600"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Scattered ideas on the left pass through a single approval point and become an ordered four day schedule on the right."
    >
      <defs>
        <radialGradient id="sc-waist-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d6a44a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d6a44a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="430" cy="300" r="150" fill="url(#sc-waist-glow)" />

      <g className="sc-sp-lines" fill="none" strokeLinecap="round" strokeWidth="1">
        <path className="sc-draw" pathLength={1} style={delay("0.72s")} d="M 430.0 300.0 C 490.0 300.0, 500.0 300.0, 586.0 74" />
        <path className="sc-draw" pathLength={1} style={delay("0.79s")} d="M 430.0 300.0 C 490.0 300.0, 616.0 300.0, 702.0 74" />
        <path className="sc-draw" pathLength={1} style={delay("0.86s")} d="M 430.0 300.0 C 490.0 300.0, 732.0 300.0, 818.0 74" />
        <path className="sc-draw" pathLength={1} style={delay("0.93s")} d="M 430.0 300.0 C 490.0 300.0, 848.0 300.0, 934.0 74" />
      </g>

      <g className="sc-sp-lines sc-sp-lines-in" fill="none" strokeLinecap="round" strokeWidth="1">
        <path className="sc-draw" pathLength={1} style={delay("0.00s")} d="M 131.1 168.6 C 251.1 168.6, 320.0 276.3, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.05s")} d="M 59.0 464.3 C 179.0 464.3, 320.0 329.6, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.10s")} d="M 213.6 530.0 C 333.6 530.0, 320.0 341.4, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.15s")} d="M 86.9 300.0 C 206.9 300.0, 320.0 300.0, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.20s")} d="M 239.0 431.4 C 359.0 431.4, 320.0 323.7, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.25s")} d="M 123.3 201.4 C 243.3 201.4, 320.0 282.3, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.30s")} d="M 49.8 497.1 C 169.8 497.1, 320.0 335.5, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.35s")} d="M 100.8 365.7 C 220.8 365.7, 320.0 311.8, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.40s")} d="M 64.7 332.9 C 184.7 332.9, 320.0 305.9, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.45s")} d="M 211.4 102.9 C 331.4 102.9, 320.0 264.5, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.50s")} d="M 162.1 70.0 C 282.1 70.0, 320.0 258.6, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.55s")} d="M 118.2 398.6 C 238.2 398.6, 320.0 317.7, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.60s")} d="M 53.2 267.1 C 173.2 267.1, 320.0 294.1, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.65s")} d="M 83.3 135.7 C 203.3 135.7, 320.0 270.4, 430.0 300.0" />
        <path className="sc-draw" pathLength={1} style={delay("0.70s")} d="M 129.8 234.3 C 249.8 234.3, 320.0 288.2, 430.0 300.0" />
      </g>

      <g className="sc-sp-sparks">
        <circle className="sc-node" style={delay("0.00s")} cx="131.1" cy="168.6" r="2.6" />
        <circle className="sc-node" style={delay("0.04s")} cx="59.0" cy="464.3" r="3.3" />
        <circle className="sc-node" style={delay("0.08s")} cx="213.6" cy="530.0" r="2.7" />
        <circle className="sc-node" style={delay("0.12s")} cx="86.9" cy="300.0" r="3.8" />
        <circle className="sc-node" style={delay("0.16s")} cx="239.0" cy="431.4" r="3.7" />
        <circle className="sc-node" style={delay("0.20s")} cx="123.3" cy="201.4" r="4.5" />
        <circle className="sc-node" style={delay("0.24s")} cx="49.8" cy="497.1" r="4.3" />
        <circle className="sc-node" style={delay("0.28s")} cx="100.8" cy="365.7" r="2.7" />
        <circle className="sc-node" style={delay("0.32s")} cx="64.7" cy="332.9" r="3.1" />
        <circle className="sc-node" style={delay("0.36s")} cx="211.4" cy="102.9" r="2.8" />
        <circle className="sc-node" style={delay("0.40s")} cx="162.1" cy="70.0" r="3.8" />
        <circle className="sc-node" style={delay("0.44s")} cx="118.2" cy="398.6" r="3.6" />
        <circle className="sc-node" style={delay("0.48s")} cx="53.2" cy="267.1" r="2.5" />
        <circle className="sc-node" style={delay("0.52s")} cx="83.3" cy="135.7" r="3.9" />
        <circle className="sc-node" style={delay("0.56s")} cx="129.8" cy="234.3" r="3.1" />
      </g>

      <circle className="sc-sp-gate" cx="430" cy="300" r="9" />

      <g className="sc-sp-bars">
        <rect className="sc-node" style={delay("0.95s")} x="540.0" y="96.0" width="92.0" height="30.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("0.98s")} x="540.0" y="164.0" width="92.0" height="42.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.02s")} x="540.0" y="232.0" width="92.0" height="54.0" rx="4" data-state="draft" />
        <rect className="sc-node" style={delay("1.05s")} x="540.0" y="300.0" width="92.0" height="30.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.09s")} x="540.0" y="368.0" width="92.0" height="42.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.12s")} x="656.0" y="104.0" width="92.0" height="30.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.16s")} x="656.0" y="172.0" width="92.0" height="42.0" rx="4" data-state="draft" />
        <rect className="sc-node" style={delay("1.20s")} x="656.0" y="240.0" width="92.0" height="54.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.23s")} x="656.0" y="308.0" width="92.0" height="30.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.27s")} x="656.0" y="376.0" width="92.0" height="42.0" rx="4" data-state="draft" />
        <rect className="sc-node" style={delay("1.30s")} x="656.0" y="444.0" width="92.0" height="54.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.33s")} x="772.0" y="96.0" width="92.0" height="30.0" rx="4" data-state="draft" />
        <rect className="sc-node" style={delay("1.37s")} x="772.0" y="164.0" width="92.0" height="42.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.41s")} x="772.0" y="232.0" width="92.0" height="54.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.44s")} x="772.0" y="300.0" width="92.0" height="30.0" rx="4" data-state="draft" />
        <rect className="sc-node" style={delay("1.48s")} x="772.0" y="368.0" width="92.0" height="42.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.51s")} x="772.0" y="436.0" width="92.0" height="54.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.54s")} x="888.0" y="104.0" width="92.0" height="30.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.58s")} x="888.0" y="172.0" width="92.0" height="42.0" rx="4" data-state="confirmed" />
        <rect className="sc-node" style={delay("1.61s")} x="888.0" y="240.0" width="92.0" height="54.0" rx="4" data-state="draft" />
        <rect className="sc-node" style={delay("1.65s")} x="888.0" y="308.0" width="92.0" height="30.0" rx="4" data-state="confirmed" />
      </g>
    </svg>
  );
}
