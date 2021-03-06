#!/usr/bin/env node

"use strict";
const path = require("path");
const got = require("got");
const os = require("os");
const fs = require("fs-extra");
const cowRcPath = os.platform() === "win32" ? "rc.txt" : path.join(os.homedir(), ".cow/rc");
const ssRcPath = "gui-config.json";
const { JSDOM } = require("jsdom");

// 可以抓取SS账号的网页，及其CSS选择符
const srvs = {
	"http://55service.yaozeyuan.online:8733/whitelist/": "table",
	"https://ss.ishadowx.net": "#portfolio .hover-text",
	"https://freessr.win": ".text-center",
};

// 中文所对应的配置项key名
const keyMap = {
	"加密方式": "method",
	"服务器地址": "server",
	"服务地址": "server",
	"服务密码": "password",
	"服务器端口": "server_port",
	"服务端口": "server_port",
	"端口号": "server_port",
	"状态": "remarks",
	"ip address": "server",
	"port": "server_port",
};

function tabel2config (table) {
	const server = {};
	Array.from(table.querySelectorAll("tr")).forEach(tr => {
		if (tr.children.length === 2) {
			const key = getConfigKey(tr.children[0].innerHTML);
			const value = tr.children[1].innerHTML.trim();
			if (key && value) {
				server[key] = value;
			}
		}
	});
	return server;
}

function nodeText2config (node) {
	// 提取dom元素中的信息
	const text = (node.innerText || node.textContent).trim();
	if (/\n/.test(text)) {
		// 一般的正常情况，按换行符分隔字符串即可
		node = text.split(/\s*\n\s*/g);
	} else {
		// 貌似jsDOM不支持innerText属性，所以采用分析子节点的办法
		node = Array.from(node.childNodes).filter(node => {
			return node.nodeType === 3;
		}).map(node => {
			return (node.innerText || node.textContent).trim();
		});
	}

	// 将提取到的信息，转为配置文件所需格式
	const server = {};

	// 遍历每行信息
	node.forEach(inf => {
		// 按冒号分隔字符串
		inf = inf.split(/\s*[:：]\s*/g);
		const key = getConfigKey(inf[0]);
		const val = inf[1];
		if (key && val) {
			server[key] = val;
		}
	});

	return server;
}

function node2config (node) {
	return node.tagName === "TABLE" ? tabel2config(node) : nodeText2config(node);
}

function getConfigKey (key) {
	if (!key) {
		return;
	}

	key = key.trim().toLowerCase();

	if (!keyMap[key]) {
		if (/^\w+$/.test(key)) {
			return key;
		}

		key = Object.keys(keyMap).find(keyName => (
			keyName.includes(key)
		));

		return key && keyMap[key];
	}
	return keyMap[key];
}

function getServers () {
	return Promise.all(Object.keys(srvs).map(url => (
		JSDOM.fromURL(url, {
			referrer: url,
		}).then(dom => (
			Array.from(
				dom.window.document.querySelectorAll(srvs[url])
			).map(node2config)
		), console.error)
	))).then(servers => (
		[].concat.apply([], servers).filter(server => {
			if (server && server.server && server.password) {
				server.server_port = server.server_port ? +server.server_port : 443;
				server.server = server.server.toLowerCase();
				server.method = server.method ? server.method.toLowerCase() : "aes-256-cfb";
				server.group = "free-ss";
				return true;
			}
		})
	));
}

async function format (servers) {
	if (!servers.length) {
		throw new Error("未找到任何服务器。");
	}

	const [
		isCow,
		isSs,
	] = await Promise.all([
		process.argv.includes("--cow") || fs.exists(cowRcPath),
		process.argv.includes("--ss") || fs.exists(ssRcPath),
	]);

	await Promise.all([
		isCow && cow(servers),
		(isSs || !(isCow || isSs)) && ss(servers),
	]);
}

async function ss (servers) {
	const config = await fs.readJSON(ssRcPath).then(config => {
		if (Array.isArray(config.configs)) {
			config.configs = config.configs.filter(
				server => server.group !== "free-ss"
			).concat(servers);
		} else {
			config.configs = servers;
		}
		return config;
	}, () => ({
		index: -1,
		shareOverLan: true,
		strategy: "com.shadowsocks.strategy.ha",
		configs: servers,
	}));

	await fs.writeJSON(ssRcPath, config, {
		EOL: os.EOL,
		spaces: "\t",
	});
	return config;
}

async function cow (servers) {
	let config = await fs.readFile(cowRcPath, "utf-8").catch(() => (
		""
	));

	config = config.replace(/^#\s*free-ss\s*start\s*$[\s\S]*?^#\s*free-ss\s*end\s*$/igm, "").trim();
	if (!config) {
		config = [
			"listen = http://0.0.0.0:1080",
			"loadBalance = latency",
		].join(os.EOL);
	}
	config = [
		config,
		"",
		"# free-ss start",
	].concat(servers.map(server => (
		`proxy = ss://${server.method}:${server.password}@${server.server}:${server.server_port}`
	))).concat(
		"# free-ss end",
		""
	).join(os.EOL);

	await fs.writeFile(cowRcPath, config);
	return config;
}

function getServerFromCI () {
	if (process.env.CI) {
		return;
	}
	return got("https://ci.appveyor.com/api/projects/gucong3000/free-ss/artifacts/gui-config.json", {
		json: true,
	}).then(config => config.body.configs).catch(() => ({}));
}

async function getConfig () {
	let [
		newServers,
		oldServers,
	] = await Promise.all([
		getServers(),
		getServerFromCI(),
	]);

	if (oldServers) {
		oldServers = oldServers.filter(oldServer => (
			!newServers.some(newServer => (
				newServer.server === oldServer.server && newServer.server_port === oldServer.server_port
			))
		));
		if (oldServers.length) {
			newServers = newServers.concat(oldServers);
		}
	}
	return format(newServers);
}

if (process.mainModule === module) {
	getConfig().catch(console.error);
}

module.exports = getConfig;
