import React from 'react';
import { View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface UniversalSvgChartProps {
  svgHtml: string;
  height?: number;
  width?: number | string;
  style?: any;
}

export const UniversalSvgChart: React.FC<UniversalSvgChartProps> = ({
  svgHtml,
  height = 280,
  width = '100%',
  style,
}) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, style]}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </View>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
          }
          svg {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        ${svgHtml}
      </body>
    </html>
  `;

  const containerWidth = typeof width === 'number' ? width : '100%';
  const containerHeight = height;

  return (
    <View style={[{ width: containerWidth, height: containerHeight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        containerStyle={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        androidLayerType="software"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
      />
    </View>
  );
};

export default UniversalSvgChart;
