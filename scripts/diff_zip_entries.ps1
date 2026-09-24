Add-Type -AssemblyName System.IO.Compression.FileSystem

$z1 = [System.IO.Compression.ZipFile]::OpenRead("C:\Users\dell\.gemini\antigravity\brain\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\.user_uploaded\media_1790227395313.xlsx")
$z2 = [System.IO.Compression.ZipFile]::OpenRead("C:\Users\dell\.gemini\antigravity\brain\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\.user_uploaded\media_1790227395325.xlsx")

foreach ($e1 in $z1.Entries) {
    $e2 = $z2.GetEntry($e1.FullName)
    if ($e1.Length -ne $e2.Length) {
        Write-Host "Diff length in $($e1.FullName): $($e1.Length) vs $($e2.Length)"
        $s1 = New-Object System.IO.StreamReader($e1.Open()); $t1 = $s1.ReadToEnd(); $s1.Close()
        $s2 = New-Object System.IO.StreamReader($e2.Open()); $t2 = $s2.ReadToEnd(); $s2.Close()
        Write-Host "T1 snippet: $($t1.Substring(0, [Math]::Min(200, $t1.Length)))"
        Write-Host "T2 snippet: $($t2.Substring(0, [Math]::Min(200, $t2.Length)))"
    }
}
$z1.Dispose()
$z2.Dispose()
