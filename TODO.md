# 足球记录小程序改进需求清单

记录日期：2026-06-11

---

## 1. 球员评分权限控制（可选不参与评分）

**需求**：球员注册时增加一个选项，允许选择是否接受其他队友的评分。

- **允许评分**：正常参与队友互评和评分展示，和历史一致
- **不允许评分**：
  - 评分页面（rate.vue）中不显示该球员，队友无法给他打分
  - 所有评分展示（detail.vue 的参赛名单、players/list.vue、stats/index.vue 的评分榜）中不显示该球员
  - 只有管理员可以给他打分（通过管理员评分通道）
  - 该管理员的评分用于 `recalculateStats` 云函数中的自动分队平衡算法，但不展示给其他玩家

**数据库字段**：在 `players` 集合中新增 `allowRating: boolean`（默认 true）

**涉及页面**：
- `pages/players/create.vue` / `pages/players/detail.vue`：新增评分权限开关
- `pages/match/rate.vue`：过滤掉不允许评分的球员
- `pages/match/detail.vue`：评分标签过滤
- `pages/players/list.vue`：历史评分显示过滤
- `pages/stats/index.vue`：评分榜过滤
- `cloudfunctions/recalculateStats/index.js`：分队算法仍然使用管理员评分

---

## 2. 队名显示改为颜色/自定义名称（不再用 A 队/B 队）

**需求**：分队时由管理员或场主手动输入颜色和队名。默认队名按颜色自动命名（如「蓝队」「白队」），如果手动输入了队名则按输入的显示。

**具体场景**：
1. **分队页面（teamSplit.vue）**：分队时显示输入框，让用户选择颜色并输入队名（可选）
2. **创建比赛（create.vue）**：如果分队前创建，同样支持颜色+队名输入
3. **所有显示队名的地方**：
   - 已结束比赛列表（index/index.vue）
   - 比赛详情（detail.vue）
   - 分队结果展示（teamSplit.vue）
   - 赛况记录（detail.vue）
   - 任何涉及 teamA / teamB 的显示，统一用颜色和队名

**数据库字段**：`teamA.name` / `teamB.name` 已存在，但需要确保分队流程中能正确设置。颜色（`teamA.color` / `teamB.color`）也已存在。

**相关函数**：
- `getColorTeamName`（在 index/index.vue 中）：将颜色转换为默认队名（蓝队、白队等），已有实现但需扩展支持所有场景
- 分队逻辑：分队后自动设置默认队名（颜色+队），允许手动修改

**注意**：如果用户已输入了自定义队名，直接使用该队名；如果未输入，调用 `getColorTeamName` 根据颜色自动判断。

---

## 实现优先级

两个功能相互独立，可分别实现。建议先实现需求 2（队名），因为涉及到 UI 展示的统一性，且逻辑相对简单；再实现需求 1（评分权限），因为涉及数据库字段变更和多个页面的条件判断。
