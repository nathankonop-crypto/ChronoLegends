@echo off
chcp 65001 > nul
title Sauvegarde ChronoLegends
node "%~dp0sauvegarder.js"
echo.
pause
