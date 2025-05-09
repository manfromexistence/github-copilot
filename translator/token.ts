import got from 'got';
import Configstore from 'configstore';

// Fix broken/garbled config declaration and type errors
const configstore = new Configstore('google-translate');
const window: { TKK: string } = {
  TKK: configstore.get('TKK') || '0'
}

// Fix type errors in sM and helpers
type Nullable<T> = T | null;

function sM(a: string): string {
  let b: string | null = null;
  if (yr !== null) {
    b = yr;
  } else {
    const t = wr(String.fromCharCode(84));
    const k = wr(String.fromCharCode(75));
    const arr = [t(), t()];
    arr[1] = k();
    b = (yr = (window as any)[arr.join(k())] || "") || "";
  }
  const t2 = wr(String.fromCharCode(116));
  const k2 = wr(String.fromCharCode(107));
  const arr2 = [t2(), t2()];
  arr2[1] = k2();
  let c = "&" + arr2.join("") + "=";
  const d = (b ?? '').split(".");
  let bNum = Number(d[0]) || 0;
  const e: number[] = [];
  let f = 0;
  for (let g = 0; g < a.length; g++) {
    let l = a.charCodeAt(g);
    if (l < 128) {
      e[f++] = l;
    } else {
      if (l < 2048) {
        e[f++] = (l >> 6) | 192;
      } else {
        if ((l & 0xFC00) === 0xD800 && g + 1 < a.length && (a.charCodeAt(g + 1) & 0xFC00) === 0xDC00) {
          l = 0x10000 + ((l & 0x3FF) << 10) + (a.charCodeAt(++g) & 0x3FF);
          e[f++] = (l >> 18) | 240;
          e[f++] = ((l >> 12) & 63) | 128;
        } else {
          e[f++] = (l >> 12) | 224;
          e[f++] = ((l >> 6) & 63) | 128;
        }
      }
      e[f++] = (l & 63) | 128;
    }
  }
  let aNum = bNum;
  for (f = 0; f < e.length; f++) {
    aNum += e[f] ?? 0;
    aNum = xr(aNum, "+-a^+6");
  }
  aNum = xr(aNum, "+-3^+b+-f");
  aNum ^= Number(d[1]) || 0;
  if (aNum < 0) {
    aNum = (aNum & 2147483647) + 2147483648;
  }
  aNum %= 1e6;
  return c + (aNum.toString() + "." + (aNum ^ bNum));
}

let yr: string | null = null;
const wr = function(a: string) {
  return function() {
    return a;
  }
};
const xr = function(a: number, b: string) {
  for (let c = 0; c < b.length - 2; c += 3) {
    let d: number | string = b.charAt(c + 2);
    d = (typeof d === 'string' && d >= 'a') ? d.charCodeAt(0) - 87 : Number(d);
    d = b.charAt(c + 1) === '+' ? (a >>> (d as number)) : (a << (d as number));
    a = b.charAt(c) === '+' ? (a + (d as number) & 4294967295) : (a ^ (d as number));
  }
  return a;
}


// Fix configstore usage in updateTKK
async function updateTKK(domain: string): Promise<void> {
  const now = Math.floor(Date.now() / 3600000);
  if (Number(window.TKK.split('.')[0]) === now) {
    return;
  } else {
    try {
      const res = await got(`https://${domain}`);
      const code = res.body.match(/tkk:'(.*?)'/ig);
      if (code) {
        const TKK = code[0].match(/\d+\.\d+/)![0];
        if (typeof TKK !== 'undefined') {
          configstore.set('TKK', TKK);
        }
      }
      return;
    } catch (error) {
      (error as any).code = 'BAD_NETWORK';
      throw error;
    }
  }
}

export async function get(text: string, domain = 'translate.google.cn'): Promise<{ name: string; value: string }> {
  try {
    await updateTKK(domain)
    const tk = sM(text).replace('&tk=', '')
    return {name: 'tk', value: tk}
  } catch (error) {
    throw error
  }
}
