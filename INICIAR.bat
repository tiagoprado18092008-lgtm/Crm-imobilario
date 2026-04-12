@echo off
echo ============================================
echo   CasaFlow - Iniciar Aplicacao
echo ============================================
echo.

echo [1/2] A iniciar o Backend (porta 3000)...
start "CRM Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] A iniciar o Frontend (porta 5173)...
start "CRM Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Aplicacao iniciada com sucesso!
echo   Abrir: http://localhost:5173
echo.
echo   Credenciais:
echo   admin@crm.pt    / Admin123!  (Administrador)
echo   joao@crm.pt     / Pass123!   (Consultor Principal)
echo   ana@crm.pt      / Pass123!   (Sub-Agente)
echo   pedro@crm.pt    / Pass123!   (Sub-Agente)
echo ============================================
echo.
pause
