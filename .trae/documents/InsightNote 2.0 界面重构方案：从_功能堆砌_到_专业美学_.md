# InsightNote 2.0 界面与体验重构计划

## 设计理念：**"理性美学 (Rational Aesthetics)"**
我们将结合**专业金融的严谨性**与**现代设计的流动感**。核心关键词：
*   **沉浸 (Immersive)**：通过更深邃的色彩和毛玻璃效果增加视觉深度。
*   **秩序 (Order)**：利用 Bento Grid（便当盒）布局重新组织信息密度。
*   **灵动 (Fluid)**：引入微交互和数据可视化动效，打破金融数据的枯燥感。

---

## 📅 实施路线图

### 第一阶段：设计语言系统升级 (Design System)
**目标**：奠定"简约大气"的基调，替换通用感强的默认样式。
1.  **色彩体系重塑**：
    *   **主色 (Brand)**：将 `Slate-900` 升级为更深邃的 **"Midnight Navy" (午夜深蓝)**，传达信任与深度。
    *   **强调色 (Accent)**：调整金色为 **"Champagne Gold" (香槟金)**，更显精致，用于高亮关键数据。
    *   **背景色**：引入 **"Paper White" (纸白)** 和 **"Soft Gray"**，减少纯白带来的视觉刺眼感。
2.  **排版微调**：
    *   强化 `Playfair Display` 在大标题中的应用，增加字重对比。
    *   优化 `Inter` 在数据表格中的数字等宽显示 (`tabular-nums`)。
3.  **质感升级**：
    *   全局引入 **"Frosted Glass" (磨砂玻璃)** 效果组件类。
    *   定义 **"Soft Shadow" (柔光阴影)** 和 **"Glow Border" (微光边框)**。

### 第二阶段：核心页面布局重构 (Layout Refactoring)
**目标**：打破常规列表布局，提升信息获取效率与视觉愉悦度。
1.  **首页 Hero 区域 (Magazine Style)**：
    *   重构 `FeaturedPost`：改为**全宽沉浸式卡片**。左侧为戏剧性的大标题与摘要，右侧为动态数据图表或配图。
2.  **情报流列表 (Smart Feed)**：
    *   重构 `LatestIntelligence`：抛弃简单的列表，改为 **"Bento Grid" (卡片网格)** 布局。
    *   区分 "深度研报"（大卡片）与 "快讯"（紧凑列表），通过视觉层级区分内容权重。
3.  **侧边栏工具箱 (Interactive Sidebar)**：
    *   **蝴蝶效应图谱**：从静态列表升级为**微型可视化节点图**，鼠标悬停可查看关联影响。
    *   **吸顶设计**：确保侧边栏在滚动时跟随，保持工具随时可用。

### 第三阶段：创意交互与细节 (Creative Interactions)
**目标**：在细节处体现"设计师"的匠心。
1.  **Spotlight Cards**：为文章卡片添加**光标跟随聚光灯效果**，增加科技感。
2.  **动态行情栏**：`MarketTicker` 增加**红绿呼吸灯效**，模拟真实交易室氛围。
3.  **导航栏升级**：设计**自动隐藏/显现**的透明导航栏，阅读时沉浸，上滑时显现。

---

## 🛠 技术执行清单 (Todo List)

1.  **全局样式配置 (`globals.css`)**：
    *   更新 `:root` 变量，定义新的色彩系统 (Navy/Gold/Paper)。
    *   添加 `.glass-panel` 和 `.text-balance` 等工具类。
2.  **组件重构**：
    *   `Header.tsx`: 实现透明模糊背景与极简菜单。
    *   `FeaturedPost.tsx`: 重写为 Hero 风格布局。
    *   `LatestIntelligence.tsx`: 实现 Grid/List 混合布局。
    *   `SidebarTool.tsx`: 视觉美化，增加卡片质感。
3.  **创意特效**：
    *   创建 `SpotlightCard` 包装组件。
    *   优化 `MarketTicker` 动画曲线。
