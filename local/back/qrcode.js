const QRCode = require("qrcode");
const sharp = require("sharp");

async function generateQRWithTextLogo(link, logoPath, outputPath) {
  try {
    // 1️⃣ Generate QR code
    const qrBuffer = await QRCode.toBuffer(link, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 500,
      color: { dark: "#000000", light: "#ffffff" },
    });

    const qrImage = sharp(qrBuffer);
    const qrMetadata = await qrImage.metadata();
    const qrSize = qrMetadata.width;

    // 2️⃣ Load logo and get metadata
    let logo = sharp(logoPath);
    const logoMetadata = await logo.metadata();

    // 3️⃣ Determine max size (25% of QR width)
    const maxLogoWidth = qrSize * 0.25;
    const maxLogoHeight = qrSize * 0.25;

    let scale = Math.min(maxLogoWidth / logoMetadata.width, maxLogoHeight / logoMetadata.height, 1);

    const logoWidth = Math.floor(logoMetadata.width * scale);
    const logoHeight = Math.floor(logoMetadata.height * scale);

    // 4️⃣ Create white background with padding
    const padding = 10;
    const logoWithBg = await sharp({
      create: {
        width: logoWidth + padding * 2,
        height: logoHeight + padding * 2,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: await logo.resize(logoWidth, logoHeight).toBuffer(), top: padding, left: padding }])
      .png()
      .toBuffer();

    // 5️⃣ Composite on center of QR
    await qrImage
      .composite([
        {
          input: logoWithBg,
          top: Math.floor((qrSize - (logoHeight + padding * 2)) / 2),
          left: Math.floor((qrSize - (logoWidth + padding * 2)) / 2),
        },
      ])
      .toFile(outputPath);

    console.log(`✅ QR code created: ${outputPath}`);
  } catch (err) {
    console.error("❌ Error generating QR:", err);
  }
}

// Example usage
const whatsappLink =
  "https://wa.me/93299123?text=السلام%20عليكم%20👋،%20أتواصل%20معكم%20بخصوص%20نظام%20ÆVE.%20أود%20معرفة%20المزيد%20عن%20منتجاتكم%20وخدماتكم.";

generateQRWithTextLogo(whatsappLink, "./aeve.png", "./whatsapp_qr_text_logo.png");
