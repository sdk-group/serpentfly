'use strict'

let _ = require('lodash');
let Promise = require('bluebird');
let isPortReachable = require('is-port-reachable');
let Serpentary = require('./Serpentary.js');
let exec = require('child_process')
	.exec;

class Serpentfly {
	constructor() {
		this.worker = () => {
			return Promise.map(_.keys(this.hosts), (key) => {
					return this.serpentary.validate(key);
				})
				.then((res) => {
					let to_restart = _.filter(res, (p) => (!p.success));
					this.logger.info(res, "Processes status");
					return Promise.map(to_restart, (proc) => {
						let hname = this.restart[proc.name] || proc.name;
						this.logger.info(`Restarting process ${proc.name} ; reason: ${_.get(_.find(res, (r)=>r.name==proc.name),'reason') }`);
						return new Promise((resolve, reject) => {
							exec(`pm2 restart ${hname}`, (errcode, stdout, stderr) => {
								console.log(errcode);
								console.log(stdout);
								console.log(stderr);
								resolve(true);
							});
						});
					});
				})
				.catch((err) => {
					console.log("ERR!", err.stack);
					this.logger.error(err);
				})
				.then((res) => {
					if (!this.stopped) {
						clearTimeout(this.timer);
						this.timer = setTimeout(this.worker, this.interval);
					}
				});
		}
	}

	// methods
	setLogger(logger) {
		this.logger = logger;
	}

	setConfig(config) {
		this.interval = config.interval;
		this.hosts = config.watch;
		this.restart = config.restart;
		this.serpentary = new Serpentary(this.hosts);

		this.serpentary.addValidator('ping', (cfg) => {
			return new Promise((resolve, reject) => {
				isPortReachable(cfg.port, {
					host: cfg.host,
					timeout: cfg.threshold
				}, function (err, reachable) {
					if (reachable)
						resolve(true);
					else
						reject(new Error(`Ping validator failed: failed to reach port ${cfg.port} in ${cfg.threshold}ms`));
				});
			});

		});

	}

	start() {
		if (!this.hosts || !this.logger)
			throw new Error('Either configs or logger is not set.');
		this.stopped = false;
		this.timer = setTimeout(this.worker, this.interval);
	}

	stop() {
		clearTimeout(this.timer);
		this.stopped = true;
	}

}
let s = new Serpentfly();
module.exports = s;