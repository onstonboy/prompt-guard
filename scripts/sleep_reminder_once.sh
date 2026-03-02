#!/bin/bash
# Nhắc đi ngủ lúc 2h - chạy 1 lần rồi tự xóa khỏi crontab
osascript -e 'display notification "Đến 2h rồi, đi ngủ nha anh 🌙" with title "Tiểu Mộng Bot"'
# Xóa dòng cron chứa script này
(crontab -l 2>/dev/null | grep -v "sleep_reminder_once.sh" || true) | crontab -
