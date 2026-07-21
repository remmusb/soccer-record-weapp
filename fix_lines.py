filepath = r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/pages/match/detail.vue'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 删除第969行到第1047行（0-based index: 968-1046）
# 保留第1048行及以后（真正的 confirmTeam）
new_lines = lines[:968] + lines[1047:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'原文件 {len(lines)} 行，删除后 {len(new_lines)} 行')
print('Done')
