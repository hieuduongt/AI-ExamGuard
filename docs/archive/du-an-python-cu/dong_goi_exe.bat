@echo off
chcp 65001 >nul
echo Dang dong goi thanh file .exe...
pyinstaller --onefile --noconsole --name AI_ExamGuard_Portable --add-data ui;ui --clean -y main.py
echo Hoan tat!
pause
