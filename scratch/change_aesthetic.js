const fs = require('fs');

const actualPath = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\course-3d-cutscenes.html';
let content = fs.readFileSync(actualPath, 'utf8');

// 1. Replace fonts link
const oldFonts = '<!-- Fonts: Space Grotesk (headings) and Manrope (body) -->\r\n  <link rel="preconnect" href="https://fonts.googleapis.com">\r\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\r\n  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&display=swap" rel="stylesheet">';
const oldFontsLF = '<!-- Fonts: Space Grotesk (headings) and Manrope (body) -->\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&display=swap" rel="stylesheet">';

const newFonts = '<!-- Google Fonts: Montserrat (Headings) and Poppins (Body) -->\r\n  <link rel="preconnect" href="https://fonts.googleapis.com">\r\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\r\n  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">';

if (content.includes(oldFonts)) {
  content = content.replace(oldFonts, newFonts);
} else if (content.includes(oldFontsLF)) {
  content = content.replace(oldFontsLF, newFonts);
} else {
  // Try generic regex replacement for the font link
  content = content.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope[\s\S]*?">/, 
    '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">');
}

// 2. Replace CSS root variables block
const oldRoot = `:root {
      --bg-color: #121212;
      --card-bg: #1c1c1f;
      --card-bg-hover: #252529;
      --accent-blue: #0059ff;
      --accent-blue-hover: #0047cc;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-color-hover: rgba(255, 255, 255, 0.16);
      
      --text-main: #ffffff;
      --text-muted: #a0a0a5;
      --text-dark: #121212;
      
      --font-heading: 'Space Grotesk', sans-serif;
      --font-body: 'Manrope', sans-serif;
      
      --transition-fast: 0.2s ease;
      --transition-normal: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }`;

const newRoot = `:root {
      --bg-color: #121212;
      --card-bg: #1a1a1a;
      --card-bg-hover: #222222;
      --accent-gold: #e4ac01;
      --accent-gold-hover: #fcd535;
      --accent-gold-glow: rgba(228, 172, 1, 0.35);
      --accent-green: #10b981;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-color-hover: rgba(255, 255, 255, 0.15);
      
      --text-main: #ffffff;
      --text-muted: rgba(255, 255, 255, 0.65);
      --text-dark: #000000;
      
      --font-heading: 'Montserrat', sans-serif;
      --font-body: 'Poppins', sans-serif;
      
      --transition-fast: 0.2s ease;
      --transition-normal: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }`;

// Normalize line endings for replacement
const normalize = s => s.replace(/\r\n/g, '\n');
if (normalize(content).includes(normalize(oldRoot))) {
  console.log("Replacing root block...");
  content = normalize(content).replace(normalize(oldRoot), newRoot);
} else {
  console.log("Warning: Could not find exact root block. We will do individual replacements for root.");
  // Individual fallbacks
  content = content.replace(/--accent-blue:\s*[^;]+;/, '--accent-gold: #e4ac01;');
  content = content.replace(/--accent-blue-hover:\s*[^;]+;/, '--accent-gold-hover: #fcd535;\n      --accent-gold-glow: rgba(228, 172, 1, 0.35);\n      --accent-green: #10b981;');
  content = content.replace(/--font-heading:\s*[^;]+;/, "--font-heading: 'Montserrat', sans-serif;");
  content = content.replace(/--font-body:\s*[^;]+;/, "--font-body: 'Poppins', sans-serif;");
}

// 3. Replace all variable usages
content = content.replace(/var\(--accent-blue\)/g, 'var(--accent-gold)');
content = content.replace(/var\(--accent-blue-hover\)/g, 'var(--accent-gold-hover)');

// 4. Replace badge-blue classes and style definition
const oldBadgeStyle = `.badge-blue {
      background: rgba(0, 89, 255, 0.15);
      border: 1px solid var(--accent-blue);
      color: #3b82f6;
    }`;
const newBadgeStyle = `.badge-gold {
      background: rgba(228, 172, 1, 0.08);
      border: 1px solid rgba(228, 172, 1, 0.25);
      color: var(--accent-gold);
    }`;

if (normalize(content).includes(normalize(oldBadgeStyle))) {
  content = normalize(content).replace(normalize(oldBadgeStyle), newBadgeStyle);
} else {
  // Slower replace
  content = content.replace(/\.badge-blue\s*\{[\s\S]*?\}/, newBadgeStyle);
}

// HTML tags
content = content.replace(/badge-blue/g, 'badge-gold');

// Write back
fs.writeFileSync(actualPath, content, 'utf8');
console.log("Successfully converted course detail page to gold aesthetic!");
