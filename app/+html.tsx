import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const webStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: #08080F;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
  }
  #root {
    width: 390px;
    height: 844px;
    overflow: hidden;
    border-radius: 44px;
    position: relative;
    background-color: #08080F;
    box-shadow:
      0 0 0 1px #2E2E48,
      0 0 80px rgba(107, 82, 224, 0.25),
      0 40px 120px rgba(0, 0, 0, 0.8);
    flex-shrink: 0;
  }
  @media (max-height: 900px) {
    #root {
      height: 100vh;
      border-radius: 0;
    }
  }
`;
