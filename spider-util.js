/**
 * 1. 下载源的deb包
 * 2. 解压源的deb包
 * 3. 分析源的deb包
 * 4. 下载源的deb包
 * 5. 解压源的deb包
 * 6. 分析源的deb包
 * 7. 下载源的deb包
 * 8. 解压源的deb包
 * 9. 分析源的deb包
 * 10. 下载
 * @type {{get: {(options: (RequestOptions | string | URL), callback?: (res: http.IncomingMessage) => void): http.ClientRequest, (url: (string | URL), options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest}, request: {(options: (RequestOptions | string | URL), callback?: (res: http.IncomingMessage) => void): http.ClientRequest, (url: (string | URL), options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest}, Agent: Agent, Server: Server, createServer: {(requestListener?: http.RequestListener): Server, (options: ServerOptions, requestListener?: http.RequestListener): Server}, RequestOptions: http.RequestOptions & tls.SecureContextOptions & {rejectUnauthorized?: boolean | undefined, servername?: string | undefined}, globalAgent: Agent, AgentOptions: AgentOptions, ServerOptions: tls.SecureContextOptions & tls.TlsOptions & http.ServerOptions}}
 */
const https = require('https');
const got = require('got');
const fs = require('fs');
const bz2 = require('unbzip2-stream');
const AdmZip = require('adm-zip');
const axios = require('axios');
const path = require('path');
var zlib = require('zlib');
var gunzipStream = zlib.createGunzip();

const headers = {
    'X-Unique-ID': '00003210-00060187115B710F',
    "Cookies": "Firmware=16.0; UDID=00008110-00060198026A801E",
    "User-Agent": "chromatic/2.1 CFNetwork/1312 Darwin/21.0.0"
};
const options = {
    headers: headers,
    responseType: 'json' // 根据实际情况设置响应类型
};
const packageName = "Packages.gz"
const parentDir = path.join(__dirname)
var authorDir = "" //父级文件
var sourceName = "" //源名称
/**
 * 下载源的deb包
 * @param sourceUrl
 * @returns {Promise<void>}
 */
async function spider(sourceUrl) {
    const data = await downPackages(sourceUrl)
    const unzip = await unzipFile(sourceUrl)
    const debs = await analysisDeb(sourceUrl)
    return debs
}


