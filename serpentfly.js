'use strict'

let pm2 = require('pm2');
let _ = require('lodash');
let Promise = require('bluebird');
let isPortReachable = require('is-port-reachable');
let Serpentary = require('./Serpentary.js');


class Serpentfly {
	constructor() {
		this.worker = () => {
			pm2.connect((err) => {
				if (err) this.logger.error(err);
				pm2.list((err, proclist) => {
					let ls = _.keyBy(proclist, 'name');
					return Promise.map(_.keys(this.hosts), (key) => {
							return this.serpentary.validate(ls[key], key);
						})
						.then((res) => {
							let to_restart = _.filter(res, (p) => (!p.success));
							this.logger.info(res, "Processes status");
							return Promise.map(to_restart, (proc) => {
								let hname = _.clone(proc.name);
								this.logger.info(`Restarting process ${hname} ; reason: ${_.get(_.find(res, (r)=>r.name==hname),'reason') }`);
								return new Promise((resolve, reject) => {
									let prc = this.pm2_cfg[hname];
									if (!prc) resolve(false);
									pm2.delete(hname, () => {
										pm2.start(prc, (err, newproc) => {
											clearTimeout(this.timer);
											resolve(true);
										});
									});
									// let env = _.clone(process.env);
									// _.unset(env, 'pm_id');
									// _.unset(env, 'name');
									// require('child_process')
									// 	.exec(`pm2 restart ${hname}`, {
									// 		env
									// 	}, (errcode, stdout, stderr) => {
									// 		console.log(errcode);
									// 		console.log(stdout);
									// 		console.log(stderr);
									// 		resolve(true);
									// 	});
								});
							});
						})
						.then((res) => {
							clearTimeout(this.timer);
							this.timer = setTimeout(this.worker, this.config.interval);
						})
						.catch((err) => {
							console.log("ERR!", err.stack);
							this.logger.error(err);
							clearTimeout(this.timer);
							this.timer = setTimeout(this.worker, this.config.interval);
						})
						.then((res) => {
							pm2.disconnect();
						});
				});
			});
		}
	}

	// methods
	setLogger(logger) {
		this.logger = logger;
	}

	setConfig(config) {
		this.config = config;
		this.hosts = _.keyBy(config.watch, 'name');
		this.serpentary = new Serpentary(this.hosts);

		this.serpentary.addValidator('loop_delay', (proc, cfg) => {
			let hname = proc.name;
			let loop_delay = _.parseInt(_.get(proc, `pm2_env.axm_monitor.${'Loop delay'}.value`, 0));
			if (loop_delay > cfg.threshold) {
				return Promise.reject(new Error(`Loop delay validator failed: ${loop_delay}ms is over threshold ${cfg.threshold}ms`));
			}
			return true;
		});

		this.serpentary.addValidator('ping', (proc, cfg) => {
			let hname = proc.name;
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

	setPM2Config(pm2_config) {
		this.pm2_cfg = _.keyBy(pm2_config, 'name');
	}

	start() {
		if (!this.config || !this.pm2_cfg || !this.logger)
			throw new Error('Either config, pm2 config or logger is not set.');
		this.timer = setTimeout(this.worker, this.config.interval);
	}

	stop() {
		clearTimeout(this.timer);
	}

}
let s = new Serpentfly();
module.exports = s;