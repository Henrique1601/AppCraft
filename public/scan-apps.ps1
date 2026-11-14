<#
.SYNOPSIS
    AppCraft - Scanner de Apps Instalados no Windows
.DESCRIPTION
    Lê os programas instalados no Registro do Windows (HKLM / HKCU), filtra componentes de sistema,
    infere categorias, captura site oficial (URLInfoAbout) e gera o arquivo appcraft-scan.json
    pronto para importar no site AppCraft.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\scan-apps.ps1
#>

param(
    [string]$OutputPath = ".\appcraft-scan.json",
    [switch]$IncludeSystemComponents
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🔍 Escaneando aplicativos instalados no Windows..." -ForegroundColor Cyan

$registryPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

$ignorePatterns = @(
    "^Microsoft Visual C\+\+",
    "^Microsoft \.NET",
    "^Windows SDK",
    "^Update for",
    "^Security Update",
    "^Hotfix for",
    "^KB\d+",
    "^NVIDIA .*Driver",
    "^Intel\(R\) ",
    "^AMD ",
    "^Realtek ",
    "Redistributable",
    "Runtime \("
)

function Infer-Category {
    param([string]$Name, [string]$Publisher)
    $text = "$Name $Publisher".ToLower()

    if ($text -match "code|studio|git|node|python|docker|postman|insomnia|terminal|powershell|wsl|jetbrains|intellij|pycharm|cursor|windsurf|neovim|vim|sublime|dbeaver|pgadmin|mysql|mongodb|android|flutter|rust|golang|sdk") {
        return "Dev & Terminal"
    }
    if ($text -match "chrome|firefox|edge|brave|opera|vivaldi|arc|zen|browser|tor ") {
        return "Navegadores"
    }
    if ($text -match "figma|photoshop|illustrator|premiere|after effects|blender|obs|vlc|spotify|audacity|davinci|gimp|inkscape|krita|canva|handbrake|ffmpeg|capcut|kdenlive") {
        return "Design & Mídia"
    }
    if ($text -match "steam|epic games|gog|ubisoft|ea app|battle\.net|riot|minecraft|roblox|discord|twitch|playnite|retroarch") {
        return "Jogos & Entretenimento"
    }
    if ($text -match "bitwarden|1password|keepass|proton|vpn|wireguard|tailscale|cloudflare|wireshark|nmap|malwarebytes|kaspersky|veracrypt|gpg") {
        return "Segurança & Rede"
    }
    if ($text -match "ollama|lm studio|chatgpt|claude|anaconda|jupyter|tableau|power bi") {
        return "IA & Dados"
    }
    if ($text -match "notion|obsidian|raycast|todoist|slack|teams|zoom|libreoffice|office|word|excel|onenote|ticktick|anytype|logseq") {
        return "Produtividade"
    }
    return "Utilitários"
}

function Normalize-AppName {
    param([string]$Text)
    if (-not $Text) { return "" }
    $n = $Text.ToLower().Trim()
    $n = $n -replace "\((x64|x86|64-bit|32-bit|user|machine|en-us|pt-br)\)", ""
    $n = $n -replace "\s+(x64|x86|64-bit|32-bit)$", ""
    $n = $n -replace "\s+v?\d+(\.\d+)+(\s|$)", " "
    return ($n -replace "[^a-z0-9]+", " ").Trim()
}

function Get-WingetPackages {
    param([int]$TimeoutMs = 25000)

    $result = @{
        Exact = @{}
        Norm  = @{}
        Count = 0
    }

    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wingetCmd) {
        Write-Host "ℹ️ winget não encontrado; pulando correspondência automática de IDs." -ForegroundColor DarkGray
        return $result
    }

    Write-Host "📦 Consultando winget list para identificar IDs de instalação..." -ForegroundColor Cyan

    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $wingetCmd.Source
        $psi.Arguments = "list --source winget --disable-interactivity --accept-source-agreements"
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
        $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
        $stderrTask = $proc.StandardError.ReadToEndAsync()

        if (-not $proc.WaitForExit($TimeoutMs)) {
            try { $proc.Kill() } catch {}
            Write-Host "⚠️ winget list excedeu o tempo limite ($($TimeoutMs / 1000)s); seguindo apenas com o Registro." -ForegroundColor Yellow
            return $result
        }

        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $null = $stderrTask.GetAwaiter().GetResult()

        if (-not $stdout) { return $result }

        $lines = $stdout -split "`r?`n"
        $headerIdx = -1
        for ($i = 1; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^-{10,}$") {
                $headerIdx = $i - 1
                break
            }
        }

        if ($headerIdx -lt 0) { return $result }

        $headerLine = $lines[$headerIdx]
        if ($headerLine -notmatch "^(\S.*?\s{2,})(\S+\s{2,})(\S+)") {
            return $result
        }

        $idStart = $matches[1].Length
        $verStart = $idStart + $matches[2].Length

        for ($i = $headerIdx + 2; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            if (-not $line -or $line.Length -le $idStart) { continue }

            $pkgName = $line.Substring(0, $idStart).Trim()
            $pkgId = if ($line.Length -ge $verStart) {
                $line.Substring($idStart, $verStart - $idStart).Trim()
            } else {
                $line.Substring($idStart).Trim()
            }

            if (-not $pkgName -or -not $pkgId) { continue }
            if ($pkgId -match "\s" -or $pkgId.EndsWith([char]0x2026) -or $pkgId.EndsWith("...")) { continue }
            if ($pkgId -match "^(ARP|MSIX)\\" -or $pkgId -notmatch "\.") { continue }

            $exactKey = $pkgName.ToLower()
            if (-not $result.Exact.ContainsKey($exactKey)) {
                $result.Exact[$exactKey] = $pkgId
            }

            $normKey = Normalize-AppName -Text $pkgName
            if ($normKey -and -not $result.Norm.ContainsKey($normKey)) {
                $result.Norm[$normKey] = $pkgId
            }

            $result.Count++
        }
    } catch {
        Write-Host "⚠️ Falha ao consultar winget; seguindo apenas com o Registro." -ForegroundColor Yellow
    }

    return $result
}

