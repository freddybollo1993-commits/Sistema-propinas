Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\Users\dell\.gemini\antigravity\brain\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\.user_uploaded\media_1790227395346.xlsx')
$zip.Entries | Select-Object -ExpandProperty FullName
$zip.Dispose()
