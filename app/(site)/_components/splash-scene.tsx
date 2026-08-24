import type { CSSProperties } from "react";

const delay = (value: string) => ({ "--sc-delay": value }) as CSSProperties;

/**
 * The splash scene.
 *
 * A sunrise, not a sunset. Three strands come in from the edges and converge
 * into the light, which is the same idea the rest of the page draws, told once
 * at full scale before a single word of explanation.
 */
export function SplashScene() {
  return (
    <svg
      className="sc-splash-scene"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070b20" />
          <stop offset="28%" stopColor="#131d42" />
          <stop offset="52%" stopColor="#372c5e" />
          <stop offset="66%" stopColor="#7a3d5b" />
          <stop offset="75%" stopColor="#c26a3d" />
          <stop offset="82%" stopColor="#e9a95a" />
        </linearGradient>
        <radialGradient id="sc-sunglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.8" />
          <stop offset="42%" stopColor="#f0a14e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f0a14e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fce7ad" />
          <stop offset="100%" stopColor="#efa54a" />
        </linearGradient>
        <linearGradient id="sc-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#291f47" />
          <stop offset="100%" stopColor="#06091b" />
        </linearGradient>
        <radialGradient id="sc-reflect" cx="50%" cy="0%" r="82%">
          <stop offset="0%" stopColor="#f7cd82" stopOpacity="0.5" />
          <stop offset="52%" stopColor="#f0a94f" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#f0a94f" stopOpacity="0" />
        </radialGradient>
        {/* Everything that belongs to the water stays under the horizon. */}
        <clipPath id="sc-below-horizon">
          <rect x="0" y="700" width="1600" height="900" />
        </clipPath>
      </defs>

      <rect width="1600" height="900" fill="url(#sc-sky)" />
      <ellipse cx="800" cy="700" rx="780" ry="330" fill="url(#sc-sunglow)" />

      <g className="sc-splash-arcs" fill="none" stroke="#f6d9a4" strokeWidth="1">
        <path d="M 578 700 A 222 222 0 0 1 1022 700" opacity="0.26" />
        <path d="M 532 700 A 268 268 0 0 1 1068 700" opacity="0.22" />
        <path d="M 482 700 A 318 318 0 0 1 1118 700" opacity="0.18" />
        <path d="M 428 700 A 372 372 0 0 1 1172 700" opacity="0.14" />
        <path d="M 370 700 A 430 430 0 0 1 1230 700" opacity="0.10" />
      </g>

      <circle cx="800" cy="700" r="176" fill="url(#sc-sun)" />

      <g className="sc-splash-threads" fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path className="sc-draw" pathLength={1} style={delay("0.15s")} stroke="#8fb6d8" d="M -40 232 C 300 232, 600 430, 800 700" />
        <path className="sc-draw" pathLength={1} style={delay("0.3s")} stroke="#84c4a6" d="M -40 498 C 260 498, 560 630, 800 700" />
        <path className="sc-draw" pathLength={1} style={delay("0.45s")} stroke="#f0c477" d="M 1640 232 C 1300 232, 1000 430, 800 700" />
        <path className="sc-draw" pathLength={1} style={delay("0.6s")} stroke="#f0c477" d="M 1640 498 C 1340 498, 1040 630, 800 700" />
      </g>

      <path d="M -30 782 L -30 702 L -21 687 L -12 702 L -2 684 L 9 702 L 19 685 L 29 702 L 37 694 L 44 702 L 53 683 L 62 702 L 67 683 L 73 702 L 80 688 L 86 702 L 95 687 L 103 702 L 109 694 L 116 702 L 126 691 L 136 702 L 142 685 L 148 702 L 154 684 L 160 702 L 166 687 L 172 702 L 182 694 L 191 702 L 198 691 L 204 702 L 214 682 L 224 702 L 234 691 L 244 702 L 253 688 L 262 702 L 272 692 L 282 702 L 293 686 L 303 702 L 310 683 L 317 702 L 323 690 L 329 702 L 335 692 L 340 702 L 349 690 L 357 702 L 366 694 L 375 702 L 381 690 L 388 702 L 396 684 L 404 702 L 412 690 L 419 702 L 425 686 L 431 702 L 436 682 L 441 702 L 451 685 L 461 702 L 470 694 L 479 702 L 488 690 L 496 702 L 501 694 L 507 702 L 517 692 L 527 702 L 537 692 L 546 702 L 556 683 L 566 702 L 573 690 L 581 702 L 590 688 L 599 702 L 608 693 L 618 702 L 627 684 L 637 702 L 647 694 L 658 702 L 665 693 L 672 702 L 682 687 L 692 702 L 702 690 L 712 702 L 719 687 L 726 702 L 732 690 L 738 702 L 744 693 L 750 702 L 761 686 L 771 702 L 777 692 L 782 702 L 790 682 L 798 702 L 805 689 L 811 702 L 821 687 L 830 702 L 838 689 L 845 702 L 855 693 L 865 702 L 873 694 L 881 702 L 887 684 L 893 702 L 903 685 L 913 702 L 923 686 L 932 702 L 940 693 L 947 702 L 957 692 L 967 702 L 974 690 L 982 702 L 992 682 L 1001 702 L 1009 682 L 1017 702 L 1026 688 L 1035 702 L 1042 688 L 1048 702 L 1054 689 L 1060 702 L 1071 689 L 1081 702 L 1090 682 L 1098 702 L 1105 688 L 1112 702 L 1119 693 L 1126 702 L 1136 685 L 1145 702 L 1155 690 L 1164 702 L 1173 685 L 1182 702 L 1191 686 L 1200 702 L 1209 690 L 1218 702 L 1226 691 L 1234 702 L 1243 685 L 1252 702 L 1262 690 L 1272 702 L 1280 686 L 1289 702 L 1297 694 L 1305 702 L 1314 691 L 1322 702 L 1332 688 L 1342 702 L 1351 686 L 1360 702 L 1369 690 L 1378 702 L 1387 685 L 1397 702 L 1407 690 L 1416 702 L 1425 684 L 1434 702 L 1444 682 L 1454 702 L 1463 688 L 1471 702 L 1480 692 L 1490 702 L 1498 683 L 1505 702 L 1514 686 L 1523 702 L 1530 685 L 1536 702 L 1544 685 L 1552 702 L 1560 686 L 1567 702 L 1577 687 L 1586 702 L 1595 686 L 1604 702 L 1610 694 L 1616 702 L 1625 689 L 1633 702 L 1642 691 L 1651 702 L 1657 686 L 1662 702 L 1662 782 Z" fill="#221b3c" opacity="0.55" />
      <path d="M -30 787 L -30 707 L -20 684 L -10 707 L -1 692 L 8 707 L 18 687 L 27 707 L 35 689 L 44 707 L 55 684 L 66 707 L 79 681 L 92 707 L 107 688 L 122 707 L 133 693 L 145 707 L 156 687 L 167 707 L 182 691 L 197 707 L 205 686 L 214 707 L 222 681 L 231 707 L 242 682 L 253 707 L 269 681 L 284 707 L 296 677 L 307 707 L 320 677 L 334 707 L 343 686 L 352 707 L 365 681 L 377 707 L 393 674 L 409 707 L 420 681 L 431 707 L 439 675 L 447 707 L 459 691 L 472 707 L 481 681 L 490 707 L 506 680 L 521 707 L 532 685 L 544 707 L 554 688 L 565 707 L 576 674 L 587 707 L 602 674 L 618 707 L 628 681 L 638 707 L 650 673 L 662 707 L 673 685 L 683 707 L 695 673 L 707 707 L 719 687 L 731 707 L 744 691 L 757 707 L 768 684 L 778 707 L 793 677 L 807 707 L 820 693 L 832 707 L 848 688 L 863 707 L 873 677 L 883 707 L 893 688 L 902 707 L 912 673 L 923 707 L 935 681 L 946 707 L 959 680 L 972 707 L 981 678 L 990 707 L 1001 678 L 1011 707 L 1022 682 L 1033 707 L 1045 687 L 1057 707 L 1068 684 L 1079 707 L 1092 678 L 1105 707 L 1115 692 L 1125 707 L 1140 684 L 1156 707 L 1168 675 L 1181 707 L 1195 693 L 1209 707 L 1222 684 L 1235 707 L 1248 679 L 1261 707 L 1276 683 L 1292 707 L 1303 685 L 1314 707 L 1324 676 L 1334 707 L 1348 687 L 1363 707 L 1378 692 L 1393 707 L 1404 679 L 1416 707 L 1430 687 L 1444 707 L 1453 675 L 1463 707 L 1475 683 L 1488 707 L 1498 683 L 1509 707 L 1522 690 L 1535 707 L 1543 677 L 1552 707 L 1566 688 L 1581 707 L 1594 677 L 1608 707 L 1622 692 L 1636 707 L 1652 673 L 1668 707 L 1668 787 Z" fill="#130e29" opacity="0.82" />

      <g clipPath="url(#sc-below-horizon)">
        <rect x="0" y="700" width="1600" height="200" fill="url(#sc-water)" />
        <ellipse cx="800" cy="700" rx="172" ry="205" fill="url(#sc-reflect)" />
        <g className="sc-splash-ripples" fill="none" stroke="#f7dfb2" strokeWidth="1.4" strokeLinecap="round">
          <path d="M 670 742 Q 800 734, 930 742" opacity="0.24" />
          <path d="M 632 778 Q 800 770, 968 778" opacity="0.20" />
          <path d="M 595 820 Q 800 812, 1005 820" opacity="0.15" />
          <path d="M 560 868 Q 800 860, 1040 868" opacity="0.10" />
        </g>
      </g>
    </svg>
  );
}
