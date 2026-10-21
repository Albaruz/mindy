$body = @{
    garments = @(
        @{garmentId="1"; garmentType="top"; color="black"; material="cotton"; season="all"; style="casual"; isDirty=$false; extraTags=@{}}
        @{garmentId="2"; garmentType="bottom"; color="navy"; material="cotton"; season="all"; style="casual"; isDirty=$false; extraTags=@{}}
        @{garmentId="3"; garmentType="footwear"; color="white"; material="leather"; season="all"; style="casual"; isDirty=$false; extraTags=@{}}
        @{garmentId="4"; garmentType="outerwear"; color="black"; material="wool"; season="winter"; style="casual"; isDirty=$false; extraTags=@{}}
    )
    temperatureC = 18
    condition = "clear"
    dayLow = 10
    dayHigh = 22
    rainProbability = 0
    style = "casual"
} | ConvertTo-Json -Depth 5

$headers = @{"Content-Type" = "application/json"}
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/recommender" -Method POST -Body $body -Headers $headers
$response.Content