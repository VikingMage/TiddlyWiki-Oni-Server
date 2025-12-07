:: Interim shim to allow running twos commands via `twos <args>` until we have compiled JS in place
@echo off

if %1== "" (
  echo Usage: twos ^<args^>
  exit /b 1
)else if %1== "dev" (
  echo Start daemon in dev mode
  npm run dev
  exit /b %errorlevel%
)else (
  echo Running twos cli command: %*
  npx ts-node src/cli/cli.ts %*
)

