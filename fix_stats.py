filepath = r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/cloudfunctions/recalculateStats/index.js'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 删除第66-68行（0-based index 65-67）：旧的 teamAPlayers/teamBPlayers/registeredIds
# 删除第125-132行（0-based index 124-131）：旧的 events 处理代码

# 先找到要删除的行
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 删除旧的重复声明（第66-68行，即包含 "const teamAPlayers = ((m.teamA || {}).players || []).filter(pid => !pid.startsWith('temp_'));" 且没有 typeof 检查的行）
    if i >= 65 and i <= 67 and 'const teamAPlayers = ((m.teamA || {}).players || []).filter(pid => !pid.startsWith' in line:
        i += 1
        continue
    if i >= 65 and i <= 67 and 'const teamBPlayers = ((m.teamB || {}).players || []).filter(pid => !pid.startsWith' in line and 'typeof pid' not in line:
        i += 1
        continue
    if i == 67 and 'const registeredIds = [...new Set([...teamAPlayers, ...teamBPlayers])];' in line:
        # 检查上一行是否是旧的 teamBPlayers
        if i > 0 and 'const teamBPlayers = ((m.teamB || {}).players || []).filter(pid => !pid.startsWith' in lines[i-1] and 'typeof pid' not in lines[i-1]:
            i += 1
            continue
    
    # 删除旧的 events 处理代码（第125-132行）
    # 这些行在 "}" 之后，且包含旧的 "if (!statsMap[e.playerId]) continue;" 格式
    if i >= 124 and i <= 131:
        # 检查这一行是否是旧的 events 代码（在 for 循环大括号关闭之后）
        stripped = line.strip()
        if stripped.startswith('if (!statsMap[e.playerId])') or \
           stripped.startswith("if (e.type === 'goal')") or \
           stripped.startswith("if (e.type === 'assist')") or \
           stripped.startswith("if (e.type === 'yellow')") or \
           stripped.startswith("if (e.type === 'red')") or \
           stripped.startswith("if (e.type === 'own_goal')") or \
           stripped.startswith("if (e.type === 'penalty')") or \
           stripped == '}':
            # 检查是否在大括号关闭之后
            if i > 0 and lines[i-1].strip() == '}':
                i += 1
                continue
            # 或者检查这行是否缩进不对（旧的代码缩进是8空格，新的是6空格）
            if line.startswith('        if') and i > 124:
                i += 1
                continue
    
    new_lines.append(line)
    i += 1

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'原文件 {len(lines)} 行，删除后 {len(new_lines)} 行')
print('Done')
