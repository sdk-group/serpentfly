'use strict'

let _ = require('lodash');
let Promise = require('bluebird');

class Serpentary {
	constructor(cfg) {
		this.validators = {};
		this.validators_config = cfg || {};
		this.validators_list = [];
	}

	validate(procname) {
		if (!this.validators_config[procname])
			return Promise.resolve({
				name: procname,
				success: true,
				reason: 'App not in config'
			});
		let validators = _.keys(this.validators_config[procname]);
		return Promise.map(validators, (valname) => {
				return _.isFunction(this.validators[valname]) ? this.validators[valname](this.validators_config[procname][valname]) : true;
			})
			.then(res => {
				return {
					name: procname,
					success: _.every(res),
					reason: _.filter(validators, (name, index) => !res[index])
				};
			})
			.catch((err) => {
				return {
					success: false,
					name: procname,
					reason: err.message
				};
			});
	}

	addValidator(snake_name, snake_body) {
		this.validators[snake_name] = snake_body;
	}
}

module.exports = Serpentary;