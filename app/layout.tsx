import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import Script from "next/script";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { LanguageProvider } from "~~/utils/i18n/LanguageContext";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "PANdora",
  description: "Decentralized AI Agent Marketplace - Discover, Create, and Trade AI Agents on PAN Network",
  imageRelativePath: "/pan-icon-txt.png",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <Script
          id="crypto-polyfill"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Polyfill for crypto.randomUUID
              (function() {
                if (typeof window !== 'undefined') {
                  // Check if crypto.randomUUID is available
                  if (!window.crypto || !window.crypto.randomUUID) {
                    // Create crypto object if it doesn't exist
                    if (!window.crypto) {
                      window.crypto = {};
                    }
                    
                    // Polyfill randomUUID
                    window.crypto.randomUUID = function() {
                      // Generate UUID v4
                      const bytes = new Uint8Array(16);
                      if (window.crypto && window.crypto.getRandomValues) {
                        window.crypto.getRandomValues(bytes);
                      } else {
                        // Fallback to Math.random (not cryptographically secure, but works)
                        for (let i = 0; i < bytes.length; i++) {
                          bytes[i] = Math.floor(Math.random() * 256);
                        }
                      }
                      
                      // Set version (4) and variant bits
                      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
                      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
                      
                      // Convert to UUID string format
                      const hex = Array.from(bytes)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                      
                      return [
                        hex.slice(0, 8),
                        hex.slice(8, 12),
                        hex.slice(12, 16),
                        hex.slice(16, 20),
                        hex.slice(20, 32),
                      ].join('-');
                    };
                  }
                }
              })();
            `,
          }}
        />
        <Script
          id="ethereum-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // 处理 window.ethereum 重定义错误
              // 某些钱包扩展或第三方库（如 evmAsk.js）可能会尝试重新定义 ethereum 属性
              (function() {
                // 监听全局错误，捕获 ethereum 重定义错误
                const originalErrorHandler = window.onerror;
                window.onerror = function(message, source, lineno, colno, error) {
                  if (typeof message === 'string' && message.includes('Cannot redefine property: ethereum')) {
                    // 静默处理这个错误，不显示在控制台
                    return true;
                  }
                  // 其他错误正常处理
                  if (originalErrorHandler) {
                    return originalErrorHandler.call(this, message, source, lineno, colno, error);
                  }
                  return false;
                };
                
                // 监听未捕获的错误
                window.addEventListener('error', function(event) {
                  if (event.message && event.message.includes('Cannot redefine property: ethereum')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true);
              })();
            `,
          }}
        />
        <ThemeProvider forcedTheme="dark">
          <LanguageProvider>
            <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
