# Omnibus bouwen en naar Docker Hub zetten, in één keer (Windows, Docker Desktop).
#
# Gebruik: dubbelklik UITROLLEN.cmd in de bouwmap. Die start dit script.
# De bouwmap bevat de code, hosting/container/database/omnibus-database.zip en
# hosting/container/database/uitrol.json met de verwachte waarden:
#   {"image":"robertworm/omnibus","tag":"0.1.12","databaseSha256":"<64 hex>","codeRevision":"<40 hex>"}
# Het script controleert het controlegetal, start zo nodig Docker Desktop, bouwt, pusht
# en schrijft het resultaat naar uitrol-resultaat.json in de bouwmap.
# Inloggen bij Docker Hub doe je zelf (eenmalig: docker login); dit script vraagt of
# bewaart geen inloggegevens.

# Continue: docker schrijft voortgang naar stderr; Windows PowerShell zou dat bij 'Stop' als fout zien.
# Fouten van docker worden met $LASTEXITCODE gecontroleerd, cmdlets met -ErrorAction Stop.
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path -ErrorAction Stop (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
$resultaat = Join-Path $root 'uitrol-resultaat.json'
if (Test-Path $resultaat) { Remove-Item $resultaat }

function Klaar($status, $melding, $extra = @{}) {
  $uit = @{ status = $status; melding = $melding; tijd = (Get-Date).ToString('s') } + $extra
  $uit | ConvertTo-Json | Set-Content -Encoding UTF8 $resultaat
  if ($status -eq 'gelukt') { Write-Host "`n$melding" -ForegroundColor Green } else { Write-Host "`n$melding" -ForegroundColor Red }
}

try {
  $info = Get-Content -Raw -ErrorAction Stop (Join-Path $root 'hosting\container\database\uitrol.json') | ConvertFrom-Json
  foreach ($veld in 'image', 'tag', 'databaseSha256', 'codeRevision') {
    if (-not $info.$veld) { throw "uitrol.json mist '$veld'." }
  }
  if ($info.databaseSha256 -notmatch '^[0-9a-f]{64}$') { throw 'databaseSha256 is geen geldig controlegetal.' }
  if ($info.codeRevision -notmatch '^[0-9a-f]{40}$') { throw 'codeRevision is geen volledige commit-hash.' }
  # De tag moet gelijk zijn aan de versie die de app zelf toont (lib/product-release.mjs).
  $bron = Get-Content -Raw -ErrorAction Stop (Join-Path $root 'lib\product-release.mjs')
  if ($bron -notmatch 'PRODUCT_RELEASE_NUMBER\s*=\s*(\d+)') { throw 'Versienummer niet gevonden in lib/product-release.mjs.' }
  $nummer = [int]$Matches[1]
  $appVersie = "0.$([math]::Floor($nummer / 100)).$($nummer % 100)"
  if ($info.tag -ne $appVersie) { throw "De tag ($($info.tag)) is niet gelijk aan de versie in de app ($appVersie)." }
  $naam = "$($info.image):$($info.tag)"

  Write-Host "Controlegetal van de database controleren..."
  $zip = Join-Path $root 'hosting\container\database\omnibus-database.zip'
  $hash = (Get-FileHash -ErrorAction Stop -Algorithm SHA256 $zip).Hash.ToLower()
  if ($hash -ne $info.databaseSha256) { throw "Controlegetal klopt niet: $hash." }

  Write-Host "Docker controleren..."
  cmd /c "docker version --format {{.Server.Version}} >nul 2>nul"
  if ($LASTEXITCODE -ne 0) {
    $app = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path $app)) { throw 'Docker Desktop is niet gevonden. Start het zelf en probeer opnieuw.' }
    Write-Host "Docker Desktop starten (kan een minuut duren)..."
    Start-Process $app
    $tot = (Get-Date).AddMinutes(3)
    do {
      Start-Sleep -Seconds 5
      cmd /c "docker version --format {{.Server.Version}} >nul 2>nul"
    } while ($LASTEXITCODE -ne 0 -and (Get-Date) -lt $tot)
    if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is na 3 minuten nog niet klaar.' }
  }

  Write-Host "Bouwen: $naam"
  docker build --platform linux/amd64 -f hosting/container/Dockerfile.lokaal `
    --build-arg "DATABASE_SHA256=$($info.databaseSha256)" `
    --build-arg "OMNIBUS_CODE_REVISION=$($info.codeRevision)" `
    -t $naam .
  if ($LASTEXITCODE -ne 0) { throw 'De build is mislukt; zie de meldingen hierboven.' }

  Write-Host "Naar Docker Hub zetten: $naam"
  docker push $naam
  if ($LASTEXITCODE -ne 0) { throw 'De push is mislukt. Ben je ingelogd? Typ eenmalig: docker login' }

  $digest = docker inspect --format '{{index .RepoDigests 0}}' $naam
  Klaar 'gelukt' "Klaar: $naam staat op Docker Hub." @{ image = "docker.io/$naam"; digest = "$digest"; codeRevision = $info.codeRevision; databaseSha256 = $info.databaseSha256 }
}
catch {
  Klaar 'mislukt' "Niet gelukt: $($_.Exception.Message)"
}
