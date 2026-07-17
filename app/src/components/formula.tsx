import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { KATEX_CSS, RENDERED, type FormulaName } from '@/lib/katex-assets';

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;

function buildHtml(name: FormulaName, color: string, mutedColor: string, fontSize: number) {
  const layout = `html,body{margin:0;padding:0;background:transparent;overflow:hidden;text-align:left;}
#f{display:block;text-align:left;color:${color};font-size:${fontSize}px;line-height:1.25;padding:1px 0;}
.katex{text-align:left;}
.eq{margin:2px 0 9px;}
.wh{font-family:${SANS};color:${mutedColor};font-size:0.9em;margin-bottom:3px;}
.defs{display:flex;flex-direction:column;gap:3px;}
.def{display:flex;align-items:baseline;gap:7px;}
.desc{font-family:${SANS};color:${mutedColor};font-size:0.92em;}`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${KATEX_CSS}</style>
<style>${layout}</style>
</head><body><div id="f">${RENDERED[name]}</div>
<script>
function report(){var h=Math.ceil(document.getElementById('f').getBoundingClientRect().height)+2;if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(String(h));}}
report();setTimeout(report,40);window.addEventListener('load',report);
</script></body></html>`;
}

type FormulaProps = {
  name: FormulaName;
  color: string;
  mutedColor?: string;
  fontSize?: number;
  width?: number;
};

export function Formula({ name, color, mutedColor, fontSize = 17, width }: FormulaProps) {
  const [height, setHeight] = useState(fontSize + 6);
  const html = useMemo(
    () => buildHtml(name, color, mutedColor ?? color, fontSize),
    [name, color, mutedColor, fontSize]
  );

  return (
    <View
      pointerEvents="none"
      style={width ? { width, height } : { height }}
      className={width ? '' : 'w-full'}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onMessage={(event) => {
          const next = Number(event.nativeEvent.data);
          if (Number.isFinite(next) && next > 0) setHeight(next);
        }}
      />
    </View>
  );
}
