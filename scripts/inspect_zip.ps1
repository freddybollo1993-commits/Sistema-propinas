Add-Type -AssemblyName System.IO.Compression.FileSystem

$files = Get-ChildItem "C:\Users\dell\.gemini\antigravity\brain\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\.user_uploaded\*.xlsx"

foreach ($file in $files) {
    Write-Host "=========================================="
    Write-Host "FILE: $($file.Name)"
    $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName -like "*docProps*" -or $entry.FullName -like "*workbook.xml*") {
            Write-Host "Entry: $($entry.FullName)"
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $text = $reader.ReadToEnd()
            Write-Host $text
            $reader.Close()
            $stream.Close()
        }
    }
    $zip.Dispose()
}
