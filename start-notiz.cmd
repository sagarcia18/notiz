@echo off
rem Double-click to start Notiz (with Tailscale when it is running) and open it in the browser.
rem Options: -Dev (live reload while coding), -Local (this computer only). Close the window to stop.
title Notiz
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
