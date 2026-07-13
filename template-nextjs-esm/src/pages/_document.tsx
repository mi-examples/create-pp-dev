import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <script
          dangerouslySetInnerHTML={{
            /**
             * This is where you can set variables that will be available in the PP template.
             */
            __html: /* JS */ `
          window.PP_VARIABLES = {
            // Example
            // LOGO: "[Logo]",
            // DATASET_ID: [Dataset ID],
          }
          `,
          }}
        ></script>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
