import _ from 'lodash';
import isUrl from 'is-url';
import got, { HTTPError, RequestError, OptionsOfJSONResponseBody } from 'got'; // Fixed import for Options type
import UserAgents from 'user-agents';
import * as token from './token';
import * as languages from './languages';

// Assume these functions are defined elsewhere or should be implemented
// For now, we'll declare them to satisfy the type checker.
declare function isNumber(value: any): boolean;
declare function isKeyword(value: any): boolean;

interface MapItem {
  p: string;
  v: string;
  i: number;
  l: number;
  s?: boolean;
}

interface TranslateOptions {
  from?: string;
  to?: string;
  except?: string[];
}

interface TokenResult {
  name: string;
  value: string;
}

function checkSame(v: string, maps: MapItem[]): number {
  for (let i = 0; i < maps.length; i++) {
    if (maps[i].v === v) {
      return i;
    }
  }
  return -1;
}

function enMap(obj: any, except: string[] = [], path = '', map: MapItem[] = []): MapItem[] {
  if (_.isObject(obj) == true) {
    _.forEach(obj, (v, k) => {
      const furKeyStr = _.isNumber(k) ? `[${k}]` : ( path && '.' ) + k
      const curPath = path + furKeyStr
      if (_.isObject(v) == true) {
        enMap(v, except, curPath, map)
      } else {
        const exceptReg = except.length > 0 ? new RegExp(`(^|\\.)(${_.map(except, _.escapeRegExp).join('|')})(\\.|\\[|$)`, 'i') : false
        if (
          _.isString(v) &&
          !isNumber(v) &&
          !isUrl(v) &&
          !isKeyword(v) &&
          !/^(?!([a-z]+|\d+|[\?=\.\*\[\]~!@#\$%\^&\(\)_+`\/\-={}:";'<>,]+)$)[a-z\d\?=\.\*\[\]~!@#\$%\^&\(\)_+`\/\-={}:";'<>,]+$/i.test(v) &&
          (!exceptReg || !exceptReg.test(curPath))
        ) {
          const idx = checkSame(v, map)
          if (idx > -1) {
            map.splice(idx+1, 0, {
              p: curPath,
              v: v,
              i: (map[idx] as MapItem).i,
              l: (map[idx] as MapItem).l,
              s: true
            })
          } else {
            const lastMap = _.last(map)
            map.push({
              p: curPath,
              v: v,
              i: lastMap ? lastMap.i + lastMap.l : 0,
              l: v.split("\n").length,
              s: false
            })
          }
        }
      }
    })
  } else {
    map.push({
      p: '',
      v: String(obj), // Ensure obj is string if not an object
      i: 0,
      l: String(obj).split("\n").length
    })
  }
  return map
}

function deMap(src: any, maps: MapItem[], dest: string): any {
  if (_.isObject(src) == true) {
    src = _.clone(src)
    dest = dest.split("\n")
    for (const map of maps) {
      _.set(src, map.p, _.slice(dest, map.i, map.i+map.l).join("\n"))
    }
  } else {
    src = dest
  }
  return src
}

export default async function translate(input: any, opts: TranslateOptions = {}, domain = 'translate.google.cn'): Promise<any> {
  const langs: (string | undefined)[] = [opts.from, opts.to];
  const except: string[] = opts.except || [];
  input = _.cloneDeep(input);
  for (const lang of langs) {
    if (lang && !languages.isSupported(lang)) {
      const e = new Error('The language \'' + lang + '\' is not supported') as Error & { code?: string }; // Fix type and make code string
      e.code = '400'; // Changed to string '400'
      throw e;
    }
  }

  opts.from = languages.getCode(opts.from || 'auto');
  opts.to = languages.getCode(opts.to || 'en');

  const strMap: MapItem[] = enMap(input, except);
  const text = _.map(_.differenceBy(strMap, [{ s: true }], 's'), 'v').join("\n");

  if (text.trim() === '') {
    // If the input text is empty or only whitespace, no translation is needed.
    // Return the original input structure, with empty strings where text was.
    return deMap(input, strMap, '');
  }

  const tokenRet: TokenResult = await token.get(text, domain);
  const url = `https://${domain}/translate_a/single`;
  const searchParams = new URLSearchParams([
    ['client', 't'],
    ['sl', opts.from as string], // opts.from is string after languages.getCode
    ['tl', opts.to as string],   // opts.to is string after languages.getCode
    ['hl', opts.to as string],   // opts.to is string after languages.getCode
    ['dt', 'at'], ['dt', 'bd'], ['dt', 'ex'], ['dt', 'ld'], ['dt', 'md'], ['dt', 'qca'], ['dt', 'rw'], ['dt', 'rm'], ['dt', 'ss'], ['dt', 't'],
    ['ie', 'UTF-8'],
    ['oe', 'UTF-8'],
    ['otf', 1],
    ['ssel', 0],
    ['tsel', 0],
    ['kc', 7],
    ['q', text],
    [tokenRet.name, tokenRet.value]
  ])
  const opt: OptionsOfJSONResponseBody = { // Fix type here
    responseType: 'json',
    headers: { 'User-Agent': new UserAgents({ deviceCategory: 'desktop' }).toString() }
  };
  if (searchParams.toString().length <= 1980) {
    opt.method = 'GET'
  } else {
    searchParams.delete('q')
    opt.method = 'POST'
    opt.form = { q: text }
  }
  opt.searchParams = searchParams
  try {
    const { body } = await got<any[][]>(url, opt); // Use generic type for got
    const retString = _.map(body[0], (item: any) => item[0]).join('');
    return deMap(input, strMap, retString);
  } catch (thrownError: unknown) { // Refactored for type safety
    let message = 'An error occurred during translation.';
    let code = 'UNKNOWN_ERROR';

    if (thrownError instanceof HTTPError) { // Use imported HTTPError
      message = thrownError.message;
      if (thrownError.response && thrownError.response.statusCode !== 200) {
        code = 'BAD_REQUEST';
      } else {
        // This case (HTTPError with statusCode 200 or no response) is unusual.
        code = 'BAD_NETWORK';
      }
    } else if (thrownError instanceof RequestError) { // Use imported RequestError
      message = thrownError.message;
      code = 'BAD_NETWORK';
    } else if (thrownError instanceof Error) {
      message = thrownError.message;
      // Default to BAD_NETWORK for other errors, aligning with original logic's spirit.
      code = 'BAD_NETWORK';
    }
    // Non-Error throwables will use the default message and code initialized above.

    const e: Error & { code?: string } = new Error(message);
    e.code = code;
    throw e;
  }
}

export { languages };


