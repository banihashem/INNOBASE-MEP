@echo off
setlocal
call npm ci
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsc --noEmit
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:prep
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:golden
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:persistence
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:auth
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:bundle
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:rbac
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:demo-v0.2
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:governance
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:security-cure
if %errorlevel% neq 0 exit /b %errorlevel%
call npm run test:security-final
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx tests/session_patch_autosave.test.ts
if %errorlevel% neq 0 exit /b %errorlevel%
call npx tsx tests/bundle_no_demo_identity.test.ts
if %errorlevel% neq 0 exit /b %errorlevel%
call node --import tsx tests/cure_regression_v0.2.test.ts
if %errorlevel% neq 0 exit /b %errorlevel%
python -m pytest tests/python/test_scoring.py tests/python/test_guardrail.py tests/python/test_golden_somayeh.py tests/python/test_auth.py tests/python/test_rag.py tests/python/test_pdf.py
if %errorlevel% neq 0 exit /b %errorlevel%
git diff --check
if %errorlevel% neq 0 exit /b %errorlevel%
echo ALL PASSED