async function toDownload(debs,debName) {
    if (debs.length == 0) {
        console.log("请确认当前架构下是否有包可以下载!..")
        return false
    }
    console.log("开始下载: " + debs[0].Architecture + " -->" + sourceName + " 越狱源的deb包,共计: " + debs.length + " 个")
    for (let i = 0; i < debs.length; i++) {
        const deb =debs[i]
        let version = debs[i].Version
        let Name = debs[i].Name
        let debPath = debs[i].Filename
        //非法文件名
        if (Name.match(/\//)) Name = Name.replace(/\//g, "_")
        if (Name.match(/\\/)) Name = Name.replace(/\\/g, "_")
        let fullName = Name + "_" + version + ".deb"
        //指定模糊下载deb
        if(deb.Name.indexOf(debName)==-1){
            continue
        }
        let architecure = debs[i].Architecture;
        architecure = architecure.split("-")[1]
        const targetDir = path.join(parentDir, sourceName, architecure)
        if (!fs.existsSync(path.join(parentDir, sourceName, architecure))) {
            fs.mkdirSync(path.join(parentDir, sourceName, architecure))
        }
       const saveFileName = path.join(targetDir, fullName);
        if (fs.existsSync(saveFileName)) {
            console.log("批量下载进度: " + "(" + (i + 1) + "/" + debs.length + ")" + " --> " + fullName + " ***已存在,跳过下载***")
            continue
        }
        await downloadFile(debs[i].path, saveFileName)
        console.log("批量下载进度: " + "(" + (i + 1) + "/" + debs.length + ")" + " --> " + Name + " 类型: " + architecure)
    }

}


async function analysisDeb(sourceUrl) {
    //源名称
    sourceName = await getSourceName(sourceUrl)
    // 读取文件内容
    const Packagestxt = path.join(__dirname, sourceName, "/Packages.txt")
    const authorDir = path.join(__dirname, sourceName); //作者的deb目录
    const textContent = fs.readFileSync(Packagestxt, 'UTF-8');
// 分割文本内容为多个包的字符串数组
    const packageStrings = textContent.trim().split('\n\n');
// 存储解析后的内容数组
    const packageInfos = [];
    const debsJson = [];
// 处理每个包的字符串
    packageStrings.forEach((packageString) => {
        const lines = packageString.split('\n');
        let packageInfo = {};
        let debInfo = {}
        lines.forEach((line) => {
            const [key, value] = line.split(':').map((item) => item.trim());
            if (key == "Name") {
                debInfo[key] = value.replaceAll("\"", "").replaceAll("\\", "_");
            }
            if (key == "Version") {
                debInfo[key] = value;
            }
            if (key == "Filename") {
                debInfo[key] = value.substr(1, value.length);
                debInfo.path = sourceUrl + debInfo[key]
            }
            if (key == "Architecture") {
                debInfo[key] = value
            }
            if(key=="Section"){
                debInfo[key] = value
            }
            packageInfo[key] = value;
        });
        debsJson.push(debInfo)
        packageInfos.push(packageInfo);
    });
    // 将解析后的内容数组输出为 JSON 格式
    const jsonOutput = JSON.stringify(packageInfos, null, 2);

    let deb = {}
    let arm = debsJson.filter(item => item.Architecture == "iphoneos-arm")
    let arm64e = debsJson.filter(item => item.Architecture == "iphoneos-arm64e")
    let arm64 = debsJson.filter(item => item.Architecture == "iphoneos-arm64")

    const downOut = JSON.stringify(debsJson, null, 2);
    //如果需要将 JSON 输出写入文件，可以使用以下代码
    const armPath = authorDir + '/arm.json';
    const arm64Path = authorDir + '/arm64.json';
    const arm64ePath = authorDir + '/arm64e.json';
    //fs.writeFileSync(outputFilePath, jsonOutput);
    deb.type = "arm";
    deb.total = arm.length;
    deb.data = arm;
    fs.writeFileSync(armPath, JSON.stringify(deb, null, 2));


    deb.url = sourceUrl;
    deb.type = "arm64";
    deb.total = arm64.length;
    deb.data = arm64;
    fs.writeFileSync(arm64Path, JSON.stringify(deb, null, 2));

    deb.type = "arm64e";
    deb.total = arm64e.length;
    deb.data = arm64e;
    fs.writeFileSync(arm64ePath, JSON.stringify(deb, null, 2));
    console.log("读取到deb包,共计: " + debsJson.length + " 个")
    return debsJson;
}


async function downloadFile(url, destinationPath) {
    try {
        const response = await axios({method: 'get', url: url, responseType: 'stream', headers: headers});
        const writer = fs.createWriteStream(destinationPath);
        // 将响应数据流(pipe)到文件
        response.data.pipe(writer);
        // console.log("保存成功 -- >", destinationPath)
        // 返回一个 Promise，以便调用者知道下载何时完成
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`下载文件失败: ${error.message}`);
    }
}


/**
 *
 * @param downUrl
 * @param fileName
 * @param savePath
 * @returns {Promise<void>}
 */
async function downPackages(sourceUrl) {
    //源名称
    sourceName = await getSourceName(sourceUrl)
    const authorDir = path.join(__dirname, sourceName); //作者的deb目录
    let downUrl = sourceUrl + "/" + packageName
    console.log("即将开始下载: " + sourceName + " 越狱源的: " + packageName + ",地址: " + downUrl)
    // 判断文件夹是否存在
    if (!fs.existsSync(path.join(__dirname, sourceName))) {
        // 如果不存在，则创建文件夹
        await fs.mkdirSync(path.join(__dirname, sourceName));
        console.log(`文件夹 ->> '${authorDir}' 创建完成.`);
    } else {
        console.log(`文件夹 --> '${authorDir}' 已存在.`);
    }
    // 创建一个Promise来处理下载过程
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(path.join(authorDir, packageName));
        const request = https.get(downUrl, {headers},
            async (response) => {
                if (response.statusCode !== 200) {
                    console.error(`Error: HTTP Status Code ${response.statusCode}`);
                    reject(new Error(`Failed to download with status code ${response.statusCode}`));
                    return;
                }
                // 确保内容类型是预期的（这里假设是gzip或stream，但根据实际情况调整）
                if (response.headers['content-type'].indexOf('gzip') === -1 &&
                    response.headers['content-type'].indexOf('stream') === -1) {
                    console.warn('Warning: Unexpected content type.');
                }
                // 直接将响应流.pipe到文件写入流，无需额外的await
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`${packageName}  downloaded to: ${authorDir}`);
                    resolve(); // 文件下载完成后，resolve Promise
                });
                fileStream.on('error', (err) => {
                    reject(err); // 如果在写入过程中发生错误，reject Promise
                });
            });
        request.on('error', (error) => {
            reject(error); // 请求过程中发生错误，reject Promise
        });

        console.log("开始下载...");
        // 不需要调用request.end()，https.get已经开始了请求
    });
}

/**
 * 获取源名称
 * @param sourceUrl
 * @returns {Promise<*|string>}
 */
async function getSourceName(sourceUrl) {
    let sourceArray = sourceUrl.split(".")
    //源名称
    sourceName = sourceArray.length == 3 ? sourceUrl.split(".")[1] : sourceUrl.split(".")[0].split("://")[1]
    return sourceName
}

//解压
async function unzipFile(sourceUrl) {
    //源名称
    sourceName = await getSourceName(sourceUrl)
    const gzipFilePath = sourceName + "/" + packageName;
    const outputFolderPath = path.join(__dirname, sourceName);
    // 解压后要保存的文件路径
    const outputFilePath = outputFolderPath + '/Packages.txt';
    return new Promise((resolve, reject) => {
        const gzipFilePath = path.join(__dirname, sourceName, packageName);
        const outputFolderPath = path.join(__dirname, sourceName);
        const outputFilePath = path.join(outputFolderPath, 'Packages.txt');

        // 创建输出文件夹
        if (!fs.existsSync(outputFolderPath)) {
            console.log("创建文件夹:" + outputFolderPath);
            fs.mkdirSync(outputFolderPath);
        }

        // 创建读取、解压和写入流
        const gzipReadStream = fs.createReadStream(gzipFilePath);
        const unzipStream = zlib.createGunzip();
        const outputWriteStream = fs.createWriteStream(outputFilePath);

        // 连接流
        gzipReadStream.pipe(unzipStream).pipe(outputWriteStream);

        // 解压完成事件
        outputWriteStream.on('finish', () => {
            console.log('解压完成....');
            resolve(); // 解压成功，resolve Promise
        });

        // 错误处理
        ['error'].forEach(event => {
            gzipReadStream.on(event, reject);
            unzipStream.on(event, reject);
            outputWriteStream.on(event, reject);
        });
    });
}

function sleep(seconds) {
    console.log("等待" + seconds + "秒")
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports.spider = spider
module.exports.analysisDeb = analysisDeb
module.exports.toDownload = toDownload
module.exports.unzipFile = unzipFile
module.exports.downPackages = downPackages
