# Test WAHA WhatsApp API
# Ganti nomor dengan nomor WhatsApp yang valid untuk test

$wahaUrl = "https://waha.khibroh.com/api/sendText"
$apiKey = "060731d7987a4c7ebd23a173a8fdb158"
$session = "default"

# GANTI NOMOR INI dengan nomor WhatsApp yang valid (format: 628xxx)
$testPhone = "628563466756"  # Nomor WhatsApp untuk test

$payload = @{
    session = $session
    chatId  = "$testPhone@c.us"
    text    = "🎫 *TEST PESAN*`n`nIni adalah test pesan dari sistem Pendaftaran QR.`n`nJika Anda menerima pesan ini, berarti WAHA berfungsi dengan baik."
} | ConvertTo-Json

Write-Host "Testing WAHA API..." -ForegroundColor Cyan
Write-Host "URL: $wahaUrl"
Write-Host "Session: $session"
Write-Host "Phone: $testPhone"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $wahaUrl -Method Post -Body $payload -ContentType "application/json" -Headers @{"X-Api-Key" = $apiKey }
    Write-Host "✅ SUCCESS! Message sent" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
}
catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
