filepath = r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/pages/players/list.vue'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The correct block should end at line 153 (0-based 152) with "      }\n"
# Lines 154-164 (0-based 153-163) are garbage duplicates
# Keep lines 0-152, then from 164 onward
new_lines = lines[:153] + lines[164:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'原文件 {len(lines)} 行，清理后 {len(new_lines)} 行')

# Verify lines 140-165
for i in range(139, min(165, len(new_lines))):
    print(f"{i+1:3d}: {new_lines[i]}", end='')
