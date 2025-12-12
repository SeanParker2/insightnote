import { PostDetail, Profile } from '@/types';

export const mockUser: Profile = {
  id: "user-1",
  email: "demo@example.com",
  subscription_status: "free",
  subscription_end_date: null,
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockProUser: Profile = {
  ...mockUser,
  id: "user-2",
  subscription_status: "pro",
  subscription_end_date: new Date("2025-12-31"),
};

export const mockPostDetail: PostDetail = {
  id: "post-1",
  slug: "great-rotation-tech-utilities",
  title: "The Great Rotation: Capital Flow Reversal from Tech to Utilities",
  summary_tldr: "Hyperscalers (Microsoft, Amazon) are facing a hard constraint on power availability. The bottleneck has moved from GPU supply to PDU (Power Distribution Unit) capacity. Unregulated Independent Power Producers (IPPs) with nuclear assets are trading at 15x PE, while pricing power is increasing dramatically.",
  content_mdx: `
For the past 18 months, the market's obsession has been singular: **Chips**. But as every engineer knows, chips generate heat, and chips need power.

## 1. The Physics of AI Economics

Goldman's data is startling: A ChatGPT query consumes 10x the electricity of a Google search. With AI inference scaling up, US data center power demand is projected to grow 160% by 2030.

> "Electricity is the new compute." — Why the AI narrative is shifting from chips to power plants.

This creates a classic supply squeeze. Unlike building a server rack (6 months), building a transmission line takes 5-7 years in the US due to permitting.

## 2. Nuclear: The Base Load Premium

Solar and wind are intermittent. AI training runs cannot stop when the sun sets. This puts a massive premium on **Baseload Power**.

The hyperscalers are realizing that their growth is capped not by Nvidia H100 availability, but by the ability to plug them into the grid.

### Key Metrics to Watch
- **PUE (Power Usage Effectiveness)**: Lower is better.
- **Grid Connection Queue**: Currently averaging 4 years in PJM interconnection.
- **Nuclear Regulatory Commission (NRC)**: Approval timelines for SMRs (Small Modular Reactors).

## 3. Valuation Disconnect

While tech multiples have expanded to >30x forward earnings, the utility sector has largely remained dormant until recently. The "AI Utility" trade is just beginning to be priced in.

| Ticker | Company | P/E Ratio | Dividend Yield | Nuclear Exposure |
|:-------|:--------|:----------|:---------------|:-----------------|
| VST    | Vistra  | 15.2x     | 1.2%           | High             |
| CEG    | Constellation | 22.4x | 0.8%       | Very High        |
| ETN    | Eaton   | 28.1x     | 1.5%           | Medium (Equipment)|

*Data as of Dec 10, 2025*
  `,
  is_premium: true,
  published_at: new Date("2025-12-10"),
  source_institution: "Goldman Sachs GIR",
  source_date: new Date("2025-12-10"),
  tags: ["Utilities", "AI Infrastructure", "Nuclear"],
  created_at: new Date(),
  updated_at: new Date(),
  butterfly_nodes: [
    {
      id: "node-1",
      post_id: "post-1",
      label: "AI Compute Demand",
      type: "root",
      parent_id: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: "node-2",
      post_id: "post-1",
      label: "Power Shortage",
      type: "event",
      parent_id: "node-1",
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: "node-3",
      post_id: "post-1",
      label: "Nuclear Premium",
      type: "impact",
      parent_id: "node-2",
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: "node-4",
      post_id: "post-1",
      label: "VST (Vistra)",
      type: "ticker",
      parent_id: "node-3",
      created_at: new Date(),
      updated_at: new Date()
    }
  ]
};
