import fs from 'node:fs';
const version=(process.env.RELEASE_TAG||'').replace(/^v/,'');
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('RELEASE_TAG precisa ser v1.2.3.');
const number=Number(process.env.RELEASE_BUILD_NUMBER);
if(!Number.isSafeInteger(number)||number<2||number>2100000000)throw Error('RELEASE_BUILD_NUMBER precisa ser um inteiro crescente maior que 1.');
const app=JSON.parse(fs.readFileSync('app.json','utf8'));app.expo.version=version;app.expo.android.versionCode=number;fs.writeFileSync('app.json',JSON.stringify(app,null,2)+'\n');
for(const filename of ['package.json','package-lock.json']){const data=JSON.parse(fs.readFileSync(filename,'utf8'));data.version=version;if(data.packages?.[''])data.packages[''].version=version;fs.writeFileSync(filename,JSON.stringify(data,null,2)+'\n');}
