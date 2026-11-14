import { safeEqual, cleanText, randomCode, stripDangerousKeys, clientIp } from '../lib/security.ts'
const ok=(n:string,c:boolean)=>console.log(c?'PASS':'FAIL',n)
ok('safeEqual same', safeEqual('abc','abc')); ok('safeEqual diff', !safeEqual('abc','abd')); ok('safeEqual empty', !safeEqual('','')); ok('safeEqual null', !safeEqual(null,'x'))
ok('nfkc fold', cleanText('ｆｕｌｌ ＡＢＣ')==='full ABC'); ok('zero width stripped', cleanText('ad​min')==='admin'); ok('bidi stripped', cleanText('a‮b')==='ab')
ok('cap 52', Array.from(cleanText('x'.repeat(500),52)).length===52)
ok('code shape', /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(randomCode()))
const p=stripDangerousKeys(JSON.parse('{"a":1,"__proto__":{"admin":true},"b":{"constructor":{"x":1},"c":2}}')) as any
ok('proto stripped', p.admin===undefined && ({} as any).admin===undefined && p.b.c===2 && !Object.prototype.hasOwnProperty.call(p.b,'constructor'))
ok('ip real wins', clientIp(new Headers({'x-forwarded-for':'1.1.1.1, 9.9.9.9','x-real-ip':'9.9.9.9'}))==='9.9.9.9')
ok('ip spoof ignored', clientIp(new Headers({'x-forwarded-for':'6.6.6.6, 9.9.9.9'}))==='9.9.9.9')
