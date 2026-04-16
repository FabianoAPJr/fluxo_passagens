@echo off
title Passagens Aereas - Dev Server
cd /d "%~dp0"
start "" http://localhost:3000
npm run dev
