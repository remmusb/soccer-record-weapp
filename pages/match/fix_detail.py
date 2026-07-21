f = open(r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/pages/match/detail.vue', 'r', encoding='utf-8')
content = f.read()
f.close()

parts = content.splitlines(keepends=True)
# Remove the duplicate old block at lines 497-527 (0-indexed: 496-526)
if len(parts) > 527:
    parts = parts[:496] + parts[527:]
    content = ''.join(parts)
    f = open(r'C:/Users/zhaozw/Documents/kimi/workspace/soccer-record-weapp/pages/match/detail.vue', 'w', encoding='utf-8')
    f.write(content)
    f.close()
    print('Removed lines 497-527, new line count:', len(parts))
else:
    print('File too short, no change')
