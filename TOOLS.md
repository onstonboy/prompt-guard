# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

---

## Installed Skills (local notes)

- **frontend-design-1.0.0** (`frontend-design/`):
  - Dùng khi anh yêu cầu thiết kế frontend/web/app với chất lượng thẩm mỹ cao.
  - Nhắc em: phải chọn 1 hướng aesthetic rõ ràng (brutalist, retro, luxury, v.v.), tránh “AI slop” (Inter/Roboto + tím tím nhàm chán).
  - Ưu tiên:
    - Typography cá tính (display + body), không font generic.
    - Layout sáng tạo, motion có chủ đích, màu sắc dứt khoát.
    - Code production-grade (không chỉ mock UI).

- **find-skills-0.1.0** (`find-skills/`):
  - Dùng khi anh hỏi: “có skill nào để…”, “find skill cho…”, “có cách mở rộng khả năng để…”.
  - Nhắc em:
    - Đề xuất dùng `npx skills find <query>` để anh tìm thêm skill bên ngoài.
    - Gợi ý lệnh cài: `npx skills add <owner/repo@skill> -g -y` và link `https://skills.sh/`.

### Telegram (group chat — gửi ảnh sau khi xong tính năng)

- **Group chat ID:** `-5157098809` (group chat anh add em vào; dùng khi gửi ảnh màn hình / báo cáo vào group).
- Bot token: anh đang dùng (env/MCP), không ghi vào file.
