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
  { cause: "美联储降息", effect: "小盘股走强" },
  { cause: "油价飙升", effect: "航空股承压" },
];

export const editorPicks: EditorPick[] = [
  { category: "加密", title: "以太坊 Layer 2 经济学为何失灵", url: "#" },
  { category: "中国", title: "消费必需品的结构性转变", url: "#" },
];
