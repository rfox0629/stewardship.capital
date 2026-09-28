import Image from "next/image";

/**
 * A drink, photographed.
 *
 * Each cup is the photograph from that drink's own card, lifted off the paper
 * and stood on a common canvas so a taller head of cream does not make its
 * cup look smaller than the others beside it. The file is the whole picture:
 * the topping, the sleeve and the shadow under the base.
 *
 * The component keeps its name and its shape, so the card and the drink's
 * sheet ask for a cup the way they always did.
 */

const CUPS: Record<string, string> = {
  shine: "/clients/shine/coffee/shine.webp",
  honeycomb: "/clients/shine/coffee/honeycomb.webp",
  northwoods: "/clients/shine/coffee/northwoods.webp",
};

export function CoffeeArt({ art, label }: { art: string; label: string }) {
  const cup = CUPS[art] ?? CUPS.shine;

  return (
    <Image
      className="gd-cup"
      src={cup}
      alt={`${label}, in a 12 ounce paper cup`}
      width={800}
      height={1000}
      sizes="(max-width: 560px) 120px, 180px"
    />
  );
}
