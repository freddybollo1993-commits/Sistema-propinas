Add-Type -AssemblyName System.IO.Compression.FileSystem

$files = Get-ChildItem "C:\Users\dell\.gemini\antigravity\brain\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\.user_uploaded\*.xlsx"

foreach ($file in $files) {
    Write-Host "=========================================="
    Write-Host "FILE: $($file.Name)"
    $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
    $entry = $zip.GetEntry("xl/sharedStrings.xml")
    if ($entry) {
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        $matches = [regex]::Matches($text, '<t[^>]*>(.*?)</t>')
        $strings = @()
        foreach ($m in $matches) {
            $val = $m.Groups[1].Value.Trim()
            if ($val.Length -gt 0) {
                $strings += $val
            }
        }
        Write-Host "Total unique strings: $($strings.Count)"
        # Print strings that might be titles or names
        $interesting = $strings | Where-Object { 
            $_ -notmatch '^\d+$' -and 
            $_ -notmatch '^#N/A$' -and 
            $_ -notmatch 'Activo|Inactivo|Salón|Cocina|Apoyo|Administrador|Supervisor|Moderador' -and
            $_.Length -gt 3
        } | Select-Object -Unique
        Write-Host "Sample interesting strings:"
        $interesting | Select-Object -First 30 | ForEach-Object { Write-Host " - $_" }
        $reader.Close()
        $stream.Close()
    }
    $zip.Dispose()
}
