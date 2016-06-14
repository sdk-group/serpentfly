var gulp = require("gulp");
var watch = require('gulp-watch');
var changed = require('gulp-changed');
var nodemon = require('gulp-nodemon');
var demon;


gulp.task('upd', function () {
	return gulp.src(["*.js"])
		.pipe(gulp.dest("../iris-v2/node_modules/serpentfly"));
});

gulp.task('test-upd', ['start-test'], function () {
	gulp.watch(["*.js"], ['upd']);
});

gulp.task('start-test', function () {
	demon = nodemon({
		script: 'serpentfly.js',
		watch: ['.'],
		execMap: {
			"js": "node  --harmony "
		},
		env: {
			'NODE_ENV': 'development'
		}
	});
});