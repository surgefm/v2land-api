let gulp = require('gulp')
let nodemon = require('gulp-nodemon')

gulp.task('watch', function () {
  nodemon({
    verbose: true,
    script: './server/server.js',
    ext: 'js json',
    watch: './',
    env: {
      'DEBUG': 'v2land_api:*',
      'NODE_ENV': 'development'
    },
    stdout: true
  })
})
