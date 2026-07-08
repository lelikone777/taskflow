import { pixelBasedPreset } from "@react-email/components";

export default {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: {
          300: "#9ecbf2", // цвет фона
        },
        neutral: {
          0: "#ffffff",
        },
      },
      fontFamily: {
        // Шрифты из css-темы
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'heading': ['30px', '30px'], // [font-size, line-height]
        'body': ['20px', '20px'], 
      },
    },
  },
};