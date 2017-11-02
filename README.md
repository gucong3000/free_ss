free-ss
===============
[![AppVeyor](https://img.shields.io/appveyor/ci/gucong3000/free-ss.svg?&label=Windows)](https://ci.appveyor.com/project/gucong3000/free-ss)

> 免费[Shadowsocks](https://github.com/shadowsocks/shadowsocks-windows/)账号自动配置工具。

## 安装

```bash
npm i -g gucong3000/free_ss
```

## 使用

- [Shadowsocks](https://github.com/shadowsocks/shadowsocks-windows/)用户
	```bash
	free-ss --ss
	```
- [COW (Climb Over the Wall) proxy](https://github.com/cyfdecyf/cow)用户
	```bash
	free-ss --cow
	```

## 功能
- 自动同步[FreeSSR](https://freessr.win)、[iShadow](https://ss.ishadowx.net)其他网站上的免费账号至本地配置文件([gui-config.json](https://ci.appveyor.com/api/projects/gucong3000/free-ss/artifacts/gui-config.json)或[rc.txt](https://ci.appveyor.com/api/projects/gucong3000/free-ss/artifacts/rc.txt)).
