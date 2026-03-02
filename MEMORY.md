# MEMORY.md — Những gì cần làm / đang làm

_Cập nhật: 2026-03-02. Em đọc file này mỗi session (main) để nhớ nhiệm vụ và ngữ cảnh._

---

## Nhiệm vụ định kỳ (recurring)

| Việc | Tần suất | Ghi chú |
|------|----------|--------|
| **Check mention app / Chuong Le** | 8:00 và 20:00 (Asia/Singapore) | Script: `scripts/check-app-mentions.mjs`. Báo cáo ghi vào `memory/mentions-YYYY-MM-DD-HHmm.md`. Cron: `scripts/cron-app-mentions.txt` (anh dán vào crontab nếu cần). |

---

## Project / focus hiện tại

- **Radio Global** — app nghe radio global (radios.global). Đã có báo cáo monetization (ads + subscription) trong `memory/2026-02-28.md`.
- **Landing / web** — có project `projects/landing-radio-global` (em chưa được giao task cụ thể).
- **Apps khác của anh (CDev / Chuong Le):** Led Board, Score Keeper, WealthFy, Skor, … — check mention chung với script trên.

---

## Quy ước đã có

- Nhắc nhở / lịch: tạo crontab + ghi note (đã thống nhất với anh).
- Telegram: group ID `-5157098809` dùng khi gửi ảnh / báo cáo sau khi xong tính năng (TOOLS.md).
- Rule 5 phút (main session): khi làm task dài, sau mỗi batch thay đổi lớn gửi một câu ngắn báo "vẫn đang làm" (HEARTBEAT.md).
- **Windows startup — OpenClaw gateway:** Script `scripts/start-openclaw-gateway.bat` (cd vào `node_modules/openclaw-atom`, chạy `node openclaw.mjs gateway --allow-unconfigured`). Thêm vào Startup: chạy `scripts/add-openclaw-to-startup.ps1` (tạo shortcut trong Startup, chạy minimized).

---

## Đã xong (để tham chiếu)

- **2026-02-28:** Báo cáo app trending + phân tích kiếm tiền cho Radio Global (Statista, trend mobile, ads/subscription/IAP) — xong trong heartbeat 8:28.
