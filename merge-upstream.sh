#!/bin/bash
set -e

UPSTREAM_BRANCH="${1:-upstream2/main}"

echo "正在從 $UPSTREAM_BRANCH 進行完整合併（採用上游優先策略）..."
git merge "$UPSTREAM_BRANCH" -X theirs --no-commit || true

echo
echo "正在全面替換倉庫內的專案名稱、GitHub URL、Raw URL 與 GHCR Image..."
echo

python3 -c '
import os
import re

# ============================================================
# 一般字面字串替換
# ============================================================

replacements = [

    # --------------------------------------------------------
    # Raw GitHub 完整 URL
    # --------------------------------------------------------

    (
        "raw.githubusercontent.com/nuomiiiii/Lite-agent/main",
        "raw.githubusercontent.com/raymao96/komari-agent/github-nuomiiiii",
    ),

    (
        "raw.githubusercontent.com/nuomiiiii/lite-agent/main",
        "raw.githubusercontent.com/raymao96/komari-agent/github-nuomiiiii",
    ),

    (
        "raw.githubusercontent.com/nuomiiiii/Lite/main",
        "raw.githubusercontent.com/raymao96/komari/github-nuomiiiii",
    ),

    (
        "raw.githubusercontent.com/nuomiiiii/lite/main",
        "raw.githubusercontent.com/raymao96/komari/github-nuomiiiii",
    ),

    # --------------------------------------------------------
    # 帶前導 / 的 Raw GitHub URL
    # --------------------------------------------------------

    (
        "/raw.githubusercontent.com/nuomiiiii/Lite-agent",
        "/raw.githubusercontent.com/raymao96/komari-agent",
    ),

    (
        "/raw.githubusercontent.com/nuomiiiii/lite-agent",
        "/raw.githubusercontent.com/raymao96/komari-agent",
    ),

    (
        "/raw.githubusercontent.com/nuomiiiii/Lite",
        "/raw.githubusercontent.com/raymao96/komari",
    ),

    (
        "/raw.githubusercontent.com/nuomiiiii/lite",
        "/raw.githubusercontent.com/raymao96/komari",
    ),

    # --------------------------------------------------------
    # GitHub URL
    # --------------------------------------------------------

    (
        "github.com/nuomiiiii/Lite-agent",
        "github.com/raymao96/komari-agent",
    ),

    (
        "github.com/nuomiiiii/lite-agent",
        "github.com/raymao96/komari-agent",
    ),

    (
        "github.com/nuomiiiii/Lite",
        "github.com/raymao96/komari",
    ),

    (
        "github.com/nuomiiiii/lite",
        "github.com/raymao96/komari",
    ),

    # --------------------------------------------------------
    # 帶前導 / 的 GitHub URL
    # --------------------------------------------------------

    (
        "/github.com/nuomiiiii/Lite-agent",
        "/github.com/raymao96/komari-agent",
    ),

    (
        "/github.com/nuomiiiii/lite-agent",
        "/github.com/raymao96/komari-agent",
    ),

    (
        "/github.com/nuomiiiii/Lite",
        "/github.com/raymao96/komari",
    ),

    (
        "/github.com/nuomiiiii/lite",
        "/github.com/raymao96/komari",
    ),

    # --------------------------------------------------------
    # GHCR Docker Image
    # --------------------------------------------------------

    (
        "ghcr.io/nuomiiiii/Lite-agent",
        "ghcr.io/raymao96/komari-agent",
    ),

    (
        "ghcr.io/nuomiiiii/lite-agent",
        "ghcr.io/raymao96/komari-agent",
    ),

    (
        "ghcr.io/nuomiiiii/Lite",
        "ghcr.io/raymao96/komari",
    ),

    (
        "ghcr.io/nuomiiiii/lite",
        "ghcr.io/raymao96/komari",
    ),

    # --------------------------------------------------------
    # Repository 名稱
    # --------------------------------------------------------

    (
        "nuomiiiii/Lite-agent",
        "raymao96/komari-agent",
    ),

    (
        "nuomiiiii/lite-agent",
        "raymao96/komari-agent",
    ),

    (
        "nuomiiiii/Lite",
        "raymao96/komari",
    ),

    (
        "nuomiiiii/lite",
        "raymao96/komari",
    ),
]


# ============================================================
# 處理變數插值型 Raw GitHub URL
# ============================================================

raw_url_main_pattern = re.compile(
    r"(https?://raw\.githubusercontent\.com/[^\s\"`]+?)/main/"
)


changed_files = 0
replacement_count = 0

for root, dirs, files in os.walk("."):

    if ".git" in dirs:
        dirs.remove(".git")

    if "merge-upstream.sh" in files:
        files.remove("merge-upstream.sh")

    for file in files:
        filepath = os.path.join(root, file)
        normalized_path = filepath.replace(os.sep, "/")

        try:
            with open(
                filepath,
                "r",
                encoding="utf-8",
                errors="ignore"
            ) as f:
                content = f.read()

        except Exception:
            continue

        new_content = content
        file_replacements = 0

        # ----------------------------------------------------
        # 專屬替換：僅在 src/theme/brand.ts 中將 "轻量.Lite" 換成 "Lite"
        # ----------------------------------------------------

        if normalized_path.endswith("src/theme/brand.ts"):
            count = new_content.count("轻量.Lite")
            if count:
                new_content = new_content.replace("轻量.Lite", "Lite")
                file_replacements += count

        # ----------------------------------------------------
        # 一般字面字串替換
        # ----------------------------------------------------

        for old, new in replacements:
            count = new_content.count(old)

            if count:
                new_content = new_content.replace(old, new)
                file_replacements += count

        # ----------------------------------------------------
        # Raw GitHub URL 中的 /main/
        # ----------------------------------------------------

        new_content, count = raw_url_main_pattern.subn(
            r"\1/github-nuomiiiii/",
            new_content
        )

        file_replacements += count

        # ----------------------------------------------------
        # 沒有變更就跳過
        # ----------------------------------------------------

        if new_content == content:
            continue

        try:
            with open(
                filepath,
                "w",
                encoding="utf-8"
            ) as f:
                f.write(new_content)

            changed_files += 1
            replacement_count += file_replacements

            print(
                f"已修改: {filepath} "
                f"({file_replacements} 處替換)"
            )

        except Exception:
            pass


print()
print("========================================")
print("全域替換完成")
print("========================================")
print(f"修改檔案數：{changed_files}")
print(f"替換總次數：{replacement_count}")
print("========================================")
'

# ============================================================
# 加入 Git 暫存區
# ============================================================

git add -A

echo
echo "========================================"
echo "合併與全域路徑替換完成！"
echo "========================================"