'use strict'

class Serpentary {
	constructor(cfg) {
		this.validators = {};
		this.validators_config = cfg || {};
		this.validators_list = [];
	}

	validate(proc) {
		if (!this.validators_config[proc.name])
			return Promise.resolve({
				name: proc.name,
				success: true
			});
		let validators = _.keys(this.validators_config[proc.name]);
		return Promise.map(validators, (valname) => {
				return (valname != 'name') && _.isFunction(this.validators[valname]) ? this.validators[valname](proc, this.validators_config[proc.name][valname]) : true;
			})
			.then(res => {
				return {
					name: proc.name,
					success: _.every(res),
					reason: _.filter(validators, (name, index) => !res[index])
				};
			})
			.catch((err) => {
				return {
					success: false,
					name: proc.name,
					reason: err.message
				};
			});
	}

	addValidator(snake_name, snake_body) {
		this.validators[snake_name] = snake_body;
	}
}

module.exports = Serpentary;