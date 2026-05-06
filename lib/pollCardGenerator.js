const sharp = require('sharp');

async function generatePollCard(participantsCount, requiredCount = 25) {
    const width = 600;
    const height = 280;

    // Progress bar calculations
    const barWidth = width - 60; // 30px padding each side
    const ratio = Math.min(participantsCount / requiredCount, 1);
    const filledWidth = Math.max(Math.floor(barWidth * ratio), 0);

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="barClipFull"><rect x="30" y="130" width="${barWidth}" height="15" rx="7.5"/></clipPath>
        <clipPath id="barClipParts"><rect x="30" y="220" width="${barWidth}" height="15" rx="7.5"/></clipPath>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#202c33"/>

      <!-- Title -->
      <text x="30" y="50" fill="#e9edef" font-size="28" font-weight="bold" font-family="sans-serif">Lottery Pools in A Z A H R A</text>

      <!-- Required Label -->
      <text x="30" y="110" fill="#e9edef" font-size="22" font-weight="bold" font-family="sans-serif">Required</text>
      <text x="${width - 30}" y="110" fill="#e9edef" font-size="22" font-weight="bold" font-family="sans-serif" text-anchor="end">${requiredCount}</text>

      <!-- Required Bar (Full Green) -->
      <rect x="30" y="130" width="${barWidth}" height="15" rx="7.5" fill="#00a884" clip-path="url(#barClipFull)"/>

      <!-- Participants Label -->
      <text x="30" y="200" fill="#e9edef" font-size="22" font-weight="bold" font-family="sans-serif">Participants</text>
      <text x="${width - 30}" y="200" fill="#e9edef" font-size="22" font-weight="bold" font-family="sans-serif" text-anchor="end">${participantsCount}</text>

      <!-- Participants Bar Background -->
      <rect x="30" y="220" width="${barWidth}" height="15" rx="7.5" fill="#3b4a54" clip-path="url(#barClipParts)"/>

      <!-- Participants Bar Fill -->
      ${filledWidth > 0 ? `<rect x="30" y="220" width="${filledWidth}" height="15" rx="7.5" fill="#00a884" clip-path="url(#barClipParts)"/>` : ''}
    </svg>`;

    const buffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

    return buffer;
}

module.exports = { generatePollCard };
