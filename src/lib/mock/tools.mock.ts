export interface ButterflyEffect {
  cause: string;
  effect: string;
}

export interface EditorPick {
  category: string;
  title: string;
  url: string;
}

export const butterflyEffects: ButterflyEffect[] = [
  { cause: "Fed Rate Cut", effect: "Small Caps" },
  { cause: "Oil Spike", effect: "Airlines Drop" },
];

export const editorPicks: EditorPick[] = [
  { category: "Crypto", title: "Why Ethereum's Layer 2 Economics are Failing", url: "#" },
  { category: "China", title: "The Structural Shift in Consumer Staples", url: "#" },
];
