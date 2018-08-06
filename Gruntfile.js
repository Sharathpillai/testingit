/*global module:false*/
require('quiet-grunt');

module.exports = function(grunt) {
  'use strict';

  var baseTestPath = 'src/web/test/',
      unitTestConfig = baseTestPath + 'unit/karma.conf.js';

  // Regexes to extract SRC and HREF
  var SRC_REGEX = /src="([^"]+)"/g;
  var HREF_REGEX = /href="([^"]+)"/g;

  // Filter - returns true if src is updated so we only compile changed files
  // Can't use grunt.event.on('watch',... since synch won't notice changes.
  var fs = require('fs');
  function onlyNew(target) {
    return function(filepath) {
      var src = fs.statSync(filepath).mtime.getTime();
      var dest = filepath.replace('.ts', '.js');
      if (!fs.existsSync(dest)) {return true};
      dest = fs.statSync(dest).mtime.getTime();
      return src > dest;
    }
  }

  // Extract file paths from report.html and create paths to files to copy.
  function  extractReportFilePaths() {
    var reportsApp = grunt.file.read('build/dist/reports.html');
    var srcFiles = reportsApp.match(SRC_REGEX);
    var hrefFiles = reportsApp.match(HREF_REGEX);
    var dirtyFileNames = srcFiles.concat(hrefFiles);
    var fileNames = dirtyFileNames.map(function(dirtyName) {
      return dirtyName.split('"')[1];
    }).filter(function(name) {
      return name !== '%CUSTOM_DASH%';
    });
    var copyFileInfo = fileNames.map(function(fileName) {
      return {
        expand: true,
        cwd: 'build/dist/',
        src: [fileName],
        dest: 'build/reports/templates/',
        filter: 'isFile'
      };
    });
    copyFileInfo.push({
      expand: true,
      cwd: 'build/dist/',
      src: ['reports.html',
            'shared/SharedBootstrapModuleCode.js',
            'shared/SharedModuleCode.js',
            'app/pages/reports/ReportsModuleCode.js',
            'app/view/customDashboard/**/*.html',
            'images/reports-logo.svg',
            'shared/components/statusLight/StatusLight.html',
            'fonts/Open_Sans/open-sans-regular-400.woff',
            'fonts/Open_Sans/open-sans-semibold-600.woff'],
      dest: 'build/reports/templates/',
      filter: 'isFile'
    });
    return copyFileInfo;
  }

  /**
   * Load external grunt helpers & tasks.
   */
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-git');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-sync');

  // Project configuration.
  grunt.initConfig({
    typescript: {
      base: {
        src: ['src/web/app/**/*.ts', 'src/web/shared/**/*.ts'],
        filter: onlyNew(['typescript', 'base']),
        options: {
          module: 'amd',
          target: 'es5',
          sourceMap: true,
          ignoreError: false
        }
      }
    },
    sass: {
      dist: {
        files: {
          'src/web/css/ui.css': 'src/web/css/ui.scss',
          'src/web/css/libs.css': 'src/web/css/libs.scss',
          'src/web/css/ui-pages.css': 'src/web/css/ui-pages.scss'
        }
      }
    },
    watch: {
      typescript: {
        files: ['src/web/app/**/*.ts', 'src/web/shared/**/*.ts'],
        tasks: ['typescript'],
      },
      scss: {
        files: ['src/web/css/*.scss', 'src/web/app/view/**/*.scss', 'src/web/shared/**/*.scss'],
        tasks: ['sass']
      },
      upload: {
        files: ['src/web/app/**/*.js', 'src/web/shared/**/*.js',
                'src/web/css/*.css', 'src/web/app/view/**/*.html',
                'src/web/shared/**/*.html', 'src/web/shared/components/**/*.html',
                'src/web/index.html'],
        tasks: ['sync'],
      }
    },
    sync: {
      main: {
        files: [{
          cwd: 'src/web',
          src: '**',
          dest: process.env.APPDYNAMICS_HOME + '/controller-tmp/glassfish/glassfish/domains/domain1/' +
                'applications/controller/controller-web_war/'
        }]
      }
    },
    clean: {
      reports: ['build/reports']
    },
    gitclone: {
      reports: {
        options: {
          repository: 'git@github.com:Appdynamics/reporting-extension.git',
          branch: 'master',
          directory: 'build/reports',
          depth: 1,
        }
      }
    },
    copy: {
      src: {
        cwd: '../../../reports-service/src',
        src: [
          '**/*'
        ],
        dest: 'build/reports',
        expand: true
      },
      reports: {
        files: extractReportFilePaths()
      },
      reportsDebug: {
        cwd: 'build/dist',
        src: [
          'reports.html',
          'app/**/*.{js,css,html}',
          'css/**/*.{js,css,html,map}',
          'lib/**/*.{js,css,html}',
          'fonts/**/*.woff',
          'shared/**/*.{js,css,html}'
        ],
        dest: 'build/reports/templates',
        expand: true,
        filter: 'isFile'
      }
    },
    compress: {
      reports: {
        options: {
          archive: 'build/reports-service.zip'
        },
        files: [
          {expand: true, cwd: 'build/', src: ['reports/**'], dest: './'}
        ]
      }
    },
    /**
     * Run the unit tests from the command line.
     */
    exec: {
      testWatch: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="Chrome" ' +
                 '--singleRun=false',
        stdout: true
      },
      test: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="Chrome" ' +
                 '--singleRun=true',
        stdout: true
      },
      testFirefox: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="Firefox" ' +
                 '--singleRun=true',
        stdout: true
      },
      testSafari: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="Safari" ' +
                 '--singleRun=true',
        stdout: true
      },
      testHeadless: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="PhantomJS" ' +
                 '--singleRun=true',
        stdout: true
      },
      testWindows: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="IE" ' +
                 '--singleRun=true',
        stdout: true
      },
      testIE10: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="sl_ie10_win7" ' +
                 '--singleRun=true',
        stdout: true
      },
      testIE9: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="sl_ie9_win7" ' +
                 '--singleRun=true',
        stdout: true
      },
      testIE8: {
        command: 'karma start ' + unitTestConfig +
                 ' --browsers="sl_ie8_winXP" ' +
                 '--singleRun=true',
        stdout: true
      }
    }
  });

  grunt.registerTask('reportBuild', 'Report Build',
    ['clean:reports', 'gitclone:reports', 'copy:reports', 'compress:reports']
  );

  grunt.registerTask('reportBuildDebug', 'Report Build Debug',
    ['clean:reports', 'copy:src', 'copy:reportsDebug']
  );

  grunt.registerTask('test', 'exec:test');
  grunt.registerTask('testFirefox', 'exec:testFirefox');
  grunt.registerTask('testSafari', 'exec:testSafari');
  grunt.registerTask('testWatch', 'exec:testWatch');
  grunt.registerTask('testHeadless', 'exec:testHeadless');
  grunt.registerTask('testWin', 'exec:testWindows');
  grunt.registerTask('testIE10', 'exec:testIE10');
  grunt.registerTask('testIE9', 'exec:testIE9');
  grunt.registerTask('testIE8', 'exec:testIE8');
  grunt.registerTask('default', ['exec:test', 'exec:testFirefox', 'exec:testSafari']);
};
