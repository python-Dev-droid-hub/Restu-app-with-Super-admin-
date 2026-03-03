# Setup script for Node.js and pnpm
$env:Path = "C:\Program Files\nodejs;C:\Users\hp\AppData\Roaming\npm;" + $env:Path

function pnpm { & "C:\Users\hp\AppData\Roaming\npm\pnpm.cmd" $args }
function npm { & "C:\Program Files\nodejs\npm.cmd" $args }
function npx { & "C:\Program Files\nodejs\npx.cmd" $args }

Write-Host "✅ Node.js tools ready! You can now use pnpm, npm, and npx commands."
