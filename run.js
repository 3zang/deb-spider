var utils = require('./spider_util');

const sources = [
    "https://apt.htv123.com",
    "https://apt.cydiabc.top/",
    "https://huayuarc.cn",
    "https://sparkdev.me",
    "https://0xkuj.yourepo.com/",
    "https://apt.25mao.com",
    "https://byg.iosios.net/",
    "https://repo.cypwn.xyz/",
    "https://repo.acreson.cn"]


init()
async function init() {
    //指定你想要下载的源的地址 这里只是随便选了一个
    const source = sources[8] //https://repo.acreson.cn
    //获取所有类型的文件
    let debs = await utils.spider(source)
    //区分不同类型的文件
    const arm64e = debs.filter(item => item.Architecture == "iphoneos-arm64e")
    const arm64 = debs.filter(item => item.Architecture == "iphoneos-arm64")
    const arm = debs.filter(item => item.Architecture == "iphoneos-arm")
    // 准备下载 只传入类型 下载对应类型的包,传入 名称 模糊下载包含名称的deb
    const debName = "GPS"
    //示例
    const start = utils.toDownload(arm64)//单独下载所有arm64的包
    const start = utils.toDownload(arm, "GPS")  //下载所有包含GPS的包
}

