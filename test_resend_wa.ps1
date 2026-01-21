# Test Resend WhatsApp Notification
# Script ini akan mengirim ulang WhatsApp notification ke participant tertentu

$apiUrl = "https://pendaftaran-qr-api.khibroh.workers.dev"
$token = "YOUR_AUTH_TOKEN_HERE"  # Ganti dengan token dari localStorage

# GANTI INI dengan Registration ID participant yang ingin dikirim ulang
$registrationId = "REG-2026-XXXXX"  # Contoh: REG-2026-28078

Write-Host "Testing Resend WhatsApp Endpoint..." -ForegroundColor Cyan
Write-Host "API URL: $apiUrl"
Write-Host "Registration ID: $registrationId"
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "$apiUrl/api/participants/$registrationId/resend-whatsapp" `
        -Method Post `
        -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
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

Write-Host ""
Write-Host "Cara mendapatkan Auth Token:" -ForegroundColor Yellow
Write-Host "1. Buka browser dan login ke admin dashboard"
Write-Host "2. Tekan F12 untuk buka Developer Tools"
Write-Host "3. Buka tab 'Console'"
Write-Host "4. Ketik: localStorage.getItem('auth_token')"
Write-Host "5. Copy token yang muncul (tanpa tanda kutip)"
Write-Host "6. Paste di script ini di bagian YOUR_AUTH_TOKEN_HERE"
