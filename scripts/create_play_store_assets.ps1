param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\docs\play-store-assets')
)

Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path (Join-Path $PSScriptRoot '..\apps\mobile\assets\icon.png')).Path
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$outputPath = (Resolve-Path $OutputDirectory).Path
$source = [System.Drawing.Image]::FromFile($sourcePath)

try {
  $icon = [System.Drawing.Bitmap]::new(512, 512)
  $iconGraphics = [System.Drawing.Graphics]::FromImage($icon)
  try {
    $iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $iconGraphics.DrawImage($source, 0, 0, 512, 512)
    $icon.Save((Join-Path $outputPath 'botali-play-icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $iconGraphics.Dispose()
    $icon.Dispose()
  }

  $feature = [System.Drawing.Bitmap]::new(1024, 500)
  $graphics = [System.Drawing.Graphics]::FromImage($feature)
  $background = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#FAFAF7'))
  $green = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#22C55E'))
  $dark = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#171717'))
  $fontTitle = [System.Drawing.Font]::new('Arial', 78, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontTagline = [System.Drawing.Font]::new('Arial', 32, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.FillRectangle($background, 0, 0, 1024, 500)
    $graphics.FillRectangle($green, 0, 0, 14, 500)
    $graphics.DrawImage($source, 72, 86, 328, 328)
    $graphics.DrawString('Botali', $fontTitle, $dark, 444, 154)
    $graphics.DrawString('O melhor posto tá ali.', $fontTagline, $dark, 449, 267)
    $feature.Save((Join-Path $outputPath 'botali-play-feature-1024x500.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $fontTagline.Dispose()
    $fontTitle.Dispose()
    $dark.Dispose()
    $green.Dispose()
    $background.Dispose()
    $graphics.Dispose()
    $feature.Dispose()
  }
} finally {
  $source.Dispose()
}
