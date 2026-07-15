#!/bin/bash
# 野球记录项目自动备份脚本
# 用法: 双击运行或在 Git Bash 中执行 ./backup.sh

cd "$(dirname "$0")"

echo "========================================"
echo "🚀 开始备份 soccer-record-weapp"
echo "========================================"
echo ""

# 检查是否有改动
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ 无未提交改动，无需备份"
    echo ""
    echo "========================================"
    echo "备份完成（无改动）"
    echo "========================================"
    read -p "按回车键退出..."
    exit 0
fi

echo "📦 发现未提交改动，开始备份..."
echo ""

# 显示改动的文件
echo "📋 改动的文件:"
git status --short
echo ""

# 添加所有改动
echo "➕ 添加文件到暂存区..."
git add -A

# 提交（使用当前日期时间作为提交信息）
COMMIT_MSG="auto backup: $(date '+%Y-%m-%d %H:%M:%S')"
echo "💾 提交: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# 推送到 GitHub
echo "☁️  推送到 GitHub..."
git push origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ 备份成功！"
    echo "📁 仓库: https://github.com/remmusb/soccer-record-weapp"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "❌ 推送失败，请检查网络或 Git 配置"
    echo "========================================"
fi

read -p "按回车键退出..."