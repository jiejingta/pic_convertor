@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo [1/4] 检查 Python 虚拟环境...
if exist ".venv\Scripts\python.exe" goto venv_ready

echo 未检测到 .venv，开始创建虚拟环境...
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m venv .venv
) else (
  python -m venv .venv
)
if errorlevel 1 goto failed

:venv_ready
echo [2/4] 安装/更新依赖...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failed

echo [3/4] 即将启动服务...
echo 访问地址: http://127.0.0.1:8000/zh-CN
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8000/zh-CN'"

echo [4/4] 启动 Uvicorn...
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
goto end

:failed
echo 启动失败，请检查上面的错误信息。
pause
exit /b 1

:end
endlocal
