filepath = r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/pages/stats/index.vue'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到正确的 pattern 并清理重复
# 目标：保留第一个 "this.completedMatches = completedMatches;" + "// 实时计算进球和助攻" + "const goalMap = {};" + "const assistMap = {};"
# 删除后面的所有重复

new_lines = []
i = 0
found_first_block = False
while i < len(lines):
    line = lines[i]
    
    # 检测 "this.completedMatches = completedMatches;" 后面跟着重复块的情况
    if 'this.completedMatches = completedMatches;' in line and not found_first_block:
        new_lines.append(line)
        found_first_block = True
        i += 1
        continue
    
    # 如果已经找到了第一个 block，跳过所有重复的内容
    if found_first_block:
        stripped = line.strip()
        # 跳过重复的注释、变量声明、和 matchesRes.data 赋值
        if stripped == '// 实时计算进球和助攻':
            # 检查下一行是否是重复声明
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # 如果已经添加过 goalMap，则跳过这个块
                if 'const goalMap' in next_line and any('const goalMap = {};' in l for l in new_lines):
                    # 跳过这个注释和后续可能的重复代码
                    i += 1
                    # 继续跳过空行和重复声明
                    while i < len(lines):
                        sl = lines[i].strip()
                        if sl == '' or sl.startswith('//') or sl.startswith('const goalMap') or sl.startswith('const assistMap') or 'matchesRes.data' in sl:
                            i += 1
                            continue
                        break
                    continue
        
        # 跳过 matchesRes.data 赋值
        if 'matchesRes.data' in stripped:
            i += 1
            continue
    
    new_lines.append(line)
    i += 1

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'原文件 {len(lines)} 行，清理后 {len(new_lines)} 行')

# 验证第240-260行
for i in range(239, min(260, len(new_lines))):
    print(f"{i+1:3d}: {new_lines[i]}", end='')
