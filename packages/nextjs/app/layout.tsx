import "@rainbow-me/rainbowkit/styles.css";
import { DappWrapperWithProviders } from "~~/components/DappWrapperWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/helper/getMetadata";

export const metadata = getMetadata({
  title: "Sharingan Dao",
  description: "Built with FHEVM",
});

const DappWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={``}>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=telegraf@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(255,0,0,0.15), transparent 60%)," +
            "repeating-conic-gradient(from 0deg, #220000, #440000 30deg, #660000 60deg, #220000 90deg)",
          animation: "spinSharingan 40s linear infinite, flicker 3s ease-in-out infinite",
          backgroundBlendMode: "overlay",
        }}
      >
        <ThemeProvider enableSystem>
          <DappWrapperWithProviders>{children}</DappWrapperWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default DappWrapper;
