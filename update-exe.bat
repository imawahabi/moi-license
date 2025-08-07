@echo off
title Update and Build Moi-Licenses App

echo.
echo ========================================
echo    Update and Build Moi-Licenses App
echo ========================================
echo.

:: Check for Node.js
echo [1/5] Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed! Please install Node.js first
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check for npm
echo [1/5] Checking for npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available! Please ensure Node.js is properly installed
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [1/5] SUCCESS: Node.js and npm are available
echo.

:: Clean old files
echo [2/5] Cleaning old files...
if exist "dist" (
    echo   - Removing old dist folder...
    rmdir /s /q "dist" 2>nul
)
if exist "release" (
    echo   - Removing old release folder...
    rmdir /s /q "release" 2>nul
)
echo [2/5] SUCCESS: Old files cleaned successfully
echo.

:: Check for required files
echo [2/5] Checking for required files...
if not exist "package.json" (
    echo ERROR: package.json file not found!
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
if not exist "backend\database.json" (
    echo WARNING: Database file not found, running fix tool...
    node fix-database-issues.cjs 2>nul
    if errorlevel 1 (
        echo ERROR: Failed to create database
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)
echo [2/5] SUCCESS: All required files are present
echo.

:: Install dependencies if needed
if not exist "node_modules" (
    echo [3/5] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo [3/5] SUCCESS: Dependencies installed successfully
    echo.
) else (
    echo [3/5] Dependencies already installed
    echo.
)

:: Build user interface
echo [4/5] Building user interface...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build user interface
    echo Please check the errors above
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo [4/5] SUCCESS: User interface built successfully
echo.

:: Check build success
if not exist "dist\index.html" (
    echo ERROR: Failed to create interface files
    echo Please check the build process
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Build packaged application
echo [5/5] Building packaged application exe...
echo This process may take several minutes, please wait...
call npm run electron:build:win
if errorlevel 1 (
    echo ERROR: Failed to build packaged application
    echo Please check the errors above
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check build success
if not exist "release" (
    echo ERROR: Release folder was not created
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo.
echo ========================================
echo [5/5] SUCCESS: Application updated successfully!
echo ========================================
echo.

:: Display created files
echo Files created in release folder:
echo.
if exist "release\Moi-Licenses Setup 1.0.0.exe" (
    echo   ✓ Moi-Licenses Setup 1.0.0.exe - Full installer
)
if exist "release\Moi-Licenses-Portable.exe" (
    echo   ✓ Moi-Licenses-Portable.exe - Portable version
)
if exist "release\win-unpacked" (
    echo   ✓ win-unpacked\ - Unpacked files
)

echo.
echo Tips:
echo   - Use installer for distribution to new devices
echo   - Use portable version for quick testing
echo   - User data is saved in: %LOCALAPPDATA%\Moi-Licenses
echo.

:: Open release folder automatically
echo Opening release folder...
explorer "release"

echo.
echo Build completed successfully!
echo Press any key to exit...
pause >nul