function Find-WingetId {
    param(
        [string]$Name,
        [string]$Publisher,
        [hashtable]$WingetMaps
    )

    if (-not $WingetMaps -or $WingetMaps.Count -eq 0) { return $null }

    $exactKey = $Name.ToLower()
    if ($WingetMaps.Exact.ContainsKey($exactKey)) {
        return $WingetMaps.Exact[$exactKey]
    }

    $normKey = Normalize-AppName -Text $Name
    if ($normKey -and $WingetMaps.Norm.ContainsKey($normKey)) {
        return $WingetMaps.Norm[$normKey]
    }

    if ($Publisher) {
        $pubNormKey = Normalize-AppName -Text "$Publisher $Name"
        if ($pubNormKey -and $WingetMaps.Norm.ContainsKey($pubNormKey)) {
            return $WingetMaps.Norm[$pubNormKey]
        }
    }

    return $null
}

function Get-WingetShowDetailsParallel {
    param(
        [string[]]$WingetIds,
        [string]$WingetPath,
        [int]$MaxThreads = 8,
        [int]$TimeoutMs = 15000
    )

    $detailsById = @{}
    if (-not $WingetIds -or $WingetIds.Count -eq 0 -or -not $WingetPath) {
        return $detailsById
    }

    $total = $WingetIds.Count
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host "🔎 Enriquecendo $total apps via winget show (até $MaxThreads threads)..." -ForegroundColor Cyan

    $pool = [runspacefactory]::CreateRunspacePool(1, $MaxThreads)
    $pool.Open()

    $workerScript = {
        param([string]$PkgId, [string]$ExePath, [int]$CmdTimeoutMs)

        $res = [pscustomobject]@{
            WingetId    = $PkgId
            WebsiteUrl  = $null
            RepoUrl     = $null
            Description = $null
        }

        try {
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $ExePath
            $psi.Arguments = "show --id `"$PkgId`" --source winget --disable-interactivity --accept-source-agreements"
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
            $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true

            $proc = [System.Diagnostics.Process]::Start($psi)
            $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
            $stderrTask = $proc.StandardError.ReadToEndAsync()

            if (-not $proc.WaitForExit($CmdTimeoutMs)) {
                try { $proc.Kill() } catch {}
                return $res
            }

            $stdout = $stdoutTask.GetAwaiter().GetResult()
            $null = $stderrTask.GetAwaiter().GetResult()
            if (-not $stdout) { return $res }

            $lines = $stdout -split "`r?`n"
            $homepage = $null
            $publisherUrl = $null
            $packageUrl = $null
            $sourceUrl = $null
            $descLines = New-Object System.Collections.Generic.List[string]
            $inDesc = $false

            foreach ($rawLine in $lines) {
                $line = $rawLine -replace [char]0x00A0, " "

                if ($inDesc) {
                    if ($line -match "^\s{2,}(.+)$") {
                        $trimmed = $matches[1].Trim()
                        if ($trimmed) { $descLines.Add($trimmed) }
                        continue
                    } elseif ([string]::IsNullOrWhiteSpace($line)) {
                        continue
                    } else {
                        $inDesc = $false
                    }
                }

                if ($line -match "^(?:Homepage|P[áa]gina inicial)\s*:\s*(https?://\S+)") {
                    if (-not $homepage) { $homepage = $matches[1].Trim() }
                } elseif ($line -match "^(?:Package\s+Url|URL\s+do\s+Pacote)\s*:\s*(https?://\S+)") {
                    if (-not $packageUrl) { $packageUrl = $matches[1].Trim() }
                } elseif ($line -match "^(?:Publisher\s+Url|URL\s+do\s+Fornecedor)\s*:\s*(https?://\S+)") {
                    if (-not $publisherUrl) { $publisherUrl = $matches[1].Trim() }
                } elseif ($line -match "^(?:Source\s+Url|Repository|URL\s+(?:da\s+Fonte|do\s+Reposit[óo]rio))\s*:\s*(https?://\S+)") {
                    if (-not $sourceUrl) { $sourceUrl = $matches[1].Trim() }
                } elseif ($line -match "^(?:Description|Descri[çc][ãa]o)\s*:\s*(.*)$") {
                    $inDesc = $true
                    $first = $matches[1].Trim()
                    if ($first) { $descLines.Add($first) }
                }
            }

            $candidateUrls = @($homepage, $packageUrl, $publisherUrl, $sourceUrl) | Where-Object { $_ }
            if ($candidateUrls.Count -gt 0) {
                $res.WebsiteUrl = $candidateUrls[0]
            }

            $repoCandidates = @($sourceUrl, $homepage, $packageUrl, $publisherUrl) | Where-Object { $_ }
            foreach ($u in $repoCandidates) {
                if ($u -match "github\.com|gitlab\.com") {
                    $res.RepoUrl = $u
                    break
                }
            }

            if ($descLines.Count -gt 0) {
                $joined = ($descLines -join " ") -replace "\s+", " "
                $res.Description = $joined.Trim()
            }
        } catch {
        }

        return $res
    }

    $jobs = New-Object System.Collections.Generic.List[object]
    foreach ($id in $WingetIds) {
        $ps = [powershell]::Create()
        $ps.RunspacePool = $pool
        $null = $ps.AddScript($workerScript).AddArgument($id).AddArgument($WingetPath).AddArgument($TimeoutMs)
        $handle = $ps.BeginInvoke()
        $jobs.Add([pscustomobject]@{
            Id     = $id
            PS     = $ps
            Handle = $handle
            Done   = $false
        })
    }

    $completed = 0
    $nextLog = [Math]::Min(20, $total)

    while ($completed -lt $total) {
        $anyCompleted = $false
        foreach ($job in $jobs) {
            if (-not $job.Done -and $job.Handle.IsCompleted) {
                $job.Done = $true
                $completed++
                $anyCompleted = $true
                try {
                    $output = $job.PS.EndInvoke($job.Handle)
                    if ($output -and $output.Count -gt 0) {
                        $detailsById[$job.Id] = $output[0]
                    }
                } catch {
                } finally {
                    $job.PS.Dispose()
                }
            }
        }

        if ($completed -ge $nextLog -and $completed -lt $total) {
            Write-Host "   ⏳ $completed/$total apps processados ($([Math]::Round($sw.Elapsed.TotalSeconds, 1))s)..." -ForegroundColor DarkGray
            $nextLog = [Math]::Min($total, $nextLog + 20)
        }

        if (-not $anyCompleted) {
            Start-Sleep -Milliseconds 100
        }
    }

    $pool.Close()
    $pool.Dispose()
    $sw.Stop()
    Write-Host "   ✨ Enriquecimento winget concluído em $([Math]::Round($sw.Elapsed.TotalSeconds, 1))s ($completed/$total)." -ForegroundColor DarkCyan

    return $detailsById
}

$wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
$wingetExePath = if ($wingetCmd) { $wingetCmd.Source } else { $null }
$wingetMaps = Get-WingetPackages

$rawEntries = Get-ItemProperty $registryPaths -ErrorAction SilentlyContinue |
    Where-Object {
        $_.DisplayName -and
        $_.DisplayName.Trim() -ne "" -and
        ($IncludeSystemComponents -or $_.SystemComponent -ne 1)
    }

$seen = @{}
$apps = @()
$appsByWingetId = @{}
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

foreach ($entry in $rawEntries) {
    $name = $entry.DisplayName.Trim()

    if (-not $IncludeSystemComponents) {
        $skip = $false
        foreach ($pattern in $ignorePatterns) {
            if ($name -match $pattern) {
                $skip = $true
                break
            }
        }
        if ($skip) { continue }
    }

    $key = $name.ToLower()
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true

    $publisher = if ($entry.Publisher) { $entry.Publisher.Trim() } else { "" }
    $version = if ($entry.DisplayVersion) { $entry.DisplayVersion.Trim() } else { $null }
    $website = if ($entry.URLInfoAbout -and $entry.URLInfoAbout -match "^https?://") {
        $entry.URLInfoAbout.Trim()
    } elseif ($entry.HelpLink -and $entry.HelpLink -match "^https?://") {
        $entry.HelpLink.Trim()
    } else {
        $null
    }

    $category = Infer-Category -Name $name -Publisher $publisher
    $repoUrl = $null
    if ($website -and $website -match "github\.com|gitlab\.com") {
        $repoUrl = $website
    }

    $slug = ($name.ToLower() -replace "[^a-z0-9]+", "-").Trim("-")
    if (-not $slug) { $slug = "app-$([guid]::NewGuid().ToString().Substring(0,6))" }

    $tags = @("windows-scan")
    if ($publisher) {
        $pubTag = ($publisher.ToLower() -replace "[^a-z0-9]+", "-").Trim("-")
        if ($pubTag -and $pubTag.Length -le 24) { $tags += $pubTag }
    }

    $wingetId = Find-WingetId -Name $name -Publisher $publisher -WingetMaps $wingetMaps
    $installCommand = if ($wingetId) {
        "winget install --id $wingetId -e --accept-package-agreements --accept-source-agreements"
    } else {
        $null
    }

    $appObj = [ordered]@{
        id             = $slug
        name           = $name
        category       = $category
        status         = "installed"
        websiteUrl     = $website
        repoUrl        = $repoUrl
        installCommand = $installCommand
        description    = if ($publisher) { "Publicado por $publisher" } else { $null }
        notes          = $null
        version        = $version
        tags           = $tags
        createdAt      = $now
        updatedAt      = $now
    }

    $apps += $appObj

    if ($wingetId) {
        if (-not $appsByWingetId.ContainsKey($wingetId)) {
            $appsByWingetId[$wingetId] = New-Object System.Collections.Generic.List[object]
        }
        $appsByWingetId[$wingetId].Add($appObj)
    }
}

if ($appsByWingetId.Count -gt 0 -and $wingetExePath) {
    $wingetIdsToEnrich = @($appsByWingetId.Keys)
    $detailsById = Get-WingetShowDetailsParallel -WingetIds $wingetIdsToEnrich -WingetPath $wingetExePath -MaxThreads 8

    foreach ($pkgId in $wingetIdsToEnrich) {
        if (-not $detailsById.ContainsKey($pkgId)) { continue }
        $info = $detailsById[$pkgId]
        if (-not $info) { continue }

        foreach ($app in $appsByWingetId[$pkgId]) {
            if ([string]::IsNullOrWhiteSpace($app.websiteUrl) -and $info.WebsiteUrl) {
                $app.websiteUrl = $info.WebsiteUrl
            }
            if ([string]::IsNullOrWhiteSpace($app.repoUrl) -and $info.RepoUrl) {
                $app.repoUrl = $info.RepoUrl
            } elseif ([string]::IsNullOrWhiteSpace($app.repoUrl) -and $app.websiteUrl -and $app.websiteUrl -match "github\.com|gitlab\.com") {
                $app.repoUrl = $app.websiteUrl
            }
            if (-not [string]::IsNullOrWhiteSpace($info.Description)) {
                $app.description = $info.Description
            }
        }
    }
}

$apps = $apps | Sort-Object { $_.name }
$wingetMatchedCount = @($apps | Where-Object { $_.installCommand }).Count
$websiteCount = @($apps | Where-Object { $_.websiteUrl }).Count
$repoCount = @($apps | Where-Object { $_.repoUrl }).Count
$richDescCount = @($apps | Where-Object { $_.description -and $_.description -notlike "Publicado por *" }).Count

$export = [ordered]@{
    version    = 1
    exportedAt = $now
    categories = @($apps | ForEach-Object { $_.category } | Select-Object -Unique)
    apps       = $apps
}

$json = $export | ConvertTo-Json -Depth 6
$resolvedOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path (Get-Location) $OutputPath }
[System.IO.File]::WriteAllText($resolvedOutput, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "✅ $($apps.Count) aplicativos encontrados ($wingetMatchedCount com comando winget; $websiteCount com websiteUrl, $repoCount com repoUrl, $richDescCount com descrição detalhada) e salvos em: $OutputPath" -ForegroundColor Green
Write-Host "👉 Agora abra o AppCraft e clique em 'Importar JSON' para carregar seus apps!" -ForegroundColor Yellow
